import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, User, LogOut, ShieldCheck, MapPin, Clock, Award, ChevronDown, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, openAuthModal, openProfileModal, logout } = useAuth();
  const { totalItems, subtotal, openCart } = useCart();
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
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all text-slate-800 font-sans">
      {/* Dynamic RGB Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 via-indigo-600 via-sky-400 to-blue-600 animate-rgb-flow" />

      {/* Top Banner with notice and address */}
      <div className="bg-gradient-to-r from-[#0a192f] via-[#172554] to-[#1e3a8a] text-white text-xs py-1.5 px-4 border-b border-blue-900/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-white/10 border border-blue-400/30 px-2 py-0.5 rounded-full font-medium text-[11px]">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Clube Fidelidade Super Popular
            </span>
            <span className="hidden sm:inline text-blue-100">
              Membros cadastrados acumulam pontos e recebem descontos exclusivos!
            </span>
          </div>

          <div className="flex items-center gap-4 text-blue-100">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-300" />
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
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-white flex items-center justify-center p-1">
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
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                  FARMÁCIA <span className="text-blue-600">SUPER POPULAR</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#0a192f] text-sky-400 border border-blue-900/50 rounded-md">
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
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all text-left shadow-xs"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[120px]">
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full">
                        {user.membershipTier}
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" /> {user.loyaltyPoints || 0} pts
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
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        Meu Perfil & Endereços
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          openProfileModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                        Histórico de Pedidos
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate('/admin');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/60 rounded-xl transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
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
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>Entrar / Cadastrar</span>
              </button>
            )}

            {/* Cart Button */}
            {!isAdminRoute && (
              <button
                id="header-cart-button"
                onClick={openCart}
                className="relative flex items-center gap-2.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-950/30 transition-all hover:scale-[1.02]"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">
                  {totalItems === 0 ? 'Carrinho' : `R$ ${subtotal.toFixed(2).replace('.', ',')}`}
                </span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
