import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { CalendarDays, Check, Copy, Download, LoaderCircle, MapPin, Plus } from 'lucide-react';
import { ApiError, fetchTicket, PublicTicket } from '../lib/api';
import { EVENT, eventWhen, eventWhere } from '../event.config';

export default function TicketPage() {
  const { token = '' } = useParams();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/t/${token}`;

  useEffect(() => {
    fetchTicket(token).then(setTicket).catch((e: ApiError) => {
      setError(e.status === 404 ? 'Este ticket no existe. Revisa que el enlace esté completo.' : e.message);
    });
    QRCode.toDataURL(link, { width: 520, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0f1c38', light: '#ffffff' } }).then(setQr);
  }, [token, link]);

  async function download() {
    if (!ticket) return;
    setSaving(true);
    setError('');
    try {
      const { buildTicketPdf } = await import('../lib/ticketPdf');
      const blob = await buildTicketPdf(ticket.fullName, ticket.ticketCode, link);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ticket-cierre-de-gloria-${ticket.ticketCode}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError('No se pudo crear el PDF. Toma una captura de pantalla de tu ticket.');
    }
    setSaving(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar. Descarga el PDF del ticket.');
    }
  }

  if (!ticket) {
    return (
      <main className="page center-page">
        {error
          ? <div className="card notice"><p>{error}</p><Link className="primary" to="/">Ir al registro</Link></div>
          : <LoaderCircle className="spin light" size={36} aria-label="Cargando ticket" />}
      </main>
    );
  }

  return (
    <main className="page ticket-page">
      <article className="ticket">
        <header className="ticket-head">
          <div className="brand">
            <span className="logo-chip"><img src="/logo-jbc.jpg" alt="Logo de Jesús el Buen Camino" /></span>
            <span>{EVENT.organizer}<small>Entrada gratuita</small></span>
          </div>
          <h1 className="event-title small">Cierre de <em>Gloria</em></h1>
        </header>
        <section className="ticket-body">
          <p className="overline">Entrada a nombre de</p>
          <p className="guest">{ticket.fullName}</p>
          <ul className="facts dark">
            <li><CalendarDays size={18} />{eventWhen()}</li>
            <li><MapPin size={18} />{eventWhere()}</li>
          </ul>
        </section>
        <div className="perforation" />
        <section className="ticket-stub">
          {qr && <img src={qr} alt="Código QR de entrada" />}
          <p className="code">{ticket.ticketCode}</p>
          {ticket.checkedIn
            ? <p className="pill done"><Check size={16} />Ingreso registrado</p>
            : <p className="fine">Muestra este código en la entrada. Es personal y solo sirve una vez.</p>}
        </section>
      </article>

      {error && <p className="error on-dark" role="alert">{error}</p>}
      <div className="actions">
        <button className="primary" onClick={download} disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={20} /> : <Download size={20} />}Descargar PDF
        </button>
        <button className="ghost" onClick={copy}>
          {copied ? <Check size={20} /> : <Copy size={20} />}{copied ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
      </div>
      <Link className="quiet" to="/"><Plus size={16} />Registrar a otra persona</Link>
    </main>
  );
}
