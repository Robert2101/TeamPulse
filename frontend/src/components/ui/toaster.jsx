import { Toaster as Sonner } from "sonner";

// Mounted once at the root. Sonner brings stacking, hover-to-pause, swipe to dismiss and pausing
// while the tab is hidden; the app font is passed through so toasts match the interface.
export const Toaster = () => (
    <Sonner
        position="bottom-right"
        closeButton
        visibleToasts={4}
        offset={24}
        mobileOffset={16}
        toastOptions={{ style: { fontFamily: "var(--font-sans)" } }}
    />
);
