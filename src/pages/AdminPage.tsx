import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Calendar, Package, Users, Settings, ShieldCheck, LogOut, Loader2, Key, Image, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminOrders } from '../components/admin/AdminOrders';
import { AdminScheduledOrders } from '../components/admin/AdminScheduledOrders';
import { AdminProducts } from '../components/admin/AdminProducts';
import { AdminMembers } from '../components/admin/AdminMembers';
import { AdminSettings } from '../components/admin/AdminSettings';
import { AdminBanners } from '../components/admin/AdminBanners';

type Section = 'dashboard' | 'orders' | 'scheduled' | 'products' | 'members' | 'settings' | 'banners';

const NAV = [
  { key: 'dashboard' as Section, label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'orders'    as Section, label: 'Pedidos',     icon: ShoppingBag },
  { key: 'scheduled' as Section, label: 'Agendados',   icon: Calendar },
  { key: 'products'  as Section, label: 'Catálogo',    icon: Package },
  { key: 'members'   as Section, label: 'Membros',     icon: Users },
  { key: 'banners'   as Section, label: 'Banners',     icon: Image },
  { key: 'settings'  as Section, label: 'Configurações', icon: Settings }
];

export default function AdminPage() {
  const { user, login, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<Section>(() => {
    const saved = localStorage.getItem('fsp_admin_active_section');
    return (saved as Section) || 'dashboard';
  });
  const [globalScreenLoading, setGlobalScreenLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('fsp_admin_active_section', active);
  }, [active]);

  // Admin login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setLoginError('Preencha o identificador e a senha.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(identifier, password);
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao realizar login. Verifique as credenciais.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogoutAdmin = () => {
    logout();
    setIdentifier('');
    setPassword('');
    setLoginError('');
  };

  const isAdmin = user && user.role === 'admin';

  // If a user just logged in as non-admin, force logout and display error safely in useEffect
  useEffect(() => {
    if (user && user.role !== 'admin' && !loginLoading) {
      logout();
      setLoginError('Acesso negado: Esta conta não possui privilégios de administrador.');
    }
  }, [user, loginLoading]);

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-white via-slate-50 to-blue-50/25 text-slate-700 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* 🌈 Ambient RGB Glowing Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-blue-600/15 via-cyan-400/15 to-indigo-600/10 blur-3xl animate-float-orb-1 opacity-75" />
        <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-indigo-600/12 via-blue-500/15 to-teal-400/10 blur-3xl animate-float-orb-2 opacity-75" />
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-t from-blue-800/15 via-sky-400/10 to-indigo-500/10 blur-3xl animate-float-orb-3 opacity-65" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Header />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500 font-bold">Verificando credenciais...</p>
          </div>
        ) : !isAdmin ? (
          /* PORTAL DO FARMACÊUTICO / ADMIN LOGIN SCREEN */
          <div className="max-w-md w-full mx-auto my-8 animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 font-black text-xl flex items-center justify-center border border-blue-200 shadow-inner mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Portal do Farmacêutico / Admin</h2>
                <p className="text-xs text-slate-500 font-semibold">Área restrita de gestão interna da farmácia</p>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-bold leading-relaxed animate-in">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase">E-mail, CPF ou Usuário</label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Informe seu identificador administrativo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                    disabled={loginLoading}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase">Senha de Acesso</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                      disabled={loginLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-950/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      Acessar Painel Admin
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* WORKSPACE DO ADMINISTRADOR */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Admin Header with Banner */}
            <div className="bg-gradient-to-r from-[#0a192f] via-[#172554] to-[#1e3a8a] border border-blue-900/40 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-blue-300 font-black text-xl flex items-center justify-center border border-blue-400/20 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                      Painel de Gestão Farmacêutica
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full">
                      Admin V4.4
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    Olá, <strong>{user?.name}</strong>! Monitore pedidos ao vivo, controle agendamentos, cupons, taxas e catálogo.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all shrink-0"
                >
                  Voltar à Loja
                </button>
                <button
                  onClick={handleLogoutAdmin}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-750 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all shrink-0 flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Admin
                </button>
              </div>
            </div>

            {/* Tab Controls */}
            <div className="bg-white rounded-3xl p-3.5 shadow-md border border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
              {NAV.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${
                    active === key
                      ? 'bg-blue-600 text-white shadow-blue-950/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* Workspace Area */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200/80 min-h-[400px]">
              {/* Cabeçalho da Tela Ativa */}
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-6">
                {(() => {
                  const navItem = NAV.find(item => item.key === active);
                  const Icon = navItem ? navItem.icon : LayoutDashboard;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-blue-600 shrink-0" />
                      <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                        Tela Ativa: {navItem ? navItem.label : ''}
                      </h1>
                    </>
                  );
                })()}
              </div>

              {active === 'dashboard' && <AdminDashboard />}
              {active === 'orders'    && <AdminOrders setGlobalLoading={setGlobalScreenLoading} />}
              {active === 'scheduled' && <AdminScheduledOrders setGlobalLoading={setGlobalScreenLoading} />}
              {active === 'products'  && <AdminProducts setGlobalLoading={setGlobalScreenLoading} />}
              {active === 'members'   && <AdminMembers />}
              {active === 'banners'   && <AdminBanners setGlobalLoading={setGlobalScreenLoading} />}
              {active === 'settings'  && <AdminSettings setGlobalLoading={setGlobalScreenLoading} />}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
      </div>

      {/* TELA DE CARREGAMENTO GLOBAL OVERLAY */}
      {globalScreenLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center gap-3.5 shadow-2xl">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="text-xs font-black text-slate-800">Processando Requisição...</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">Aguarde um momento por favor</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
