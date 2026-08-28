import React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Heart, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { openAuthModal, isAuthenticated, openAdminModal, isAdmin } = useAuth();

  return (
    <footer className="bg-[#0d0d0d] border-t border-[#1f2937] mt-16 pt-12 pb-8 text-[#9ca3af]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Main 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[#1f2937]">
          
          {/* Col 1: Brand & Slogan */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-[#27272a] p-1 bg-[#161616]">
                <img src="./farmacia.jpeg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-extrabold text-sm text-[#f3f4f6] tracking-tight">
                FARMÁCIA <span className="text-[#10b981]">SUPER POPULAR</span>
              </h3>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Sua farmácia de confiança em Itapema - SC. Medicamentos, vitaminas e perfumaria com os melhores preços e entrega rápida.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Farmácia Autorizada ANVISA
              </span>
            </div>
          </div>

          {/* Col 2: Business Hours & Address */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#f3f4f6]">
              Atendimento & Localização
            </h4>
            <ul className="space-y-2 text-xs text-[#9ca3af]">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                <span>Av. Nereu Ramos, 897 • Centro, Itapema - SC</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#10b981] shrink-0" />
                <span>Segunda a Domingo: 07:30 às 23:00</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#10b981] shrink-0" />
                <span>(49) 8889-7524</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Member Benefits & Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#f3f4f6]">
              Clube Super Popular
            </h4>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Membros cadastrados contam com histórico de saúde sigiloso, múltiplos endereços e pontos fidelidade em cada compra.
            </p>
            <button
              onClick={() => openAuthModal('register')}
              className="px-3.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cadastre-se no Clube
            </button>
          </div>

          {/* Col 4: Safe Payments & Mercado Pago */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#f3f4f6]">
              Pagamentos Seguros
            </h4>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Processamento protegido com criptografia de ponta a ponta via <strong className="text-[#f3f4f6]">Mercado Pago</strong> e PIX Instantâneo.
            </p>
            <div className="p-3 bg-[#161616] rounded-2xl border border-[#1f2937] flex items-center gap-3">
              <div className="p-2 bg-[#009EE3]/20 text-[#009EE3] border border-[#009EE3]/30 rounded-xl font-bold text-xs">
                MP
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#f3f4f6]">Mercado Pago Integrado</p>
                <p className="text-[10px] text-[#9ca3af]">PIX • Cartão até 6x • Dinheiro</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6b7280]">
          <p>© {new Date().getFullYear()} Farmácia Super Popular Itapema. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => {
                if (isAdmin) {
                  openAdminModal();
                } else {
                  openAuthModal('login', 'Acesso Restrito: Faça login com suas credenciais de administrador/farmacêutico.');
                }
              }}
              className="text-purple-400 hover:text-purple-300 font-bold hover:underline flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Painel Administrativo Farmacêutico' : 'Acesso Farmacêutico / Admin'}</span>
            </button>
            <span className="flex items-center gap-1 text-[#6b7280]">
              Desenvolvido com <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para sua saúde.
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
