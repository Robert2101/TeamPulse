import { motion } from "framer-motion";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { useStore } from "../store/useStore";
import api from "../lib/axios";
import { Users, UserCircle, Calendar, DollarSign, ArrowRight } from "lucide-react";

export const ProjectList = () => {
    const { projects, user } = useStore();
    const isAdmin = user?.role?.roleName === 'Admin';
    const canCreateProject = user?.role?.manageProjects || isAdmin;

    // Helper to get initials for avatars
    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h3 className="text-3xl font-bold tracking-tight text-zinc-100">
                        {isAdmin ? "Organization Workspace" : "My Projects"}
                    </h3>
                    <p className="mt-2 text-zinc-400">
                        {isAdmin
                            ? "Enterprise directory of all active and past projects."
                            : "Projects you manage or contribute to."}
                    </p>
                </div>
                {canCreateProject && <CreateProjectModal api={api} />}
            </div>

            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-zinc-500 mb-4 shadow-inner">
                        <Users size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-300">No active projects</h3>
                    <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                        {canCreateProject ? "Create a new project to start organizing your team's workflow." : "You haven't been assigned to any projects yet."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project, index) => {
                        const pm = project.projectManager;
                        const team = project.assignedTeamMembers || [];
                        const displayTeam = team.slice(0, 3);
                        const extraTeamCount = team.length - 3;

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={project._id}
                                onClick={() => window.location.href = `/project/${project._id}`}
                                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-md transition-all hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer"
                            >
                                {/* Top Section: Title & Badges */}
                                <div>
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <h4 className="text-xl font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                                            {project.projectName}
                                        </h4>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${project.projectStatus === 'Active' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                                                project.projectStatus === 'Completed' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                                                    'border-zinc-700 bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {project.projectStatus || 'Active'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                                        {project.projectDescription}
                                    </p>
                                </div>

                                {/* Middle Section: PM & Team */}
                                <div className="mt-6 flex items-center justify-between border-t border-zinc-800/60 pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-zinc-950">
                                            {getInitials(pm?.fullName)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Manager</span>
                                            <span className="text-xs font-medium text-zinc-300">{pm?.fullName || "Unassigned"}</span>
                                        </div>
                                    </div>

                                    {/* Overlapping Team Avatars */}
                                    {team.length > 0 && (
                                        <div className="flex items-center">
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {displayTeam.map((member, i) => (
                                                    <div key={i} className="inline-block h-7 w-7 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center ring-2 ring-zinc-950 border border-zinc-700" title={member.fullName}>
                                                        {getInitials(member.fullName)}
                                                    </div>
                                                ))}
                                                {extraTeamCount > 0 && (
                                                    <div className="inline-block h-7 w-7 rounded-full bg-zinc-900 text-[10px] font-bold text-zinc-400 flex items-center justify-center ring-2 ring-zinc-950 border border-zinc-800">
                                                        +{extraTeamCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Section: Meta details */}
                                <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
                                    <div className="flex items-center gap-3">
                                        {project.budget ? (
                                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                <DollarSign size={14} />
                                                {project.budget.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <UserCircle size={14} />
                                                {project.clientName || "Internal"}
                                            </span>
                                        )}
                                        {project.dueDate && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(project.dueDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <ArrowRight size={16} className="text-zinc-600 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};