// Dua titik yang terhubung: satu terisi (kita), satu berongga (orang lain).
export default function Logo({ size = 28 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <line x1="10" y1="22" x2="22" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="23" r="6" fill="currentColor" />
      <circle cx="23" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
