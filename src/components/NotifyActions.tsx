import { useState } from 'react';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Form';
import { addDays, parseBogotaDate, toBogotaDateString } from '@/lib/format';
import {
  type NotifyOrder,
  buildCustomerMessage,
  buildDaySummaryMessage,
  buildTeamMessage,
  copyText,
  downloadIcs,
  googleCalendarUrl,
  loadNotifySettings,
  mailtoUrl,
  normalizePhone,
  saveNotifySettings,
  summarizeDay,
  formatHourOnly,
  whatsappUrl,
} from '@/lib/notify';
import { BellRing, CalendarPlus, CalendarDays, Copy, Mail, MessageCircle, Send, Smartphone } from 'lucide-react';

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ------------------------------------------------------------------ */
/*  Botones dentro del detalle de un pedido                            */
/* ------------------------------------------------------------------ */

export function OrderNotifyActions({ order }: { order: NotifyOrder }) {
  const [notice, setNotice] = useState('');
  const hasDate = !!order.delivery_at;
  const customerPhone = normalizePhone(order.customer?.phone);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  }

  function addGoogle() {
    const url = googleCalendarUrl(order);
    if (url) openExternal(url);
  }

  function addIcs() {
    const s = loadNotifySettings();
    if (downloadIcs(order, s.leadMinutes)) flash('Archivo descargado: ábrelo para agregarlo a tu calendario.');
  }

  function whatsappTeam() {
    const s = loadNotifySettings();
    openExternal(whatsappUrl(s.teamWhatsapp, buildTeamMessage(order)));
  }

  function whatsappCustomer() {
    openExternal(whatsappUrl(order.customer?.phone, buildCustomerMessage(order)));
  }

  function email() {
    const s = loadNotifySettings();
    openExternal(mailtoUrl(s.email, `Pedido #${order.number} · ${order.customer?.name || ''}`.trim(), buildTeamMessage(order)));
  }

  async function copy() {
    const ok = await copyText(buildTeamMessage(order));
    flash(ok ? 'Resumen copiado ✓' : 'No se pudo copiar');
  }

  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">
        <BellRing size={13} /> Avisos y recordatorios
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button size="sm" variant="outline" leftIcon={<CalendarPlus size={14} />} onClick={addGoogle} disabled={!hasDate} title={hasDate ? '' : 'Este pedido no tiene fecha de entrega'}>
          Google Calendar
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Smartphone size={14} />} onClick={addIcs} disabled={!hasDate} title={hasDate ? '' : 'Este pedido no tiene fecha de entrega'}>
          iPhone / Outlook
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Copy size={14} />} onClick={copy}>
          Copiar resumen
        </Button>
        <Button size="sm" variant="outline" leftIcon={<MessageCircle size={14} />} onClick={whatsappTeam}>
          WhatsApp equipo
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Send size={14} />} onClick={whatsappCustomer} disabled={!customerPhone} title={customerPhone ? '' : 'El cliente no tiene teléfono guardado'}>
          WhatsApp cliente
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Mail size={14} />} onClick={email}>
          Correo
        </Button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-charcoal-700/55">
        Los eventos de calendario avisan {formatLead(loadNotifySettings().leadMinutes)} antes (se cambia en Ajustes → Avisos). Si no hay número guardado, WhatsApp te deja elegir el contacto.
      </p>
      {notice && <p className="mt-1.5 text-xs font-semibold text-emerald-700" role="status">{notice}</p>}
    </div>
  );
}

function formatLead(min: number): string {
  if (min >= 1440) return `${Math.round(min / 1440)} día`;
  if (min >= 60) return `${Math.round(min / 60)} h`;
  return `${min} min`;
}

/* ------------------------------------------------------------------ */
/*  Resumen de entregas del día                                        */
/* ------------------------------------------------------------------ */

export function DeliverySummaryModal({ onClose }: { onClose: () => void }) {
  const { orders, orderItems, payments, customers } = useData();
  const [mode, setMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(toBogotaDateString(new Date()));
  const [notice, setNotice] = useState('');

  const dateStr =
    mode === 'today'
      ? toBogotaDateString(new Date())
      : mode === 'tomorrow'
        ? toBogotaDateString(addDays(new Date(), 1))
        : customDate;
  const day = parseBogotaDate(dateStr);

  const dayOrders: NotifyOrder[] = orders
    .filter((o) => o.status === 'pendiente' && o.delivery_at && toBogotaDateString(new Date(o.delivery_at)) === dateStr)
    .map((o) => ({
      id: o.id,
      number: o.number,
      delivery_at: o.delivery_at,
      notes: o.notes,
      discount: Number(o.discount),
      customer: customers.find((c) => c.id === o.customer_id) || null,
      items: orderItems.filter((i) => i.order_id === o.id),
      payments: payments.filter((p) => p.order_id === o.id),
    }));

  const { orders: sorted, production } = summarizeDay(dayOrders);
  const message = buildDaySummaryMessage(day, dayOrders);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  }

  async function copy() {
    flash((await copyText(message)) ? 'Resumen copiado ✓' : 'No se pudo copiar');
  }

  const chip = (m: typeof mode, label: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      className={`btn-press rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
        mode === m ? 'bg-terracota-500 text-white shadow-soft' : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Resumen de entregas"
      subtitle="Pedidos pendientes del día y total a producir"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-emerald-700" role="status">{notice}</span>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" leftIcon={<Copy size={14} />} onClick={copy}>Copiar</Button>
            <Button size="sm" variant="outline" leftIcon={<Mail size={14} />} onClick={() => openExternal(mailtoUrl(loadNotifySettings().email, `Entregas ${dateStr}`, message))}>Correo</Button>
            <Button size="sm" leftIcon={<MessageCircle size={14} />} onClick={() => openExternal(whatsappUrl(loadNotifySettings().teamWhatsapp, message))}>WhatsApp</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {chip('today', 'Hoy')}
          {chip('tomorrow', 'Mañana')}
          {chip('custom', 'Otra fecha')}
          {mode === 'custom' && <Input type="date" value={customDate} onChange={(e) => e.target.value && setCustomDate(e.target.value)} className="h-8 w-auto text-xs" />}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl bg-cream-50 py-8 text-center">
            <CalendarDays size={24} className="text-charcoal-700/30" />
            <p className="mt-2 text-sm font-semibold text-charcoal-800">Sin pedidos pendientes para este día</p>
            <p className="text-xs text-charcoal-700/55">Los pedidos sin fecha de entrega no aparecen aquí.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {sorted.map((o) => (
                <div key={o.id} className="rounded-lg border border-cream-200 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-charcoal-900">#{o.number} · {o.customer?.name || 'Sin cliente'}</p>
                    <span className="shrink-0 rounded-full bg-terracota-50 px-2.5 py-0.5 text-xs font-bold text-terracota-600">{formatHourOnly(o.delivery_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-charcoal-700/70">{o.items.map((i) => `${i.quantity} ${i.product_name}`).join(' · ')}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-cream-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-700/60">Producción total del día</p>
              <div className="flex flex-wrap gap-2">
                {production.map((p) => (
                  <span key={p.name} className="rounded-lg bg-white px-3 py-1.5 text-sm text-charcoal-800 shadow-soft">
                    <strong className="text-terracota-600">{p.quantity}</strong> × {p.name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Tarjeta de ajustes (Ajustes → Avisos)                              */
/* ------------------------------------------------------------------ */

export function NotificationSettingsCard({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const initial = loadNotifySettings();
  const [teamWhatsapp, setTeamWhatsapp] = useState(initial.teamWhatsapp);
  const [email, setEmail] = useState(initial.email);
  const [leadMinutes, setLeadMinutes] = useState(String(initial.leadMinutes));

  function save() {
    const cleanEmail = email.trim();
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      showToast('El correo no parece válido', 'error');
      return;
    }
    const phone = teamWhatsapp.trim();
    if (phone && normalizePhone(phone).length < 10) {
      showToast('El número de WhatsApp parece incompleto', 'error');
      return;
    }
    const ok = saveNotifySettings({ teamWhatsapp: phone, email: cleanEmail, leadMinutes: Number(leadMinutes) || 60 });
    showToast(ok ? 'Avisos guardados en este dispositivo' : 'No se pudo guardar', ok ? 'success' : 'error');
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracota-50 text-terracota-500"><BellRing size={18} /></div>
        <div>
          <h2 className="font-display text-base font-bold text-charcoal-900">Avisos y recordatorios</h2>
          <p className="text-xs text-charcoal-700/60">A quién se envían los resúmenes de pedidos y con cuánta anticipación avisa el calendario</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="WhatsApp del equipo" hint="Con o sin +57. Ej: 300 123 4567">
          <Input type="tel" inputMode="tel" value={teamWhatsapp} onChange={(e) => setTeamWhatsapp(e.target.value)} placeholder="300 123 4567" />
        </Field>
        <Field label="Correo para avisos" hint="Opcional">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
        </Field>
        <Field label="Recordar en el calendario" hint="Alarma antes de la hora de entrega">
          <Select value={leadMinutes} onChange={(e) => setLeadMinutes(e.target.value)}>
            <option value="15">15 minutos antes</option>
            <option value="30">30 minutos antes</option>
            <option value="60">1 hora antes</option>
            <option value="120">2 horas antes</option>
            <option value="1440">1 día antes</option>
          </Select>
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-md text-[11px] leading-snug text-charcoal-700/55">
          Por ahora estos datos se guardan solo en este dispositivo (celular o computador). Cuando activemos los avisos automáticos pasarán a la base de datos.
        </p>
        <Button onClick={save}>Guardar</Button>
      </div>
    </div>
  );
}
