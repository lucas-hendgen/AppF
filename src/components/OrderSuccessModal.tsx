import React from 'react';
import { X, CheckCircle2, MessageCircle, Clock, MapPin, ShoppingBag, ArrowRight } from 'lucide-react';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onOpenProfileOrders: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onOpenProfileOrders
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();

  if (!order) return null;

  const handleSendWhatsApp = () => {
    const adminPhone = '554988897524'; // WhatsApp da Farmácia
    let msg = `🔔 *NOVO PEDIDO FARMÁCIA SUPER POPULAR* 🔔\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📦 *Pedido:* ${order.id}\n`;
    msg += `👤 *Cliente:* ${order.customerName}\n`;
    msg += `📱 *Telefone:* ${order.customerPhone}\n`;
    msg += `📍 *Tipo:* ${order.deliveryType === 'delivery' ? '🛵 Delivery' : '🥡 Retirar no Balcão'}\n`;
    
    if (order.address && typeof order.address === 'object') {
      msg += `🏠 *Endereço:* ${order.address.street}, ${order.address.number} - ${order.address.neighborhood}\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🛍️ *ITENS:*\n`;
    order.items.forEach(it => {
      msg += `• ${it.quantity}x ${it.name} (R$ ${(it.price * it.quantity).toFixed(2).replace('.', ',')})\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *TOTAL: R$ ${order.total.toFixed(2).replace('.', ',')}*\n`;
    msg += `💳 *Forma de Pagamento:* ${order.paymentMethod.replace('mercadopago_', 'Mercado Pago ').replace('_', ' ').toUpperCase()}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⏰ *Realizado em:* ${new Date(order.createdAt).toLocaleString('pt-BR')}\n`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=${adminPhone}&text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111111] rounded-3xl shadow-2xl border border-[#1f2937] overflow-hidden flex flex-col max-h-[90vh] text-[#d1d5db]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] text-white text-center relative border-b border-[#065f46]/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner border border-white/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold text-white">Pedido Recebido com Sucesso!</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Código do Pedido: <strong className="font-mono text-white text-sm">{order.id}</strong>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Status Timeline */}
          <div className="p-4 bg-[#161616] border border-[#1f2937] rounded-2xl space-y-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase block">
              Status do Pedido em Tempo Real:
            </span>
            <div className="flex items-center justify-between text-center relative">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  1
                </div>
                <span className="text-[10px] font-bold text-[#f3f4f6] mt-1">Recebido</span>
              </div>
              <div className="flex-1 h-0.5 bg-[#1f2937] mx-1"></div>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                  order.status === 'preparando' || order.status === 'em_rota' || order.status === 'concluido'
                    ? 'bg-[#10b981] text-white'
                    : 'bg-[#27272a] text-[#9ca3af]'
                }`}>
                  2
                </div>
                <span className="text-[10px] font-medium text-[#9ca3af] mt-1">Separação</span>
              </div>
              <div className="flex-1 h-0.5 bg-[#1f2937] mx-1"></div>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                  order.status === 'em_rota' || order.status === 'concluido'
                    ? 'bg-[#10b981] text-white'
                    : 'bg-[#27272a] text-[#9ca3af]'
                }`}>
                  3
                </div>
                <span className="text-[10px] font-medium text-[#9ca3af] mt-1">Entrega</span>
              </div>
            </div>
          </div>

          {/* Summary Details */}
          <div className="p-4 bg-[#161616] rounded-2xl border border-[#1f2937] space-y-2">
            <div className="flex justify-between font-bold text-[#f3f4f6] pb-1 border-b border-[#1f2937]">
              <span>Cliente:</span>
              <span>{order.customerName}</span>
            </div>
            <div className="space-y-1 text-[#9ca3af]">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.quantity}x {it.name}</span>
                  <span className="font-semibold text-[#f3f4f6]">
                    R$ {(it.price * it.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#1f2937] flex justify-between font-extrabold text-sm text-[#f3f4f6]">
              <span>Total Pago / A Pagar</span>
              <span className="text-[#10b981]">R$ {order.total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {/* WhatsApp Notification Action */}
          <button
            onClick={handleSendWhatsApp}
            className="w-full py-3.5 bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar Confirmação no WhatsApp da Farmácia</span>
          </button>

          {/* Profile Tracking */}
          {isAuthenticated ? (
            <button
              onClick={() => {
                onClose();
                onOpenProfileOrders();
              }}
              className="w-full py-3 bg-[#161616] hover:bg-[#222222] text-[#f3f4f6] border border-[#27272a] font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Ver Meus Pedidos na Área do Membro</span>
            </button>
          ) : (
            <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-800/40 text-center space-y-1.5">
              <p className="text-[11px] text-emerald-300 font-medium">
                Crie sua conta para salvar este pedido e acumular pontos de fidelidade!
              </p>
              <button
                onClick={() => {
                  onClose();
                  openAuthModal('register');
                }}
                className="px-4 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Cadastrar-se Agora
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
