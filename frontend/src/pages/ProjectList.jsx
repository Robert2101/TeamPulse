import { CreateProjectModal } from "../components/CreateProjectModal";
import { useStore } from "../store/useStore";
import api from "../lib/axios";
import { FolderKanban, UserCircle, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../components/ui/avatar";
import { ProjectStatusBadge } from "../components/ui/badges";
import { formatCurrency, formatDate } from "../lib/format";
import { card } from "../lib/styles";
import { cn } from "../lib/utils";

const ProjectSkeleton = () => (
    <div className={cn(card, "animate-pulse p-6")} aria-hidden="true">
        <div className="h-5 w-2/3 rounded bg-gray-200" />
        <div className="mt-4 h-3 w-full rounded bg-gray-100" />
        <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
        <div className="mt-8 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
        </div>
    </div>
);

export const ProjectList = () => {
    const { projects, projectsLoaded, user } = useStore();
    const isAdmin = user?.role?.roleName === 'Admin';
    const canCreateProject = user?.role?.manageProjects || isAdmin;

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                        {isAdmin ? "All projects" : "My projects"}
                    </h1>
                    <p className="mt-2 text-gray-600">
                        {isAdmin
                            ? "Every project in your workspace, newest first."
                            : "Projects you manage or contribute to."}
                    </p>
                </div>
                {canCreateProject && <CreateProjectModal api={api} />}
            </div>

            {!projectsLoaded ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading projects">
                    {[0, 1, 2].map((i) => <ProjectSkeleton key={i} />)}
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                        <FolderKanban size={22} aria-hidden="true" />
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">No projects yet</h2>
                    <p className="mt-1 max-w-sm text-sm text-gray-600">
                        {canCreateProject
                            ? "Create your first project to start a board, assign tasks and invite your team."
                            : "When a project manager adds you to a project, it will appear here."}
                    </p>
                    {canCreateProject && <div className="mt-6"><CreateProjectModal api={api} /></div>}
                </div>
            ) : (
                <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => {
                        const pm = typeof project.projectManager === "object" ? project.projectManager : null;
                        const team = (project.assignedTeamMembers || []).filter((m) => typeof m === "object");
                        const displayTeam = team.slice(0, 3);
                        const extraTeamCount = team.length - displayTeam.length;
                        const deadline = project.endDate || project.dueDate;

                        return (
                            <li key={project._id} className="min-w-0">
                                <Link
                                    to={`/project/${project._id}`}
                                    className={cn(card, "group flex h-full flex-col p-6 transition-[border-color,box-shadow] duration-150 hover:border-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]")}
                                >
                                    {/* Top Section: Title & Badges */}
                                    <div className="mb-3 flex items-start justify-between gap-4">
                                        <h2 className="line-clamp-2 min-w-0 text-lg font-semibold leading-snug text-gray-900 wrap-anywhere">
                                            {project.projectName}
                                        </h2>
                                        <ProjectStatusBadge status={project.projectStatus} />
                                    </div>
                                    <p className="line-clamp-2 min-h-10 text-sm text-gray-600 wrap-anywhere">
                                        {project.projectDescription || <span className="italic text-gray-500">No description</span>}
                                    </p>

                                    {/* Middle Section: PM & Team */}
                                    <div className="mt-auto pt-6"><div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Avatar name={pm?.fullName} src={pm?.profilePicture} />
                                            <div className="flex min-w-0 flex-col">
                                                <span className="text-xs text-gray-600">Manager</span>
                                                <span className="truncate text-sm font-medium text-gray-900">{pm?.fullName || "Unassigned"}</span>
                                            </div>
                                        </div>

                                        {/* Overlapping Team Avatars */}
                                        {team.length > 0 && (
                                            <div className="flex shrink-0 -space-x-2" aria-label={`${team.length} team member${team.length === 1 ? "" : "s"}`}>
                                                {displayTeam.map((member) => (
                                                    <Avatar key={member._id} name={member.fullName} src={member.profilePicture} size="sm" ring />
                                                ))}
                                                {extraTeamCount > 0 && (
                                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700 ring-2 ring-white">
                                                        +{extraTeamCount}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div></div>

                                    {/* Bottom Section: Meta details */}
                                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                                            {project.budget ? (
                                                <span className="tabular font-medium text-gray-800" title="Budget">
                                                    {formatCurrency(project.budget)}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <UserCircle size={14} aria-hidden="true" />
                                                    {project.clientName || "Internal"}
                                                </span>
                                            )}
                                            {deadline && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} aria-hidden="true" />
                                                    <span>Due {formatDate(deadline)}</span>
                                                </span>
                                            )}
                                        </div>
                                        <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700" />
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
