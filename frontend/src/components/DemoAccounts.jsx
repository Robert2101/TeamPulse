import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Avatar } from "./ui/avatar";
import { errorMessage } from "../lib/format";
import { cn } from "../lib/utils";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../lib/demo";

/** Signs straight into a demo account. `compact` renders the two-column grid used on the sign-in page. */
export const DemoAccounts = ({ compact = false, className }) => {
    const login = useStore((s) => s.login);
    const navigate = useNavigate();
    const [pending, setPending] = useState(null);
    const [error, setError] = useState("");

    const signIn = async (account) => {
        setPending(account.email);
        setError("");
        try {
            await login({ emailAddress: account.email, password: DEMO_PASSWORD });
            navigate("/dashboard");
        } catch (err) {
            setError(errorMessage(err, "The demo is unavailable right now. Please try again in a moment."));
            setPending(null);
        }
    };

    return (
        <div className={className}>
            <ul className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
                {DEMO_ACCOUNTS.map((account) => (
                    <li key={account.email}>
                        <button
                            type="button"
                            onClick={() => signIn(account)}
                            disabled={pending !== null}
                            aria-label={`Sign in as ${account.name}, ${account.role} at ${account.workspace}`}
                            className={cn(
                                "group flex h-full w-full items-center gap-3 rounded-xl border border-gray-200 bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] hover:border-gray-300 hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.2)] disabled:opacity-60",
                                compact ? "px-3 py-2.5" : "px-4 py-3"
                            )}
                        >
                            <Avatar name={account.name} size={compact ? "sm" : "md"} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-gray-900">{compact ? account.name.split(" ")[0] : account.name}</span>
                                <span className="block truncate text-xs text-gray-600">
                                    {account.role}
                                    {account.workspace !== DEMO_ACCOUNTS[0].workspace && (compact ? `, ${account.workspace.split(" ")[0]}` : ` · ${account.workspace}`)}
                                </span>
                                {!compact && <span className="mt-1 block text-xs leading-snug text-gray-500">{account.sees}</span>}
                            </span>
                            {pending === account.email
                                ? <Loader2 size={16} className="shrink-0 animate-spin text-gray-500" aria-hidden="true" />
                                : <ArrowRight size={16} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700" aria-hidden="true" />}
                        </button>
                    </li>
                ))}
            </ul>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        </div>
    );
};
