import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Users, Clock, Truck, Store, QrCode, CreditCard, Wallet, Banknote, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface Stats {
  totalRevenue: number;
  pixRevenue: number;
  creditCardRevenue: number;
  debitCardRevenue: number;
  cashRevenue: number;
  cancelledCount: number;
  cancelledRevenue: number;
  totalOrders: number;
  totalMembers: number;
  pendingOrders: number;
  deliveryCount: number;
  pickupCount: number;
  salesTrend: { date: string; value: number }[];
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (showFullLoader = false) => {
    if (showFullLoader || !stats) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      setError('Não foi possível carregar as estatísticas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(true);
    const interval = setInterval(() => {
      load(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-10">
        <p className="text-red-650 text-sm font-semibold mb-3">{error || 'Erro ao carregar dados.'}</p>
        <button onClick={() => load(true)} className="px-4 py-2 bg-purple-650 text-white rounded-xl text-xs font-bold shadow">Tentar Novamente</button>
      </div>
    );
  }

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const mainCards = [
    {
      label: 'Faturamento Líquido (Pago)',
      value: formatBRL(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/40 border-emerald-100'
    },
    {
      label: 'Fila de Pedidos Ativos',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50/40 border-amber-100'
    },
    {
      label: 'Membros Fidelidade',
      value: stats.totalMembers,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50/40 border-purple-100'
    }
  ];

  const paymentCards = [
    {
      label: 'Faturamento PIX (Online)',
      value: formatBRL(stats.pixRevenue),
      icon: QrCode,
      color: 'text-sky-650',
      bg: 'bg-sky-50/30 border-sky-100/70'
    },
    {
      label: 'Cartão de Crédito (MP)',
      value: formatBRL(stats.creditCardRevenue),
      icon: CreditCard,
      color: 'text-indigo-650',
      bg: 'bg-indigo-50/30 border-indigo-100/70'
    },
    {
      label: 'Cartão (Entrega / Débito)',
      value: formatBRL(stats.debitCardRevenue),
      icon: Wallet,
      color: 'text-teal-650',
      bg: 'bg-teal-50/30 border-teal-100/70'
    },
    {
      label: 'Dinheiro (Físico)',
      value: formatBRL(stats.cashRevenue),
      icon: Banknote,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50/20 border-emerald-100/50'
    }
  ];

  const operationalCards = [
    {
      label: 'Total de Pedidos Gerados',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'text-blue-600'
    },
    {
      label: 'Entregas via Delivery',
      value: stats.deliveryCount,
      icon: Truck,
      color: 'text-blue-500'
    },
    {
      label: 'Retiradas na Loja',
      value: stats.pickupCount,
      icon: Store,
      color: 'text-rose-500'
    }
  ];

  // SVG CHART CALCULATIONS
  const chartWidth = 500;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const trendData = stats.salesTrend || [];
  const maxVal = Math.max(...trendData.map(d => d.value), 100);
  const minVal = 0;

  // Generate SVG coordinates
  const points = trendData.map((d, i) => {
    const x = paddingLeft + i * ((chartWidth - paddingLeft - paddingRight) / Math.max(1, trendData.length - 1));
    const y = chartHeight - paddingBottom - ((d.value - minVal) / (maxVal - minVal)) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, label: d.date, value: d.value };
  });

  // SVG Path description for line
  const linePath = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  // SVG Path description for gradient fill
  const fillPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
    : '';

  return (
    <div className="space-y-6 text-slate-700">
      {/* 1. SEÇÃO PRINCIPAL COM REFRESH */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-450">Visão Geral</h4>
          <button
            onClick={() => load(false)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors flex items-center gap-1 text-[11px] font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Recarregar'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mainCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`bg-white border ${card.bg} rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`p-3 rounded-xl bg-white shadow-sm border border-slate-100/80 ${card.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{card.value}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. GRÁFICO FINANCEIRO SVG */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800">Faturamento Diário</h4>
          <p className="text-[11px] text-slate-450 font-semibold">Gráfico financeiro dos últimos 7 dias de vendas pagas</p>
        </div>

        <div className="w-full overflow-x-auto scrollbar-none">
          <div className="min-w-[500px] h-[180px] relative mx-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingLeft} y1={paddingTop} x2={chartWidth - paddingRight} y2={paddingTop} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1={paddingLeft} y1={(chartHeight - paddingBottom + paddingTop) / 2} x2={chartWidth - paddingRight} y2={(chartHeight - paddingBottom + paddingTop) / 2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom} stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Gradient Area Fill */}
              {fillPath && <path d={fillPath} fill="url(#chartGrad)" />}

              {/* Chart Line */}
              {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Dots & Values */}
              {points.map((p, i) => (
                <g key={i} className="group cursor-pointer">
                  {/* Point circle */}
                  <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" className="transition-all hover:r-7" />
                  <circle cx={p.x} cy={p.y} r="10" fill="#10b981" fillOpacity="0" className="hover:fill-opacity-10 transition-all" />

                  {/* Value Label above dot */}
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className="text-[9px] font-black fill-[#047857] opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                  >
                    R$ {Math.round(p.value)}
                  </text>
                  {/* Static value for peaks */}
                  {p.value === maxVal && maxVal > 0 && (
                    <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-extrabold fill-emerald-850">
                      R$ {Math.round(p.value)}
                    </text>
                  )}

                  {/* X Axis Date Label */}
                  <text x={p.x} y={chartHeight - 10} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">
                    {p.label}
                  </text>
                </g>
              ))}

              {/* Y Axis Grid values */}
              <text x={10} y={paddingTop + 4} className="text-[9px] font-bold fill-slate-400">{formatBRL(maxVal).split(',')[0]}</text>
              <text x={10} y={(chartHeight - paddingBottom + paddingTop) / 2 + 4} className="text-[9px] font-bold fill-slate-400">{formatBRL(maxVal / 2).split(',')[0]}</text>
              <text x={10} y={chartHeight - paddingBottom + 4} className="text-[9px] font-bold fill-slate-400">R$ 0</text>
            </svg>
          </div>
        </div>
      </div>

      {/* 3. SEÇÃO FINANCEIRA DETALHADA */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-450">Faturamento por Meio de Pagamento</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {paymentCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`bg-white border ${card.bg} rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all min-h-[110px]`}>
                <div className={`p-2 rounded-lg bg-white shadow-sm border border-slate-100/80 ${card.color} self-start`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <p className="text-base sm:text-lg font-black text-slate-800 leading-tight">{card.value}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SEÇÃO CANCELAMENTOS E INFOS OPERACIONAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendas Canceladas */}
        <div className="md:col-span-1 bg-red-50/20 border border-red-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-white shadow-sm border border-red-100 text-red-650 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-red-700 leading-tight">{formatBRL(stats.cancelledRevenue)}</p>
            <p className="text-xs text-red-650 font-bold mt-0.5">Vendas Canceladas ({stats.cancelledCount} ped.)</p>
          </div>
        </div>

        {/* Resumo de Operações */}
        <div className="md:col-span-2 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <h5 className="text-xs font-black text-slate-800 mb-2">Desempenho e Eficiência</h5>
          <div className="grid grid-cols-3 gap-3 text-[10px] sm:text-xs">
            {operationalCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white border border-slate-150 rounded-xl p-2.5 shadow-sm text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${card.color}`} />
                  <span className="block font-extrabold text-slate-800 text-sm sm:text-base leading-none">{card.value}</span>
                  <span className="text-[9px] text-slate-450 font-bold mt-1 block leading-tight">{card.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ticket Médio & Taxa de Entrega */}
      <div className="bg-slate-50/30 border border-slate-200/50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl p-3 shadow-sm animate-in">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10b981]" />
            <span className="font-semibold text-slate-500">Ticket Médio por Compra</span>
          </div>
          <span className="font-extrabold text-slate-800 text-sm">
            {stats.totalOrders > 0
              ? formatBRL(stats.totalRevenue / stats.totalOrders)
              : 'R$ 0,00'}
          </span>
        </div>
        <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl p-3 shadow-sm animate-in">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#10b981]" />
            <span className="font-semibold text-slate-500">Taxa de Pedidos com Delivery</span>
          </div>
          <span className="font-extrabold text-slate-800 text-sm">
            {stats.totalOrders > 0 ? Math.round((stats.deliveryCount / stats.totalOrders) * 100) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};
