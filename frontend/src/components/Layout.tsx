import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Camera, Activity, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FooterCredit } from './FooterCredit';

const NAV_ITEMS = [
  { to: '/', icon: Camera, label: 'Analyze', end: true },
  { to: '/results', icon: Activity, label: 'Results', end: false },
  { to: '/history', icon: Clock, label: 'History', end: false },
  { to: '/about', icon: Info, label: 'About', end: false },
];

function ForgeLogo() {
  return (
    <NavLink to="/" className="flex items-center gap-3 select-none">
      <div className="w-6 h-6 bg-[#CCFF00] border border-[#CCFF00] flex items-center justify-center font-pixel text-xs font-bold text-[#0A0A0A]">
        F
      </div>
      <span className="font-display font-black text-xl tracking-tight leading-none text-[var(--text)]">
        FORGE<span className="text-[#CCFF00]">.</span>
      </span>
    </NavLink>
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <div className="grain-overlay" aria-hidden="true" />

      {/* Top Navigation */}
      <header className="border-b border-[var(--hairline)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <ForgeLogo />

          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => {
                  const active =
                    isActive ||
                    (to === '/' && location.pathname === '/analyze') ||
                    (to === '/results' && location.pathname.startsWith('/results'));
                  return `px-3 py-1.5 font-pixel text-[11px] uppercase tracking-wider border transition-colors duration-150 ${
                    active
                      ? 'border-[#CCFF00] bg-[#CCFF00] text-[#0A0A0A] font-bold'
                      : 'border-transparent text-[var(--text)]/75 hover:text-[#CCFF00] hover:border-[var(--hairline)]'
                  }`;
                }}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Route Content */}
      <main className="flex-1 pb-16 md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Single Consistent Footer Across All Routes */}
      <FooterCredit />

      {/* Mobile Bottom Tab Bar (4 items) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--hairline)] pb-safe"
      >
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => {
                const active =
                  isActive ||
                  (to === '/' && location.pathname === '/analyze') ||
                  (to === '/results' && location.pathname.startsWith('/results'));
                return `flex flex-col items-center justify-center py-2 min-h-[56px] font-pixel text-[9px] uppercase transition-colors ${
                  active
                    ? 'text-[#CCFF00] bg-[#CCFF00]/10 border-t-2 border-[#CCFF00]'
                    : 'text-[var(--text)]/60 hover:text-[var(--text)]'
                }`;
              }}
            >
              <Icon size={18} />
              <span className="mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
