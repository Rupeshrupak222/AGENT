import Link from "next/link";
import { Zap, Twitter, Linkedin, Youtube, Github } from "lucide-react";

const R = "#D42027";

const cols = {
  Product:    [{ l:"Features",href:"#features" },{ l:"Pricing",href:"#pricing" },{ l:"Integrations",href:"#integrations" },{ l:"Changelog",href:"/changelog" },{ l:"Roadmap",href:"/roadmap" }],
  Solutions:  [{ l:"AI Telecaller",href:"/solutions/telecaller" },{ l:"AI Recruiter",href:"/solutions/recruiter" },{ l:"AI Receptionist",href:"/solutions/receptionist" },{ l:"AI Sales Agent",href:"/solutions/sales" },{ l:"AI Collections",href:"/solutions/collections" }],
  Developers: [{ l:"Documentation",href:"/docs" },{ l:"API Reference",href:"/docs/api" },{ l:"SDKs",href:"/docs/sdks" },{ l:"Webhooks",href:"/docs/webhooks" },{ l:"Status Page",href:"/status" }],
  Company:    [{ l:"About",href:"/about" },{ l:"Blog",href:"/blog" },{ l:"Careers",href:"/careers" },{ l:"Contact",href:"/contact" },{ l:"Press",href:"/press" }],
};
const socials = [
  { icon:<Twitter className="w-4 h-4"/>,  href:"https://twitter.com",  label:"Twitter" },
  { icon:<Linkedin className="w-4 h-4"/>, href:"https://linkedin.com", label:"LinkedIn" },
  { icon:<Youtube className="w-4 h-4"/>,  href:"https://youtube.com",  label:"YouTube" },
  { icon:<Github className="w-4 h-4"/>,   href:"https://github.com",   label:"GitHub" },
];

export function Footer() {
  return (
    <footer className="bg-gray-50 pt-12 sm:pt-16 pb-6 sm:pb-8"
      style={{ borderTop:"1px solid rgba(0,0,0,0.08)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:"0 0 12px rgba(212,32,39,0.25)" }}>
                <Zap className="w-4 h-4 text-white fill-white"/>
              </div>
              <span className="text-lg font-bold text-gray-900">AgentCall <span className="gradient-text">AI</span></span>
            </Link>
            <p className="text-sm leading-relaxed mb-5 max-w-xs text-gray-400">
              The AI Workforce Platform for modern businesses. Deploy AI Employees that work 24/7, handle calls and drive revenue.
            </p>
            <div className="flex items-center gap-2.5">
              {socials.map(s=>(
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-gray-400"
                  style={{ border:"1px solid rgba(0,0,0,0.10)", background:"#ffffff" }}
                  onMouseEnter={e=>{const t=e.currentTarget;t.style.borderColor=R;t.style.color=R}}
                  onMouseLeave={e=>{const t=e.currentTarget;t.style.borderColor="rgba(0,0,0,0.10)";t.style.color=""}}
                >{s.icon}</a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(cols).map(([cat, links])=>(
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-400">{cat}</p>
              <ul className="space-y-2.5">
                {links.map(link=>(
                  <li key={link.l}>
                    <Link href={link.href} className="text-sm transition-colors text-gray-500 hover:text-gray-900"
                    >{link.l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">© 2026 AgentCall AI. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {["Privacy Policy","Terms of Service","Cookie Policy","GDPR"].map(t=>(
              <Link key={t} href="#" className="text-xs text-gray-400 hover:text-red-600 transition-colors">{t}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
