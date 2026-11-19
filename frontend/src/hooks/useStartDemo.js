import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { errorMessage } from "../lib/format";

/** Starts a demo workspace as `persona`, reporting progress, and goes to the overview when ready. */
export const useStartDemo = () => {
    const startDemo = useStore((s) => s.startDemo);
    const navigate = useNavigate();
    const [pending, setPending] = useState(null);
    const [slow, setSlow] = useState(false);
    const [error, setError] = useState("");

    // A sleeping free-tier server can take a while to wake; say so instead of looking stuck.
    useEffect(() => {
        if (!pending) return undefined;
        const timer = setTimeout(() => setSlow(true), 3500);
        return () => { clearTimeout(timer); setSlow(false); };
    }, [pending]);

    const start = async (persona) => {
        setPending(persona);
        setError("");
        try {
            await startDemo(persona);
            navigate("/dashboard");
        } catch (err) {
            setError(errorMessage(err, "The demo couldn't start. Please try again in a moment."));
            setPending(null);
        }
    };

    return { start, pending, slow, error };
};

