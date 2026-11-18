import { LayoutDashboard, FolderKanban, ListChecks, MessageSquare, Activity } from "lucide-react";

// Who may open what. The sidebar, the command palette and the route guards in App.jsx all use these,
// and they mirror the API (the audit log is for Admins and Project Managers).
export const canSeeOverview = (user) => Boolean(user?.role?.viewReports);
export const canReadAuditLog = (user) => Boolean(user?.role?.viewReports) && ["Admin", "Project Manager"].includes(user?.role?.roleName);

export const NAV_ITEMS = [
    { label: "Overview", path: "/dashboard", icon: LayoutDashboard, allowed: canSeeOverview, shortcut: "G O" },
    { label: "My Tasks", path: "/tasks", icon: ListChecks },
    { label: "Projects", path: "/projects", icon: FolderKanban },
    { label: "AI Assistant", path: "/ai-chat", icon: MessageSquare },
    { label: "Audit Log", path: "/activity", icon: Activity, allowed: canReadAuditLog },
];

export const visibleNav = (user) => NAV_ITEMS.filter((item) => !item.allowed || item.allowed(user));

export const isActivePath = (pathname, path) =>
    pathname === path || (path === "/projects" && pathname.startsWith("/project/"));
