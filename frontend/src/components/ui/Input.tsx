import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const fieldBase =
  "w-full h-10 rounded-xl px-4 text-sm transition-colors duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed " +
  "bg-surface-muted text-content border border-line placeholder:text-content-muted " +
  "focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card " +
  "dark:bg-white/[0.04] dark:text-white dark:border-white/10 dark:placeholder:text-white/20 " +
  "dark:focus:border-brand-500/60 dark:focus:ring-brand-500/14 dark:focus:bg-white/[0.06]";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const sid = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={sid}
            className="block text-sm font-medium text-content-secondary dark:text-white/65"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-content-muted dark:text-white/28">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={sid}
            className={cn(
              fieldBase,
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "!border-red-500/75 focus:!border-red-500 focus:!ring-red-500/10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-content-muted dark:text-white/32">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-content-muted dark:text-white/35">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const sid = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={sid}
            className="block text-sm font-medium text-content-secondary dark:text-white/65"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={sid}
          className={cn(
            fieldBase,
            "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10",
            error && "!border-red-500/75",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const tid = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={tid}
            className="block text-sm font-medium text-content-secondary dark:text-white/65"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={tid}
          className={cn(
            "w-full min-h-[5rem] rounded-xl px-4 py-3 text-sm transition-colors duration-200 outline-none resize-none disabled:opacity-50",
            "bg-surface-muted text-content border border-line placeholder:text-content-muted",
            "focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10",
            "dark:bg-white/[0.04] dark:text-white dark:border-white/10 dark:placeholder:text-white/20",
            "dark:focus:border-brand-500/60 dark:focus:ring-brand-500/14",
            error && "!border-red-500/75",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";
