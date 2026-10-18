import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Paperclip, Loader2 } from "lucide-react";
import { toast } from "../../lib/toast";
import { cn } from "../../lib/utils";

const ACCEPT = {
    "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "text/plain": [".txt"],
};
const MAX_SIZE = 50 * 1024 * 1024;

const describeRejection = ({ file, errors }) => {
    const code = errors?.[0]?.code;
    if (code === "file-too-large") return `${file.name} is larger than 50 MB.`;
    if (code === "file-invalid-type") return `${file.name} isn't a supported file type.`;
    if (code === "too-many-files") return "Attach one file at a time.";
    return `${file.name} couldn't be added.`;
};

export const FileDropZone = ({ onFilesDropped, multiple = true, uploading = false, compact = false }) => {
    const [rejection, setRejection] = useState("");

    const onDrop = useCallback(
        (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                setRejection("");
                onFilesDropped(acceptedFiles);
            }
        },
        [onFilesDropped]
    );

    const onDropRejected = useCallback((rejections) => {
        const message = rejections.slice(0, 2).map(describeRejection).join(" ");
        setRejection(message);
        if (compact) toast.error("File not attached", message);
    }, [compact]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: ACCEPT,
        multiple,
        maxSize: MAX_SIZE,
        disabled: uploading,
    });

    if (compact) {
        return (
            <div
                {...getRootProps({
                    role: "button",
                    "aria-label": uploading ? "Uploading attachment" : "Attach a file",
                    title: "Attach a file (max 50 MB)",
                })}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
            >
                <input {...getInputProps()} />
                {uploading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Paperclip size={18} aria-hidden="true" />}
            </div>
        );
    }

    return (
        <div>
            <div
                {...getRootProps({ role: "button", "aria-label": "Upload files: drag and drop, or press to browse" })}
                className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                    isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50",
                    uploading && "cursor-not-allowed opacity-60"
                )}
            >
                <input {...getInputProps()} />
                {uploading
                    ? <Loader2 size={22} className="mb-2 animate-spin text-indigo-600" aria-hidden="true" />
                    : <Upload size={22} className={cn("mb-2", isDragActive ? "text-indigo-600" : "text-gray-500")} aria-hidden="true" />}
                <p className="text-sm font-medium text-gray-800">
                    {uploading ? "Uploading…" : isDragActive ? "Drop files to upload" : <>Drag files here, or <span className="text-indigo-700 underline underline-offset-2">browse</span></>}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                    Images, PDF, Word, Excel or TXT · up to 50 MB
                </p>
            </div>
            {rejection && <p role="alert" className="mt-2 text-xs text-red-700">{rejection}</p>}
        </div>
    );
};
