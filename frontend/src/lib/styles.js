// Shared class recipes so every screen uses the same button and field vocabulary.
const press = "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

export const btn = {
    primary: `inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(49,46,129,0.25)] hover:bg-indigo-700 ${press}`,
    secondary: `inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-gray-50 hover:border-gray-400 ${press}`,
    ghost: `inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${press}`,
    danger: `inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 ${press}`,
    dangerSoft: `inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 ${press}`,
    icon: `inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 ${press}`,
};

export const field =
    "block h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm aria-invalid:border-red-400 aria-invalid:ring-red-500/20";

export const label = "mb-1.5 block text-sm font-medium text-gray-700";

export const card = "rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
