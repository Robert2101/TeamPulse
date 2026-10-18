const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export const formatDate = (value, { short = false } = {}) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    if (short && date.getFullYear() === new Date().getFullYear()) return shortDateFormatter.format(date);
    return dateFormatter.format(date);
};

export const isOverdue = (value, status) => {
    if (!value || status === "Done") return false;
    const due = new Date(value);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
};

export const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
        notation: amount >= 1_000_000 ? "compact" : "standard",
    }).format(amount);
};

export const relativeTime = (value) => {
    const date = new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (Number.isNaN(seconds)) return "";
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 172800) return "Yesterday";
    return formatDate(date);
};

export const getInitials = (name) => {
    if (!name || typeof name !== "string") return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return parts.map((p) => [...p][0]).join("").slice(0, 2).toUpperCase();
};

export const firstName = (name) => (name || "").trim().split(/\s+/)[0] || "";

// Pull a readable message out of an axios/fetch error, mapping the status codes users actually hit.
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") => {
    const status = err?.response?.status;
    const serverMessage = err?.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!err?.response && err?.request) return "Can't reach the server. Check your connection and try again.";
    if (status === 403) return "You don't have permission to do that.";
    if (status === 404) return "That item no longer exists.";
    if (status === 429) return "Too many requests. Wait a moment and try again.";
    return fallback;
};
