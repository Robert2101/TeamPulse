import { useState } from "react";
import { LayoutDashboard, FolderKanban, ListChecks, MessageSquare, Activity, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: ListChecks, label: "My Tasks", path: "/tasks" },
    { icon: MessageSquare, label: "AI Assistant", path: "/ai-chat" },
    { icon: Activity, label: "Audit Log", path: "/activity" },
];

export const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const location = useLocation();
    const { user, logout } = useStore();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const isAdmin = user?.role?.roleName === 'Admin';
    const isManager = user?.role?.roleName === 'Project Manager';

    const filteredMenuItems = menuItems.filter(item => {
        if (item.path === '/tasks' && isAdmin) return false;
        if (item.path === '/activity' && !isAdmin && !isManager) return false;
        return true;
    });

    const handleConfirmLogout = () => {
        setShowLogoutModal(false);
        logout();
    };

    return (
        <>
            {/*  FIX: Added dynamic width and transition */}
            <aside className={`flex h-screen flex-col border-r border-gray-200/60 bg-gray-50/50 backdrop-blur-xl transition-[width] duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"}`}>

                {/* Logo Section */}
                <div className={`flex h-16 shrink-0 items-center ${isCollapsed ? "justify-center" : "justify-between px-6"}`}>
                    <div className={`flex items-center gap-2 ${isCollapsed ? "hidden" : "flex"}`}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="h-3 w-3 rounded-full bg-gray-900" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-gray-900 truncate">TeamPulse</span>
                    </div>

                    {/*  NEW: The Collapse/Expand Button */}
                    <button
                        onClick={toggleSidebar}
                        className={`text-gray-500 hover:text-gray-900 transition-colors ${isCollapsed ? "mt-2" : ""}`}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 space-y-1 px-3 py-4 overflow-x-hidden overflow-y-auto">
                    {!isCollapsed && <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Menu</div>}

                    {filteredMenuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} className="block relative" title={isCollapsed ? item.label : ""}>
                                {isActive && (
                                    <div
                                       
                                        className="absolute inset-0 rounded-lg bg-gray-100 border border-gray-200"
                                       
                                    />
                                )}
                                <div className={`relative z-10 flex items-center rounded-lg px-3 py-2 transition-colors ${isActive ? "text-gray-900 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-white border-gray-200 font-medium"} ${isCollapsed ? "justify-center" : "justify-start"}`}>
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className={isActive ? "text-gray-900 shrink-0" : "text-gray-400 shrink-0"} />
                                        {/*  FIX: Hide label when collapsed */}
                                        {!isCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom User Profile & Settings Section */}
                <div className="shrink-0 border-t border-gray-200/60 p-4 flex flex-col items-center">
                    <Link to="/settings" className={`group flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-white cursor-pointer ${isCollapsed ? "justify-center w-full" : "w-full"}`} title="Settings">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-gray-700 overflow-hidden">
                            {user?.profilePicture ? (
                                <img src={user.profilePicture} alt={user.fullName} className="h-full w-full object-cover" />
                            ) : (
                                user?.fullName?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>

                        {!isCollapsed && (
                            <>
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <span className="truncate text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">{user?.fullName}</span>
                                    <span className="truncate text-xs text-gray-400">{user?.role?.roleName || 'Member'}</span>
                                </div>
                                <Settings size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
                            </>
                        )}
                    </Link>

                    <button
                        onClick={() => setShowLogoutModal(true)}
                        title="Log out"
                        className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors ${isCollapsed ? "justify-center w-full" : "w-full"}`}
                    >
                        <LogOut size={16} className="shrink-0" />
                        {!isCollapsed && <span>Log out</span>}
                    </button>
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            <>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-200/80 backdrop-blur-sm p-4">
                        <div
                           
                           
                           
                            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-2xl"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 mt-1">
                                    <LogOut size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Log out of TeamPulse?</h3>
                                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                                        Are you sure you want to log out? You will need to enter your credentials to access your dashboard again.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmLogout}
                                    className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-gray-900 hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        </>
    );
};