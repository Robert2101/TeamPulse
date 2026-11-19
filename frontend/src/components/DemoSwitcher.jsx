import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Avatar } from "./ui/avatar";
import { DEMO_COMPANY, DEMO_PERSONAS, personaFor } from "../lib/demo";
import { useSwitchPersona } from "../hooks/useSwitchPersona";
import { cn } from "../lib/utils";

const item = "flex cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-800 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-gray-100";

/** Demo workspace only: who you're signed in as, and a one-click sign-in as anyone else. */
export const DemoSwitcher = () => {
    const user = useStore((s) => s.user);
    const current = personaFor(user);
    const { switchTo, pending } = useSwitchPersona();
    if (!user?.workspace?.isDemo) return null;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    className="flex min-h-9 items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2.5 text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[border-color,transform] duration-150 ease-snappy hover:border-gray-300 active:scale-97 data-[state=open]:border-gray-300"
                    aria-label={`Demo workspace. Signed in as ${user.fullName}, ${user.role?.roleName}. Switch account`}
                >
                    {pending ? <Loader2 size={20} className="animate-spin text-gray-500" aria-hidden="true" /> : <Avatar name={user.fullName} size="xs" />}
                    <span className="hidden text-gray-500 lg:inline">Viewing as</span>
                    <span className="max-w-[9rem] truncate font-medium text-gray-900">{user.fullName?.split(" ")[0]}</span>
                    <span className="hidden rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 sm:inline">{user.role?.roleName}</span>
                    <ChevronDown size={14} className="text-gray-500" aria-hidden="true" />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 w-[min(22rem,calc(100vw-2rem))] origin-(--radix-dropdown-menu-content-transform-origin) rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.3)] duration-150 ease-snappy data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                    <DropdownMenu.Label className="px-2.5 pb-2 pt-1.5 text-xs leading-relaxed text-gray-500">
                        The shared demo of {DEMO_COMPANY}, a sample company. Sign in as:
                    </DropdownMenu.Label>
                    <DropdownMenu.Group>
                        {DEMO_PERSONAS.map((p) => {
                            const isCurrent = p.persona === current?.persona;
                            return (
                                <DropdownMenu.Item key={p.persona} disabled={isCurrent} onSelect={() => switchTo(p.persona)} className={cn(item, isCurrent && "bg-gray-50")}>
                                    <Avatar name={p.name} size="sm" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium text-gray-900">{p.name}</span>
                                        <span className="block truncate text-xs text-gray-500">{p.role} · {p.title}</span>
                                    </span>
                                    {isCurrent && <Check size={16} className="text-indigo-600" aria-label="Current" />}
                                </DropdownMenu.Item>
                            );
                        })}
                    </DropdownMenu.Group>
                    <p className="px-2.5 pb-1.5 pt-2 text-xs text-gray-500">Other visitors use these accounts too. The data resets every night.</p>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
};
