import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Lock, RotateCw, Search, MessageSquare, Paperclip } from "lucide-react";

import api from "../lib/axios";
import { useSocket } from "../hooks/useSocket";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { ManageTeamModal } from "../components/ManageTeamModal";
import { EditProjectModal } from "../components/EditProjectModal";
import { useStore } from "../store/useStore";
import { Avatar } from "../components/ui/avatar";
import { PriorityBadge, ProjectStatusBadge } from "../components/ui/badges";
import { TASK_STATUS_DOT } from "../lib/taskMeta";
import { formatDate, isOverdue, errorMessage } from "../lib/format";
import { toast } from "../lib/toast";
import { btn, field } from "../lib/styles";
import { cn } from "../lib/utils";
import { gsap, Flip, prefersReducedMotion } from "../lib/motion";

// The task panel and the files tab bring in the comment thread and react-dropzone: load them on demand.
const loadTaskPanel = () => import("../components/TaskModal/TaskDetailsModal");
const TaskDetailsModal = lazy(() => loadTaskPanel().then((m) => ({ default: m.TaskDetailsModal })));
const AssetsHub = lazy(() => import("./AssetsHub").then((m) => ({ default: m.AssetsHub })));

const COLUMNS = ["To-Do", "In-Progress", "Review", "Done"];
const idOf = (v) => (v && typeof v === "object" ? v._id : v)?.toString();

const BoardSkeleton = () => (
    <div className="animate-pulse" role="status" aria-label="Loading board">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-4 h-8 w-2/3 max-w-md rounded bg-gray-200" />
        <div className="mt-3 h-4 w-1/2 max-w-sm rounded bg-gray-100" />
        <div className="mt-10 flex gap-4 overflow-hidden">
            {COLUMNS.map((c) => (
                <div key={c} className="h-96 w-72 shrink-0 rounded-2xl bg-gray-100" />
            ))}
        </div>
    </div>
);

export const ProjectBoard = () => {
    const { id } = useParams();
    const { user, updateProjectInStore } = useStore();

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    // The open task lives in the URL (?task=<id>): links can be shared and survive a refresh.
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedTaskId = searchParams.get("task");
    const setTaskParam = useCallback((taskId, onlyIfOpen) => {
        setSearchParams((prev) => {
            if (onlyIfOpen && prev.get("task") !== onlyIfOpen) return prev;
            const next = new URLSearchParams(prev);
            if (taskId) next.set("task", taskId); else next.delete("task");
            return next;
        }, { replace: true });
    }, [setSearchParams]);
    const openTask = (taskId) => setTaskParam(taskId);
    const closeTask = useCallback(() => setTaskParam(null), [setTaskParam]);
    const [activeTab, setActiveTab] = useState("kanban"); // "kanban" | "assets"
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const [query, setQuery] = useState("");
    const [onlyMine, setOnlyMine] = useState(false);

    // FLIP: snapshot card positions right before tasks change, then animate from there after React re-renders.
    const boardRef = useRef(null);
    const flipStateRef = useRef(null);
    const tasksRef = useRef(tasks);
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);
    // Warm the task panel chunk so the first card click opens instantly.
    useEffect(() => { loadTaskPanel(); }, []);

    const captureLayout = useCallback(() => {
        if (!boardRef.current || prefersReducedMotion()) return;
        flipStateRef.current = Flip.getState(boardRef.current.querySelectorAll("[data-flip-id]"));
    }, []);

    useLayoutEffect(() => {
        const state = flipStateRef.current;
        if (!state || !boardRef.current) return;
        flipStateRef.current = null;
        Flip.from(state, {
            targets: boardRef.current.querySelectorAll("[data-flip-id]"),
            duration: 0.45,
            ease: "power3.inOut",
            scale: false,
            onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }),
        });
    }, [tasks]);

    const fetchBoardData = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [projRes, tasksRes] = await Promise.all([
                api.get(`/projects/${id}`),
                api.get(`/tasks/project/${id}`)
            ]);
            setProject(projRes.data);
            setTasks(tasksRes.data);
        } catch (error) {
            console.error("Error fetching board data:", error);
            setLoadError(error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setProject(null);
        fetchBoardData();
    }, [fetchBoardData]);

    const socket = useSocket(id);

    // Merge a server copy of a task into local state without losing fields the update endpoint doesn't populate.
    const mergeTask = useCallback((incoming) => {
        setTasks(prev => prev.map(t => (t._id === incoming._id ? { ...t, ...incoming } : t)));
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onUpdated = (updatedTask) => {
            const current = tasksRef.current.find(t => t._id === updatedTask._id);
            if (current && current.taskStatus !== updatedTask.taskStatus) captureLayout();
            mergeTask(updatedTask);
        };
        const onCreated = (newTask) => {
            if (!tasksRef.current.some(t => t._id === newTask._id)) captureLayout();
            setTasks(prev => (prev.some(t => t._id === newTask._id) ? prev : [newTask, ...prev]));
        };
        const onDeleted = ({ taskId }) => {
            if (tasksRef.current.some(t => t._id === taskId)) captureLayout();
            setTasks(prev => prev.filter(t => t._id !== taskId));
            setTaskParam(null, taskId); // close the panel if it showed the deleted task
        };

        // Keep the discussion and attachment counts on cards live.
        const editIds = (taskId, key, edit) => setTasks(prev => prev.map(t => (t._id === taskId ? { ...t, [key]: edit((t[key] || []).map(idOf)) } : t)));
        const onComment = ({ taskId, comment }) => editIds(taskId, "comments", (ids) => (ids.includes(comment._id) ? ids : [...ids, comment._id]));
        const onCommentDeleted = (commentId) => setTasks(prev => prev.map(t => (
            (t.comments || []).some(c => idOf(c) === commentId) ? { ...t, comments: t.comments.filter(c => idOf(c) !== commentId) } : t
        )));
        const onFile = ({ entityType, entityId, file }) => {
            if (entityType === "Task") editIds(idOf(entityId), "attachments", (ids) => (ids.includes(file._id) ? ids : [...ids, file._id]));
        };
        const onFileDeleted = ({ entityType, entityId, fileId }) => {
            if (entityType === "Task") editIds(idOf(entityId), "attachments", (ids) => ids.filter(fid => fid !== fileId));
        };

        const handlers = {
            "task-updated": onUpdated, "task-created": onCreated, "task-deleted": onDeleted,
            "new-comment": onComment, "comment-deleted": onCommentDeleted,
            "file-uploaded": onFile, "file-deleted": onFileDeleted,
        };
        Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
        return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
    }, [socket, mergeTask, captureLayout, setTaskParam]);

    // A link to a task that is gone (deleted, or never on this board) closes with an explanation.
    useEffect(() => {
        if (loading || !selectedTaskId || tasks.some(t => t._id === selectedTaskId)) return;
        toast.info("That task isn't on this board", "It may have been deleted, or the link points to another project.");
        closeTask();
    }, [loading, selectedTaskId, tasks, closeTask]);

    // --- FRONTEND RBAC (mirrors backend checks) ---
    const isAdmin = user?.role?.roleName === 'Admin';
    const isProjectManager = !!project && idOf(project.projectManager) === idOf(user?._id);
    const isMember = !!project && (project.assignedTeamMembers || []).some(m => idOf(m) === idOf(user?._id));
    const canManageTeam = isAdmin || isProjectManager;
    const canEditProject = isAdmin || isProjectManager;
    const canCreateTask = isAdmin || isProjectManager || (user?.role?.manageTasks && isMember);
    // PATCH /tasks requires the manageTasks permission plus project membership.
    const canMoveTasks = isAdmin || isProjectManager || (!!user?.role?.manageTasks && isMember);

    const changeStatus = useCallback(async (taskId, newStatus) => {
        let previous;
        captureLayout();
        setTasks(prev => {
            previous = prev.find(t => t._id === taskId);
            return prev.map(t => (t._id === taskId ? { ...t, taskStatus: newStatus } : t));
        });
        try {
            const res = await api.patch(`/tasks/${taskId}`, { taskStatus: newStatus });
            if (res.data?.task) mergeTask(res.data.task);
        } catch (error) {
            if (previous) {
                captureLayout();
                setTasks(prev => prev.map(t => (t._id === taskId ? previous : t)));
            }
            toast.error("Couldn't move the task", errorMessage(error));
        }
    }, [mergeTask, captureLayout]);

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add("opacity-50");
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove("opacity-50");
        setDragOverColumn(null);
    };

    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        setDragOverColumn(null);
        const taskId = e.dataTransfer.getData("taskId");
        const taskToMove = tasks.find(t => t._id === taskId);
        if (!taskToMove || taskToMove.taskStatus === newStatus) return;
        changeStatus(taskId, newStatus);
    };

    const handleTeamUpdated = (updated) => {
        setProject(updated);
        updateProjectInStore(updated);
    };

    if (loading && !project) return <BoardSkeleton />;

    if (loadError || !project) {
        const status = loadError?.response?.status;
        const title = status === 403 ? "You don't have access to this project" : status === 404 ? "Project not found" : "Couldn't load this project";
        const body = status === 403
            ? "Ask the project manager to add you to the team."
            : status === 404
                ? "It may have been deleted, or the link is wrong."
                : errorMessage(loadError, "Something went wrong while loading the board.");
        return (
            <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Lock size={20} aria-hidden="true" /></span>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                <p className="mt-2 text-gray-600">{body}</p>
                <div className="mt-6 flex gap-2">
                    <Link to="/projects" className={btn.secondary}><ArrowLeft size={16} aria-hidden="true" /> All projects</Link>
                    {status !== 403 && status !== 404 && (
                        <button onClick={fetchBoardData} className={btn.primary}><RotateCw size={16} aria-hidden="true" /> Try again</button>
                    )}
                </div>
            </div>
        );
    }

    const selectedTask = tasks.find(t => t._id === selectedTaskId) || null;

    const needle = query.trim().toLowerCase();
    const filtering = Boolean(needle) || onlyMine;
    const visibleTasks = tasks.filter(t =>
        (!onlyMine || idOf(t.assignee) === idOf(user?._id)) &&
        (!needle || t.taskName.toLowerCase().includes(needle) || (t.taskDescription || "").toLowerCase().includes(needle))
    );

    return (
        <div className="relative flex flex-col">
            {/* Board Header */}
            <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <Link to="/projects" className="mb-3 inline-flex items-center gap-1.5 rounded text-sm text-gray-600 transition-colors hover:text-gray-900">
                        <ArrowLeft size={16} aria-hidden="true" /> All projects
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h1 className="line-clamp-3 min-w-0 text-2xl font-semibold tracking-tight text-gray-900 wrap-anywhere sm:text-3xl">{project.projectName}</h1>
                        <ProjectStatusBadge status={project.projectStatus} />
                    </div>
                    {project.projectDescription && (
                        <p className="mt-2 line-clamp-3 max-w-3xl text-gray-600 wrap-anywhere">{project.projectDescription}</p>
                    )}
                </div>

                {/* --- CONDITIONAL RENDERING CONTROL PANEL --- */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEditProject && (
                        <EditProjectModal api={api} project={project} onProjectUpdated={(p) => { setProject(p); updateProjectInStore(p); }} />
                    )}

                    {canManageTeam && (
                        <ManageTeamModal project={project} onTeamUpdated={handleTeamUpdated} />
                    )}

                    {canCreateTask && activeTab === "kanban" && (
                        <CreateTaskModal
                            api={api}
                            project={project}
                            onTaskCreated={(newTask) => { captureLayout(); setTasks(prev => (prev.some(t => t._id === newTask._id) ? prev : [newTask, ...prev])); }}
                        />
                    )}
                </div>
            </div>

            {/* Tab Bar */}
            <div role="tablist" aria-label="Project views" className="mb-6 flex gap-1 border-b border-gray-200">
                {["kanban", "assets"].map((tab) => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                            activeTab === tab ? "border-indigo-600 text-gray-900" : "border-transparent text-gray-600 hover:text-gray-900"
                        )}
                    >
                        {tab === "kanban" ? `Board · ${tasks.length}` : "Assets"}
                    </button>
                ))}
            </div>

            {!canMoveTasks && activeTab === "kanban" && (
                <p className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <Lock size={14} aria-hidden="true" /> You can view this board. Only team members with task permissions can move cards.
                </p>
            )}

            {activeTab === "kanban" && tasks.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <label className="relative min-w-48 flex-1 sm:max-w-xs">
                        <span className="sr-only">Filter tasks</span>
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape" && query) { e.preventDefault(); setQuery(""); } }}
                            placeholder="Filter by title or description"
                            className={cn(field, "h-9 pl-9")}
                        />
                    </label>
                    <div role="group" aria-label="Whose tasks to show" className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        {[["Everyone", false], ["Mine", true]].map(([text, mine]) => (
                            <button
                                key={text}
                                type="button"
                                aria-pressed={onlyMine === mine}
                                onClick={() => setOnlyMine(mine)}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    onlyMine === mine ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                )}
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                    {filtering && (
                        <p className="flex items-center gap-2 text-sm text-gray-600" aria-live="polite">
                            <span className="tabular">{visibleTasks.length} of {tasks.length}</span>
                            <button type="button" onClick={() => { setQuery(""); setOnlyMine(false); }} className="font-medium text-indigo-700 underline-offset-4 hover:underline">Clear</button>
                        </p>
                    )}
                </div>
            )}

            {/* Tab Content */}
            {activeTab === "assets" ? (
                <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-100" role="status" aria-label="Loading files" />}>
                    <AssetsHub project={project} socket={socket} />
                </Suspense>
            ) : (
                <div ref={boardRef} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:snap-none md:px-0">
                    {COLUMNS.map((status) => {
                        const columnTasks = visibleTasks.filter(task => task.taskStatus === status);
                        const isTarget = dragOverColumn === status;

                        return (
                            <section
                                key={status}
                                aria-label={`${status}, ${columnTasks.length} task${columnTasks.length === 1 ? "" : "s"}`}
                                onDragOver={canMoveTasks ? (e) => { e.preventDefault(); setDragOverColumn(status); } : undefined}
                                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null); }}
                                onDrop={canMoveTasks ? (e) => handleDrop(e, status) : undefined}
                                className={cn(
                                    "flex w-[85vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl border bg-gray-100/70 p-3 transition-colors sm:w-75 xl:w-auto xl:min-w-60 xl:max-w-none xl:flex-1",
                                    isTarget ? "border-indigo-400 bg-indigo-50/60" : "border-gray-200"
                                )}
                            >
                                <div className="mb-3 flex items-center justify-between px-1">
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                        <span className={cn("h-2 w-2 rounded-full", TASK_STATUS_DOT[status])} aria-hidden="true" />
                                        {status}
                                    </h2>
                                    <span className="tabular rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                                        {columnTasks.length}
                                    </span>
                                </div>

                                <ul className="flex min-h-36 flex-1 flex-col gap-2">
                                    {columnTasks.map((task) => {
                                        const overdue = isOverdue(task.dueDate, task.taskStatus);
                                        const assignee = typeof task.assignee === "object" ? task.assignee : null;
                                        const commentCount = task.comments?.length || 0;
                                        const fileCount = task.attachments?.length || 0;
                                        return (
                                            <li
                                                key={task._id}
                                                data-flip-id={task._id}
                                                draggable={canMoveTasks}
                                                onDragStart={canMoveTasks ? (e) => handleDragStart(e, task._id) : undefined}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => openTask(task._id)}
                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTask(task._id); } }}
                                                    aria-label={`${task.taskName}. ${task.priority} priority${task.dueDate ? `, due ${formatDate(task.dueDate)}` : ""}${commentCount ? `, ${commentCount} comment${commentCount === 1 ? "" : "s"}` : ""}. Open details`}
                                                    className={cn(
                                                        "group rounded-xl border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[border-color,box-shadow] duration-150 hover:border-gray-300 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.12)]",
                                                        canMoveTasks ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                                    )}
                                                >
                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                        <PriorityBadge priority={task.priority} />
                                                        {assignee && <Avatar name={assignee.fullName} src={assignee.profilePicture} size="xs" />}
                                                    </div>
                                                    <h3 className="line-clamp-3 text-sm font-medium leading-snug text-gray-900 wrap-anywhere">{task.taskName}</h3>
                                                    {(task.dueDate || commentCount > 0 || fileCount > 0) && (
                                                        <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-600">
                                                            {task.dueDate && (
                                                                <span className={cn("flex items-center gap-1.5", overdue && "font-medium text-red-700")}>
                                                                    <Calendar size={13} aria-hidden="true" />
                                                                    {overdue ? "Overdue · " : ""}{formatDate(task.dueDate, { short: true })}
                                                                </span>
                                                            )}
                                                            <span className="ml-auto flex items-center gap-2.5">
                                                                {commentCount > 0 && (
                                                                    <span className="tabular flex items-center gap-1" title={`${commentCount} comment${commentCount === 1 ? "" : "s"}`}>
                                                                        <MessageSquare size={13} aria-hidden="true" />{commentCount}
                                                                    </span>
                                                                )}
                                                                {fileCount > 0 && (
                                                                    <span className="tabular flex items-center gap-1" title={`${fileCount} attachment${fileCount === 1 ? "" : "s"}`}>
                                                                        <Paperclip size={13} aria-hidden="true" />{fileCount}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                    {columnTasks.length === 0 && (
                                        <li className={cn(
                                            "pointer-events-none flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm",
                                            isTarget ? "border-indigo-300 text-indigo-700" : "border-gray-300 text-gray-600"
                                        )}>
                                            {filtering ? "No matching tasks" : canMoveTasks ? "Drop tasks here" : "No tasks"}
                                        </li>
                                    )}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}

            {selectedTask && (
                <Suspense fallback={null}>
                <TaskDetailsModal
                    task={selectedTask}
                    project={project}
                    onClose={closeTask}
                    socket={socket}
                    canMoveTasks={canMoveTasks}
                    onStatusChange={(status) => changeStatus(selectedTask._id, status)}
                    onTaskUpdated={mergeTask}
                    onTaskDeleted={(taskId) => { captureLayout(); setTasks(prev => prev.filter(t => t._id !== taskId)); closeTask(); }}
                />
                </Suspense>
            )}
        </div>
    );
};
