import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default"|"red"|"blue"|"green"|"yellow"|"purple"|"orange"|"gray"|"cyan"|"white";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

// All "blue" / "purple" / "cyan" variants map to the #D42027 red palette
const styles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background:"rgba(212,32,39,0.14)", color:"#f88080", border:"1px solid rgba(212,32,39,0.32)" },
  red:     { background:"rgba(212,32,39,0.18)", color:"#ff8080", border:"1px solid rgba(212,32,39,0.4)" },
  blue:    { background:"rgba(212,32,39,0.12)", color:"#ffaaaa", border:"1px solid rgba(212,32,39,0.28)" },
  purple:  { background:"rgba(212,32,39,0.1)",  color:"#ffbbbb", border:"1px solid rgba(212,32,39,0.24)" },
  cyan:    { background:"rgba(212,32,39,0.1)",  color:"#ffcccc", border:"1px solid rgba(212,32,39,0.22)" },
  orange:  { background:"rgba(249,115,22,0.12)",color:"#fb923c", border:"1px solid rgba(249,115,22,0.3)" },
  green:   { background:"rgba(34,197,94,0.12)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.3)" },
  yellow:  { background:"rgba(234,179,8,0.12)", color:"#facc15", border:"1px solid rgba(234,179,8,0.3)" },
  white:   { background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.88)", border:"1px solid rgba(255,255,255,0.22)" },
  gray:    { background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.1)" },
};

export function Badge({ variant="default", dot=false, children, className, style, ...props }: BadgeProps) {
  return (
    <span
      style={{ ...styles[variant], ...style }}
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[0.7rem] font-semibold leading-tight", className)}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"/>}
      {children}
    </span>
  );
}
