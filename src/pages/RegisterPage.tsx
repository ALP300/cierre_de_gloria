import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, LoaderCircle, LockKeyhole, MapPin, Ticket } from 'lucide-react';
import { ApiError, registerGuest, saveTicket, savedTickets } from '../lib/api';
import { EVENT, eventWhen, eventWhere } from '../event.config';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const mine = savedTickets();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const { token, ticket } = await registerGuest(fullName, phone, website);
      saveTicket({ token, fullName: ticket.fullName });
      navigate(`/t/${token}`);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Algo salió mal. Inténtalo de nuevo.';
      setError(e instanceof ApiError && e.status === 409
        ? `${message} Ábrelo desde el celular donde te registraste o acércate al equipo el día del congreso.`
        : message);
      setSending(false);
    }
  }

  return (
    <main className="page hero-page">
      <div className="hero">
        <div className="brand">
          <span className="logo-chip"><img src="/logo-jbc.jpg" alt="Logo de Jesús el Buen Camino" /></span>
          <span>{EVENT.organizer} presenta</span>
        </div>
        <h1 className="event-title">Cierre de <em>Gloria</em></h1>
        <p className="lead">El congreso que no te puedes perder. Entrada gratuita: registra tu nombre y llévate tu ticket.</p>
        <ul className="facts">
          <li><CalendarDays size={18} />{eventWhen()}</li>
          <li><MapPin size={18} />{eventWhere()}</li>
        </ul>
      </div>

      <form className="card form" onSubmit={submit}>
        <h2>Consigue tu ticket</h2>
        <label>
          Nombre y apellido
          <input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required minLength={3} maxLength={80} placeholder="Así saldrá en tu ticket" />
        </label>
        <label>
          Celular
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="Número de celular" />
        </label>
        <label className="trap" aria-hidden="true">
          Sitio web
          <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={sending}>
          {sending ? <><LoaderCircle className="spin" size={20} />Creando tu ticket…</> : <>Quiero mi ticket<ArrowRight size={20} /></>}
        </button>
        <p className="fine">Tus datos solo se usan para organizar el ingreso al congreso.</p>
      </form>

      {mine.length > 0 && (
        <section className="mine">
          <h2>Tus tickets en este celular</h2>
          {mine.map(ticket => (
            <Link key={ticket.token} to={`/t/${ticket.token}`}><Ticket size={18} />{ticket.fullName}</Link>
          ))}
        </section>
      )}

      <Link className="ghost admin-link" to="/admin"><LockKeyhole size={18} />Iniciar sesión como administrador</Link>
    </main>
  );
}
