import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Login = () => {
    const [credentials, setCredentials] = useState({ emailAddress: "", password: "" });
    const [showPassword, setShowPassword] = useState(false); //  Added State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const login = useStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(credentials);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
            <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
                    <p className="mt-2 text-sm text-zinc-400">Sign in to your TeamPulse workspace</p>
                </div>

                {error && <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="emailAddress" className="text-zinc-400">Email Address</Label>
                        <Input
                            id="emailAddress"
                            type="email"
                            required
                            className="h-12 border-zinc-800 bg-zinc-950/50 text-white focus-visible:ring-indigo-500"
                            value={credentials.emailAddress}
                            onChange={(e) => setCredentials({ ...credentials, emailAddress: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-zinc-400">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"} //  Dynamic Type
                                required
                                className="h-12 border-zinc-800 bg-zinc-950/50 text-white pr-10 focus-visible:ring-indigo-500"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            />
                            {/*  Eye Button */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-zinc-400">
                    Don't have an account? <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">Register here</Link>
                </p>
            </motion.div>
        </div>
    );
};