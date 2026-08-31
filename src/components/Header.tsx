import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, User, LogOut, ShieldCheck, MapPin, Clock, Award, ChevronDown, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, openAuthModal, openProfileModal, logout } = useAuth();
  const { totalItems, finalTotal, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdminRoute = location.pathname.startsWith('/admin');

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100/80 shadow-md transition-all text-slate-800">
      {/* Top Banner with notice and address */}
      <div className="bg-gradient-to-r from-[#064e3b] to-[#047857] text-white text-xs py-1.5 px-4 border-b border-[#065f46]/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium text-[11px]">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Clube Fidelidade Super Popular
            </span>
            <span className="hidden sm:inline text-emerald-100">
              Membros cadastrados acumulam pontos e recebem descontos exclusivos!
            </span>
          </div>

          <div className="flex items-center gap-4 text-emerald-100">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              <span>Itapema - SC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Pharmacy Name */}
          <div className="flex items-center gap-3.5 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-50 flex items-center justify-center p-1">
              <img 
                src="/farmacia.jpeg" 
                alt="Logo Farmácia Super Popular" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none">
                  FARMÁCIA <span className="text-[#10b981]">SUPER POPULAR</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-950/80 text-[#10b981] border border-emerald-800/50 rounded-md">
                  Itapema
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                Cuidando da sua saúde todos os dias com economia e segurança
              </p>
            </div>
          </div>

          {/* Right Actions: Member Profile / Login & Cart FAB trigger */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* User Auth Button */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full transition-all text-left shadow-md"
                >
                  <div className="w-8 h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[120px]">
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full">
                        {user.membershipTier}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" /> {user.loyaltyPoints || 0} pts
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-600">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                      <p className="text-xs text-slate-400 font-medium">Conectado como Membro</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          openProfileModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-[#10b981]" />
                        Meu Perfil & Endereços
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          openProfileModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-blue-500" />
                        Histórico de Pedidos
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate('/admin');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100/80 border border-purple-100 rounded-xl transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-500" />
                          Painel Farmacêutico / Admin
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="login-register-header-btn"
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-[#10b981] border border-slate-200/60 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                <User className="w-4 h-4" />
                <span>Entrar / Cadastrar</span>
              </button>
            )}

            {/* Cart Button */}
            {!isAdminRoute && (
              <button
                id="header-cart-button"
                onClick={openCart}
                className="relative flex items-center gap-2.5 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02]"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#dc2626] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">
                  {finalTotal > 0 ? `R$ ${finalTotal.toFixed(2).replace('.', ',')}` : 'Carrinho'}
                </span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
