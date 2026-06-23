import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  LayoutDashboard,
  CalendarDays,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/helpers';
import { APP_NAME } from '../../utils/constants';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
];

const Navbar = ({ darkMode, setDarkMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error(error);
      toast.error('Failed to log out');
    }
  };

  const closeMobile = () => setMobileOpen(false);

  const displayName = user?.displayName || user?.email || 'User';
  const initials = getInitials(displayName);

  /* ------------------------------------------------------------------ */
  /*  Shared link styles                                                 */
  /* ------------------------------------------------------------------ */
  const baseLinkClass =
    'flex items-center gap-2 font-medium transition-all duration-200 ease-out rounded-btn px-4 py-2 text-surface-600 dark:text-surface-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30';
  const activeLinkClass =
    'text-primary-500 bg-primary-50 dark:bg-primary-900/30';

  const mobileLinkBase =
    'flex items-center gap-3 font-medium transition-all duration-200 ease-out rounded-btn px-4 min-h-[48px] text-surface-700 dark:text-surface-200 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30';
  const mobileLinkActive =
    'text-primary-500 bg-primary-50 dark:bg-primary-900/30';

  return (
    <>
      {/* ============================================================== */}
      {/*  NAVBAR                                                        */}
      {/* ============================================================== */}
      <nav
        id="main-navbar"
        className="sticky top-0 z-40 w-full bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200/50 dark:border-surface-700/50 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* ---- LEFT: Logo ---- */}
            <NavLink
              to="/"
              className="flex items-center gap-2 group shrink-0"
            >
              <CalendarCheck className="h-7 w-7 text-primary-500 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-gradient font-heading font-bold text-xl select-none">
                {APP_NAME}
              </span>
            </NavLink>

            {/* ---- CENTER: Desktop nav links ---- */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `${baseLinkClass} ${isActive ? activeLinkClass : ''}`
                    }
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span className="text-sm">{link.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* ---- RIGHT: Actions (desktop) ---- */}
            <div className="hidden md:flex items-center gap-3">
              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className="relative flex items-center justify-center h-10 w-10 rounded-btn text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 transition-transform duration-300 rotate-0 hover:rotate-45" />
                ) : (
                  <Moon className="h-5 w-5 transition-transform duration-300 rotate-0 hover:-rotate-12" />
                )}
              </button>

              {/* Divider */}
              <div className="h-8 w-px bg-surface-200 dark:bg-surface-700" />

              {/* User avatar + name */}
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 text-white text-xs font-bold select-none shadow-md"
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-200 max-w-[120px] truncate">
                  {displayName}
                </span>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center h-10 w-10 rounded-btn text-surface-500 dark:text-surface-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            {/* ---- HAMBURGER (mobile) ---- */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="flex md:hidden items-center justify-center h-11 w-11 rounded-btn text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ============================================================== */}
      {/*  MOBILE OVERLAY + DRAWER                                       */}
      {/* ============================================================== */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white dark:bg-surface-900 shadow-glass-lg border-l border-surface-200/50 dark:border-surface-700/50 flex flex-col transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-surface-200/50 dark:border-surface-700/50 shrink-0">
          <span className="text-gradient font-heading font-bold text-lg select-none">
            {APP_NAME}
          </span>
          <button
            type="button"
            onClick={closeMobile}
            className="flex items-center justify-center h-10 w-10 rounded-btn text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ---- Navigation links ---- */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `${mobileLinkBase} ${isActive ? mobileLinkActive : ''}`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}

          {/* Dark mode toggle (mobile) */}
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="flex items-center gap-3 w-full font-medium transition-all duration-200 ease-out rounded-btn px-4 min-h-[48px] text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </nav>

        {/* ---- User section (bottom) ---- */}
        <div className="shrink-0 border-t border-surface-200/50 dark:border-surface-700/50 px-5 py-4 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 text-white text-sm font-bold select-none shadow-md shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 truncate">
                {displayName}
              </p>
              {user?.email && (
                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={() => {
              closeMobile();
              handleLogout();
            }}
            className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-btn text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            <LogOut className="h-5 w-5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
