import { useState } from "react";
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-8 text-center flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
                        <Building size={24} />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Setup Account</h2>
                    <p className="mt-2 text-sm text-gray-500">Join TeamPulse and collaborate instantly</p>
                </div>

                <div className="mb-8 flex rounded-lg bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => { setMode("join"); setError(""); }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold tracking-wide transition-all ${
                            mode === "join" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <KeyRound size={14} /> Join Workspace
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode("create"); setError(""); }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold tracking-wide transition-all ${
                            mode === "create" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <Building size={14} /> Create Workspace
                    </button>
                </div>

                {error && <div className="mb-6 flex items-center justify-center rounded-lg bg-red-50 py-3 text-sm font-medium text-red-600 border border-red-100">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {mode === "create" ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="workspaceName" className="text-sm font-medium text-gray-700">Workspace / Company Name</Label>
                            <Input
                                id="workspaceName"
                                type="text"
                                required={mode === "create"}
                                placeholder="E.g., Netflix Inc."
                                className="h-11 border-gray-300 bg-white text-gray-900 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                                value={formData.workspaceName}
                                onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <Label htmlFor="inviteCode" className="text-sm font-medium text-gray-700">Invite Code</Label>
                            <Input
                                id="inviteCode"
                                type="text"
                                required={mode === "join"}
                                placeholder="E.g., A8X2L5"
                                className="h-11 border-gray-300 bg-white text-gray-900 font-mono uppercase tracking-widest focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                                value={formData.inviteCode}
                                onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                            />
                        </div>
                    )}

                    <hr className="my-6 border-gray-200" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</Label>
                            <Input
                                id="fullName"
                                type="text"
                                required
                                className="h-11 border-gray-300 bg-white text-gray-900 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emailAddress" className="text-sm font-medium text-gray-700">Email Address</Label>
                            <Input
                                id="emailAddress"
                                type="email"
                                required
                                className="h-11 border-gray-300 bg-white text-gray-900 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                                value={formData.emailAddress}
                                onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className="h-11 border-gray-300 bg-white text-gray-900 pr-10 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 font-medium text-gray-900 transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Already have an account? <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
};
