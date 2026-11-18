import { cn } from "@/lib/utils";

/** TeamPulse mark: one heartbeat on an ink tile. */
export const LogoMark = ({ size = 32, className }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
        <rect width="32" height="32" rx="8" className="fill-gray-900" />
        <path d="M6 17h5l2.5-6 4 11 2.5-5H26" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
