import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { errorMessage } from "../lib/format";
import { DEMO_PASSWORD, DEMO_PERSONAS } from "../lib/demo";

/** Signs in to a shared demo account (a real login with its email and password) and opens the overview. */
export const useDemoSignIn = () => {
    const login = useStore((s) => s.login);
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

    const signInAs = async (persona) => {
        const account = DEMO_PERSONAS.find((p) => p.persona === persona);
        setPending(persona);
        setError("");
        try {
            await login({ emailAddress: account.email, password: DEMO_PASSWORD });
            navigate("/dashboard");
        } catch (err) {
            setError(errorMessage(err, "Couldn't sign in to the demo. Please try again in a moment."));
            setPending(null);
        }
    };

    return { signInAs, pending, slow, error };
};
