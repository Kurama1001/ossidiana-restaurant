import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement, requiredRole }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, user } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-[#C69C6D] font-body tracking-widest uppercase text-xs mb-3">Accesso Negato</p>
          <h1 className="text-white font-display text-3xl mb-4">Area Riservata</h1>
          <p className="text-[#E5E5E5]/50 font-body text-sm mb-6">Non hai i permessi per accedere a questa sezione.</p>
          <button onClick={() => base44.auth.logout('/')} className="text-[#C69C6D] font-body text-sm hover:underline">Torna alla home</button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}