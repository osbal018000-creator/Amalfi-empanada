import type { Customer, OrderItem, Payment } from './types';
import { computeOrderTotals, orderBalance } from './calc';
import { formatCOP } from './format';

/* ------------------------------------------------------------------ */
/*  Ajustes de avisos (Etapa 1: se guardan en este dispositivo)        */
/* ------------------------------------------------------------------ */

export interface NotifySettings {
  teamWhatsapp: string;
  email: string;
  leadMinutes: number;
}

export const DEFAULT_NOTIFY_SETTINGS: NotifySettings = {
  teamWhatsapp: '',
  email: '',
  leadMinutes: 60,
};

const STORAGE_KEY = 'amalfi.notify.v1';

export function loadNotifySettings(): NotifySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFY_SETTINGS };
    return { ...DEFAULT_NOTIFY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFY_SETTINGS };
  }
}

export function saveNotifySettings(s: NotifySettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Tipos y formato                                                    */
/* ------------------------------------------------------------------ */

export interface NotifyOrder {
  id: string;
  number: number;
  delivery_at: string | null;
  notes: string | null;
  discount: number;
  customer?: Customer | null;
  items: OrderItem[];
  payments: Payment[];
}

const TZ = 'America/Bogota';

/** Ej.: "sáb, 25 oct, 3:00 p. m." */
export function formatDeliveryLong(iso: string | null): string {
  if (!iso) return 'Sin fecha de entrega';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Sin fecha de entrega';
  return d.toLocaleString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  });
}

export function formatHourOnly(iso: string | null): string {
  if (!iso) return 'Sin hora';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Sin hora';
  return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

export function formatDayLong(d: Date): string {
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
}

function itemsLines(items: OrderItem[]): string[] {
  return items.map((i) => `• ${i.quantity} × ${i.product_name}`);
}

/* ------------------------------------------------------------------ */
/*  Mensajes                                                           */
/* ------------------------------------------------------------------ */

/** Mensaje para el equipo / cocina. */
export function buildTeamMessage(o: NotifyOrder): string {
  const totals = computeOrderTotals(o.items, Number(o.discount));
  const balance = orderBalance(totals.total, o.payments);
  const lines = [
    `🥟 *Pedido #${o.number}* — ${o.customer?.name || 'Sin cliente'}`,
    `📅 Entrega: ${formatDeliveryLong(o.delivery_at)}`,
    ...itemsLines(o.items),
    `Total: ${formatCOP(totals.total)} · Saldo: ${formatCOP(balance)}`,
  ];
  if (o.customer?.address) lines.push(`📍 ${o.customer.address}`);
  if (o.notes) lines.push(`📝 ${o.notes}`);
  return lines.join('\n');
}

/** Mensaje de confirmación para el cliente. */
export function buildCustomerMessage(o: NotifyOrder): string {
  const totals = computeOrderTotals(o.items, Number(o.discount));
  const balance = orderBalance(totals.total, o.payments);
  const name = o.customer?.name?.split(' ')[0] || '';
  const lines = [
    `Hola${name ? ` ${name}` : ''} 👋, te confirmo tu pedido #${o.number}:`,
    ...itemsLines(o.items),
    `📅 Entrega: ${formatDeliveryLong(o.delivery_at)}`,
    `Total: ${formatCOP(totals.total)}${balance > 0 ? ` · Saldo pendiente: ${formatCOP(balance)}` : ' · Pagado ✅'}`,
    '¡Gracias por tu compra!',
  ];
  return lines.join('\n');
}

export interface DaySummary {
  orders: NotifyOrder[];
  production: { name: string; quantity: number }[];
}

export function summarizeDay(orders: NotifyOrder[]): DaySummary {
  const sorted = [...orders].sort((a, b) => (a.delivery_at || '').localeCompare(b.delivery_at || ''));
  const map = new Map<string, number>();
  for (const o of sorted) {
    for (const i of o.items) map.set(i.product_name, (map.get(i.product_name) || 0) + Number(i.quantity));
  }
  const production = [...map.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
  return { orders: sorted, production };
}

/** Resumen de entregas de un día (para el equipo). */
export function buildDaySummaryMessage(day: Date, orders: NotifyOrder[]): string {
  const { orders: sorted, production } = summarizeDay(orders);
  const head = `🥟 *Entregas — ${formatDayLong(day)}*`;
  if (sorted.length === 0) return `${head}\nNo hay pedidos pendientes para este día.`;
  const lines = [head, `${sorted.length} pedido(s) pendiente(s)`, ''];
  sorted.forEach((o) => {
    const prods = o.items.map((i) => `${i.quantity} ${i.product_name}`).join(', ');
    lines.push(`⏰ ${formatHourOnly(o.delivery_at)} · #${o.number} ${o.customer?.name || 'Sin cliente'}`);
    lines.push(`   ${prods}`);
  });
  lines.push('', '*Producción total:*');
  production.forEach((p) => lines.push(`• ${p.quantity} × ${p.name}`));
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Enlaces: WhatsApp, correo, calendario                              */
/* ------------------------------------------------------------------ */

/** Deja solo dígitos y agrega 57 (Colombia) a celulares de 10 dígitos. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('3')) digits = `57${digits}`;
  return digits;
}

/** Sin número, WhatsApp deja elegir el contacto. */
export function whatsappUrl(phone: string | null | undefined, text: string): string {
  const n = normalizePhone(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function eventTitle(o: NotifyOrder): string {
  const units = o.items.reduce((s, i) => s + Number(i.quantity), 0);
  return `Entrega #${o.number}: ${o.customer?.name || 'Sin cliente'} (${units} und.)`;
}

function eventDescription(o: NotifyOrder): string {
  const totals = computeOrderTotals(o.items, Number(o.discount));
  const balance = orderBalance(totals.total, o.payments);
  const lines = [...itemsLines(o.items), `Total: ${formatCOP(totals.total)} · Saldo: ${formatCOP(balance)}`];
  if (o.notes) lines.push(`Obs.: ${o.notes}`);
  return lines.join('\n');
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

const EVENT_MINUTES = 30;

export function googleCalendarUrl(o: NotifyOrder): string | null {
  if (!o.delivery_at) return null;
  const start = new Date(o.delivery_at);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + EVENT_MINUTES * 60000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(o),
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details: eventDescription(o),
  });
  if (o.customer?.address) params.set('location', o.customer.address);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Archivo .ics (Apple, Outlook, Android) con alarma antes de la entrega. */
export function buildIcs(o: NotifyOrder, leadMinutes: number): string | null {
  if (!o.delivery_at) return null;
  const start = new Date(o.delivery_at);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + EVENT_MINUTES * 60000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amalfi Empanada//Pedidos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:pedido-${o.id}@amalfi-empanada`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(eventTitle(o))}`,
    `DESCRIPTION:${icsEscape(eventDescription(o))}`,
  ];
  if (o.customer?.address) lines.push(`LOCATION:${icsEscape(o.customer.address)}`);
  lines.push(
    'BEGIN:VALARM',
    `TRIGGER:-PT${Math.max(0, Math.round(leadMinutes))}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`Entrega del pedido #${o.number}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );
  return lines.join('\r\n');
}

export function downloadIcs(o: NotifyOrder, leadMinutes: number): boolean {
  const ics = buildIcs(o, leadMinutes);
  if (!ics) return false;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedido-${o.number}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
