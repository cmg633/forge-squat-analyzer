import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Camera, Clock, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/',        icon: Camera, label: 'Analyze' },
  { to: '/history', icon: Clock,  label: 'History'  },
  { to: '/about',   icon: Info,   label: 'About'    },
];

function ForgeLogo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 group select-none">
      <div className="relative">
        <Zap
          size={22}
          className="text-forge-red drop-shadow-[0_0_6px_rgba(224,58,30,0.7)] transition-transform group-hover:scale-110"
          fill="currentColor"
        />
      </div>
      <span className="display-heading text-xl text-white tracking-tight">
        FORGE<span className="text-forge-red">.</span>AI
      </span>
    </NavLink>
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-dvh bg-forge-bg">
      {/* ── Desktop top nav ── */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-forge-border bg-forge-bg/90 backdrop-blur-md sticky top-0 z-40">
        <ForgeLogo />
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-forge-red/10 text-forge-red border border-forge-red/20'
                    : 'text-forge-grey hover:text-white hover:bg-forge-surface'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 pb-safe md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-forge-surface/95 backdrop-blur-lg border-t border-forge-border bottom-tab-bar">
        <div className="flex">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[52px] transition-colors duration-200 ${
                  isActive ? 'text-forge-red' : 'text-forge-grey'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute -inset-1.5 bg-forge-red/10 rounded-lg -z-10"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
