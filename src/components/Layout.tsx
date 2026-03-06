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

  const showAdmin = user && isAdmin(user.email ?? undefined);
  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/cumulative', label: 'Cumulative' },
    { to: '/bookmarks', label: 'Bookmarks' },
    { to: '/notes', label: 'Notes' },
    { to: '/analytics', label: 'Analytics' },
    ...(showAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="font-semibold text-lg text-[var(--text)] no-underline hover:no-underline hover:text-[var(--accent)]">
              DSA Tracker
            </NavLink>
            {tracks.length > 1 && (
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)]"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <nav className="flex gap-1">
              {nav.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm no-underline ${
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
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:bg-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {!authLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-muted)] truncate max-w-[120px]">
                      {user.isAnonymous ? 'Guest' : user.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-sm px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => signInAnon()}
                      className="text-sm px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]"
                    >
                      Continue as Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => signInWithGoogle()}
                      className="text-sm px-3 py-1.5 rounded-md bg-[var(--accent)] text-white hover:opacity-90"
                    >
                      Sign in with Google
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
