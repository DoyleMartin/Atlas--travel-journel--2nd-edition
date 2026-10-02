import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../Avatar/Avatar';
import Logo from '../Logo/Logo';
import './Navbar.css';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'navbar__link navbar__link--active' : 'navbar__link';

export default function Navbar() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="Atlas home">
          <Logo />
        </Link>

        {status === 'authed' && (
          <nav className="navbar__links" aria-label="Main">
            <NavLink to="/" end className={navLinkClass}>
              Map
            </NavLink>
          </nav>
        )}

        <div className="navbar__actions">
          {status === 'authed' && user && (
            <div className="navbar__account" ref={accountRef}>
              <button
                type="button"
                className="navbar__avatar-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <Avatar name={user.username} src={user.avatar?.url} size="sm" />
              </button>

              {menuOpen && (
                <div className="navbar__menu" role="menu">
                  <div className="navbar__menu-header">
                    <span className="navbar__menu-name">@{user.username}</span>
                    <span className="navbar__menu-email">{user.email}</span>
                  </div>
                  <Link
                    role="menuitem"
                    to={`/u/${user.username}`}
                    className="navbar__menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Your profile
                  </Link>
                  <button role="menuitem" type="button" className="navbar__menu-item" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'anon' && (
            <>
              <Link to="/login" className="navbar__link">
                Log in
              </Link>
              <Link to="/register" className="navbar__cta">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
