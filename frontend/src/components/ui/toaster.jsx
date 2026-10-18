import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TONES = {
    success: { icon: CheckCircle2, className: "text-emerald-600" },
    error: { icon: AlertCircle, className: "text-red-600" },
    info: { icon: Info, className: "text-indigo-600" },
};

export const Toaster = () => {
    const { toasts, dismiss } = useToastStore();

    return (
        <div
            aria-live="polite"
            aria-relevant="additions"
            className="pointer-events-none fixed inset-x-4 bottom-4 z-[200] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6"
        >
            {toasts.map((t) => {
                const { icon: Icon, className } = TONES[t.tone] || TONES.info;
                return (
                    <div
                        key={t.id}
                        role={t.tone === "error" ? "alert" : "status"}
                        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                    >
                        <Icon size={18} className={cn("mt-0.5 shrink-0", className)} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{t.title}</p>
                            {t.description && <p className="mt-0.5 text-sm text-gray-600 break-words">{t.description}</p>}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="-m-1 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            aria-label="Dismiss notification"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
