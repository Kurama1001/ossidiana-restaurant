import { useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Clock, Pencil, Check, Move, Table2, X, MapPin, Plus, Trash2 } from 'lucide-react';
import { isCancelledStatus, isConfirmedStatus, isPendingStatus, getTurno, formatDateLong } from './utils';

const TABLE_W = 104;
const TABLE_H = 92;
const COLS = 6;
const GRID_SIZE = 20;

export default function FloorPlanView({ tavoli, dayReservations, selectedDate, onRefresh }) {
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [localPositions, setLocalPositions] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [editingNum, setEditingNum] = useState(null);
  const [numValue, setNumValue] = useState('');
  const [editingCoperti, setEditingCoperti] = useState(null);
  const [copertiValue, setCopertiValue] = useState('');
  const [addingTable, setAddingTable] = useState(false);
  const containerRef = useRef(null);

  // Map of tavolo_id -> reservation (active only)
  const tableReservations = useMemo(() => {
    const map = {};
    dayReservations.forEach(r => {
      if (r.tavolo_id && !isCancelledStatus(r.status)) {
        map[r.tavolo_id] = r;
      }
    });
    return map;
  }, [dayReservations]);

  // Available reservations (confirmed/pending, not assigned to a table)
  const assignableReservations = useMemo(() => {
    return dayReservations
      .filter(r => !r.tavolo_id && !isCancelledStatus(r.status) && (isConfirmedStatus(r.status) || isPendingStatus(r.status)))
      .sort((a, b) => (a.res_time || '').localeCompare(b.res_time || ''));
  }, [dayReservations]);

  // Tables with resolved positions (auto-arrange if missing)
  const positionedTavoli = useMemo(() => {
    return tavoli.map((t, i) => {
      const localPos = localPositions[t.id];
      if (localPos) return { ...t, pos_x: localPos.x, pos_y: localPos.y };
      if (t.pos_x != null && t.pos_y != null) return t;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return { ...t, pos_x: 30 + col * (TABLE_W + 20), pos_y: 30 + row * (TABLE_H + 20) };
    });
  }, [tavoli, localPositions]);

  // ── Drag handlers (pointer events: mouse + touch) ──
  const handlePointerDown = (e, table) => {
    if (!editMode || editingNum === table.id) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const tableRect = e.currentTarget.getBoundingClientRect();
    setDragging({
      id: table.id,
      offsetX: e.clientX - tableRect.left,
      offsetY: e.clientY - tableRect.top,
      containerRect,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const { offsetX, offsetY, containerRect } = dragging;
    const x = e.clientX - containerRect.left - offsetX;
    const y = e.clientY - containerRect.top - offsetY;
    const clampedX = Math.max(0, Math.min(x, containerRect.width - TABLE_W));
    const clampedY = Math.max(0, Math.min(y, containerRect.height - TABLE_H));
    const snappedX = Math.round(clampedX / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(clampedY / GRID_SIZE) * GRID_SIZE;
    setLocalPositions(prev => ({ ...prev, [dragging.id]: { x: snappedX, y: snappedY } }));
  };

  const handlePointerUp = async () => {
    if (!dragging) return;
    const pos = localPositions[dragging.id];
    if (pos) {
      await base44.entities.Tavolo.update(dragging.id, { pos_x: pos.x, pos_y: pos.y }).catch(() => {});
    }
    setDragging(null);
  };

  // ── Inline number editing ──
  const startEditNum = (e, table) => {
    e.stopPropagation();
    setEditingNum(table.id);
    setNumValue(String(table.numero));
  };

  const saveNum = async (tableId) => {
    const n = parseInt(numValue);
    if (!isNaN(n)) {
      await base44.entities.Tavolo.update(tableId, { numero: n }).catch(() => {});
      onRefresh();
    }
    setEditingNum(null);
    setNumValue('');
  };

  // ── Add / delete table ──
  const handleAddTable = async () => {
    setAddingTable(true);
    const maxNum = tavoli.reduce((max, t) => Math.max(max, t.numero || 0), 0);
    const nextNum = maxNum + 1;
    // Place at a free-ish spot (bottom-right area)
    const containerW = containerRef.current?.clientWidth || 400;
    const containerH = containerRef.current?.clientHeight || 600;
    const px = Math.max(20, containerW - TABLE_W - 30);
    const py = Math.max(20, containerH - TABLE_H - 30);
    try {
      await base44.entities.Tavolo.create({
        numero: nextNum,
        coperti: 4,
        stato: 'libero',
        pos_x: px,
        pos_y: py,
      });
      onRefresh();
    } catch (e) {
      console.error('Errore creazione tavolo:', e);
    }
    setAddingTable(false);
  };

  const handleDeleteTable = async (e, table) => {
    e.stopPropagation();
    if (!window.confirm(`Eliminare il Tavolo ${table.numero}?`)) return;
    await base44.entities.Tavolo.delete(table.id).catch(() => {});
    setSelectedTable(null);
    onRefresh();
  };

  // ── Inline coperti editing ──
  const startEditCoperti = (e, table) => {
    e.stopPropagation();
    setEditingCoperti(table.id);
    setCopertiValue(String(table.coperti || ''));
  };

  const saveCoperti = async (tableId) => {
    const n = parseInt(copertiValue);
    if (!isNaN(n)) {
      await base44.entities.Tavolo.update(tableId, { coperti: n }).catch(() => {});
      onRefresh();
    }
    setEditingCoperti(null);
    setCopertiValue('');
  };

  // ── Table assignment ──
  const assignTable = async (tableId, reservationId) => {
    const existing = dayReservations.find(r => r.tavolo_id === tableId && !isCancelledStatus(r.status));
    if (existing) {
      await base44.entities.Reservation.update(existing.id, { tavolo_id: null }).catch(() => {});
    }
    await base44.entities.Reservation.update(reservationId, { tavolo_id: tableId });
    setSelectedTable(null);
    onRefresh();
  };

  const unassignTable = async (tableId) => {
    const res = tableReservations[tableId];
    if (res) {
      await base44.entities.Reservation.update(res.id, { tavolo_id: null });
      setSelectedTable(null);
      onRefresh();
    }
  };

  const reservedCount = Object.keys(tableReservations).length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg text-white tracking-widest">Mappa Sala</h3>
          <span className="font-body text-xs text-[#E5E5E5]/40">{formatDateLong(selectedDate)}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#1a1a1c] border border-[#C69C6D]/30"></div>
              <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-wider">Libero</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-yellow-400/20 border border-yellow-400/50"></div>
              <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-wider">Pranzo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-400/20 border border-blue-400/50"></div>
              <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-wider">Cena</span>
            </div>
          </div>
          {editMode && (
            <button
              onClick={handleAddTable}
              disabled={addingTable}
              className="flex items-center gap-2 px-4 py-2 border border-green-400/40 text-green-400 hover:bg-green-400/10 rounded-sm font-body text-xs uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {addingTable ? <div className="w-3.5 h-3.5 border border-green-400/40 border-t-green-400 rounded-full animate-spin" /> : <Plus size={14} />} Aggiungi Tavolo
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm font-body text-xs uppercase tracking-widest transition-all ${
              editMode
                ? 'bg-[#C69C6D] text-[#0A0A0B] font-bold'
                : 'border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10'
            }`}
          >
            {editMode ? <><Check size={14} /> Fatto</> : <><Move size={14} /> Modifica disposizione</>}
          </button>
        </div>
      </div>

      {editMode && (
        <p className="font-body text-xs text-[#C69C6D]/60 mb-3 flex items-center gap-1">
          <MapPin size={12} /> Trascina per spostare · Click sul numero o sui coperti per modificarli · Usa la X per eliminare
        </p>
      )}

      {/* Floor plan canvas */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-[600px] bg-[#0A0A0B] border border-[#C69C6D]/10 rounded-sm overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(rgba(198,156,109,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(198,156,109,0.04) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      >
        {positionedTavoli.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#E5E5E5]/20">
            <Table2 size={40} className="mb-3 opacity-30" />
            <p className="font-body text-sm">Nessun tavolo configurato</p>
            {editMode ? (
              <button
                onClick={handleAddTable}
                disabled={addingTable}
                className="mt-3 flex items-center gap-2 px-4 py-2 border border-green-400/40 text-green-400 hover:bg-green-400/10 rounded-sm font-body text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {addingTable ? <div className="w-3.5 h-3.5 border border-green-400/40 border-t-green-400 rounded-full animate-spin" /> : <Plus size={14} />} Aggiungi Tavolo
              </button>
            ) : (
              <p className="font-body text-xs mt-1">Attiva "Modifica disposizione" per crearne</p>
            )}
          </div>
        ) : (
          positionedTavoli.map(t => {
            const res = tableReservations[t.id];
            const reserved = !!res;
            const isDragging = dragging?.id === t.id;
            const turno = res ? getTurno(res.res_time) : null;

            return (
              <div
                key={t.id}
                onPointerDown={(e) => handlePointerDown(e, t)}
                onClick={() => !editMode && !isDragging && setSelectedTable(selectedTable === t.id ? null : t.id)}
                className={`absolute select-none transition-shadow ${
                  editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } ${isDragging ? 'z-50 shadow-2xl' : 'z-10'} ${
                  selectedTable === t.id ? 'ring-2 ring-[#C69C6D] ring-offset-2 ring-offset-[#0A0A0B]' : ''
                }`}
                style={{ left: t.pos_x, top: t.pos_y, width: TABLE_W, height: TABLE_H, touchAction: 'none' }}
              >
                <div
                  className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center p-1.5 transition-all ${
                    reserved
                      ? turno === 'pranzo'
                        ? 'bg-yellow-400/15 border-yellow-400/50'
                        : 'bg-blue-400/15 border-blue-400/50'
                      : 'bg-[#1a1a1c] border-[#C69C6D]/25 hover:border-[#C69C6D]/50'
                  }`}
                >
                  {/* Delete button (edit mode) */}
                  {editMode && (
                    <button
                      onClick={(e) => handleDeleteTable(e, t)}
                      onPointerDown={e => e.stopPropagation()}
                      className="absolute -top-2 -right-2 z-20 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Elimina tavolo"
                    >
                      <X size={11} />
                    </button>
                  )}

                  {/* Table number */}
                  {editingNum === t.id ? (
                    <input
                      type="number"
                      value={numValue}
                      onChange={e => setNumValue(e.target.value)}
                      onBlur={() => saveNum(t.id)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNum(t.id); if (e.key === 'Escape') setEditingNum(null); }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                      onPointerDown={e => e.stopPropagation()}
                      className="w-14 text-center bg-[#0A0A0B] border border-[#C69C6D] text-white font-display text-xl rounded-sm outline-none"
                    />
                  ) : (
                    <div
                      className="flex items-center gap-1"
                      onClick={editMode ? (e) => startEditNum(e, t) : undefined}
                    >
                      {editMode && <Pencil size={10} className="text-[#E5E5E5]/30" />}
                      <span className={`font-display text-2xl leading-none ${reserved ? 'text-white' : 'text-[#E5E5E5]/70'}`}>
                        {t.numero}
                      </span>
                    </div>
                  )}

                  {/* Capacity */}
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Users size={10} className={reserved ? 'text-white/60' : 'text-[#E5E5E5]/25'} />
                    {editingCoperti === t.id ? (
                      <input
                        type="number"
                        value={copertiValue}
                        onChange={e => setCopertiValue(e.target.value)}
                        onBlur={() => saveCoperti(t.id)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCoperti(t.id); if (e.key === 'Escape') setEditingCoperti(null); }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        className="w-10 text-center bg-[#0A0A0B] border border-[#C69C6D] text-white font-body text-[10px] rounded-sm outline-none px-0.5"
                      />
                    ) : (
                      <div
                        className="flex items-center gap-0.5"
                        onClick={editMode ? (e) => startEditCoperti(e, t) : undefined}
                      >
                        {editMode && <Pencil size={8} className="text-[#E5E5E5]/25" />}
                        <span className={`font-body text-[10px] ${reserved ? 'text-white/60' : 'text-[#E5E5E5]/30'}`}>
                          {t.coperti || '—'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reservation info */}
                  {reserved && res && (
                    <div className="mt-1 text-center w-full px-0.5">
                      <div className={`flex items-center justify-center gap-0.5 ${turno === 'pranzo' ? 'text-yellow-400' : 'text-blue-400'}`}>
                        <Clock size={9} />
                        <span className="font-body text-[10px] font-semibold">{res.res_time}</span>
                      </div>
                      <p className="font-body text-[9px] text-white/50 truncate">{res.customer_name}</p>
                      <p className="font-body text-[8px] text-white/30">{res.guests} pers.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Table assignment popover */}
        {selectedTable && !editMode && (() => {
          const table = tavoli.find(t => t.id === selectedTable);
          if (!table) return null;
          const res = tableReservations[selectedTable];
          const containerW = containerRef.current?.clientWidth || 400;
          const popoverLeft = Math.min((table.pos_x || 0) + TABLE_W + 8, containerW - 260);
          const popoverTop = Math.max(0, (table.pos_y || 0) - 10);
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSelectedTable(null)} />
              <div
                className="absolute z-50 bg-[#161618] border border-[#C69C6D]/30 rounded-sm p-4 shadow-2xl min-w-[240px]"
                style={{ left: popoverLeft, top: popoverTop }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-lg text-white">Tavolo {table.numero}</span>
                  <button onClick={() => setSelectedTable(null)} className="text-[#E5E5E5]/30 hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                {res ? (
                  <div>
                    <div className="p-2 bg-[#0A0A0B] rounded-sm mb-3">
                      <p className="font-body text-sm text-white">{res.customer_name}</p>
                      <p className="font-body text-xs text-[#E5E5E5]/50">
                        {res.res_time} · {res.guests} pers · {getTurno(res.res_time) === 'pranzo' ? 'Pranzo' : 'Cena'}
                      </p>
                      {res.phone && <p className="font-body text-xs text-[#C69C6D]/50 mt-0.5">{res.phone}</p>}
                    </div>
                    <button
                      onClick={() => unassignTable(selectedTable)}
                      className="w-full py-2 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-sm font-body text-xs transition-all"
                    >
                      Rimuovi assegnazione
                    </button>
                  </div>
                ) : (
                  <div>
                    {assignableReservations.length === 0 ? (
                      <p className="font-body text-xs text-[#E5E5E5]/30 text-center py-3">
                        Nessuna prenotazione da assegnare
                      </p>
                    ) : (
                      <>
                        <p className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest mb-2">
                          Assegna prenotazione
                        </p>
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {assignableReservations.map(r => (
                            <button
                              key={r.id}
                              onClick={() => assignTable(selectedTable, r.id)}
                              className="w-full flex items-center justify-between gap-2 p-2 bg-[#0A0A0B] hover:bg-[#C69C6D]/10 border border-transparent hover:border-[#C69C6D]/20 rounded-sm transition-all text-left"
                            >
                              <div>
                                <p className="font-body text-xs text-white">{r.customer_name}</p>
                                <p className="font-body text-[10px] text-[#E5E5E5]/40">{r.guests} pers</p>
                              </div>
                              <div className="text-right">
                                <p className="font-body text-xs text-[#C69C6D] font-semibold">{r.res_time}</p>
                                <p className="font-body text-[9px] text-[#E5E5E5]/30 uppercase">{getTurno(r.res_time)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Stats footer */}
      <div className="flex flex-wrap items-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-white">{tavoli.length}</span>
          <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest">Tavoli</span>
        </div>
        <div className="w-px h-8 bg-[#C69C6D]/10" />
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-[#C69C6D]">{reservedCount}</span>
          <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest">Prenotati</span>
        </div>
        <div className="w-px h-8 bg-[#C69C6D]/10" />
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-green-400">{tavoli.length - reservedCount}</span>
          <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest">Liberi</span>
        </div>
        <div className="w-px h-8 bg-[#C69C6D]/10" />
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-white">{tavoli.reduce((s, t) => s + (t.coperti || 0), 0)}</span>
          <span className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest">Coperti totali</span>
        </div>
      </div>
    </div>
  );
}