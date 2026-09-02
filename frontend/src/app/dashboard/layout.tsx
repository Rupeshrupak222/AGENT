"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, LayoutDashboard, Bot, Users, Phone, BarChart3,
  Settings, CreditCard, MessageSquare, Calendar,
  Bell, HelpCircle, LogOut, Building2, Mic2,
  Menu, X, Plus, Search, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const R = "#D42027";

const groups = [
  { label:"Overview",    items:[{ icon:LayoutDashboard, label:"Dashboard",   href:"/dashboard/overview" }] },
  { label:"AI Workforce",items:[
    { icon:Bot,    label:"AI Agents",  href:"/dashboard/agents" },
    { icon:Mic2,   label:"Voices",     href:"/dashboard/voices", badge:"New" },
  ]},
  { label:"Operations", items:[
    { icon:Phone,         label:"Call Center",  href:"/dashboard/calls" },
    { icon:Users,         label:"CRM / Leads",  href:"/dashboard/crm" },
    { icon:Calendar,      label:"Calendar",      href:"/dashboard/calendar" },
    { icon:MessageSquare, label:"Automations",   href:"/dashboard/automations" },
  ]},
  { label:"Insights",   items:[{ icon:BarChart3, label:"Analytics", href:"/dashboard/analytics" }] },
  { label:"Account",    items:[
    { icon:Building2, label:"Workspace", href:"/dashboard/workspace" },
    { icon:CreditCard,label:"Billing",   href:"/dashboard/billing" },
    { icon:Settings,  label:"Settings",  href:"/dashboard/settings" },
  ]},
];

const NOTIFS = [
  { id:1, text:"Priya AI completed 50 calls today",       time:"2m ago",  unread:true  },
  { id:2, text:"New lead qualified: Rahul Sharma",         time:"15m ago", unread:true  },
  { id:3, text:"Campaign 'Q3 Drive' reached 500 calls",    time:"1h ago",  unread:false },
];

function SidebarContent({ collapsed=false, mobile=false, onClose }: { collapsed?:boolean; mobile?:boolean; onClose?:()=>void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const show = !collapsed || mobile;

  return (
    <div className="flex flex-col h-full" style={{ background:"#0f0102" }}>
      {/* Logo */}
      <div className={cn("flex items-center h-16 flex-shrink-0", show?"px-5 gap-3":"justify-center")}
        style={{ borderBottom:"1px solid rgba(212,32,39,0.15)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:"0 0 16px rgba(212,32,39,0.38)" }}>
          <Zap className="w-4 h-4 text-white fill-white"/>
        </div>
        {show && <span className="text-base font-bold text-white whitespace-nowrap">AgentCall <span className="gradient-text">AI</span></span>}
        {mobile && <button onClick={onClose} className="ml-auto" style={{ color:"rgba(255,255,255,0.4)" }}><X className="w-5 h-5"/></button>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
        {groups.map(g=>(
          <div key={g.label}>
            {show && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.22)" }}>{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map(item=>{
                const active = pathname===item.href || pathname.startsWith(item.href+"/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href}
                      title={!show ? item.label : undefined}
                      className={cn("flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150", show?"px-3":"justify-center mx-1")}
                      style={active
                        ? { background:"rgba(212,32,39,0.18)", border:"1px solid rgba(212,32,39,0.32)", color:"#fff" }
                        : { color:"rgba(255,255,255,0.48)", border:"1px solid transparent" }
                      }
                      onMouseEnter={e=>{ if(!active){const t=e.currentTarget;t.style.color="#fff";t.style.background="rgba(255,255,255,0.04)";}}}
                      onMouseLeave={e=>{ if(!active){const t=e.currentTarget;t.style.color="rgba(255,255,255,0.48)";t.style.background="transparent";}}}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" style={active?{color:"#ff8080"}:{}} />
                      {show && <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {(item as any).badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:"rgba(212,32,39,0.22)", color:"#ffaaaa", border:"1px solid rgba(212,32,39,0.3)" }}>
                            {(item as any).badge}
                          </span>
                        )}
                      </>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn("p-2.5 space-y-1 flex-shrink-0", !show&&"px-1")} style={{ borderTop:"1px solid rgba(212,32,39,0.12)" }}>
        <Link href="/help" className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all", !show&&"justify-center px-0")}
          style={{ color:"rgba(255,255,255,0.38)" }}>
          <HelpCircle className="w-4 h-4 flex-shrink-0"/>{show&&<span>Help &amp; Support</span>}
        </Link>
        <button onClick={()=>{ logout(); router.push("/login"); }}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all", !show&&"justify-center px-0")}
          style={{ color:"rgba(255,255,255,0.38)" }}
          onMouseEnter={e=>{const t=e.currentTarget;t.style.color="#ff8080";t.style.background="rgba(212,32,39,0.08)"}}
          onMouseLeave={e=>{const t=e.currentTarget;t.style.color="rgba(255,255,255,0.38)";t.style.background="transparent"}}>
          <LogOut className="w-4 h-4 flex-shrink-0"/>{show&&<span>Sign Out</span>}
        </button>
        {show && user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl"
            style={{ background:"rgba(212,32,39,0.08)", border:"1px solid rgba(212,32,39,0.16)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background:`linear-gradient(135deg,${R},#9b1219)` }}>
              {user.name?.[0]?.toUpperCase()??"U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] capitalize truncate" style={{ color:"rgba(255,255,255,0.35)" }}>{user.role?.replace("_"," ")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children:React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);

  useEffect(()=>{ setMobileOpen(false); }, [pathname]);
  useEffect(()=>{
    const fn = ()=>{ setNotifOpen(false); setProfileOpen(false); };
    document.addEventListener("click", fn);
    return ()=>document.removeEventListener("click", fn);
  },[]);

  const unread = NOTIFS.filter(n=>n.unread).length;
  const pageLabel = pathname.split("/").pop()?.replace(/-/g," ")||"Dashboard";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:"#0c0102" }}>

      {/* Desktop sidebar */}
      <aside className={cn("hidden lg:flex flex-col relative flex-shrink-0 transition-all duration-300", collapsed?"w-[64px]":"w-[240px]")}
        style={{ borderRight:"1px solid rgba(212,32,39,0.13)" }}>
        <SidebarContent collapsed={collapsed} />
        <button onClick={()=>setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
          style={{ background:"#1a0405", border:"1px solid rgba(212,32,39,0.3)", color:"rgba(255,255,255,0.5)", boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }}
          onMouseEnter={e=>{const t=e.currentTarget;t.style.borderColor=R;t.style.color="#fff"}}
          onMouseLeave={e=>{const t=e.currentTarget;t.style.borderColor="rgba(212,32,39,0.3)";t.style.color="rgba(255,255,255,0.5)"}}>
          {collapsed?<ChevronRight className="w-3.5 h-3.5"/>:<ChevronLeft className="w-3.5 h-3.5"/>}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-40 lg:hidden" style={{ background:"rgba(0,0,0,0.7)" }}
              onClick={()=>setMobileOpen(false)}/>
            <motion.div initial={{ x:-280 }} animate={{ x:0 }} exit={{ x:-280 }}
              transition={{ type:"spring", stiffness:300, damping:30 }}
              className="fixed left-0 top-0 h-full w-72 z-50 lg:hidden flex flex-col"
              style={{ borderRight:"1px solid rgba(212,32,39,0.18)" }}>
              <SidebarContent mobile onClose={()=>setMobileOpen(false)}/>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30"
          style={{ borderBottom:"1px solid rgba(212,32,39,0.13)", background:"rgba(15,1,2,0.88)", backdropFilter:"blur(18px)" }}>

          <div className="flex items-center gap-3 min-w-0">
            <button onClick={()=>setMobileOpen(true)} className="lg:hidden p-2 rounded-xl transition-all"
              style={{ color:"rgba(255,255,255,0.5)" }}>
              <Menu className="w-5 h-5"/>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight capitalize truncate">{pageLabel}</h1>
              <p className="text-xs hidden sm:block" style={{ color:"rgba(255,255,255,0.35)" }}>
                {new Date().toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative hidden sm:block">
              <AnimatePresence>
                {searchOpen ? (
                  <motion.input initial={{ width:0,opacity:0 }} animate={{ width:200,opacity:1 }} exit={{ width:0,opacity:0 }}
                    autoFocus onBlur={()=>setSearchOpen(false)}
                    placeholder="Search..."
                    className="h-9 rounded-xl px-3 text-sm text-white placeholder:text-white/25 outline-none"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,32,39,0.3)" }}
                  />
                ) : (
                  <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={()=>setSearchOpen(true)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)" }}>
                    <Search className="w-4 h-4"/>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <div className="relative" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{setNotifOpen(!notifOpen);setProfileOpen(false);}}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)" }}>
                <Bell className="w-4 h-4"/>
                {unread>0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background:R }}>{unread}</span>}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity:0,y:8,scale:0.95 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:8,scale:0.95 }}
                    className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50"
                    style={{ background:"rgba(18,2,4,0.97)", border:"1px solid rgba(212,32,39,0.2)", backdropFilter:"blur(20px)", boxShadow:"0 0 40px rgba(0,0,0,0.6)" }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:"1px solid rgba(212,32,39,0.1)" }}>
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"rgba(212,32,39,0.2)", color:"#ffaaaa", border:"1px solid rgba(212,32,39,0.3)" }}>{unread} new</span>
                    </div>
                    {NOTIFS.map(n=>(
                      <div key={n.id} className="px-4 py-3 cursor-pointer transition-all" style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", background:n.unread?"rgba(212,32,39,0.05)":undefined }}>
                        <div className="flex gap-2.5">
                          {n.unread && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background:R }}/>}
                          <div className={n.unread?"":"pl-4"}>
                            <p className="text-sm" style={{ color:"rgba(255,255,255,0.78)" }}>{n.text}</p>
                            <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.3)" }}>{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2.5" style={{ borderTop:"1px solid rgba(212,32,39,0.1)" }}>
                      <button className="text-xs font-medium transition-colors" style={{ color:R }}>View all →</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* New Agent */}
            <Link href="/dashboard/agents"
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-xs font-semibold transition-all active:scale-[0.97]"
              style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:"0 0 16px rgba(212,32,39,0.32)" }}>
              <Plus className="w-3.5 h-3.5"/><span>New Agent</span>
            </Link>

            {/* Profile */}
            <div className="relative" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{setProfileOpen(!profileOpen);setNotifOpen(false);}}
                className="flex items-center gap-2 h-9 px-2 rounded-xl transition-all">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background:`linear-gradient(135deg,${R},#9b1219)` }}>
                  {user?.name?.[0]?.toUpperCase()??"U"}
                </div>
                <span className="hidden sm:block text-xs font-medium max-w-[80px] truncate" style={{ color:"rgba(255,255,255,0.65)" }}>{user?.name}</span>
                <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color:"rgba(255,255,255,0.28)" }}/>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity:0,y:8,scale:0.95 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:8,scale:0.95 }}
                    className="absolute right-0 top-12 w-56 rounded-2xl overflow-hidden z-50"
                    style={{ background:"rgba(18,2,4,0.97)", border:"1px solid rgba(212,32,39,0.2)", backdropFilter:"blur(20px)", boxShadow:"0 0 40px rgba(0,0,0,0.6)" }}>
                    <div className="px-4 py-3" style={{ borderBottom:"1px solid rgba(212,32,39,0.1)" }}>
                      <p className="text-sm font-semibold text-white">{user?.name}</p>
                      <p className="text-xs truncate" style={{ color:"rgba(255,255,255,0.4)" }}>{user?.email}</p>
                      <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background:"rgba(212,32,39,0.18)", color:"#ffaaaa", border:"1px solid rgba(212,32,39,0.3)" }}>
                        {user?.role?.replace("_"," ")}
                      </span>
                    </div>
                    {[{ label:"Profile Settings",href:"/dashboard/settings"},{ label:"Workspace",href:"/dashboard/workspace"},{ label:"Billing",href:"/dashboard/billing"}].map(item=>(
                      <Link key={item.href} href={item.href} className="block px-4 py-2.5 text-sm transition-all"
                        style={{ color:"rgba(255,255,255,0.58)" }}
                        onMouseEnter={e=>{const t=e.currentTarget;t.style.color="#fff";t.style.background="rgba(212,32,39,0.07)"}}
                        onMouseLeave={e=>{const t=e.currentTarget;t.style.color="rgba(255,255,255,0.58)";t.style.background="transparent"}}>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop:"1px solid rgba(212,32,39,0.1)" }}>
                      <button onClick={()=>{logout();router.push("/login");}}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-all"
                        style={{ color:"#ff8080" }}>
                        <LogOut className="w-4 h-4"/> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto" style={{ background:"#0c0102" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
