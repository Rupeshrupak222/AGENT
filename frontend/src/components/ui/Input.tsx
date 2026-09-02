import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const fieldBase: React.CSSProperties = {
  width:"100%", height:"2.75rem", borderRadius:"0.75rem",
  padding:"0 1rem", fontSize:"0.875rem", color:"#fff",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(255,255,255,0.1)",
  outline:"none", transition:"border-color .2s, box-shadow .2s",
};
const focusStyle = "focus:border-[rgba(212,32,39,0.65)] focus:ring-2 focus:ring-[rgba(212,32,39,0.14)]";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string;
  leftIcon?: React.ReactNode; rightIcon?: React.ReactNode;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, style, ...props }, ref) => {
    const sid = id || label?.toLowerCase().replace(/\s+/g,"-");
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={sid} className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>{label}</label>}
        <div className="relative">
          {leftIcon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:"rgba(255,255,255,0.28)" }}>{leftIcon}</span>}
          <input ref={ref} id={sid}
            style={{ ...fieldBase, borderColor: error?"rgba(212,32,39,0.75)":"rgba(255,255,255,0.1)", paddingLeft: leftIcon?"2.5rem":undefined, paddingRight: rightIcon?"2.5rem":undefined, ...style }}
            className={cn("placeholder:text-white/20 outline-none", focusStyle, "disabled:opacity-50", className)}
            {...props}
          />
          {rightIcon && <span className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.32)" }}>{rightIcon}</span>}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color:"rgba(255,255,255,0.35)" }}>{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value:string; label:string }[];
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const sid = id || label?.toLowerCase().replace(/\s+/g,"-");
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={sid} className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>{label}</label>}
        <select ref={ref} id={sid}
          style={{ ...fieldBase, background:"#1a0405", cursor:"pointer", borderColor: error?"rgba(212,32,39,0.75)":"rgba(255,255,255,0.1)" }}
          className={cn("outline-none", focusStyle, className)}
          {...props}
        >
          {options.map(o=><option key={o.value} value={o.value} style={{ background:"#1a0405" }}>{o.label}</option>)}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string;
}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, id, style, ...props }, ref) => {
    const tid = id || label?.toLowerCase().replace(/\s+/g,"-");
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={tid} className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>{label}</label>}
        <textarea ref={ref} id={tid}
          style={{ background:"rgba(255,255,255,0.04)", borderRadius:"0.75rem", padding:"0.75rem 1rem", fontSize:"0.875rem", color:"#fff", width:"100%", borderColor: error?"rgba(212,32,39,0.75)":"rgba(255,255,255,0.1)", border:"1px solid", outline:"none", resize:"none", transition:"border-color .2s", ...style }}
          className={cn("placeholder:text-white/20", focusStyle, className)}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";
