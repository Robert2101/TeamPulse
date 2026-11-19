import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, UserRound } from "lucide-react";
import { CommandDialog, Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut } from "./ui/command";
import { useStore } from "../store/useStore";
import api from "../lib/axios";
import { visibleNav } from "../lib/navigation";
import { TASK_STATUS_DOT, taskKey } from "../lib/taskMeta";
import { DEMO_PERSONAS, personaFor } from "../lib/demo";
import { useSwitchPersona } from "../hooks/useSwitchPersona";
import { cn } from "../lib/utils";

/**
 * ⌘K: jump to any page, project or task you can see, switch demo persona, or sign out.
 * Tasks are fetched when the palette opens and only listed once you type.
 */
export const CommandPalette = () => {
    const { user, projects, commandOpen, setCommandOpen, logout } = useStore();
    const navigate = useNavigate();
    const { switchTo } = useSwitchPersona();
    const [search, setSearch] = useState("");
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        if (!commandOpen) return undefined;
        let cancelled = false;
        api.get("/tasks/overview").then((res) => { if (!cancelled) setTasks(res.data); }).catch(() => {});
        return () => { cancelled = true; };
    }, [commandOpen]);

    const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p._id, p])), [projects]);
    const current = personaFor(user);

    const run = (action) => {
        setCommandOpen(false);
        setSearch("");
        action();
    };

    return (
        <CommandDialog open={commandOpen} onOpenChange={(open) => { setCommandOpen(open); if (!open) setSearch(""); }}>
            <Command loop>
                <CommandInput value={search} onValueChange={setSearch} placeholder="Search pages, projects and tasks…" />
                <CommandList>
                    <CommandEmpty>Nothing matches “{search}”.</CommandEmpty>

                    {search.trim() && tasks.length > 0 && (
                        <CommandGroup heading="Tasks">
                            {tasks.map((task) => {
                                const project = projectById[task.projectReference];
                                const key = taskKey(task, project);
                                return (
                                    <CommandItem
                                        key={task._id}
                                        value={`${key ?? ""} ${task.taskName} ${task._id}`}
                                        keywords={[project?.projectName ?? "", task.taskStatus]}
                                        onSelect={() => run(() => navigate(`/project/${task.projectReference}?task=${task._id}`))}
                                    >
                                        <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[task.taskStatus])} aria-hidden="true" />
                                        {key && <span className="w-14 shrink-0 tabular text-xs text-gray-500">{key}</span>}
                                        <span className="min-w-0 flex-1 truncate">{task.taskName}</span>
                                        <span className="hidden shrink-0 text-xs text-gray-500 sm:block">{project?.projectName}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    )}

                    <CommandGroup heading="Go to">
                        {visibleNav(user).map((item) => (
                            <CommandItem key={item.path} value={`page ${item.label}`} onSelect={() => run(() => navigate(item.path))}>
                                <item.icon size={16} className="text-gray-500" aria-hidden="true" />
                                {item.label}
                            </CommandItem>
                        ))}
                        <CommandItem value="page settings profile" onSelect={() => run(() => navigate("/settings"))}>
                            <Settings size={16} className="text-gray-500" aria-hidden="true" />
                            Settings
                        </CommandItem>
                    </CommandGroup>

                    {projects.length > 0 && (
                        <CommandGroup heading="Projects">
                            {projects.map((project) => (
                                <CommandItem key={project._id} value={`project ${project.key ?? ""} ${project.projectName}`} onSelect={() => run(() => navigate(`/project/${project._id}`))}>
                                    <span className="flex h-5 min-w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 tabular text-[11px] font-medium text-gray-600">{project.key ?? "—"}</span>
                                    <span className="min-w-0 flex-1 truncate">{project.projectName}</span>
                                    <CommandShortcut>{project.projectStatus}</CommandShortcut>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {user?.workspace?.isDemo && (
                        <CommandGroup heading="Demo: view as">
                            {DEMO_PERSONAS.filter((p) => p.persona !== current?.persona).map((p) => (
                                <CommandItem key={p.persona} value={`view as ${p.name} ${p.role}`} onSelect={() => run(() => switchTo(p.persona))}>
                                    <UserRound size={16} className="text-gray-500" aria-hidden="true" />
                                    <span className="flex-1">{p.name}</span>
                                    <CommandShortcut>{p.role}</CommandShortcut>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandGroup heading="Account">
                        <CommandItem value="sign out log out" onSelect={() => run(logout)}>
                            <LogOut size={16} className="text-gray-500" aria-hidden="true" />
                            Sign out
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
};
