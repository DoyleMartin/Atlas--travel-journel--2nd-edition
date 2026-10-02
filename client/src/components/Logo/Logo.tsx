import './Logo.css';

interface LogoProps {
  size?: 'md' | 'lg';
}

/** Globe mark + "Atlas" wordmark. */
export default function Logo({ size = 'md' }: LogoProps) {
  return (
    <span className={`logo logo--${size}`}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.25" />
        <ellipse cx="16" cy="16" rx="5.5" ry="13" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M3.5 12h25M3.5 20h25" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle className="logo__pin" cx="22.5" cy="9.5" r="3.25" />
      </svg>
      <span className="logo__text">Atlas</span>
    </span>
  );
}
