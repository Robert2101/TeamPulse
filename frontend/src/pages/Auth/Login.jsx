import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Login = () => {
    const [credentials, setCredentials] = useState({ emailAddress: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
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

    const loadDemo = (email, password) => {
        setCredentials({ emailAddress: email, password: password });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Sign in to TeamPulse</h2>
                </div>

                {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="emailAddress" className="text-gray-700 text-sm font-medium">Email Address</Label>
                        <Input
                            id="emailAddress"
                            type="email"
                            required
                            className="h-11 border-gray-300 bg-white text-gray-900 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                            value={credentials.emailAddress}
                            onChange={(e) => setCredentials({ ...credentials, emailAddress: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"} //  Dynamic Type
                                required
                                className="h-11 border-gray-300 bg-white text-gray-900 pr-10 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            />
                            {/*  Eye Button */}
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
                        {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
                    </button>
                </form>

                {/* Demo Credentials for Interview */}
                <div className="mt-8 pt-6">
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => loadDemo('tony@stark.com', 'password123')} className="text-xs py-2 px-3 rounded text-left bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-medium">
                             Tony (Admin)
                        </button>
                        <button type="button" onClick={() => loadDemo('peter@stark.com', 'password123')} className="text-xs py-2 px-3 rounded text-left bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-medium">
                             Peter (Dev)
                        </button>
                        <button type="button" onClick={() => loadDemo('bruce@wayne.com', 'password123')} className="text-xs py-2 px-3 rounded text-left bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-medium">
                             Bruce (Admin)
                        </button>
                        <button type="button" onClick={() => loadDemo('dick@wayne.com', 'password123')} className="text-xs py-2 px-3 rounded text-left bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-medium">
                             Dick (Dev)
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account? <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
};