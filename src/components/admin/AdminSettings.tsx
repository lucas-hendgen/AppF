import React, { useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Edit2, Check, X, Tag, Truck } from 'lucide-react';
import { api } from '../../services/api';
import { Coupon, Neighborhood } from '../../types';

interface AdminSettingsProps {
  setGlobalLoading?: (loading: boolean) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ setGlobalLoading }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Coupon Form state
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'produtos' | 'frete' | 'total'>('total');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [couponSaving, setCouponSaving] = useState(false);

  // Neighborhood Edit state
  const [editingBairro, setEditingBairro] = useState<string | null>(null);
  const [editingTaxa, setEditingTaxa] = useState<string>('');
  const [neighborhoodSaving, setNeighborhoodSaving] = useState<string | null>(null);

  const loadData = async (showFullLoader = false) => {
    if (showFullLoader || coupons.length === 0 || neighborhoods.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      const [cList, nList] = await Promise.all([
        api.fetchCoupons(),
        api.fetchNeighborhoods()
      ]);
      setCoupons(cList);
      setNeighborhoods(nList);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar as configurações do servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newValue.trim()) {
      alert('Código e Valor do Desconto são obrigatórios.');
      return;
    }
    setCouponSaving(true);
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      const created = await api.createCoupon({
        codigo: newCode.trim().toUpperCase(),
        tipo_desconto: newType,
        valor_desconto: newValue.trim(),
        descricao: newDesc.trim() || `Desconto de ${newValue} no ${newType}`
      });
      setCoupons(prev => [created, ...prev.filter(c => c.codigo.toUpperCase() !== created.codigo.toUpperCase())]);
      // Reset form
      setNewCode('');
      setNewValue('');
      setNewDesc('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cupom.');
    } finally {
      setCouponSaving(false);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom ${code}?`)) return;
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      await api.deleteCoupon(code);
      setCoupons(prev => prev.filter(c => c.codigo !== code));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cupom.');
    } finally {
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const startEditNeighborhood = (n: Neighborhood) => {
    setEditingBairro(n.bairro);
    setEditingTaxa(String(n.taxa));
  };

  const handleSaveNeighborhood = async (bairro: string) => {
    const numericTaxa = parseFloat(editingTaxa.replace(',', '.')) || 0;
    setNeighborhoodSaving(bairro);
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      const updated = await api.updateNeighborhood(bairro, numericTaxa);
      setNeighborhoods(prev => prev.map(n => n.bairro === bairro ? updated : n));
      setEditingBairro(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar taxa de entrega.');
    } finally {
      setNeighborhoodSaving(null);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-bold">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-700 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-800">Configurações do Sistema</h3>
          <p className="text-xs text-slate-500 font-medium">Controle cupons de desconto e taxas de entrega por bairro.</p>
        </div>
        <button
          onClick={() => loadData(false)}
          disabled={refreshing}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold animate-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CUPONS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Tag className="w-5 h-5 shrink-0 text-blue-600" />
            <h4 className="font-black text-sm">Cupons de Desconto</h4>
          </div>

          {/* Form to create coupon */}
          <form onSubmit={handleCreateCoupon} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <h5 className="text-xs font-black text-slate-800">Criar Novo Cupom</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">CÓDIGO *</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="EX: PROMO15"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">APLICAR EM *</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                >
                  <option value="total">Subtotal + Frete</option>
                  <option value="produtos">Apenas Produtos</option>
                  <option value="frete">Apenas Frete (Entrega)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">VALOR DESCONTO *</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Ex: 15% ou 10,00"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">DESCRIÇÃO</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Ex: 15% de desconto"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={couponSaving}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/20 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {couponSaving ? 'Salvando...' : 'Adicionar Cupom'}
            </button>
          </form>

          {/* Coupons list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {coupons.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 border border-dashed rounded-xl">Sem cupons cadastrados.</p>
            ) : (
              coupons.map(coupon => (
                <div key={coupon.codigo} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">{coupon.codigo}</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {coupon.tipo_desconto === 'total' ? 'Carrinho' : coupon.tipo_desconto === 'frete' ? 'Frete Grátis' : 'Produtos'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 mt-1">Desconto: {coupon.valor_desconto}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{coupon.descricao}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCoupon(coupon.codigo)}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* NEIGHBORHOODS FREIGHT SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Truck className="w-5 h-5 shrink-0 text-blue-600" />
            <h4 className="font-black text-sm">Taxas de Entrega por Bairro</h4>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {neighborhoods.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 border border-dashed rounded-xl">Sem bairros cadastrados.</p>
            ) : (
              neighborhoods.map(n => (
                <div key={n.bairro} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 text-xs capitalize">{n.bairro}</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Farmácia Super Popular (Itapema)</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
