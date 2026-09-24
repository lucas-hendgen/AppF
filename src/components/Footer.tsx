import React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Heart, Sparkles, MessageCircle, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { openAuthModal, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <footer className="bg-gradient-to-br from-[#0a192f] via-[#0f172a] to-[#1e293b] border-t border-blue-900/40 mt-16 pt-12 pb-8 text-blue-100/70 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Main 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-blue-900/40">
          
          {/* Col 1: Brand & Slogan */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-blue-800/40 p-1 bg-white">
                <img src="./farmacia.jpeg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">
                FARMÁCIA <span className="text-sky-400">SUPER POPULAR</span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sua farmácia de confiança em Itapema - SC. Medicamentos, vitaminas e perfumaria com os melhores preços e entrega rápida.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-800/40">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Farmácia Autorizada ANVISA
              </span>
            </div>
            <div className="pt-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400/80 block mb-2">Redes Sociais</span>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.instagram.com/superpopular.itapema?igsi=OWo0aTVqbDVnMnRq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-blue-950/60 hover:bg-rose-600 border border-blue-800/40 flex items-center justify-center text-sky-300 hover:text-white transition-all hover:scale-105 shadow-sm"
                  title="Siga-nos no Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Business Hours & Address */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">
              Atendimento & Localização
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Av. Nereu Ramos, 897 • Centro, Itapema - SC</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Seg. a Sáb. 08:00 às 20:00 • Dom. 08:00 às 14:00</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>(49) 8889-7524</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Member Benefits & Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">
              Clube Super Popular
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Membros cadastrados contam com histórico de saúde sigiloso, múltiplos endereços e pontos fidelidade em cada compra.
            </p>
            <button
              onClick={() => openAuthModal('register')}
              className="px-3.5 py-2 bg-blue-900/50 hover:bg-blue-800/60 text-sky-200 border border-blue-700/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cadastre-se no Clube
            </button>
          </div>

          {/* Col 4: Safe Payments & Mercado Pago */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">
              Pagamentos Seguros
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Processamento protegido com criptografia de ponta a ponta via <strong className="text-sky-300">Mercado Pago</strong> e PIX Instantâneo.
            </p>
            <div className="p-3 bg-blue-950/50 rounded-2xl border border-blue-900/40 flex items-center gap-3">
              <div className="p-2 bg-[#009EE3]/20 text-[#009EE3] border border-[#009EE3]/30 rounded-xl font-bold text-xs">
                MP
              </div>
              <div>
                <p className="text-[11px] font-bold text-white">Mercado Pago Integrado</p>
                <p className="text-[10px] text-slate-400">PIX • Cartão até 6x • Dinheiro</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Farmácia Super Popular Itapema. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              Desenvolvido com <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para sua saúde.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
