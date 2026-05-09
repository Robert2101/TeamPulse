import { useState } from "react";
import { FileText, Image, FileSpreadsheet, File, Download, Trash2, X, AlertTriangle } from "lucide-react";
const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const FileIcon = ({ fileType }) => {
    if (fileType?.startsWith("image/")) return <Image size={18} className="text-gray-600" />;
    if (fileType === "application/pdf") return <FileText size={18} className="text-gray-600" />;
    if (fileType?.includes("spreadsheet") || fileType?.includes("excel")) return <FileSpreadsheet size={18} className="text-gray-600" />;
    return <File size={18} className="text-gray-500" />;
};

export const FilePreview = ({ file, onDelete, canDelete = false }) => {
    const [lightbox, setLightbox] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isImage = file.fileType?.startsWith("image/");
    const downloadUrl = file.url.replace('/upload/', '/upload/fl_attachment/');

    return (
        <>
            <div
               
               
                className="group flex flex-col rounded-xl border border-gray-200 bg-white border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
            >
                <div className="flex items-center gap-3 p-3">
                    {isImage ? (
                        <button onClick={() => setLightbox(true)} className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-300" title="Preview image">
                            <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                        </button>
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50">
                            <FileIcon fileType={file.fileType} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-400">
                            {formatBytes(file.size)}
                            {file.uploadedBy?.fullName && ` · ${file.uploadedBy.fullName}`}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Download" onClick={(e) => e.stopPropagation()}>
                            <Download size={15} />
                        </a>
                        {canDelete && !confirmDelete && (
                            <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400" title="Delete">
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                </div>

                <>
                    {confirmDelete && (
                        <div className="border-t border-red-500/20 bg-red-500/5 p-2 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 ml-1"><AlertTriangle size={12} /> Confirm Delete</span>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-1 text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                                <button onClick={() => { setConfirmDelete(false); onDelete(file._id); }} className="text-[10px] px-2 py-1 bg-red-600 hover:bg-red-500 text-gray-900 rounded font-bold transition-colors">Delete File</button>
                            </div>
                        </div>
                    )}
                </>
            </div>

            {/* Lightbox for images */}
            <>
                {lightbox && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-200/90 backdrop-blur-sm p-4" onClick={() => setLightbox(false)}>
                        <button className="absolute right-4 top-4 rounded-full border border-gray-300 bg-white p-2 text-gray-600 hover:text-gray-900" onClick={() => setLightbox(false)}><X size={20} /></button>
                        <img src={file.url} alt={file.name} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    </div>
                )}
            </>
        </>
    );
};