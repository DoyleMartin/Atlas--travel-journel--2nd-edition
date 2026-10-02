import './Avatar.css';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  src?: string;
  size?: Size;
  className?: string;
}

const PALETTE_SIZE = 6;

// Same name → same color every time
function colorIndex(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % PALETTE_SIZE;
}

function initials(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
}

export default function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const classes = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ');

  if (src) return <img className={classes} src={src} alt={name} />;

  return (
    <span className={`${classes} avatar--initials avatar--c${colorIndex(name)}`} role="img" aria-label={name}>
      {initials(name)}
    </span>
  );
}
