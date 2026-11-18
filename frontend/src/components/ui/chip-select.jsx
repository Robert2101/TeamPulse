import { Select } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A property picker shaped like a chip (status, priority, assignee): Radix Select underneath for
 * keyboard, typeahead and focus handling; the menu opens from its trigger.
 * options: [{ value, label, icon?, hint? }]; values must be non-empty strings.
 */
export const ChipSelect = ({ label, value, onValueChange, options, disabled, busy, className }) => {
    const selected = options.find((o) => o.value === value);
    return (
        <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
            <Select.Trigger
                aria-label={label}
                className={cn(
                    "group flex min-h-8 max-w-[15rem] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-900 outline-none transition-[border-color,background-color,transform] duration-150 ease-snappy hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-97 disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-gray-300 data-[state=open]:bg-gray-50",
                    busy && "opacity-70",
                    className
                )}
            >
                {selected?.icon}
                <span className="truncate">{selected?.label ?? "Choose"}</span>
                <ChevronDown size={13} className="-mr-0.5 text-gray-500" aria-hidden="true" />
            </Select.Trigger>
            <Select.Portal>
                <Select.Content
                    position="popper"
                    sideOffset={6}
                    align="start"
                    className="z-[60] max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)] duration-150 ease-snappy data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                    <Select.Viewport className="p-1">
                        {options.map((o) => (
                            <Select.Item
                                key={o.value}
                                value={o.value}
                                className="relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg py-1.5 pl-2.5 pr-8 text-sm text-gray-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                            >
                                {o.icon}
                                <span className="min-w-0 flex-1">
                                    <Select.ItemText>{o.label}</Select.ItemText>
                                    {o.hint && <span className="block truncate text-xs text-gray-500">{o.hint}</span>}
                                </span>
                                <Select.ItemIndicator className="absolute right-2.5">
                                    <Check size={14} className="text-indigo-600" aria-hidden="true" />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
};
