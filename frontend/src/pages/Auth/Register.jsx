import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, Building, KeyRound } from "lucide-react";
import api from "../../lib/axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            await api.post('/auth/signup', {
                ...formData,
                isCreatingWorkspace: mode === "create"
            });
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to register");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
            <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-8 text-center flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 mb-4 border border-indigo-500/30 shadow-inner">
                        <Building size={24} />
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">Setup Account</h2>
                    <p className="mt-2 text-sm font-medium text-zinc-400">Join TeamPulse and collaborate instantly</p>
                </div>

                <div className="mb-8 flex rounded-xl border border-zinc-800/80 bg-[#0f0f11] p-1.5 shadow-inner">
                    <button
                        type="button"
                        onClick={() => { setMode("join"); setError(""); }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${
                            mode === "join" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow shadow-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        <KeyRound size={14} /> Join Workspace
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode("create"); setError(""); }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${
                            mode === "create" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow shadow-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        <Building size={14} /> Create Workspace
                    </button>
                </div>

                {error && <div className="mb-6 flex items-center justify-center rounded-xl bg-red-500/10 py-3 text-sm font-semibold text-red-400 border border-red-500/20 shadow-inner shadow-red-500/10">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {mode === "create" ? (
                        <div className="space-y-2">
                            <Label htmlFor="workspaceName" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Workspace / Company Name</Label>
                            <Input
                                id="workspaceName"
                                type="text"
                                required={mode === "create"}
                                placeholder="E.g., Netflix Inc."
                                className="h-14 rounded-xl border-zinc-800 bg-[#0a0a0a] px-5 text-white focus-visible:ring-emerald-500 shadow-inner transition-colors focus:bg-zinc-900/50"
                                value={formData.workspaceName}
                                onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="inviteCode" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Invite Code</Label>
                            <Input
                                id="inviteCode"
                                type="text"
                                required={mode === "join"}
                                placeholder="E.g., A8X2L5"
                                className="h-14 rounded-xl border-zinc-800 bg-[#0a0a0a] px-5 text-white font-mono uppercase tracking-widest focus-visible:ring-indigo-500 shadow-inner transition-colors focus:bg-zinc-900/50"
                                value={formData.inviteCode}
                                onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                            />
                        </div>
                    )}

                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-6" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name</Label>
                            <Input
                                id="fullName"
                                type="text"
                                required
                                className={`h-14 rounded-xl border-zinc-800 bg-[#0a0a0a] px-5 text-white shadow-inner transition-colors focus:bg-zinc-900/50 focus-visible:ring-${mode === 'create' ? 'emerald' : 'indigo'}-500`}
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emailAddress" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email Address</Label>
                            <Input
                                id="emailAddress"
                                type="email"
                                required
                                className={`h-14 rounded-xl border-zinc-800 bg-[#0a0a0a] px-5 text-white shadow-inner transition-colors focus:bg-zinc-900/50 focus-visible:ring-${mode === 'create' ? 'emerald' : 'indigo'}-500`}
                                value={formData.emailAddress}
                                onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className={`h-14 rounded-xl border-zinc-800 bg-[#0a0a0a] px-5 text-white shadow-inner transition-colors focus:bg-zinc-900/50 pr-12 focus-visible:ring-${mode === 'create' ? 'emerald' : 'indigo'}-500`}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 ${
                            mode === "create" 
                            ? "bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20" 
                            : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20"
                        }`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-zinc-500">
                    Already have an account? <Link to="/login" className="font-semibold text-indigo-400 hover:underline hover:text-indigo-300">Log in</Link>
                </p>
            </motion.div>
        </div>
    );
};
