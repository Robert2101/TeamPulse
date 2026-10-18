import { useEffect, useState } from "react";
import { FileText, Image, FileSpreadsheet, File, Download, Trash2, X, AlertTriangle } from "lucide-react";

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const FileIcon = ({ fileType }) => {
    if (fileType?.startsWith("image/")) return <Image size={18} className="text-gray-600" aria-hidden="true" />;
    if (fileType === "application/pdf") return <FileText size={18} className="text-gray-600" aria-hidden="true" />;
    if (fileType?.includes("spreadsheet") || fileType?.includes("excel")) return <FileSpreadsheet size={18} className="text-gray-600" aria-hidden="true" />;
    return <File size={18} className="text-gray-600" aria-hidden="true" />;
};

const Lightbox = ({ file, onClose }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    return (
        <div role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`} className="fixed inset-0 z-100 flex items-center justify-center bg-gray-950/80 p-4" onClick={onClose}>
            <button autoFocus className="absolute right-4 top-4 rounded-full bg-white p-2 text-gray-700 shadow hover:text-gray-900" onClick={onClose} aria-label="Close preview"><X size={20} /></button>
            <img src={file.url} alt={file.name} className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

export const FilePreview = ({ file, onDelete, canDelete = false }) => {
    const [lightbox, setLightbox] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (!file?.url) return null;
    const isImage = file.fileType?.startsWith("image/");
    const downloadUrl = file.url.replace('/upload/', '/upload/fl_attachment/');
    const actionBtn = "inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors";

    return (
        <>
            <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
                <div className="flex items-center gap-3 p-3">
                    {isImage ? (
                        <button onClick={() => setLightbox(true)} className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200" aria-label={`Preview ${file.name}`}>
                            <img src={file.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </button>
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                            <FileIcon fileType={file.fileType} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900" title={file.name}>{file.name}</p>
                        <p className="truncate text-xs text-gray-600">
                            <span className="tabular">{formatBytes(file.size)}</span>
                            {file.uploadedBy?.fullName && ` · ${file.uploadedBy.fullName}`}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={`${actionBtn} hover:bg-gray-100 hover:text-gray-900`} aria-label={`Download ${file.name}`} onClick={(e) => e.stopPropagation()}>
                            <Download size={15} />
                        </a>
                        {canDelete && !confirmDelete && (
                            <button onClick={() => setConfirmDelete(true)} className={`${actionBtn} hover:bg-red-50 hover:text-red-700`} aria-label={`Delete ${file.name}`}>
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {confirmDelete && (
                    <div role="alertdialog" aria-label={`Delete ${file.name}?`} className="flex items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-3 py-2">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-800"><AlertTriangle size={13} aria-hidden="true" /> Delete this file?</span>
                        <div className="flex gap-1.5">
                            <button onClick={() => setConfirmDelete(false)} className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white">Cancel</button>
                            <button autoFocus onClick={() => { setConfirmDelete(false); onDelete(file._id); }} className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                )}
            </div>

            {lightbox && <Lightbox file={file} onClose={() => setLightbox(false)} />}
        </>
    );
};
