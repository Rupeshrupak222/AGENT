"use client";
import { useState } from "react";
import { Bell, Search, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

const notifications = [
  { id: 1, text: "Agent 'Priya AI' completed 50 calls",   time: "2m ago",  unread: true },
  { id: 2, text: "New lead assigned: Rahul Sharma",         time: "15m ago", unread: true },
  { id: 3, text: "Call recording ready for review",         time: "1h ago",  unread: false },
];

export function TopBar({ title, subtitle, action }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.07] bg-[#0d0d1f]/80 backdrop-blur-xl sticky top-0 z-40">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <input
              autoFocus
              placeholder="Search leads, agents, calls..."
              onBlur={() => setSearchOpen(false)}
              className="w-64 h-9 rounded-xl border border-white/15 bg-white/5 px-3 pr-8 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/60 transition-all"
            />
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 glass-card rounded-2xl border border-white/10 shadow-glass overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-sm font-semibold text-white">Notifications</span>
                <Badge variant="blue">{unread} new</Badge>
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {notifications.map((n) => (
                  <li key={n.id} className={cn("px-4 py-3 hover:bg-white/[0.03] transition-colors", n.unread && "bg-brand-500/5")}>
                    <p className="text-sm text-white/80">{n.text}</p>
                    <p className="text-xs text-white/30 mt-0.5">{n.time}</p>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2 border-t border-white/[0.06]">
                <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button className="flex items-center gap-2 h-9 px-2 rounded-xl hover:bg-white/5 transition-all group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
        </button>

        {/* Action button */}
        {action && (
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </header>
  );
}
