import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useLocation, Outlet } from "react-router-dom";
import { useStore } from "../store/useStore";
import api from "../lib/axios";

export const DashboardLayout = ({ children }) => {
    const { projects, setProjects, projectsLoaded } = useStore();

    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (projectsLoaded) return;
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects");
                setProjects(response.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchProjects();
    }, [projectsLoaded, setProjects]);

    const location = useLocation();
    // Extract the current path to make a sleek breadcrumb
    const pathName = location.pathname.replace('/', '');
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
        <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100">
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />

            <main className="flex flex-1 flex-col min-w-0 overflow-y-auto">
                {/* Minimalist Top Bar */}
                <header className="flex h-16 shrink-0 items-center gap-2 px-8 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <span>Workspace</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-900">{capitalizedPath}</span>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 px-8 pb-12 pt-6">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};