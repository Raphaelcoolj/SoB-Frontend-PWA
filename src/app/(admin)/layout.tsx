'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BookOpen, 
  Radio, 
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
  Menu,
  X,
  Newspaper,
  BarChart3,
  Flag,
  ChevronDown
} from 'lucide-react';
import { Logo } from '../../components/shared/Logo';

const ADMIN_NAV = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/posts', icon: FileText, label: 'Posts' },
  { href: '/admin/fields', icon: BookOpen, label: 'Fields' },
  { href: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
  { href: '/admin/broadcast', icon: Radio, label: 'Broadcast' },
  { href: '/admin/pipeline', icon: Newspaper, label: 'Pipeline' },
];

const REPORTS_SUBNAV = [
  { href: '/admin/reports', label: 'Post Reports' },
  { href: '/admin/reports/users', label: 'User Reports' },
  { href: '/admin/reports/debates', label: 'Debate Reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.replace('/home');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col fixed inset-y-0 overflow-y-auto hidden lg:flex">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Logo />
          <div className="bg-accent/10 p-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
        </div>
        <NavLinks onNavClick={() => setIsMenuOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-10 max-w-7xl mx-auto w-full min-h-screen overflow-x-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-border">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 px-3 py-1.5 rounded-full hidden sm:flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black text-accent uppercase">Admin</span>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-foreground">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-14 bg-background z-40 flex flex-col">
            <NavLinks onNavClick={() => setIsMenuOpen(false)} />
          </div>
        )}
        
        {children}
      </main>
    </div>
  );
}

function NavLinks({ onNavClick }: { onNavClick: () => void }) {
  const [reportsOpen, setReportsOpen] = useState(false);

  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted group"
          >
            <item.icon className="w-5 h-5 group-hover:text-accent transition-colors" />
            {item.label}
          </Link>
        ))}

        <button
          onClick={() => setReportsOpen(!reportsOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted group"
        >
          <span className="flex items-center gap-3">
            <Flag className="w-5 h-5 group-hover:text-accent transition-colors" />
            Reports
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${reportsOpen ? 'rotate-180' : ''}`} />
        </button>
        {reportsOpen && (
          <div className="pl-10 space-y-0.5">
            {REPORTS_SUBNAV.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onNavClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {sub.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <Link 
          href="/home" 
          onClick={onNavClick}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          Exit Admin
        </Link>
      </div>
    </>
  );
}
