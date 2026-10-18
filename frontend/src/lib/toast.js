import { create } from "zustand";

let nextId = 1;

export const useToastStore = create((set) => ({
    toasts: [],
    push: (toast) => {
        const id = nextId++;
        set((state) => ({ toasts: [...state.toasts.slice(-3), { id, tone: "info", ...toast }] }));
        setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), toast.duration ?? 5000);
        return id;
    },
    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
    success: (title, description) => useToastStore.getState().push({ tone: "success", title, description }),
    error: (title, description) => useToastStore.getState().push({ tone: "error", title, description, duration: 7000 }),
    info: (title, description) => useToastStore.getState().push({ tone: "info", title, description }),
};
