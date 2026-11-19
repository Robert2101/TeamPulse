import { useEffect } from "react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";

/** Loads every visible project's 14-day pulse once per session (it resets when the person changes). */
export const useProjectPulse = () => {
    const { pulse, setPulse, user } = useStore();

    useEffect(() => {
        if (!user || pulse) return;
        let cancelled = false;
        api.get("/projects/pulse")
            .then((res) => { if (!cancelled) setPulse({ days: res.data.days, byProject: res.data.pulse }); })
            .catch(() => { if (!cancelled) setPulse({ days: [], byProject: {} }); });
        return () => { cancelled = true; };
    }, [user, pulse, setPulse]);

    return pulse;
};
