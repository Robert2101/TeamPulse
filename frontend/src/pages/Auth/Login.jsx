import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { btn, field, label } from "../../lib/styles";
import { errorMessage } from "../../lib/format";

const DEMO_ACCOUNTS = [
    { name: "Tony", role: "Admin", email: "tony@stark.com" },
    { name: "Peter", role: "Dev", email: "peter@stark.com" },
    { name: "Bruce", role: "Admin", email: "bruce@wayne.com" },
    { name: "Dick", role: "Dev", email: "dick@wayne.com" },
];

export const Login = () => {
    const [credentials, setCredentials] = useState({ emailAddress: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const login = useStore((state) => state.login);
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    const justRegistered = location.state?.registered;
    const sessionExpired = params.get("expired") === "1";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login({ ...credentials, emailAddress: credentials.emailAddress.trim() });
            navigate("/dashboard");
        } catch (err) {
            setError(errorMessage(err, "Couldn't sign you in. Check your email and password."));
        } finally {
            setLoading(false);
        }
    };

    const loadDemo = (email) => {
        setCredentials({ emailAddress: email, password: "password123" });
        setError("");
    };

    return (
        <AuthShell
            title="Sign in to TeamPulse"
            footer={<>Don't have an account? <Link to="/register" className="font-medium text-indigo-700 underline-offset-4 hover:underline">Create one</Link></>}
        >
            {justRegistered && !error && (
                <div role="status" className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Account created. Sign in with your new credentials.
                </div>
            )}
            {sessionExpired && !justRegistered && !error && (
                <div role="status" className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Your session expired. Sign in again to continue.
                </div>
            )}
            {error && (
                <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
                <div>
                    <label htmlFor="emailAddress" className={label}>Email address</label>
                    <input
                        id="emailAddress"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        className={`${field} h-11`}
                        value={credentials.emailAddress}
                        aria-invalid={!!error || undefined}
                        onChange={(e) => setCredentials({ ...credentials, emailAddress: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="password" className={label}>Password</label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            className={`${field} h-11 pr-11`}
                            value={credentials.password}
                            aria-invalid={!!error || undefined}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={loading} className={`${btn.primary} h-11 w-full`}>
                    {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Signing in…</> : "Sign in"}
                </button>
            </form>

            {/* Demo Credentials for Interview */}
            <div className="mt-8 border-t border-gray-200 pt-6">
                <p className="mb-3 text-xs font-medium text-gray-600">Try a demo account</p>
                <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acct) => (
                        <button
                            key={acct.email}
                            type="button"
                            onClick={() => loadDemo(acct.email)}
                            className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-left text-sm text-gray-800 transition-colors hover:border-gray-300 hover:bg-white"
                        >
                            <span className="truncate font-medium">{acct.name}</span>
                            <span className="shrink-0 text-xs text-gray-600">{acct.role}</span>
                        </button>
                    ))}
                </div>
            </div>
        </AuthShell>
    );
};
