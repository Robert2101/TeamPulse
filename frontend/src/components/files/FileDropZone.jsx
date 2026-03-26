import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileUp } from "lucide-react";

const ACCEPT = {
    "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "text/plain": [".txt"],
};

export const FileDropZone = ({ onFilesDropped, multiple = true, uploading = false, compact = false }) => {
    const onDrop = useCallback(
        (acceptedFiles) => {
            if (acceptedFiles.length > 0) onFilesDropped(acceptedFiles);
        },
        [onFilesDropped]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPT,
        multiple,
        maxSize: 50 * 1024 * 1024,
        disabled: uploading,
    });

    if (compact) {
        return (
            <div
                {...getRootProps()}
                className="cursor-pointer text-zinc-400 hover:text-indigo-400 transition-colors"
                title="Attach file"
            >
                <input {...getInputProps()} />
                <FileUp size={18} />
            </div>
        );
    }

    return (
        <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer
                ${isDragActive
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-700 bg-zinc-900/30 hover:border-indigo-500/50 hover:bg-zinc-900/50"
                }
                ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            `}
        >
            <input {...getInputProps()} />
            <Upload size={24} className={`mb-2 ${isDragActive ? "text-indigo-400" : "text-zinc-500"}`} />
            <p className="text-sm font-medium text-zinc-300">
                {isDragActive ? "Drop files here" : "Drag & drop files, or click to select"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
                Images, PDFs, Word, Excel, TXT — max 50 MB
            </p>
            {uploading && (
                <p className="mt-2 text-xs font-medium text-indigo-400 animate-pulse">Uploading…</p>
            )}
        </div>
    );
};
