import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, LogOut, QrCode, Search } from 'lucide-react';
import { AdminTicket, ApiError, checkInManually, clearSession, fetchTickets, TicketList } from '../lib/api';

const REFRESH_MS = 15_000;
const time = (value: string) => new Date(value).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

export default function PanelPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<TicketList | null>(null);
  const [error, setError] = useState('');

  const leave = useCallback(() => {
    clearSession();
    navigate('/admin', { replace: true });
  }, [navigate]);

  const load = useCallback(async (term: string) => {
    try {
      setData(await fetchTickets(term));
      setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) leave();
      else setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    }
  }, [leave]);

  useEffect(() => {
    const debounce = setTimeout(() => load(search), 250);
    const refresh = setInterval(() => load(search), REFRESH_MS);
    return () => {
      clearTimeout(debounce);
      clearInterval(refresh);
    };
  }, [search, load]);

  async function markEntry(ticket: AdminTicket) {
    if (!window.confirm(`¿Marcar el ingreso de ${ticket.fullName}?`)) return;
    try {
      await checkInManually(ticket.id);
      await load(search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo marcar el ingreso.');
    }
  }

  const registered = data?.totalRegistered ?? 0;
  const entered = data?.totalCheckedIn ?? 0;

  return (
    <main className="page panel-page">
      <header className="panel-head">
        <div className="brand">
          <span className="logo-chip"><img src="/logo-jbc.jpg" alt="" /></span>
          <span>Cierre de Gloria<small>Panel del equipo</small></span>
        </div>
        <button className="icon-button" onClick={leave} aria-label="Cerrar sesión"><LogOut size={20} /></button>
      </header>

      <section className="stats" aria-live="polite">
        <div><strong>{registered}</strong><span>Registrados</span></div>
        <div className="accent"><strong>{entered}</strong><span>Ingresaron</span></div>
        <div><strong>{registered - entered}</strong><span>Faltan</span></div>
      </section>

      <Link className="primary scan-link" to="/admin/escaner"><QrCode size={22} />Escanear entradas</Link>

      <section className="card list">
        <label className="search">
          <Search size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, celular o código" aria-label="Buscar invitado" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {data && data.tickets.length === 0 && (
          <p className="empty">{search ? 'No hay resultados para esa búsqueda.' : 'Todavía no hay invitados registrados.'}</p>
        )}
        <ul>
          {data?.tickets.map(ticket => (
            <li key={ticket.id}>
              <div>
                <p className="row-name">{ticket.fullName}</p>
                <p className="row-meta">{ticket.phone} · {ticket.ticketCode}</p>
              </div>
              {ticket.checkedInAt
                ? <span className="pill done"><Check size={15} />{time(ticket.checkedInAt)}</span>
                : <button className="small-button" onClick={() => markEntry(ticket)}>Marcar ingreso</button>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
