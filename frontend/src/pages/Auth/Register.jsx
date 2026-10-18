import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, Building, KeyRound, AlertCircle } from "lucide-react";
import api from "../../lib/axios";
import { AuthShell } from "./AuthShell";
import { btn, field, label } from "../../lib/styles";
import { errorMessage } from "../../lib/format";
import { cn } from "../../lib/utils";

const MODES = [
    { id: "join", label: "Join a workspace", icon: KeyRound },
    { id: "create", label: "Create a workspace", icon: Building },
];

export const Register = () => {
    const [mode, setMode] = useState("join");
    const [formData, setFormData] = useState({
        fullName: "",
        emailAddress: "",
        password: "",
        workspaceName: "",
        inviteCode: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const update = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post('/auth/signup', {
                ...formData,
                fullName: formData.fullName.trim(),
                emailAddress: formData.emailAddress.trim(),
                workspaceName: formData.workspaceName.trim(),
                inviteCode: formData.inviteCode.trim(),
                isCreatingWorkspace: mode === "create"
            });
            navigate("/login", { state: { registered: true } });
        } catch (err) {
            setError(errorMessage(err, "Couldn't create your account. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            wide
            title="Create your account"
            subtitle="Join your team with an invite code, or start a new workspace as its admin."
            footer={<>Already have an account? <Link to="/login" className="font-medium text-indigo-700 underline-offset-4 hover:underline">Sign in</Link></>}
        >
            <div role="tablist" aria-label="Account type" className="mb-8 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
                {MODES.map(({ id, label: text, icon }) => {
                    const ModeIcon = icon;
                    return (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={mode === id}
                        onClick={() => { setMode(id); setError(""); }}
                        className={cn(
                            "flex min-h-10 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors",
                            mode === id ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <ModeIcon size={15} aria-hidden="true" className={mode === id ? "text-indigo-600" : undefined} />
                        <span className="truncate">{text}</span>
                    </button>
                    );
                })}
            </div>

            {error && (
                <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "create" ? (
                    <div>
                        <label htmlFor="workspaceName" className={label}>Workspace or company name</label>
                        <input
                            id="workspaceName"
                            type="text"
                            required
                            maxLength={80}
                            autoComplete="organization"
                            placeholder="e.g. Northwind Studio"
                            className={`${field} h-11`}
                            value={formData.workspaceName}
                            onChange={update("workspaceName")}
                        />
                        <p className="mt-1.5 text-xs text-gray-600">You'll be the admin and get an invite code to share with your team.</p>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="inviteCode" className={label}>Invite code</label>
                        <input
                            id="inviteCode"
                            type="text"
                            required
                            maxLength={6}
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            placeholder="A8X2L5"
                            className={`${field} h-11 font-mono uppercase tracking-[0.2em]`}
                            value={formData.inviteCode}
                            onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase().replace(/\s/g, "") })}
                        />
                        <p className="mt-1.5 text-xs text-gray-600">Ask your workspace admin for the 6-character code. New members join as Stakeholders.</p>
                    </div>
                )}

                <hr className="border-gray-200" />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="fullName" className={label}>Full name</label>
                        <input id="fullName" type="text" required maxLength={80} autoComplete="name" className={`${field} h-11`} value={formData.fullName} onChange={update("fullName")} />
                    </div>
                    <div>
                        <label htmlFor="emailAddress" className={label}>Email address</label>
                        <input id="emailAddress" type="email" required autoComplete="email" inputMode="email" className={`${field} h-11`} value={formData.emailAddress} onChange={update("emailAddress")} />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className={label}>Password</label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="new-password"
                            className={`${field} h-11 pr-11`}
                            value={formData.password}
                            onChange={update("password")}
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
                    {loading
                        ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Creating account…</>
                        : mode === "create" ? "Create workspace" : "Join workspace"}
                </button>
            </form>
        </AuthShell>
    );
};
