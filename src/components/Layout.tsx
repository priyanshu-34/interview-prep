import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTrack } from '../contexts/TrackContext';
import { tracks } from '../data';
import { isAdmin } from '../lib/admin';

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading, signInWithGoogle, signInAnon, signOut } = useAuth();
  const { trackId, setTrackId } = useTrack();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showAdmin = user && isAdmin(user.email ?? undefined);
  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/cumulative', label: 'Cumulative' },
    { to: '/bookmarks', label: 'Bookmarks' },
    { to: '/notes', label: 'Notes' },
    { to: '/analytics', label: 'Analytics' },
    ...(showAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur safe-area-top">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <NavLink to="/" className="font-semibold text-lg text-[var(--text)] no-underline hover:no-underline hover:text-[var(--accent)] shrink-0" onClick={closeMobileMenu}>
              DSA Tracker
            </NavLink>
            <nav className="hidden md:flex items-center gap-1 shrink-0">
              {nav.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm no-underline whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            {tracks.length > 1 && (
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="hidden md:block bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)] shrink-0"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:bg-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] flex items-center justify-center"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:bg-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
            <div className="hidden md:flex items-center gap-2">
              {!authLoading && (
                <>
                  {user ? (
                    <>
                      <span className="text-sm text-[var(--text-muted)] truncate max-w-[140px]">
                        {user.isAnonymous ? 'Guest' : user.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-sm px-3 py-2 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)] min-h-[44px]"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => signInAnon()}
                        className="text-sm px-3 py-2 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)] min-h-[44px]"
                      >
                        Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => signInWithGoogle()}
                        className="text-sm px-3 py-2 rounded-md bg-[var(--accent)] text-white hover:opacity-90 min-h-[44px]"
                      >
                        Google
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <div className="fixed top-14 right-0 bottom-0 z-40 w-full max-w-[280px] bg-[var(--bg)] border-l border-[var(--border)] shadow-xl md:hidden safe-area-top flex flex-col overflow-y-auto">
              {tracks.length > 1 && (
                <div className="p-4 border-b border-[var(--border)]">
                  <label className="block text-xs text-[var(--text-muted)] mb-2">Track</label>
                  <select
                    value={trackId}
                    onChange={(e) => { setTrackId(e.target.value); closeMobileMenu(); }}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2.5 text-[var(--text)]"
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <nav className="flex flex-col p-2">
                {nav.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-md text-base no-underline min-h-[48px] flex items-center ${
                        isActive
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'text-[var(--text)] hover:bg-[var(--bg-card)]'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
              {!authLoading && (
                <div className="mt-auto p-4 border-t border-[var(--border)] space-y-2">
                  {user ? (
                    <>
                      <p className="text-sm text-[var(--text-muted)] truncate px-2">{user.isAnonymous ? 'Guest' : user.email}</p>
                      <button
                        type="button"
                        onClick={() => { signOut(); closeMobileMenu(); }}
                        className="w-full text-sm px-4 py-3 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => { signInAnon(); closeMobileMenu(); }}
                        className="w-full text-sm px-4 py-3 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]"
                      >
                        Continue as Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => { signInWithGoogle(); closeMobileMenu(); }}
                        className="w-full text-sm px-4 py-3 rounded-md bg-[var(--accent)] text-white hover:opacity-90"
                      >
                        Sign in with Google
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 safe-area-bottom">
        <Outlet />
      </main>
    </div>
  );
}
