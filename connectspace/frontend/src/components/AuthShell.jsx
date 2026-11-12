import Logo from './Logo.jsx';

// Tata letak bersama untuk halaman Login dan Register.
export default function AuthShell({ title, children, formClassName = '' }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="brand">
          <Logo size={34} />
          <span>UmaThreads</span>
        </div>
        <p className="auth-aside-title">Tempat tim berbagi kabar, foto, dan tanggapan.</p>
      </aside>

      <main className="auth-main">
        <div className={`auth-form ${formClassName}`}>
          <h1>{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
