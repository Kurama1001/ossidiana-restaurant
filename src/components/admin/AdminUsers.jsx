import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Mail, Loader2, Users } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    base44.entities.User.list().then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setMessage(null);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setMessage({ type: 'success', text: `Invito inviato a ${inviteEmail}` });
      setInviteEmail('');
      const data = await base44.entities.User.list();
      setUsers(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Errore durante l\'invito.' });
    } finally {
      setInviting(false);
    }
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
              type="email"
              required
              placeholder="email@esempio.it"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-10 pr-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/25"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm"
          >
            <option value="user">Utente</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-6 py-2.5 bg-[#C69C6D] text-[#0A0A0B] font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-[#D4AA7D] transition-all disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
          >
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
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#C69C6D]" /></div>
        ) : (
          <div className="divide-y divide-[#C69C6D]/10">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-[#E5E5E5] font-body">{u.full_name || '—'}</p>
                  <p className="text-xs text-[#E5E5E5]/50 font-body">{u.email}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border font-body ${
                  u.role === 'admin'
                    ? 'border-[#C69C6D]/50 text-[#C69C6D]'
                    : 'border-[#E5E5E5]/15 text-[#E5E5E5]/40'
                }`}>
                  {u.role === 'admin' ? 'Admin' : 'Utente'}
                </span>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-[#E5E5E5]/40 font-body py-4 text-center">Nessun utente trovato.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}