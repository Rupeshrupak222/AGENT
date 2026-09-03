import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <div className={cn("relative group inline-flex", className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "absolute z-50 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150",
          "bg-gray-900 text-white dark:bg-white/90 dark:text-gray-900",
          positionClasses[side]
        )}
      >
        {content}
      </div>
    </div>
  );
}
