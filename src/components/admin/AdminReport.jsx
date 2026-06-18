import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, ShoppingBag, Users, Clock, RefreshCw, CalendarDays } from 'lucide-react';
import { startOfDay, subDays } from 'date-fns';

export default function AdminReport() {
  const [ordini, setOrdini] = useState([]);
  const [righe, setRighe] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('oggi');

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [ords, rigs, res] = await Promise.all([
      base44.entities.Ordine.list('-created_date', 500),
      base44.entities.RigaOrdine.list('-created_date', 1000),
      base44.entities.Reservation.filter({ res_date: today }, '-created_date', 50).catch(() => []),
    ]);
    setOrdini(ords);
    setRighe(rigs);
    setReservations(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filterByPeriodo = (items) => {
    const now = new Date();
    const from = periodo === 'oggi' ? startOfDay(now) :
      periodo === '7giorni' ? subDays(now, 7) :
      periodo === '30giorni' ? subDays(now, 30) : new Date(0);
    return items.filter(o => new Date(o.created_date) >= from);
  };

  const ordFiltrati = filterByPeriodo(ordini).filter(o => o.stato === 'chiuso' && o.pagato);
  const righeFiltrate = filterByPeriodo(righe).filter(r => r.stato !== 'annullato' && r.stato !== 'bozza');

  const totaleVendite = ordFiltrati.reduce((s, o) => s + (o.totale || 0), 0);
  const numOrdini = ordFiltrati.length;

  // Ordini attivi oggi (non chiusi)
  const ordiniAttivi = filterByPeriodo(ordini).filter(o => !['chiuso','annullato'].includes(o.stato));

  // Top piatti
  const countItems = righeFiltrate.reduce((acc, r) => {
    if (!acc[r.nome_item]) acc[r.nome_item] = { nome: r.nome_item, reparto: r.reparto, qty: 0, totale: 0 };
    acc[r.nome_item].qty += r.quantita || 0;
    acc[r.nome_item].totale += r.prezzo_totale || 0;
    return acc;
  }, {});
  const topItems = Object.values(countItems).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const topCucina = topItems.filter(i => i.reparto === 'cucina').slice(0, 5);
  const topBar = topItems.filter(i => i.reparto === 'bar').slice(0, 5);

  // Per cameriere
  const perCameriere = ordFiltrati.reduce((acc, o) => {
    const nome = o.cameriere_nome || 'Sconosciuto';
    if (!acc[nome]) acc[nome] = { nome, ordini: 0, totale: 0 };
    acc[nome].ordini++;
    acc[nome].totale += o.totale || 0;
    return acc;
  }, {});

  // Tempi medi preparazione cucina
  const righeConTempo = righeFiltrate.filter(r => r.reparto === 'cucina' && r.sent_at && r.ready_at);
  const tempoMedioCucina = righeConTempo.length > 0
    ? Math.round(righeConTempo.reduce((s, r) => s + (new Date(r.ready_at) - new Date(r.sent_at)) / 60000, 0) / righeConTempo.length)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Report</h2>
        <div className="flex items-center gap-2">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]">
            <option value="oggi">Oggi</option>
            <option value="7giorni">Ultimi 7 giorni</option>
            <option value="30giorni">Ultimi 30 giorni</option>
            <option value="tutto">Tutto</option>
          </select>
          <button onClick={load} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard icon={TrendingUp} label="Vendite" value={`€${totaleVendite.toFixed(2)}`} color="text-[#C69C6D]" />
            <KpiCard icon={ShoppingBag} label="Ordini chiusi" value={numOrdini} color="text-green-400" />
            <KpiCard icon={Clock} label="Ordini attivi" value={ordiniAttivi.length} color="text-yellow-400" />
            <KpiCard icon={CalendarDays} label="Prenotazioni oggi" value={reservations.length} color="text-blue-400" />
          </div>

          {/* Prenotazioni del giorno */}
          {reservations.length > 0 && (
            <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-5 mb-6">
              <h3 className="font-body text-sm text-[#E5E5E5]/60 mb-4">📅 Prenotazioni di oggi</h3>
              <div className="space-y-2">
                {reservations.map(r => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-[#C69C6D]/5 last:border-0">
                    <div>
                      <p className="font-body text-sm text-white">{r.customer_name}</p>
                      <p className="font-body text-xs text-[#E5E5E5]/40">{r.guests} persone · {r.res_time}</p>
                    </div>
                    <span className={`text-xs font-body border px-2.5 py-1 rounded-full ${
                      r.status === 'confirmed' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                      r.status === 'cancelled' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
                      'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                    }`}>
                      {r.status === 'confirmed' ? 'Confermata' : r.status === 'cancelled' ? 'Annullata' : 'In attesa'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="🍽 Piatti più venduti">
              {topCucina.length === 0 ? <Empty /> : topCucina.map((item, i) => (
                <Row key={item.nome} rank={i+1} label={item.nome} value={`${item.qty} pz`} sub={`€${item.totale.toFixed(2)}`} />
              ))}
            </Section>

            <Section title="🍹 Bevande più vendute">
              {topBar.length === 0 ? <Empty /> : topBar.map((item, i) => (
                <Row key={item.nome} rank={i+1} label={item.nome} value={`${item.qty} pz`} sub={`€${item.totale.toFixed(2)}`} />
              ))}
            </Section>

            <Section title="👤 Totale per cameriere">
              {Object.keys(perCameriere).length === 0 ? <Empty /> :
                Object.values(perCameriere).sort((a,b) => b.totale - a.totale).map((c, i) => (
                  <Row key={c.nome} rank={i+1} label={c.nome} value={`€${c.totale.toFixed(2)}`} sub={`${c.ordini} ordini`} />
                ))
              }
            </Section>

            <Section title="💳 Metodi di pagamento">
              {(() => {
                const mp = ordFiltrati.reduce((acc, o) => {
                  const m = o.metodo_pagamento || 'n.d.';
                  if (!acc[m]) acc[m] = 0;
                  acc[m]++;
                  return acc;
                }, {});
                return Object.keys(mp).length === 0 ? <Empty /> :
                  Object.entries(mp).sort((a,b) => b[1]-a[1]).map(([m, c], i) => (
                    <Row key={m} rank={i+1} label={m} value={`${c} volte`} />
                  ));
              })()}
            </Section>

            {tempoMedioCucina !== null && (
              <Section title="⏱ Tempo medio preparazione cucina">
                <div className="text-center py-4">
                  <span className="font-display text-5xl text-[#C69C6D]">{tempoMedioCucina}</span>
                  <span className="font-body text-[#E5E5E5]/40 ml-2">minuti</span>
                </div>
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4">
      <Icon size={18} className={`${color} mb-2`} />
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="font-body text-xs text-[#E5E5E5]/40 mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-5">
      <h3 className="font-body text-sm text-[#E5E5E5]/60 mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ rank, label, value, sub }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-body text-xs text-[#E5E5E5]/20 w-4">{rank}</span>
      <span className="font-body text-sm text-[#E5E5E5]/80 flex-1 truncate">{label}</span>
      <span className="font-body text-sm text-[#C69C6D] font-semibold">{value}</span>
      {sub && <span className="font-body text-xs text-[#E5E5E5]/30 w-20 text-right">{sub}</span>}
    </div>
  );
}

function Empty() {
  return <p className="font-body text-xs text-[#E5E5E5]/30 text-center py-4">Nessun dato nel periodo selezionato</p>;
}