import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { ApiError, getSession, login } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (getSession()) return <Navigate to="/admin/panel" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await login(email, password);
      navigate('/admin/panel', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.');
      setSending(false);
    }
  }

  return (
    <main className="page center-page">
      <form className="card form login" onSubmit={submit}>
        <span className="logo-chip large"><img src="/logo-jbc.jpg" alt="Logo de Jesús el Buen Camino" /></span>
        <h1>Acceso de administradores</h1>
        <label>
          Correo
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={sending}>
          {sending ? <LoaderCircle className="spin" size={20} /> : <LockKeyhole size={20} />}Entrar
        </button>
      </form>
    </main>
  );
}
