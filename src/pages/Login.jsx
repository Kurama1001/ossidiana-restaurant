import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Lock, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/admin";
    } catch (err) {
      setError("Email o password non corretti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="https://media.base44.com/images/public/6a047f37242becec83398e6f/cfc846ccb_Ossidiana_02_Negativo1.svg"
            alt="Ossidiana Restaurant"
            className="h-12 w-auto mx-auto mb-6"
          />
          <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs">Area Amministrativa</p>
        </div>

        <div className="bg-[#161618] border border-[#C69C6D]/15 rounded-sm p-8">
          {/* Google login */}
          <button
            onClick={() => base44.auth.loginWithProvider("google", "/admin")}
            className="w-full flex items-center justify-center gap-3 py-3 border border-[#E5E5E5]/15 text-[#E5E5E5] font-body text-sm rounded-sm hover:border-[#C69C6D]/40 transition-all mb-5 min-h-[48px]"
          >
            <GoogleIcon className="w-5 h-5" />
            Continua con Google
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E5E5]/10" /></div>
            <div className="relative flex justify-center"><span className="bg-[#161618] px-3 text-xs text-[#E5E5E5]/30 font-body uppercase tracking-widest">oppure</span></div>
          </div>

          {error && (
            <div className="mb-5 p-3 border border-red-400/20 bg-red-400/5 text-red-400 text-sm font-body rounded-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C69C6D]/50" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="admin@ossidiana.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-10 pr-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C69C6D]/50" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-10 pr-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/25"
                />
              </div>
              <div className="text-right mt-1">
                <a href="/forgot-password" className="text-xs text-[#C69C6D]/70 hover:text-[#C69C6D] font-body transition-colors">Password dimenticata?</a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C69C6D] text-[#0A0A0B] font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-[#D4AA7D] transition-all disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Accesso...</> : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}