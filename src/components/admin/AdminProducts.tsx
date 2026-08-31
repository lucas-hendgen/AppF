import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, RefreshCw, Package } from 'lucide-react';
import { api } from '../../services/api';
import { Product } from '../../types';

const CATEGORIES = ['medicamentos', 'higiene', 'perfumaria', 'infantil', 'vitaminas'];

const EMPTY_FORM: Omit<Product, 'id'> = {
  sku: '',
  nome: '',
  categoria: 'medicamentos',
  descricao: '',
  preco: '',
  status: 'Ativo',
  imagem: '',
  observacoes: '',
  classificacaoAdicional: ''
};

interface AdminProductsProps {
  setGlobalLoading?: (loading: boolean) => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({ setGlobalLoading }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const filtered = products.filter(p => {
    const matchesSearch = !search ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p.categoria.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const load = async (showFullLoader = false) => {
    if (showFullLoader || products.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const data = await api.getAdminProducts();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const { id, ...rest } = p;
    setForm(rest);
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.sku.trim()) {
      setError('Nome e SKU são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      if (editing) {
        const updated = await api.updateProduct(editing.id, form);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await api.createProduct(form);
        setProducts(prev => [created, ...prev]);
      }
      setShowModal(false);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este produto?')) return;
    setDeleting(id);
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } finally {
      setDeleting(null);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem é muito grande. Escolha uma imagem com menos de 2MB para garantir a performance.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imagem: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  });

  const inputCls = 'w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-450 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all font-medium';

  return (
    <div className="space-y-4 text-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-slate-500 font-bold">{filtered.length} de {products.length} produto(s)</p>
        <div className="flex gap-2">
          <button
            onClick={() => load(false)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl bg-slate-55 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Filtros de Busca */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-medium shadow-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-bold shadow-sm"
          >
            <option value="todos">Todas as Categorias</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-150 rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in duration-300">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500">
                <th className="text-left p-3 font-bold">SKU</th>
                <th className="text-left p-3 font-bold">Nome</th>
                <th className="text-left p-3 font-bold hidden sm:table-cell">Categoria</th>
                <th className="text-left p-3 font-bold hidden md:table-cell">Preço</th>
                <th className="text-center p-3 font-bold">Status</th>
                <th className="text-center p-3 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-mono text-slate-500 font-semibold">{p.sku}</td>
                  <td className="p-3 font-bold text-slate-800 max-w-[220px] truncate flex items-center gap-2">
                    {p.imagem ? (
                      <img src={p.imagem} alt={p.nome} className="w-6 h-6 rounded-md object-cover border border-slate-200" />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <Package className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="truncate">{p.nome}</span>
                  </td>
                  <td className="p-3 text-slate-500 uppercase tracking-wider font-bold text-[10px] hidden sm:table-cell">{p.categoria}</td>
                  <td className="p-3 text-[#10b981] font-bold hidden md:table-cell">
                    {p.preco.includes('#') ? 'Variável' : p.preco.includes('Consulte') ? 'Sob Consulta' : `R$ ${p.preco}`}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-500 hover:text-purple-650 border border-slate-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        disabled={deleting === p.id}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-650 border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-purple-900 via-[#1b122c] to-purple-900 text-white rounded-t-3xl">
              <h3 className="font-black text-sm sm:text-base">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && <p className="text-red-700 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-bold">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-bold mb-1.5 block">SKU *</label>
                  <input className={inputCls} placeholder="MED001" {...field('sku')} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold mb-1.5 block">Categoria *</label>
                  <select className={inputCls} {...field('categoria')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold mb-1.5 block">Nome do Produto *</label>
                <input className={inputCls} placeholder="Ex: Dipirona 500mg (10 comp)" {...field('nome')} />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold mb-1.5 block">Descrição</label>
                <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Descrição detalhada do produto..." {...field('descricao')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-bold mb-1.5 block">Preço</label>
                  <input className={inputCls} placeholder='Ex: 12,90 ou "Consulte"' {...field('preco')} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold mb-1.5 block">Status</label>
                  <select className={inputCls} {...field('status')}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* UPLOAD DE IMAGEM LOCAL E VISUALIZAÇÃO DE THUMBNAIL */}
              <div>
                <label className="text-xs text-slate-500 font-bold mb-1.5 block">Imagem do Produto</label>
                <div className="flex flex-col sm:flex-row gap-3 items-center bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  {form.imagem ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white">
                      <img src={form.imagem} alt="Pré-visualização" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, imagem: '' }))}
                        className="absolute top-0 right-0 bg-red-650 text-white p-0.5 rounded-bl hover:bg-red-750 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 text-slate-400 bg-white">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2 w-full">
                    {/* Botão de Anexo */}
                    <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-750 border border-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-all text-center">
                      <Plus className="w-3.5 h-3.5" />
                      Anexar Foto Local
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    
                    {/* Campo de link como alternativa */}
                    <input
                      type="text"
                      value={form.imagem}
                      onChange={e => setForm(prev => ({ ...prev, imagem: e.target.value }))}
                      placeholder="Ou cole a URL da foto..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold mb-1.5 block">Observações</label>
                <input className={inputCls} placeholder="Bula, dosagem, contraindicação..." {...field('observacoes')} />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#10b981] hover:bg-[#059669] text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-100"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
