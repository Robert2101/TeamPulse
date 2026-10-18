import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";

const SIZES = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-7 w-7 text-[11px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
    xl: "h-24 w-24 text-2xl",
};

export const Avatar = ({ name, src, size = "md", className, ring = false }) => {
    const [failed, setFailed] = useState(false);
    return (
        <span
            className={cn(
                "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gray-100 font-semibold text-gray-700",
                ring ? "ring-2 ring-white" : "border border-gray-200",
                SIZES[size],
                className
            )}
            title={name || undefined}
        >
            {src && !failed ? (
                <img src={src} alt={name ? `${name}'s avatar` : ""} className="h-full w-full object-cover" onError={() => setFailed(true)} />
            ) : (
                <span aria-hidden={!!name}>{getInitials(name)}</span>
            )}
        </span>
    );
};
