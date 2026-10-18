import { useState, useEffect } from "react";
import { FolderOpen } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { FileDropZone } from "../components/files/FileDropZone";
import { FilePreview } from "../components/files/FilePreview";
import { toast } from "../lib/toast";
import { errorMessage } from "../lib/format";

export const AssetsHub = ({ project, socket }) => {
    const { user } = useStore();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);

    const isAdmin = user?.role?.roleName === 'Admin';
    const pmId = (project?.projectManager?._id || project?.projectManager)?.toString();
    const isProjectManager = !!pmId && pmId === user?._id?.toString();
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
                setLoadFailed(true);
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
            toast.error("Upload failed", errorMessage(err, "The file couldn't be uploaded. Please try again."));
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
            toast.error("Couldn't delete the file", errorMessage(err));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <FolderOpen size={20} className="text-gray-500" aria-hidden="true" /> Project assets
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Shared storage for brand files, contracts, templates and resources.
                    </p>
                </div>
                {assets.length > 0 && (
                    <span className="tabular shrink-0 text-sm text-gray-600">{assets.length} file{assets.length !== 1 ? 's' : ''}</span>
                )}
            </div>

            {canUpload && (
                <FileDropZone onFilesDropped={handleFileDrop} uploading={uploading} />
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="status" aria-label="Loading assets">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                    ))}
                </div>
            ) : loadFailed ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Couldn't load project assets. Refresh the page to try again.</p>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                    <FolderOpen size={32} className="mb-3 text-gray-400" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">No assets yet</p>
                    <p className="mt-1 text-sm text-gray-600">
                        {canUpload
                            ? "Drop files above to share them with everyone on this project."
                            : "The project manager hasn't shared any files yet."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
