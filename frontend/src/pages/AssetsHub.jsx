import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Trash2 } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { FileDropZone } from "../components/files/FileDropZone";
import { FilePreview } from "../components/files/FilePreview";

export const AssetsHub = ({ project, socket }) => {
    const { user } = useStore();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const isAdmin = user?.role?.roleName === 'Admin';
    const isProjectManager =
        project?.projectManager?._id === user?._id ||
        project?.projectManager === user?._id;
    const canUpload = isAdmin || isProjectManager;

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const res = await api.get('/files', {
                    params: { entityType: 'Project', entityId: project._id }
                });
                setAssets(res.data);
            } catch (err) {
                console.error("Failed to load project assets", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
    }, [project._id]);

    useEffect(() => {
        if (!socket) return;

        const handleFileUploaded = (data) => {
            if (data.entityType === 'Project' && data.entityId === project._id) {
                setAssets(prev => {
                    if (prev.find(f => f._id === data.file._id)) return prev;
                    return [data.file, ...prev];
                });
            }
        };

        const handleFileDeleted = (data) => {
            if (data.entityType === 'Project' && data.entityId === project._id) {
                setAssets(prev => prev.filter(f => f._id !== data.fileId));
            }
        };

        socket.on("file-uploaded", handleFileUploaded);
        socket.on("file-deleted", handleFileDeleted);

        return () => {
            socket.off("file-uploaded", handleFileUploaded);
            socket.off("file-deleted", handleFileDeleted);
        };
    }, [socket, project._id]);

    const handleFileDrop = async (files) => {
        if (!files.length) return;
        setUploading(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('entityType', 'Project');
                formData.append('entityId', project._id);
                const res = await api.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setAssets(prev => {
                    if (prev.some(f => f._id === res.data.file._id)) return prev;
                    return [res.data.file, ...prev];
                });
            }
        } catch (err) {
            console.error("Failed to upload asset", err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
        try {
            await api.delete(`/files/${fileId}`);
            setAssets(prev => prev.filter(f => f._id !== fileId));
        } catch (err) {
            console.error("Failed to delete asset", err);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                        <FolderOpen size={20} className="text-indigo-400" /> Project Assets
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                        Central storage for brand files, contracts, templates, and resources.
                    </p>
                </div>
                {assets.length > 0 && (
                    <span className="text-sm text-zinc-500">{assets.length} file{assets.length !== 1 ? 's' : ''}</span>
                )}
            </div>

            {canUpload && (
                <FileDropZone onFilesDropped={handleFileDrop} uploading={uploading} />
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-900" />
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center"
                >
                    <FolderOpen size={40} className="mb-3 text-zinc-700" />
                    <p className="text-sm font-medium text-zinc-500">No assets yet</p>
                    <p className="mt-1 text-xs text-zinc-600">
                        {canUpload
                            ? "Drag & drop files above to add project assets."
                            : "No project assets have been uploaded yet."}
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assets.map(file => (
                        <FilePreview
                            key={file._id}
                            file={file}
                            onDelete={handleDelete}
                            canDelete={isAdmin || file.uploadedBy?._id === user?._id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
