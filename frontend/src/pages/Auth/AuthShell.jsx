import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

// Shared frame for the sign-in and sign-up screens.
export const AuthShell = ({ title, subtitle, children, footer, wide = false }) => (
    <div className="flex min-h-dvh flex-col bg-gray-50 px-4 py-8 sm:py-12">
        <Link to="/" className="mx-auto mb-8 flex items-center gap-2.5 rounded-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-gray-900">TeamPulse</span>
        </Link>
        <main className={cn("mx-auto w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_12px_32px_-16px_rgba(15,23,42,0.12)] sm:p-8", wide ? "max-w-xl" : "max-w-md")}>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
            </div>
            {children}
        </main>
        {footer && <p className="mt-6 text-center text-sm text-gray-600">{footer}</p>}
    </div>
);
