import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../store/useStore";
import { btn } from "../lib/styles";

export const NotFound = () => {
    const { user } = useStore();
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-6 text-center">
            <p className="font-mono text-sm font-medium text-indigo-600">404</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">This page doesn't exist</h1>
            <p className="mt-3 max-w-md text-gray-600">
                The link may be broken, or the page may have been moved. Check the address or head back to familiar ground.
            </p>
            <Link to={user ? "/projects" : "/"} className={`${btn.primary} mt-8`}>
                <ArrowLeft size={16} aria-hidden="true" />
                {user ? "Back to projects" : "Back to home"}
            </Link>
        </main>
    );
};
