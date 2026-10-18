import { useCallback, useEffect, useRef } from "react";
import { gsap, useGSAP, EASE_OUT, EASE_IN, prefersReducedMotion } from "../../lib/motion";
import { useStore } from "../../store/useStore";
import { TaskHeader } from "./TaskHeader";
import { TaskDescription } from "./TaskDescription";
import { TaskAttachments } from "./TaskAttachments";
import { TaskChat } from "./TaskChat";

const idOf = (v) => (v && typeof v === "object" ? v._id : v)?.toString();

export const TaskDetailsModal = ({ task, project, onClose, socket, canMoveTasks, onStatusChange, onTaskUpdated, onTaskDeleted }) => {
    const { user } = useStore();
    const panelRef = useRef(null);
    const overlayRef = useRef(null);
    const closingRef = useRef(false);
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    // Slide in from the right; reduced motion keeps only the fade.
    useGSAP(() => {
        const reduced = prefersReducedMotion();
        gsap.from(overlayRef.current, { opacity: 0, duration: 0.2, ease: "power1.out" });
        gsap.from(panelRef.current, reduced
            ? { opacity: 0, duration: 0.2 }
            : { xPercent: 8, opacity: 0, duration: 0.45, ease: EASE_OUT });
    });

    // Exit is quicker than entrance, then the parent unmounts the panel.
    const requestClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        const reduced = prefersReducedMotion();
        gsap.to(overlayRef.current, { opacity: 0, duration: 0.18, ease: EASE_IN });
        gsap.to(panelRef.current, {
            ...(reduced ? {} : { xPercent: 6 }),
            opacity: 0,
            duration: 0.2,
            ease: EASE_IN,
            onComplete: () => onCloseRef.current(),
        });
    }, []);

    // --- RBAC PERMISSIONS ---
    const isAdmin = user?.role?.roleName === 'Admin';
    const isProjectManager = idOf(project?.projectManager) === idOf(user?._id);
    const canAssignMembers = isAdmin || isProjectManager;

    // Dialog behaviour: Escape closes, background scroll is locked, focus moves in and is restored on close.
    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            // Let inline editors (comment edit, selects) handle their own Escape first.
            if (e.defaultPrevented) return;
            requestClose();
        };
        document.addEventListener("keydown", onKey);
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        panelRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        };
    }, [requestClose]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div ref={overlayRef} className="absolute inset-0 bg-gray-950/40" onClick={requestClose} aria-hidden="true" />

            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-dialog-title"
                tabIndex={-1}
                className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-[-16px_0_48px_-16px_rgba(15,23,42,0.35)] outline-none sm:rounded-l-2xl"
            >
                {/* Header Section */}
                <TaskHeader
                    task={task}
                    project={project}
                    canAssignMembers={canAssignMembers}
                    canMoveTasks={canMoveTasks}
                    canDelete={canAssignMembers}
                    onStatusChange={onStatusChange}
                    onTaskUpdated={onTaskUpdated}
                    onTaskDeleted={onTaskDeleted}
                    onClose={requestClose}
                />

                {/* Body: stacked on small screens, split on large */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
                    {/* Left: Task Details + Attachments */}
                    <div className="space-y-8 border-b border-gray-200 bg-gray-50 p-5 sm:p-8 lg:w-[40%] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                        <TaskDescription task={task} />
                        <TaskAttachments
                            task={task}
                            socket={socket}
                            user={user}
                            isAdmin={isAdmin}
                        />
                    </div>

                    {/* Right: Real-time Comments */}
                    <div className="flex min-h-[70dvh] flex-col bg-white lg:min-h-0 lg:w-[60%]">
                        <TaskChat
                            task={task}
                            project={project}
                            socket={socket}
                            user={user}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
