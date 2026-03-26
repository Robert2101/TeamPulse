import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import api from "../../lib/axios";
import { FileDropZone } from "../files/FileDropZone";
import { FilePreview } from "../files/FilePreview";

export const TaskAttachments = ({ task, socket, user, isAdmin }) => {
    const [attachments, setAttachments] = useState([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(true);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [showAttachments, setShowAttachments] = useState(true);

    useEffect(() => {
        const fetchAttachments = async () => {
            try {
                const res = await api.get(`/files`, {
                    params: { entityType: 'Task', entityId: task._id }
                });
                setAttachments(res.data);
            } catch (err) {
                console.error("Failed to load attachments", err);
            } finally {
                setAttachmentsLoading(false);
            }
        };
        fetchAttachments();
    }, [task._id]);

    useEffect(() => {
        if (!socket) return;

        const handleFileUploaded = (data) => {
            if (data.entityType === 'Task' && data.entityId === task._id) {
                setAttachments(prev => {
                    if (prev.find(f => f._id === data.file._id)) return prev;
                    return [data.file, ...prev];
                });
            }
        };

        const handleFileDeleted = (data) => {
            if (data.entityType === 'Task' && data.entityId === task._id) {
                setAttachments(prev => prev.filter(f => f._id !== data.fileId));
            }
        };

        socket.on("file-uploaded", handleFileUploaded);
        socket.on("file-deleted", handleFileDeleted);

        return () => {
            socket.off("file-uploaded", handleFileUploaded);
            socket.off("file-deleted", handleFileDeleted);
        };
    }, [socket, task._id]);

    const handleAttachmentDrop = async (files) => {
        if (!files.length) return;
        setUploadingAttachment(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('entityType', 'Task');
                formData.append('entityId', task._id);
                const res = await api.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setAttachments(prev => {
                    if (prev.some(f => f._id === res.data.file._id)) return prev;
                    return [res.data.file, ...prev];
                });
            }
        } catch (err) {
            console.error("Failed to upload attachment", err);
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleDeleteAttachment = async (fileId) => {
        try {
            await api.delete(`/files/${fileId}`);
            setAttachments(prev => prev.filter(f => f._id !== fileId));
        } catch (err) {
            console.error("Failed to delete attachment", err);
        }
    };

    return (
        <div className="mt-8">
            <button
                onClick={() => setShowAttachments(v => !v)}
                className="flex w-full items-center justify-between mb-3"
            >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                    Attachments {attachments.length > 0 && `(${attachments.length})`}
                </h3>
                {showAttachments ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
            </button>

            <AnimatePresence>
                {showAttachments && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <FileDropZone onFilesDropped={handleAttachmentDrop} uploading={uploadingAttachment} />

                        {attachmentsLoading ? (
                            <p className="text-xs text-zinc-500 animate-pulse">Loading attachments…</p>
                        ) : attachments.length === 0 ? (
                            <p className="text-xs text-zinc-600">No attachments yet.</p>
                        ) : (
                            attachments.map(file => (
                                <FilePreview
                                    key={file._id}
                                    file={file}
                                    onDelete={handleDeleteAttachment}
                                    canDelete={isAdmin || file.uploadedBy?._id === user?._id}
                                />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};