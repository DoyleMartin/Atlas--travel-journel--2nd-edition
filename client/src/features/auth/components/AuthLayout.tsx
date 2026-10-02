import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Logo from '../../../components/Logo/Logo';
import './AuthLayout.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Split screen for login/register: illustration panel (desktop only) + form card. */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <aside className="auth-layout__panel" aria-hidden="true">
        <div className="auth-layout__panel-content">
          <p className="auth-layout__tagline">Every place you&rsquo;ve been, on one map.</p>
          <ul className="auth-layout__features">
            <li>Tap a country to mark it visited</li>
            <li>Turn trips into journals and scrapbooks</li>
            <li>Relive them as a reel or a timeline</li>
          </ul>
        </div>
      </aside>

      <div className="auth-layout__main">
        <div className="auth-layout__card">
          <Link to="/" className="auth-layout__logo" aria-label="Atlas home">
            <Logo size="lg" />
          </Link>
          <h1 className="auth-layout__title">{title}</h1>
          <p className="auth-layout__subtitle">{subtitle}</p>
          {children}
          <p className="auth-layout__footer">{footer}</p>
        </div>
      </div>
    </div>
  );
}
