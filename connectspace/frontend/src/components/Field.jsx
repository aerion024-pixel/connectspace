// Label + kontrol input + pesan error di bawahnya.
export default function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
