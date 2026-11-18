import { toast as sonner } from "sonner";

// App-wide toast API (title + optional description). Rendered by <Toaster /> in components/ui/toaster.
export const toast = {
    success: (title, description) => sonner.success(title, { description }),
    error: (title, description) => sonner.error(title, { description, duration: 7000 }),
    info: (title, description) => sonner.info(title, { description }),
    promise: (promise, messages) => sonner.promise(promise, messages),
    dismiss: (id) => sonner.dismiss(id),
};
