import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useStore } from "../store/useStore";
import api from "../lib/axios";

export const DashboardLayout = ({ children }) => {
    const { projects, setProjects } = useStore();

    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects");
                setProjects(response.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchProjects();
    }, [setProjects]);

    // Extract the current path to make a sleek breadcrumb
    const pathName = window.location.pathname.replace('/', '');
    let capitalizedPath = pathName ? pathName.charAt(0).toUpperCase() + pathName.slice(1) : 'Overview';

    // check if it's a project path
    if (capitalizedPath.startsWith('Project/')) {
        const parts = capitalizedPath.split('/');
        if (parts.length > 1) {
             const projectId = parts[1];
             const project = projects.find(p => p._id === projectId);
             capitalizedPath = `Project / ${project ? project.projectName : projectId}`;
        }
    } else {
        capitalizedPath = capitalizedPath.replace('-', ' ');
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />

            <main className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
                {/* Subtle top glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-indigo-500/5 blur-[120px] pointer-events-none" />

                {/* Minimalist Top Bar */}
                <header className="flex h-16 shrink-0 items-center gap-2 px-8 z-10">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                        <span>Workspace</span>
                        <span>/</span>
                        <span className="text-zinc-200">{capitalizedPath}</span>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-12 pt-2 scroll-smooth">
                    {children}
                </div>
            </main>
        </div>
    );
};