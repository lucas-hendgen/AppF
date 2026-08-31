import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Truck, Package, XCircle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { Order } from '../../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  recebido:   { label: 'Recebido',    color: 'bg-sky-50 text-sky-700 border-sky-200',     icon: <Clock className="w-3.5 h-3.5" /> },
  preparando: { label: 'Separando',  color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Package className="w-3.5 h-3.5" /> },
  em_rota:    { label: 'Em Rota',     color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Truck className="w-3.5 h-3.5" /> },
  concluido:  { label: 'Concluído',   color: 'bg-emerald-50 text-emerald-700 border-emerald-250', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelado:  { label: 'Cancelado',   color: 'bg-red-50 text-red-700 border-red-200',     icon: <XCircle className="w-3.5 h-3.5" /> }
};

const PAYMENT_STATUS: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-750 border border-amber-100',
  paid:     'bg-emerald-50 text-emerald-700 border border-emerald-250',
  failed:   'bg-red-50 text-red-700 border border-red-200',
  refunded: 'bg-slate-50 text-slate-600 border border-slate-200'
};

const FLOW: Order['status'][] = ['recebido', 'preparando', 'em_rota', 'concluido'];

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

interface AdminOrdersProps {
  setGlobalLoading?: (loading: boolean) => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ setGlobalLoading }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async (showFullLoader = false) => {
    if (showFullLoader || orders.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const data = await api.getOrders();
      setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const advance = async (order: Order) => {
    const currentIdx = FLOW.indexOf(order.status as any);
    if (currentIdx === -1 || currentIdx >= FLOW.length - 1) return;
    const nextStatus = FLOW[currentIdx + 1];
    setUpdating(order.id);
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      const updated = await api.updateOrderStatus(order.id, nextStatus);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } finally {
      setUpdating(null);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const cancel = async (order: Order) => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    setUpdating(order.id);
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      const updated = await api.updateOrderStatus(order.id, 'cancelado');
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } finally {
      setUpdating(null);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const filtered = orders.filter(o => {
    if (o.scheduled === true) return false;
    const matchesFilter = filter === 'todos' || o.status === filter;
    const matchesSearch = !search || 
      o.id.toLowerCase().includes(search.toLowerCase()) || 
      o.customerName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const FILTER_TABS = [
    { key: 'todos', label: 'Todos' },
    { key: 'recebido', label: 'Recebidos' },
    { key: 'preparando', label: 'Separando' },
    { key: 'em_rota', label: 'Em Rota' },
    { key: 'concluido', label: 'Concluídos' },
    { key: 'cancelado', label: 'Cancelados' }
  ];

  return (
    <div className="space-y-4">
      {/* Filtros e Busca */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  filter === tab.key
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-55 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60'
                }`}
              >
                {tab.label}
                {tab.key !== 'todos' && (
                  <span className="ml-1.5 opacity-70">
                    ({orders.filter(o => o.status === tab.key).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(false)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl bg-slate-55 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Input de Busca */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome do cliente ou número do pedido (ex: PED-7841)..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-450 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all font-medium shadow-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-55 border border-slate-150 rounded-2xl p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-550 text-sm font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.recebido;
            const currentIdx = FLOW.indexOf(order.status as any);
            const canAdvance = currentIdx >= 0 && currentIdx < FLOW.length - 1;
            const canCancel = order.status !== 'concluido' && order.status !== 'cancelado';
            const isBusy = updating === order.id;

            return (
              <div key={order.id} className="bg-white border border-slate-200/80 hover:border-purple-300 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all space-y-3">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-purple-700 text-xs">#{order.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYMENT_STATUS[order.paymentStatus] ?? 'bg-slate-100 text-slate-650'}`}>
                          {order.paymentStatus === 'paid' ? 'Pago' : order.paymentStatus === 'pending' ? 'Aguardando' : order.paymentStatus === 'failed' ? 'Falhou' : 'Estornado'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mt-2">{order.customerName}</h4>
                      {order.customerPhone && (
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">📞 {order.customerPhone}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                        {new Date(order.createdAt).toLocaleString('pt-BR')} · {order.deliveryType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 mt-1.5 flex items-center gap-1 flex-wrap">
                        <span>💳 Pago via:</span>
                        <span className="text-slate-850 font-extrabold">{getPaymentMethodLabel(order.paymentMethod)}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-[#10b981]">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
                    </div>
                  </div>

                  {/* Delivery Address & Change Info */}
                  <div className="space-y-2">
                    {order.deliveryType === 'delivery' && order.address && (
                      <div className="text-[11px] text-slate-700 bg-emerald-50/30 border border-emerald-100 rounded-xl p-2.5 space-y-1">
                        <strong className="text-emerald-800 font-extrabold block">📍 Endereço de Entrega:</strong>
                        <p className="font-semibold text-slate-700 leading-relaxed">
                          {typeof order.address === 'string'
                            ? order.address
                            : `${order.address.street}, ${order.address.number}${order.address.complement ? ` - ${order.address.complement}` : ''}, ${order.address.neighborhood}, ${order.address.city} - ${order.address.state}`}
                        </p>
                      </div>
                    )}

                    {order.paymentMethod === 'dinheiro' && order.changeAmount && (
                      <div className="text-[11px] text-amber-800 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl font-bold flex justify-between items-center">
                        <span>💵 Troco necessário para:</span>
                        <span className="bg-amber-100/80 px-2 py-0.5 rounded-md text-slate-900 font-black">R$ {order.changeAmount}</span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="text-xs text-slate-655 bg-slate-50/60 border border-slate-150 rounded-xl p-3 space-y-1">
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
                  {canAdvance && (
                    <button
                      onClick={() => advance(order)}
                      disabled={isBusy}
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md shadow-purple-100 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                    >
                      {isBusy ? 'Atualizando...' : `Avançar para ${STATUS_CONFIG[FLOW[currentIdx + 1]]?.label}`}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => cancel(order)}
                      disabled={isBusy}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
