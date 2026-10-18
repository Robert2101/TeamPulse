import { useState } from "react";
import { LayoutDashboard, FolderKanban, ListChecks, MessageSquare, Activity, Settings, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Avatar } from "./ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { btn } from "../lib/styles";
import { cn } from "../lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: ListChecks, label: "My Tasks", path: "/tasks" },
    { icon: MessageSquare, label: "AI Assistant", path: "/ai-chat" },
    { icon: Activity, label: "Audit Log", path: "/activity" },
];

const isActivePath = (pathname, path) =>
    pathname === path || (path === "/projects" && pathname.startsWith("/project/"));

/**
 * Navigation content shared by the desktop rail and the mobile drawer.
 * `mobile` renders the drawer variant (always expanded, with a close button).
 */
export const Sidebar = ({ isCollapsed = false, toggleSidebar, mobile = false, onClose }) => {
    const location = useLocation();
    const { user, logout } = useStore();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const collapsed = !mobile && isCollapsed;

    const isAdmin = user?.role?.roleName === 'Admin';
    const isManager = user?.role?.roleName === 'Project Manager';

    // Mirror the route guards in App.jsx so we never link to a page that bounces the user.
    const filteredMenuItems = menuItems.filter(item => {
        if (item.path === '/dashboard' && !user?.role?.viewReports) return false;
        if (item.path === '/tasks' && isAdmin) return false;
        if (item.path === '/activity' && (!user?.role?.viewReports || (!isAdmin && !isManager))) return false;
        return true;
    });

    const handleConfirmLogout = () => {
        setShowLogoutModal(false);
        logout();
    };

    return (
        <>
            <div className={cn("flex h-full flex-col", mobile ? "w-72 bg-white" : "w-full")}>
                {/* Logo Section */}
                <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pl-5 pr-3")}>
                    {!collapsed && (
                        <Link to={user?.role?.viewReports ? "/dashboard" : "/projects"} onClick={onClose} className="flex items-center gap-2.5 rounded-lg">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                            </span>
                            <span className="text-[17px] font-semibold tracking-tight text-gray-900">TeamPulse</span>
                        </Link>
                    )}

                    {mobile ? (
                        <button onClick={onClose} className={btn.icon} aria-label="Close navigation">
                            <X size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={toggleSidebar}
                            className={btn.icon}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            aria-expanded={!collapsed}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                        </button>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
                    <ul className="space-y-0.5">
                        {filteredMenuItems.map((item) => {
                            const isActive = isActivePath(location.pathname, item.path);
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={onClose}
                                        aria-current={isActive ? "page" : undefined}
                                        title={collapsed ? item.label : undefined}
                                        className={cn(
                                            "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                                            collapsed && "justify-center px-0",
                                            isActive
                                                ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-gray-200"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                        )}
                                    >
                                        <item.icon size={18} aria-hidden="true" className={cn("shrink-0", isActive ? "text-indigo-600" : "text-gray-500")} />
                                        <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Bottom User Profile & Settings Section */}
                <div className="shrink-0 space-y-1 border-t border-gray-200 p-3">
                    <Link
                        to="/settings"
                        onClick={onClose}
                        aria-current={location.pathname === "/settings" ? "page" : undefined}
                        className={cn(
                            "group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100",
                            collapsed && "justify-center",
                            location.pathname === "/settings" && "bg-white ring-1 ring-gray-200"
                        )}
                        title="Account settings"
                    >
                        <Avatar name={user?.fullName} src={user?.profilePicture} size="lg" />
                        {!collapsed && (
                            <>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-semibold text-gray-900">{user?.fullName}</span>
                                    <span className="truncate text-xs text-gray-600">{user?.role?.roleName || 'Member'}</span>
                                </span>
                                <Settings size={16} aria-hidden="true" className="shrink-0 text-gray-500 transition-colors group-hover:text-gray-800" />
                            </>
                        )}
                        {collapsed && <span className="sr-only">Account settings</span>}
                    </Link>

                    <button
                        onClick={() => setShowLogoutModal(true)}
                        title={collapsed ? "Log out" : undefined}
                        className={cn(
                            "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700",
                            collapsed && "justify-center px-0"
                        )}
                    >
                        <LogOut size={16} aria-hidden="true" className="shrink-0" />
                        <span className={collapsed ? "sr-only" : undefined}>Log out</span>
                    </button>
                </div>
            </div>

            {/* Logout Confirmation */}
            <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
                <DialogContent className="gap-0 p-6 sm:max-w-md">
                    <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <LogOut size={18} aria-hidden="true" />
                        </span>
                        <div className="pr-6">
                            <DialogTitle className="text-lg font-semibold leading-tight text-gray-900">Log out of TeamPulse?</DialogTitle>
                            <DialogDescription className="mt-2 text-sm leading-relaxed text-gray-600">
                                You'll need your email and password to get back into your workspace.
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button onClick={() => setShowLogoutModal(false)} className={btn.ghost}>Cancel</button>
                        <button onClick={handleConfirmLogout} className={btn.danger} autoFocus>Log out</button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
