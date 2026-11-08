const BASE = (import.meta.env.VITE_API_URL ?? 'https://lacasa-informatica-aula-back.onrender.com/api').replace(/\/$/, '');
const PREFIX = `${BASE}/cierregloria`;
const SESSION_KEY = 'cdg.session';

export interface PublicTicket {
  fullName: string;
  ticketCode: string;
  createdAt: string;
  checkedIn: boolean;
}

export interface AdminTicket {
  id: number;
  fullName: string;
  phone: string;
  ticketCode: string;
  createdAt: string;
  checkedInAt: string | null;
}

export interface TicketList {
  totalRegistered: number;
  totalCheckedIn: number;
  tickets: AdminTicket[];
}

export type CheckInResult = 'valid' | 'used' | 'invalid';

export interface CheckIn {
  result: CheckInResult;
  ticket: AdminTicket | null;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const store = {
  get: (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* el navegador puede bloquearlo */ }
  },
  remove: (key: string) => {
    try { localStorage.removeItem(key); } catch { /* el navegador puede bloquearlo */ }
  },
};

export const getSession = () => store.get(SESSION_KEY);
export const clearSession = () => store.remove(SESSION_KEY);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  let response: Response;
  try {
    response = await fetch(PREFIX + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { 'X-Cierre-Gloria-Session': session } : {}),
      },
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Inténtalo de nuevo.', 0);
  }

  if (response.ok) return response.json() as Promise<T>;

  if (response.status === 429) throw new ApiError('Demasiados intentos. Espera un minuto.', 429);
  const body = await response.json().catch(() => null) as { message?: string } | null;
  throw new ApiError(body?.message ?? 'Algo salió mal. Inténtalo de nuevo.', response.status);
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const registerGuest = (fullName: string, phone: string, website: string) =>
  post<{ token: string; ticket: PublicTicket }>('/register', { fullName, phone, website });

export const fetchTicket = (token: string) =>
  request<PublicTicket>(`/tickets/${encodeURIComponent(token)}`);

export async function login(email: string, password: string) {
  const { session } = await post<{ session: string }>('/staff/login', { email, password });
  store.set(SESSION_KEY, session);
}

export const fetchTickets = (search: string) =>
  request<TicketList>(`/staff/tickets?search=${encodeURIComponent(search)}`);

export const checkInToken = (token: string) => post<CheckIn>('/staff/check-in', { token });

export const checkInManually = (id: number) => post<CheckIn>(`/staff/tickets/${id}/check-in`);

// Tickets creados en este celular, para volver a abrirlos sin buscar el enlace
const SAVED_KEY = 'cdg.tickets';
export interface SavedTicket { token: string; fullName: string }

export function savedTickets(): SavedTicket[] {
  try {
    return JSON.parse(store.get(SAVED_KEY) ?? '[]') as SavedTicket[];
  } catch {
    return [];
  }
}

export function saveTicket(ticket: SavedTicket) {
  store.set(SAVED_KEY, JSON.stringify([ticket, ...savedTickets().filter(t => t.token !== ticket.token)].slice(0, 8)));
}
