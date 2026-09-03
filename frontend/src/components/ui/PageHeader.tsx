import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-content-muted dark:text-white/35 mb-3">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-content-muted/50 dark:text-white/15">/</span>}
              {b.href ? (
                <a href={b.href} className="hover:text-content-secondary dark:hover:text-white/60 transition-colors">
                  {b.label}
                </a>
              ) : (
                <span className="text-content-secondary dark:text-white/55">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content dark:text-white tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-content-secondary dark:text-white/45 mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
