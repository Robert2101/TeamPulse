import { useEffect, useRef } from "react";

const isTyping = (target) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Global keyboard shortcuts. `bindings` maps a key to a handler: "mod+k" (⌘ on macOS, Ctrl elsewhere),
 * or a single key like "/" or "c" that is ignored while the user is typing in a field.
 */
export const useHotkeys = (bindings, enabled = true) => {
    const ref = useRef(bindings);
    useEffect(() => { ref.current = bindings; });

    useEffect(() => {
        if (!enabled) return undefined;
        const onKeyDown = (event) => {
            if (event.defaultPrevented) return;
            const mod = event.metaKey || event.ctrlKey;
            const key = event.key.toLowerCase();
            for (const [combo, handler] of Object.entries(ref.current)) {
                const wantsMod = combo.startsWith("mod+");
                const comboKey = wantsMod ? combo.slice(4) : combo;
                if (key !== comboKey || wantsMod !== mod || event.altKey) continue;
                if (!wantsMod && (isTyping(event.target) || event.shiftKey)) continue;
                event.preventDefault();
                handler(event);
                return;
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [enabled]);
};

export const MOD_LABEL = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl ";
