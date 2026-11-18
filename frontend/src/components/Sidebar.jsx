import { useState } from "react";
import { Settings, LogOut, PanelLeftClose, PanelLeftOpen, X, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Avatar } from "./ui/avatar";
import { LogoMark } from "./ui/logo";
import { Pulse } from "./ui/pulse";
import { Kbd } from "./ui/kbd";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { visibleNav, isActivePath } from "../lib/navigation";
import { MOD_LABEL } from "../hooks/useHotkeys";
import { btn } from "../lib/styles";
import { cn } from "../lib/utils";

const rowBase = "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150";
const rowIdle = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
const rowActive = "bg-white font-medium text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-gray-200";

/**
 * Navigation shared by the desktop rail and the mobile drawer.
 * `mobile` renders the drawer variant (always expanded, with a close button).
 */
export const Sidebar = ({ isCollapsed = false, toggleSidebar, mobile = false, onClose }) => {
    const location = useLocation();
    const { user, logout, projects, pulse, setCommandOpen } = useStore();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const collapsed = !mobile && isCollapsed;
    const isDemo = user?.workspace?.isDemo;

    const openSearch = () => {
        onClose?.();
        setCommandOpen(true);
    };

    return (
        <>
            <div className={cn("flex h-full flex-col", mobile ? "w-72 bg-gray-50" : "w-full")}>
                {/* Workspace */}
                <div className={cn("flex h-16 shrink-0 items-center gap-2", collapsed ? "justify-center px-2" : "pl-4 pr-2")}>
                    {!collapsed && (
                        <Link to={user?.role?.viewReports ? "/dashboard" : "/projects"} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg">
                            <LogoMark size={30} />
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-gray-900">{user?.workspace?.workspaceName || "TeamPulse"}</span>
                                <span className="block truncate text-xs text-gray-500">{isDemo ? "Demo workspace" : "TeamPulse"}</span>
                            </span>
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

                {/* Search / command palette */}
                <div className={cn("shrink-0 pb-2", collapsed ? "px-2" : "px-3")}>
                    <button
                        onClick={openSearch}
                        title={collapsed ? `Search (${MOD_LABEL}K)` : undefined}
                        className={cn(
                            "flex h-9 w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,color,transform] duration-150 ease-snappy hover:border-gray-300 hover:text-gray-700 active:scale-98",
                            collapsed ? "justify-center px-0" : "px-2.5"
                        )}
                    >
                        <Search size={15} aria-hidden="true" className="shrink-0" />
                        <span className={collapsed ? "sr-only" : "flex-1 text-left"}>Search</span>
                        {!collapsed && <Kbd>{MOD_LABEL}K</Kbd>}
                    </button>
                </div>

                <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
                    <ul className="flex flex-col gap-0.5">
                        {visibleNav(user).map((item) => {
                            const isActive = isActivePath(location.pathname, item.path) && !location.pathname.startsWith("/project/");
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={onClose}
                                        aria-current={isActive ? "page" : undefined}
                                        title={collapsed ? item.label : undefined}
                                        className={cn(rowBase, collapsed && "justify-center px-0", isActive ? rowActive : rowIdle)}
                                    >
                                        <item.icon size={17} aria-hidden="true" className={cn("shrink-0", isActive ? "text-indigo-600" : "text-gray-500")} />
                                        <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Projects, each with its 14-day pulse */}
                    {projects.length > 0 && (
                        <div className="mt-6">
                            {!collapsed && <h2 className="mb-1.5 px-2.5 text-xs font-medium text-gray-500">Your projects</h2>}
                            <ul className="flex flex-col gap-0.5">
                                {projects.map((project) => {
                                    const path = `/project/${project._id}`;
                                    const isActive = location.pathname === path;
                                    return (
                                        <li key={project._id}>
                                            <Link
                                                to={path}
                                                onClick={onClose}
                                                aria-current={isActive ? "page" : undefined}
                                                title={collapsed ? project.projectName : undefined}
                                                className={cn(rowBase, "group", collapsed && "justify-center px-0", isActive ? rowActive : rowIdle)}
                                            >
                                                <span className={cn(
                                                    "flex h-5 min-w-8 shrink-0 items-center justify-center rounded-md px-1 font-mono text-[10.5px] font-medium",
                                                    isActive ? "bg-indigo-50 text-indigo-700" : "bg-gray-200/70 text-gray-600"
                                                )}>
                                                    {project.key ?? project.projectName?.slice(0, 3).toUpperCase()}
                                                </span>
                                                {!collapsed && (
                                                    <>
                                                        <span className="min-w-0 flex-1 truncate">{project.projectName}</span>
                                                        <Pulse values={pulse?.byProject?.[project._id]} width={34} height={14} active={isActive} />
                                                    </>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </nav>

                {/* Account */}
                <div className="shrink-0 border-t border-gray-200 p-3">
                    <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
                        <Link
                            to="/settings"
                            onClick={onClose}
                            aria-current={location.pathname === "/settings" ? "page" : undefined}
                            className={cn(
                                "group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-gray-100",
                                collapsed && "justify-center",
                                location.pathname === "/settings" && "bg-white ring-1 ring-gray-200"
                            )}
                            title="Account settings"
                        >
                            <Avatar name={user?.fullName} src={user?.profilePicture} size="md" />
                            {!collapsed && (
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-medium text-gray-900">{user?.fullName}</span>
                                    <span className="truncate text-xs text-gray-500">{user?.role?.roleName || "Member"}</span>
                                </span>
                            )}
                            {!collapsed && <Settings size={15} aria-hidden="true" className="shrink-0 text-gray-400 transition-colors group-hover:text-gray-700" />}
                            {collapsed && <span className="sr-only">Account settings</span>}
                        </Link>
                        <button onClick={() => setShowLogoutModal(true)} className={btn.icon} aria-label="Log out" title="Log out">
                            <LogOut size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Logout confirmation */}
            <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
                <DialogContent className="gap-0 p-6 sm:max-w-md">
                    <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <LogOut size={18} aria-hidden="true" />
                        </span>
                        <div className="pr-6">
                            <DialogTitle className="text-lg font-semibold leading-tight text-gray-900">
                                {isDemo ? "Leave the demo?" : "Log out of TeamPulse?"}
                            </DialogTitle>
                            <DialogDescription className="mt-2 text-sm leading-relaxed text-gray-600">
                                {isDemo
                                    ? "This private demo workspace is discarded when you leave. You can start a fresh one any time."
                                    : "This signs you out on every device. You'll need your email and password to get back in."}
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button onClick={() => setShowLogoutModal(false)} className={btn.ghost}>Cancel</button>
                        <button onClick={() => { setShowLogoutModal(false); logout(); }} className={btn.danger} autoFocus>
                            {isDemo ? "Leave demo" : "Log out"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
