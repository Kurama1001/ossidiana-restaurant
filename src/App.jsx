import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Menu from '@/pages/Menu';
import Prenotazioni from '@/pages/Prenotazioni';
import Ordini from '@/pages/Ordini';
import Admin from '@/pages/Admin';
import Profilo from '@/pages/Profilo';
import Sala from '@/pages/Sala';
import Comanda from '@/pages/Comanda';
import Cucina from '@/pages/Cucina';
import Bar from '@/pages/Bar';
import Cassa from '@/pages/Cassa';
import StoricoComande from '@/pages/StoricoComande';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="font-display text-2xl text-white tracking-widest" style={{ fontFamily: 'serif' }}>OSSIDIANA</div>
          <div className="w-8 h-8 border-2 border-[#C69C6D]/30 border-t-[#C69C6D] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
    // Per errori unknown o altri, procediamo comunque a mostrare l'app
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Layout />}>
        {/* Pagine pubbliche */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/prenotazioni" element={<Prenotazioni />} />
        <Route path="/ordini" element={<Ordini />} />
        <Route path="/profilo" element={<Profilo />} />

        {/* Solo admin */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} requiredRole="admin" />}>
          <Route path="/admin" element={<Admin />} />
          <Route path="/cassa" element={<Cassa />} />
          <Route path="/storico-comande" element={<StoricoComande />} />
        </Route>

        {/* Solo cucina (o admin) */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} allowedRoles={['cucina', 'admin']} />}>
          <Route path="/cucina" element={<Cucina />} />
        </Route>

        {/* Solo cameriere (o admin) */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} allowedRoles={['cameriere', 'admin']} />}>
          <Route path="/sala" element={<Sala />} />
          <Route path="/comanda/:ordineId" element={<Comanda />} />
        </Route>

        {/* Solo bar (o admin) */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} allowedRoles={['bar', 'admin']} />}>
          <Route path="/bar" element={<Bar />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App