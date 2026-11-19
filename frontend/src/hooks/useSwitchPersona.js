import { useState } from "react";
import { useStore } from "../store/useStore";
import { toast } from "../lib/toast";
import { errorMessage } from "../lib/format";
import { DEMO_PASSWORD, DEMO_PERSONAS } from "../lib/demo";

/** Demo only: signs in as another demo account, in place (a real login). */
export const useSwitchPersona = () => {
    const login = useStore((s) => s.login);
    const [pending, setPending] = useState(null);

    const switchTo = async (persona) => {
        const p = DEMO_PERSONAS.find((x) => x.persona === persona);
        setPending(persona);
        try {
            await login({ emailAddress: p.email, password: DEMO_PASSWORD });
            toast.success(`Signed in as ${p.name}`, `${p.role}. ${p.sees}`);
        } catch (err) {
            toast.error("Couldn't switch accounts", errorMessage(err));
        } finally {
            setPending(null);
        }
    };

    return { switchTo, pending };
};
