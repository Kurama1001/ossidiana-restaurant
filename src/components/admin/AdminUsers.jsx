import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Mail, Loader2, Users, Pencil, Trash2, Check, X } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null); // { id, full_name, role }
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = () =>
    base44.entities.User.list().then(data => { setUsers(data); setLoading(false); });

  useEffect(() => { loadUsers(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setMessage(null);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setMessage({ type: 'success', text: `Invito inviato a ${inviteEmail}` });
      setInviteEmail('');
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Errore durante l'invito." });
    } finally {
      setInviting(false);
    }
  };

  const startEdit = (u) => setEditing({ id: u.id, full_name: u.full_name || '', role: u.role || 'user' });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.User.update(editing.id, { full_name: editing.full_name, role: editing.role });
    setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, full_name: editing.full_name, role: editing.role } : u));
    setEditing(null);
    setSaving(false);
  };

  const deleteUser = async (u) => {
    if (!confirm(`Eliminare l'utente "${u.full_name || u.email}"? L'operazione è irreversibile.`)) return;
    setDeletingId(u.id);
    await base44.entities.User.delete(u.id);
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setDeletingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Invita utente */}
      <div className="bg-[#161618] border border-[#C69C6D]/15 rounded-sm p-6">
        <h2 className="font-display text-xl text-white tracking-widest mb-5 flex items-center gap-2">
          <UserPlus size={18} className="text-[#C69C6D]" /> Invita Utente
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C69C6D]/50" />
            <input
              type="email" required placeholder="email@esempio.it"
              value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-10 pr-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/25"
            />
          </div>
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm">
            <option value="user">Utente</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={inviting}
            className="px-6 py-2.5 bg-[#C69C6D] text-[#0A0A0B] font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-[#D4AA7D] transition-all disabled:opacity-50 flex items-center gap-2 min-h-[44px]">
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Invita
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm font-body ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
      </div>

      {/* Lista utenti */}
      <div className="bg-[#161618] border border-[#C69C6D]/15 rounded-sm p-6">
        <h2 className="font-display text-xl text-white tracking-widest mb-5 flex items-center gap-2">
          <Users size={18} className="text-[#C69C6D]" /> Utenti Registrati
          <span className="text-sm text-[#E5E5E5]/30 font-body normal-case tracking-normal ml-1">({users.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#C69C6D]" /></div>
        ) : users.length === 0 ? (
          <p className="text-sm text-[#E5E5E5]/40 font-body py-4 text-center">Nessun utente trovato.</p>
        ) : (
          <div className="divide-y divide-[#C69C6D]/10">
            {users.map(u => (
              <div key={u.id} className="py-3">
                {editing?.id === u.id ? (
                  /* ---- Riga in modifica ---- */
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <input
                      value={editing.full_name}
                      onChange={e => setEditing(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Nome completo"
                      className="flex-1 bg-[#0A0A0B] border border-[#C69C6D]/40 text-[#E5E5E5] px-3 py-1.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm"
                    />
                    <select
                      value={editing.role}
                      onChange={e => setEditing(prev => ({ ...prev, role: e.target.value }))}
                      className="bg-[#0A0A0B] border border-[#C69C6D]/40 text-[#E5E5E5] px-3 py-1.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm"
                    >
                      <option value="user">Utente</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-1.5">
                      <button onClick={saveEdit} disabled={saving}
                        className="p-2 border border-green-400/40 text-green-400 hover:bg-green-400/10 rounded-sm transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button onClick={cancelEdit}
                        className="p-2 border border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:text-white hover:border-[#E5E5E5]/40 rounded-sm transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ---- Riga normale ---- */
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[#E5E5E5] font-body truncate">{u.full_name || '—'}</p>
                      <p className="text-xs text-[#E5E5E5]/50 font-body truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-3 py-1 rounded-full border font-body ${
                        u.role === 'admin'
                          ? 'border-[#C69C6D]/50 text-[#C69C6D]'
                          : 'border-[#E5E5E5]/15 text-[#E5E5E5]/40'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Utente'}
                      </span>
                      <button onClick={() => startEdit(u)} title="Modifica"
                        className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteUser(u)} title="Elimina" disabled={deletingId === u.id}
                        className="p-2 border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/50 rounded-sm transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50">
                        {deletingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}