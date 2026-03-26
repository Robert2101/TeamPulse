import { useState } from "react";
import { FileText, Image, FileSpreadsheet, File, Download, Trash2, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const FileIcon = ({ fileType }) => {
    if (fileType?.startsWith("image/")) return <Image size={18} className="text-blue-400" />;
    if (fileType === "application/pdf") return <FileText size={18} className="text-red-400" />;
    if (fileType?.includes("spreadsheet") || fileType?.includes("excel")) return <FileSpreadsheet size={18} className="text-green-400" />;
    return <File size={18} className="text-zinc-400" />;
};

export const FilePreview = ({ file, onDelete, canDelete = false }) => {
    const [lightbox, setLightbox] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isImage = file.fileType?.startsWith("image/");
    const downloadUrl = file.url.replace('/upload/', '/upload/fl_attachment/');

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors overflow-hidden"
            >
                <div className="flex items-center gap-3 p-3">
                    {isImage ? (
                        <button onClick={() => setLightbox(true)} className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-700" title="Preview image">
                            <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                        </button>
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800">
                            <FileIcon fileType={file.fileType} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-200">{file.name}</p>
                        <p className="text-xs text-zinc-500">
                            {formatBytes(file.size)}
                            {file.uploadedBy?.fullName && ` · ${file.uploadedBy.fullName}`}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200" title="Download" onClick={(e) => e.stopPropagation()}>
                            <Download size={15} />
                        </a>
                        {canDelete && !confirmDelete && (
                            <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400" title="Delete">
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {confirmDelete && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-red-500/20 bg-red-500/5 p-2 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 ml-1"><AlertTriangle size={12} /> Confirm Delete</span>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-1 text-zinc-400 hover:text-white transition-colors">Cancel</button>
                                <button onClick={() => { setConfirmDelete(false); onDelete(file._id); }} className="text-[10px] px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors">Delete File</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Lightbox for images */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightbox(false)}>
                        <button className="absolute right-4 top-4 rounded-full bg-zinc-800 p-2 text-zinc-300 hover:text-white" onClick={() => setLightbox(false)}><X size={20} /></button>
                        <img src={file.url} alt={file.name} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};