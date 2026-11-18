import { useState } from "react";
import { useStore } from "../store/useStore";
import { toast } from "../lib/toast";
import { errorMessage } from "../lib/format";
import { DEMO_PERSONAS } from "../lib/demo";

/** Switches the demo session to another persona of the same sandbox, in place. */
export const useSwitchPersona = () => {
    const switchPersona = useStore((s) => s.switchPersona);
    const [pending, setPending] = useState(null);

    const switchTo = async (persona) => {
        setPending(persona);
        try {
            await switchPersona(persona);
            const p = DEMO_PERSONAS.find((x) => x.persona === persona);
            toast.success(`You're now ${p?.name}`, `${p?.role}. ${p?.sees}`);
        } catch (err) {
            toast.error("Couldn't switch roles", errorMessage(err));
        } finally {
            setPending(null);
        }
    };

    return { switchTo, pending };
};
