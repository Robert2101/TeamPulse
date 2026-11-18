import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// shadcn's Command (cmdk), adapted to this project: no InputGroup dependency, and the dialog opens
// with no animation, because a palette summoned many times a day should feel instant.

function Command({ className, ...props }) {
    return (
        <CommandPrimitive
            data-slot="command"
            className={cn("flex size-full flex-col overflow-hidden bg-white text-gray-900", className)}
            {...props}
        />
    );
}

function CommandDialog({ title = "Command palette", description = "Search for a page, project, task or action", children, className, ...props }) {
    return (
        <DialogPrimitive.Root {...props}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-gray-950/30" />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] outline-none",
                        className
                    )}
                >
                    <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
                    {children}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function CommandInput({ className, ...props }) {
    return (
        <div data-slot="command-input-wrapper" className="flex items-center gap-2.5 border-b border-gray-200 px-4">
            <Search size={16} className="shrink-0 text-gray-500" aria-hidden="true" />
            <CommandPrimitive.Input
                data-slot="command-input"
                className={cn("h-12 w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50", className)}
                {...props}
            />
        </div>
    );
}

function CommandList({ className, ...props }) {
    return (
        <CommandPrimitive.List
            data-slot="command-list"
            className={cn("max-h-[min(24rem,60vh)] scroll-py-2 overflow-y-auto overflow-x-hidden p-2 outline-none", className)}
            {...props}
        />
    );
}

function CommandEmpty({ className, ...props }) {
    return <CommandPrimitive.Empty data-slot="command-empty" className={cn("py-10 text-center text-sm text-gray-600", className)} {...props} />;
}

function CommandGroup({ className, ...props }) {
    return (
        <CommandPrimitive.Group
            data-slot="command-group"
            className={cn(
                "overflow-hidden pb-1 text-gray-900 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:pt-2.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-gray-500",
                className
            )}
            {...props}
        />
    );
}

function CommandSeparator({ className, ...props }) {
    return <CommandPrimitive.Separator data-slot="command-separator" className={cn("-mx-2 my-1 h-px bg-gray-100", className)} {...props} />;
}

function CommandItem({ className, ...props }) {
    return (
        <CommandPrimitive.Item
            data-slot="command-item"
            className={cn(
                "relative flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 text-sm text-gray-800 outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-gray-100 data-[selected=true]:text-gray-900 [&_svg]:shrink-0",
                className
            )}
            {...props}
        />
    );
}

function CommandShortcut({ className, ...props }) {
    return <span data-slot="command-shortcut" className={cn("ml-auto text-xs tracking-wide text-gray-500", className)} {...props} />;
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator };
