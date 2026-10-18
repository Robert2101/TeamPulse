import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";
import { errorMessage } from "../../lib/format";
import { FileDropZone } from "../files/FileDropZone";
import { FilePreview } from "../files/FilePreview";

export const TaskAttachments = ({ task, socket, user, isAdmin }) => {
    const [attachments, setAttachments] = useState([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(true);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [showAttachments, setShowAttachments] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        const fetchAttachments = async () => {
            try {
                const res = await api.get(`/files`, {
                    params: { entityType: 'Task', entityId: task._id }
                });
                setAttachments(res.data);
            } catch (err) {
                console.error("Failed to load attachments", err);
                setLoadFailed(true);
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
            toast.error("Upload failed", errorMessage(err, "The file couldn't be uploaded. Please try again."));
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
            toast.error("Couldn't delete the file", errorMessage(err));
        }
    };

    return (
        <div>
            <button
                onClick={() => setShowAttachments(v => !v)}
                aria-expanded={showAttachments}
                aria-controls={`attachments-${task._id}`}
                className="mb-3 flex w-full items-center justify-between rounded-md"
            >
                <h3 className="text-sm font-semibold text-gray-900">
                    Attachments {attachments.length > 0 && <span className="tabular font-normal text-gray-500">({attachments.length})</span>}
                </h3>
                {showAttachments ? <ChevronUp size={16} className="text-gray-500" aria-hidden="true" /> : <ChevronDown size={16} className="text-gray-500" aria-hidden="true" />}
            </button>

            {showAttachments && (
                <div id={`attachments-${task._id}`} className="space-y-2">
                    <FileDropZone onFilesDropped={handleAttachmentDrop} uploading={uploadingAttachment} />

                    {attachmentsLoading ? (
                        <div className="h-16 animate-pulse rounded-xl bg-gray-100" role="status" aria-label="Loading attachments" />
                    ) : loadFailed ? (
                        <p className="text-sm text-red-700">Couldn't load attachments. Close and reopen the task to retry.</p>
                    ) : attachments.length === 0 ? (
                        <p className="text-sm text-gray-600">No attachments yet.</p>
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
                </div>
            )}
        </div>
    );
};
