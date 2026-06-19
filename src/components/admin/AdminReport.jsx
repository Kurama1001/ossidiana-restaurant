import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, ShoppingBag, Clock, RefreshCw, CalendarDays, GripVertical } from 'lucide-react';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const GOLD = '#C69C6D';
const DARK_BG = '#161618';
const TEXT_DIM = 'rgba(229,229,229,0.4)';
const PIE_COLORS_GOLD = ['#C69C6D','#e85d04','#f48c06','#6a994e','#8338ec','#ef476f'];
const PIE_COLORS_BLUE = ['#60a5fa','#f72585','#4cc9f0','#f77f00','#06d6a0','#9b5de5'];

// Blocchi disponibili — l'utente può riordinarli
const BLOCKS_DEFAULT = ['kpi', 'vendite_grafico', 'prenotazioni', 'piatti', 'bevande'];

export default function AdminReport() {
  const [ordini, setOrdini] = useState([]);
  const [ordiniAsporto, setOrdiniAsporto] = useState([]);
  const [righe, setRighe] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('oggi');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [blocchi, setBlocchi] = useState(() => {
    try {
      const saved = localStorage.getItem('report_blocchi');
      return saved ? JSON.parse(saved) : BLOCKS_DEFAULT;
    } catch { return BLOCKS_DEFAULT; }
  });

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [ords, rigs, res, ordersAsporto] = await Promise.all([
      base44.entities.Ordine.list('-created_date', 500),
      base44.entities.RigaOrdine.list('-created_date', 1000),
      base44.entities.Reservation.filter({ res_date: today }, '-created_date', 50).catch(() => []),
      base44.entities.Order.list('-created_date', 500).catch(() => []),
    ]);
    setOrdini(ords);
    setRighe(rigs);
    setReservations(res);
    setOrdiniAsporto(ordersAsporto);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filterByPeriodo = (items, dateField = 'created_date') => {
    const now = new Date();
    let from, to;
    if (periodo === 'custom') {
      from = dateFrom ? new Date(dateFrom) : new Date(0);
      to = dateTo ? new Date(dateTo + 'T23:59:59') : now;
    } else {
      to = now;
      from = periodo === 'oggi' ? startOfDay(now)
           : periodo === '7giorni' ? subDays(now, 7)
           : periodo === '30giorni' ? subDays(now, 30)
           : new Date(0);
    }
    return items.filter(o => {
      const d = new Date(o[dateField]);
      return d >= from && d <= to;
    });
  };

  const ordFiltrati = filterByPeriodo(ordini).filter(o => !['aperto', 'annullato'].includes(o.stato));
  const asportoFiltrati = filterByPeriodo(ordiniAsporto).filter(o => o.status !== 'annullato');
  const righeFiltrate = filterByPeriodo(righe).filter(r => !['annullato', 'bozza'].includes(r.stato));

  const totaleLocale = ordFiltrati.reduce((s, o) => s + (o.totale || 0), 0);
  const totaleAsporto = asportoFiltrati.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totaleVendite = totaleLocale + totaleAsporto;
  const numOrdiniLocale = ordFiltrati.length;
  const numOrdiniAsporto = asportoFiltrati.length;
  const ordiniAttivi = filterByPeriodo(ordini).filter(o => !['chiuso', 'annullato'].includes(o.stato));

  // Top cucina / bar
  const countItems = righeFiltrate.reduce((acc, r) => {
    if (!acc[r.nome_item]) acc[r.nome_item] = { nome: r.nome_item, reparto: r.reparto, qty: 0, totale: 0 };
    acc[r.nome_item].qty += r.quantita || 0;
    acc[r.nome_item].totale += r.prezzo_totale || 0;
    return acc;
  }, {});
  const topItems = Object.values(countItems).sort((a, b) => b.qty - a.qty);
  const topCucina = topItems.filter(i => i.reparto === 'cucina').slice(0, 8);
  const topBar = topItems.filter(i => i.reparto === 'bar').slice(0, 8);

  // Grafico vendite giornaliere
  const venditeDailyData = (() => {
    const now = new Date();
    let days;
    if (periodo === 'oggi') {
      // Raggruppamento per ora
      const ore = Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, locale: 0, asporto: 0 }));
      ordFiltrati.forEach(o => {
        const h = new Date(o.created_date).getHours();
        ore[h].locale += o.totale || 0;
      });
      asportoFiltrati.forEach(o => {
        const h = new Date(o.created_date).getHours();
        ore[h].asporto += o.total_amount || 0;
      });
      return ore.filter(o => o.locale > 0 || o.asporto > 0);
    }
    const from = periodo === '7giorni' ? subDays(now, 6)
               : periodo === '30giorni' ? subDays(now, 29)
               : periodo === 'custom' && dateFrom ? new Date(dateFrom)
               : subDays(now, 29);
    const to = periodo === 'custom' && dateTo ? new Date(dateTo) : now;
    days = eachDayOfInterval({ start: from, end: to });
    return days.map(d => {
      const label = format(d, 'd MMM', { locale: it });
      const dayStr = format(d, 'yyyy-MM-dd');
      const locale = ordFiltrati
        .filter(o => o.created_date?.startsWith(dayStr))
        .reduce((s, o) => s + (o.totale || 0), 0);
      const asporto = asportoFiltrati
        .filter(o => o.created_date?.startsWith(dayStr))
        .reduce((s, o) => s + (o.total_amount || 0), 0);
      return { label, locale, asporto };
    });
  })();

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = [...blocchi];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setBlocchi(newOrder);
    localStorage.setItem('report_blocchi', JSON.stringify(newOrder));
  };

  const renderBlock = (id) => {
    switch (id) {
      case 'kpi':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={TrendingUp} label="Vendite totali" value={`€${totaleVendite.toFixed(2)}`} color="text-[#C69C6D]"
              sub={`€${totaleLocale.toFixed(2)} locale · €${totaleAsporto.toFixed(2)} asporto`} />
            <KpiCard icon={ShoppingBag} label="Ordini" value={numOrdiniLocale + numOrdiniAsporto} color="text-green-400"
              sub={`${numOrdiniLocale} locale · ${numOrdiniAsporto} asporto`} />
            <KpiCard icon={Clock} label="Tavoli attivi" value={ordiniAttivi.length} color="text-yellow-400" />
            <KpiCard icon={CalendarDays} label="Prenotazioni oggi" value={reservations.length} color="text-blue-400" />
          </div>
        );

      case 'vendite_grafico':
        return (
          <BlockShell title="📈 Andamento vendite">
            {venditeDailyData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={venditeDailyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: TEXT_DIM, fontSize: 11 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} tickFormatter={v => `€${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1c', border: `1px solid ${GOLD}30`, borderRadius: 4 }}
                    labelStyle={{ color: '#E5E5E5', fontSize: 12 }}
                    formatter={(v, name) => [`€${v.toFixed(2)}`, name === 'locale' ? 'Locale' : 'Asporto']}
                  />
                  <Legend formatter={v => v === 'locale' ? 'Locale' : 'Asporto'} wrapperStyle={{ fontSize: 12, color: TEXT_DIM }} />
                  <Line type="monotone" dataKey="locale" stroke={GOLD} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="asporto" stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </BlockShell>
        );

      case 'piatti':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BlockShell title="🍽 Piatti più venduti — classifica">
              {topCucina.length === 0 ? <Empty /> : topCucina.map((item, i) => (
                <Row key={item.nome} rank={i + 1} label={item.nome} value={`${item.qty} pz`} sub={`€${item.totale.toFixed(2)}`} />
              ))}
            </BlockShell>
            <BlockShell title="🍽 Piatti — grafico a torta">
              {topCucina.length === 0 ? <Empty /> : <PieBlock data={topCucina.slice(0, 6)} colors={PIE_COLORS_GOLD} />}
            </BlockShell>
          </div>
        );

      case 'bevande':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BlockShell title="🍹 Bevande più vendute — classifica">
              {topBar.length === 0 ? <Empty /> : topBar.map((item, i) => (
                <Row key={item.nome} rank={i + 1} label={item.nome} value={`${item.qty} pz`} sub={`€${item.totale.toFixed(2)}`} />
              ))}
            </BlockShell>
            <BlockShell title="🍹 Bevande — grafico a torta">
              {topBar.length === 0 ? <Empty /> : <PieBlock data={topBar.slice(0, 6)} colors={PIE_COLORS_BLUE} />}
            </BlockShell>
          </div>
        );

      case 'prenotazioni':
        return reservations.length === 0 ? null : (
          <BlockShell title="📅 Prenotazioni di oggi">
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
          </BlockShell>
        );

      default: return null;
    }
  };

  return (
    <div>
      {/* Header con filtri */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Report</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]">
            <option value="oggi">Oggi</option>
            <option value="7giorni">Ultimi 7 giorni</option>
            <option value="30giorni">Ultimi 30 giorni</option>
            <option value="tutto">Tutto</option>
            <option value="custom">Personalizzato</option>
          </select>
          {periodo === 'custom' && (
            <>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]" />
              <span className="text-[#E5E5E5]/40 font-body text-sm">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]" />
            </>
          )}
          <button onClick={load} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <p className="font-body text-xs text-[#E5E5E5]/20 mb-4 flex items-center gap-1">
        <GripVertical size={12} /> Trascina i blocchi per riorganizzare il report
      </p>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="report-blocks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-6">
                {blocchi.map((id, index) => {
                  const content = renderBlock(id);
                  if (!content) return null;
                  return (
                    <Draggable key={id} draggableId={id} index={index}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={`transition-opacity ${snapshot.isDragging ? 'opacity-80 shadow-2xl' : ''}`}
                        >
                          <div className="relative group">
                            {/* Drag handle */}
                            <div
                              {...prov.dragHandleProps}
                              className="absolute -left-6 top-3 opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity cursor-grab active:cursor-grabbing text-[#E5E5E5]"
                            >
                              <GripVertical size={16} />
                            </div>
                            {content}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4">
      <Icon size={18} className={`${color} mb-2`} />
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="font-body text-xs text-[#E5E5E5]/40 mt-1">{label}</div>
      {sub && <div className="font-body text-[10px] text-[#E5E5E5]/25 mt-1 leading-tight">{sub}</div>}
    </div>
  );
}

function BlockShell({ title, children }) {
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

function PieBlock({ data, colors }) {
  const pieData = data.map(d => ({ name: d.nome, value: d.qty }));
  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={36}>
            {pieData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1a1a1c', border: `1px solid ${GOLD}30`, borderRadius: 4 }}
            formatter={(v, name) => [`${v} pz`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {pieData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="font-body text-xs text-[#E5E5E5]/50 truncate max-w-[120px]">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}