import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted dark:text-white/25 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          className={cn(
            "w-full h-9 pl-9 pr-8 text-sm rounded-xl outline-none transition-colors",
            "bg-surface-muted text-content border border-line placeholder:text-content-muted",
            "focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card",
            "dark:bg-white/[0.04] dark:text-white dark:border-white/10 dark:placeholder:text-white/20",
            "dark:focus:border-brand-500/60 dark:focus:ring-brand-500/14 dark:focus:bg-white/[0.06]",
            className
          )}
          {...props}
        />
        {value && onClear && (
          <button
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-content-muted hover:text-content dark:text-white/30 dark:hover:text-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
