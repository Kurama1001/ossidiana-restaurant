import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react';

export default function AdminEmailTest() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('emailService', { action: 'test' });
      setResult(res.data);
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
    setSending(false);
  };

  return (
    <div>
      <button onClick={handleTest} disabled={sending}
        className="flex items-center gap-2 px-4 py-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-sm transition-all disabled:opacity-50">
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        Invia Email di Test
      </button>
      {result?.success && (
        <p className="mt-2 flex items-center gap-1 text-xs text-green-400 font-body">
          <Check size={12} /> Email inviata! ID: {result.messageId}
        </p>
      )}
      {result && !result.success && (
        <p className="mt-2 flex items-start gap-1 text-xs text-red-400 font-body max-w-[250px]">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {result.error}
        </p>
      )}
    </div>
  );
}