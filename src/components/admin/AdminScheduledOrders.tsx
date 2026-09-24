import React, { useEffect, useState } from 'react';
import { RefreshCw, Calendar, CheckCircle2, XCircle, User, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { Order } from '../../types';

const PAYMENT_STATUS: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-750 border border-amber-100',
  paid:     'bg-emerald-50 text-emerald-700 border border-emerald-250',
  failed:   'bg-red-50 text-red-700 border border-red-200',
  refunded: 'bg-slate-50 text-slate-600 border border-slate-200'
};

interface AdminScheduledOrdersProps {
  setGlobalLoading?: (loading: boolean) => void;
}

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'mercadopago_pix': return 'Mercado Pago (PIX Online)';
    case 'mercadopago_card': return 'Mercado Pago (Cartão Online)';
    case 'pix': return 'PIX (Na Entrega)';
    case 'dinheiro': return 'Dinheiro (Na Entrega)';
    case 'cartao_entrega': return 'Cartão (Maquininha na Entrega)';
    default: return method;
  }
};

export const AdminScheduledOrders: React.FC<AdminScheduledOrdersProps> = ({ setGlobalLoading }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async (showFullLoader = false) => {
    if (showFullLoader || orders.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const data = await api.getOrders();
      // Filtrar apenas os agendados
      const scheduledOnly = data.filter(o => o.scheduled === true);
      setOrders(scheduledOnly.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const handleUnschedule = async (orderId: string) => {
    if (!confirm('Deseja aprovar este agendamento e enviá-lo para a fila de preparação ativa?')) return;
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      await api.unscheduleOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar agendamento.');
    } finally {
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const handleRejectSchedule = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja recusar e cancelar este pedido agendado?')) return;
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      await api.rejectScheduledOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Erro ao recusar agendamento.');
    } finally {
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const filtered = orders.filter(o =>
    !search ||
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 text-slate-700">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar agendados por cliente ou ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 font-bold whitespace-nowrap">{filtered.length} agendamento(s) pendente(s)</p>
          <button
            onClick={() => load(false)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-150 rounded-2xl p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
          <Calendar className="w-8 h-8 text-slate-300" />
          Nenhuma venda agendada no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
          {filtered.map(order => (
            <div key={order.id} className="bg-white border border-slate-200/80 hover:border-amber-300 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all space-y-3">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                        📅 AGENDADO
                      </span>
                      <span className="font-mono font-bold text-blue-700 text-xs">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYMENT_STATUS[order.paymentStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {order.paymentStatus === 'paid' ? 'Pago' : order.paymentStatus === 'pending' ? 'Aguardando' : order.paymentStatus === 'failed' ? 'Falhou' : 'Estornado'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mt-2 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {order.customerName}
                    </h4>
                    {order.customerPhone && (
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">📞 {order.customerPhone}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleString('pt-BR')} · {order.deliveryType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 mt-1.5 flex items-center gap-1 flex-wrap">
                      <span>💳 Pago via:</span>
                      <span className="text-slate-800 font-extrabold">{getPaymentMethodLabel(order.paymentMethod)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-blue-700">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
                  </div>
                </div>

                {/* Delivery Address & Change Info */}
                <div className="space-y-2 text-[11px]">
                  {order.deliveryType === 'delivery' && order.address && (
                    <div className="text-slate-700 bg-blue-50/40 border border-blue-100 rounded-xl p-2.5 space-y-1">
                      <strong className="text-blue-900 font-extrabold block">📍 Endereço de Entrega:</strong>
                      <p className="font-semibold text-slate-700 leading-relaxed">
                        {typeof order.address === 'string'
                          ? order.address
                          : `${order.address.street}, ${order.address.number}${order.address.complement ? ` - ${order.address.complement}` : ''}, ${order.address.neighborhood}, ${order.address.city} - ${order.address.state}`}
                      </p>
                    </div>
                  )}

                  {order.paymentMethod === 'dinheiro' && order.changeAmount && (
                    <div className="text-amber-800 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl font-bold flex justify-between items-center">
                      <span>💵 Troco necessário para:</span>
                      <span className="bg-amber-100/80 px-2 py-0.5 rounded-md text-slate-900 font-black">R$ {order.changeAmount}</span>
                    </div>
                  )}

                  {/* Warning regarding schedule approval */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-slate-500 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="leading-normal font-medium">
                      Este pedido foi realizado fora do expediente de entregas. Clique no botão abaixo para autorizar a preparação e movê-lo para a fila de pedidos ativos.
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="text-xs text-slate-600 bg-slate-50/60 border border-slate-150 rounded-xl p-3 space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between font-medium">
                      <span>{item.quantity}× {item.name}</span>
                      <span className="text-slate-800 font-semibold">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-amber-800 bg-amber-50/50 border border-amber-100 p-2 rounded-lg mt-2 text-[11px]">
                      <strong>Obs:</strong> {order.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleUnschedule(order.id)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-950/20 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={() => handleRejectSchedule(order.id)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
