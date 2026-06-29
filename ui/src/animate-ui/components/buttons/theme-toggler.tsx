import React from "react";
import { m } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeTogglerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    theme: "light" | "dark";
    toggleTheme: () => void;
}

export function ThemeToggler({ theme, toggleTheme, className, ...props }: ThemeTogglerProps) {
    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(
                "relative w-14 h-8 rounded-full transition-all duration-300 focus:outline-none p-1 border select-none shrink-0",
                isDark 
                    ? "bg-stone-950 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]" 
                    : "bg-stone-200/80 border-stone-300",
                className
            )}
            aria-label="Toggle theme"
            {...props}
        >
            <m.div
                className={cn(
                    "w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-xs transition-all duration-300",
                    isDark 
                        ? "bg-amber-400 text-stone-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
                        : "bg-white text-stone-600"
                )}
                initial={false}
                animate={{ x: isDark ? 22 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
                {isDark ? (
                    <Moon className="size-3 fill-current" />
                ) : (
                    <Sun className="size-3 fill-current" />
                )}
            </m.div>
        </button>
    );
}
