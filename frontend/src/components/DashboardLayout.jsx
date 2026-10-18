import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useLocation, Outlet, Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import api from "../lib/axios";
import { btn } from "../lib/styles";
import { cn } from "../lib/utils";

const ROUTE_LABELS = {
    "/dashboard": "Overview",
    "/projects": "Projects",
    "/tasks": "My Tasks",
    "/ai-chat": "AI Assistant",
    "/activity": "Audit Log",
    "/settings": "Settings",
};

const readCollapsed = () => {
    try { return localStorage.getItem("tp:sidebar-collapsed") === "1"; } catch { return false; }
};

export const DashboardLayout = ({ children }) => {
    const { user, projects, setProjects, projectsLoaded } = useStore();
    const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (projectsLoaded) return;
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects");
                setProjects(response.data);
            } catch (err) {
                console.error(err);
                setProjects([]);
            }
        };
        fetchProjects();
    }, [projectsLoaded, setProjects]);

    useEffect(() => {
        try { localStorage.setItem("tp:sidebar-collapsed", isCollapsed ? "1" : "0"); } catch { /* storage unavailable */ }
    }, [isCollapsed]);

    // Mobile drawer: links close it via onClose; Escape closes it; page scroll is locked while open.
    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [drawerOpen]);

    let crumb = ROUTE_LABELS[location.pathname] || "Overview";
    let parent = null;
    if (location.pathname.startsWith("/project/")) {
        const projectId = location.pathname.split("/")[2];
        const project = projects.find(p => p._id === projectId);
        parent = { label: "Projects", to: "/projects" };
        crumb = project?.projectName || "Project";
    }

    return (
        <div className="flex h-dvh w-full bg-gray-50 text-gray-900">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-300 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
            >
                Skip to content
            </a>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden h-dvh shrink-0 border-r border-gray-200 bg-gray-50 transition-[width] duration-200 ease-out md:block",
                    isCollapsed ? "w-18" : "w-64"
                )}
            >
                <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(c => !c)} />
            </aside>

            {/* Mobile drawer */}
            <div className={cn("fixed inset-0 z-50 md:hidden", drawerOpen ? "visible" : "invisible")} aria-hidden={!drawerOpen}>
                <div
                    className={cn("absolute inset-0 bg-gray-950/40 transition-opacity duration-200", drawerOpen ? "opacity-100" : "opacity-0")}
                    onClick={() => setDrawerOpen(false)}
                />
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigation"
                    inert={drawerOpen ? undefined : ""}
                    className={cn(
                        "absolute inset-y-0 left-0 shadow-[8px_0_32px_-12px_rgba(15,23,42,0.3)] transition-transform duration-200 ease-out",
                        drawerOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <Sidebar mobile onClose={() => setDrawerOpen(false)} />
                </aside>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white/90 px-3 backdrop-blur md:h-16 md:px-8">
                    <button onClick={() => setDrawerOpen(true)} className={cn(btn.icon, "md:hidden")} aria-label="Open navigation" aria-expanded={drawerOpen}>
                        <Menu size={20} />
                    </button>
                    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                        <ol className="flex min-w-0 items-center gap-2 text-sm">
                            <li className="hidden shrink-0 text-gray-600 sm:block">{user?.workspace?.workspaceName || "Workspace"}</li>
                            <li className="hidden text-gray-500 sm:block" aria-hidden="true">/</li>
                            {parent && (
                                <>
                                    <li className="shrink-0"><Link to={parent.to} className="text-gray-600 hover:text-gray-900">{parent.label}</Link></li>
                                    <li className="text-gray-500" aria-hidden="true">/</li>
                                </>
                            )}
                            <li className="min-w-0 truncate font-medium text-gray-900" aria-current="page">{crumb}</li>
                        </ol>
                    </nav>
                </header>

                {/* Scrollable Content Area */}
                <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
                    <div className="px-4 py-6 md:px-8 md:py-8">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>
        </div>
    );
};
