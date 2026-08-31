import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Save, RefreshCw, Package, Download, Printer, Search, Filter, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Flame, Award, Tag, Zap, Star, Barcode, DollarSign } from 'lucide-react';
import { api } from '../../services/api';
import { Product, PromotionalSection } from '../../types';

const DEFAULT_CATEGORIES = ['medicamentos', 'higiene', 'perfumaria', 'infantil', 'vitaminas'];

const PROMO_SECTIONS_LIST: { key: PromotionalSection; label: string }[] = [
  { key: 'geral', label: 'Nenhuma (Catálogo Geral)' },
  { key: 'ofertas_imperdiveis', label: '🔥 Ofertas Imperdíveis' },
  { key: 'leve_mais', label: '💰 Leve mais por muito menos, aproveite!' },
  { key: 'super_ofertas', label: '⭐ Super Ofertas da semana' },
  { key: 'mais_vendidos', label: '🏆 Os mais vendidos' },
  { key: 'lancamentos', label: '✨ Os principais lançamentos' },
];

const EMPTY_FORM: Omit<Product, 'id'> = {
  sku: '',
  nome: '',
  categoria: 'medicamentos',
  descricao: '',
  preco: '',
  status: 'Ativo',
  imagem: '',
  observacoes: '',
  classificacaoAdicional: '',
  promotionalSection: 'geral',
  ean: '',
  estoque: 100
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
  
  // Custom Category Creation State
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedPromo, setSelectedPromo] = useState('todos');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async (showFullLoader = false) => {
    if (showFullLoader || products.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const data = await api.getAdminProducts();
      setProducts(data);
      
      // Extract unique custom categories
      const allCats = Array.from(new Set(data.map(p => p.categoria.toLowerCase())));
      setCustomCategories(allCats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(true); }, []);

  // All combined available categories
  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories]));
  }, [customCategories]);

  // Filtered Products
  const filtered = useMemo(() => {
    return products.filter(p => {
      const query = search.toLowerCase().trim();
      const matchesSearch = !query ||
        p.nome.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.ean && p.ean.toLowerCase().includes(query)) ||
        (p.descricao && p.descricao.toLowerCase().includes(query));

      const matchesCategory = selectedCategory === 'todos' || p.categoria.toLowerCase() === selectedCategory.toLowerCase();
      const matchesStatus = selectedStatus === 'todos' || p.status === selectedStatus;
      const matchesPromo = selectedPromo === 'todos' || (p.promotionalSection || 'geral') === selectedPromo;

      return matchesSearch && matchesCategory && matchesStatus && matchesPromo;
    });
  }, [products, search, selectedCategory, selectedStatus, selectedPromo]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.status === 'Ativo').length;
    const inactive = total - active;
    const totalValue = products.reduce((acc, p) => {
      const numericPrice = parseFloat(String(p.preco).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      const stock = p.estoque || 10;
      return acc + (numericPrice * stock);
    }, 0);
    return { total, active, inactive, totalValue, categoriesCount: allCategories.length };
  }, [products, allCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsCreatingNewCategory(false);
    setNewCategoryName('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const { id, ...rest } = p;
    setForm({
      ...EMPTY_FORM,
      ...rest,
      promotionalSection: p.promotionalSection || 'geral'
    });
    setIsCreatingNewCategory(false);
    setNewCategoryName('');
    setError('');
    setShowModal(true);
  };

  const toggleStatus = async (p: Product) => {
    const newStatus = p.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const updated = await api.updateProduct(p.id, { status: newStatus });
      setProducts(prev => prev.map(item => item.id === updated.id ? updated : item));
      setFeedback(`Produto "${p.nome}" alterado para ${newStatus}.`);
      setTimeout(() => setFeedback(''), 3000);
    } catch (e: any) {
      alert('Erro ao atualizar status: ' + e.message);
    }
  };

  const save = async () => {
    if (!form.nome.trim() || !form.sku.trim()) {
      setError('Nome e Código SKU são obrigatórios.');
      return;
    }

    let finalCategory = form.categoria;
    if (isCreatingNewCategory) {
      if (!newCategoryName.trim()) {
        setError('Digite o nome da nova categoria ou desmarque a opção.');
        return;
      }
      finalCategory = newCategoryName.trim().toLowerCase();
    }

    setSaving(true);
    setError('');
    if (setGlobalLoading) setGlobalLoading(true);

    try {
      const payload: Omit<Product, 'id'> = {
        ...form,
        categoria: finalCategory,
        promotionalSection: form.promotionalSection || 'geral'
      };

      if (editing) {
        const updated = await api.updateProduct(editing.id, payload);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        setFeedback(`Produto "${updated.nome}" atualizado com sucesso!`);
      } else {
        const created = await api.createProduct(payload);
        setProducts(prev => [created, ...prev]);
        setFeedback(`Novo produto "${created.nome}" cadastrado com sucesso!`);
      }

      if (isCreatingNewCategory && !customCategories.includes(finalCategory)) {
        setCustomCategories(prev => [...prev, finalCategory]);
      }

      setShowModal(false);
      setTimeout(() => setFeedback(''), 3500);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este produto do catálogo?')) return;
    setDeleting(id);
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setFeedback('Produto removido com sucesso.');
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setDeleting(null);
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem é muito grande. Escolha uma imagem de até 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imagem: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Export to CSV Report
  const handleExportCSV = () => {
    const headers = ['ID', 'SKU', 'Codigo_Barras_EAN', 'Nome', 'Categoria', 'Preco', 'Estoque', 'Status', 'Vitrine_Promocional'];
    const rows = products.map(p => [
      p.id,
      `"${p.sku}"`,
      `"${p.ean || ''}"`,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.categoria}"`,
      `"${p.preco}"`,
      p.estoque || 100,
      p.status,
      `"${p.promotionalSection || 'geral'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_produtos_farmacia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Price Table for Physical Counter
  const handlePrintCatalog = () => {
    window.print();
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all font-medium';

  return (
    <div className="space-y-5 text-slate-700">
      
      {/* 📊 Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-[#10b981] rounded-xl border border-emerald-100 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Produtos</span>
            <span className="text-lg sm:text-xl font-black text-slate-800">{metrics.total} itens</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Ativos / Inativos</span>
            <span className="text-lg sm:text-xl font-black text-slate-800">{metrics.active} <span className="text-xs text-slate-400 font-normal">/ {metrics.inactive}</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Categorias</span>
            <span className="text-lg sm:text-xl font-black text-slate-800">{metrics.categoriesCount} tipos</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Inventário Estimado</span>
            <span className="text-base sm:text-lg font-black text-slate-800">R$ {metrics.totalValue.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Exibindo <strong className="text-slate-800">{filtered.length}</strong> de {products.length} produtos
          </span>
          {refreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Exportar dados em planilha Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar CSV
          </button>

          <button
            onClick={handlePrintCatalog}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Imprimir catálogo formatado para balcão da loja"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" /> Imprimir Balcão
          </button>

          <button
            onClick={() => load(false)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
            title="Recarregar produtos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-100"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          {feedback}
        </div>
      )}

      {/* Advanced Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por Nome, SKU ou EAN..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-medium shadow-xs"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-bold shadow-xs uppercase tracking-wider"
          >
            <option value="todos">Todas as Categorias</option>
            {allCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedPromo}
            onChange={e => setSelectedPromo(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-bold shadow-xs"
          >
            <option value="todos">Todas as Vitrines Promocionais</option>
            {PROMO_SECTIONS_LIST.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-bold shadow-xs"
          >
            <option value="todos">Status: Todos</option>
            <option value="Ativo">Apenas Ativos</option>
            <option value="Inativo">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Professional Products Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-pulse h-14" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs animate-in fade-in duration-300">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500">
                <th className="text-left p-3 font-black">SKU / EAN</th>
                <th className="text-left p-3 font-black">Produto</th>
                <th className="text-left p-3 font-black hidden sm:table-cell">Categoria</th>
                <th className="text-left p-3 font-black hidden md:table-cell">Vitrine Promocional</th>
                <th className="text-left p-3 font-black">Preço</th>
                <th className="text-center p-3 font-black">Estoque</th>
                <th className="text-center p-3 font-black">Status</th>
                <th className="text-center p-3 font-black">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-500 font-bold whitespace-nowrap">
                    <span className="block text-slate-800">{p.sku}</span>
                    {p.ean && <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5"><Barcode className="w-3 h-3" />{p.ean}</span>}
                  </td>
                  <td className="p-3 font-bold text-slate-800 max-w-[240px]">
                    <div className="flex items-center gap-2.5">
                      {p.imagem ? (
                        <img src={p.imagem} alt={p.nome} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 bg-white" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="truncate block font-bold text-slate-850">{p.nome}</span>
                        {p.descricao && <span className="text-[11px] text-slate-400 truncate block font-normal">{p.descricao}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 uppercase tracking-wider font-bold text-[10px] hidden sm:table-cell whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                      {p.categoria}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 hidden md:table-cell whitespace-nowrap">
                    {p.promotionalSection && p.promotionalSection !== 'geral' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {PROMO_SECTIONS_LIST.find(s => s.key === p.promotionalSection)?.label || p.promotionalSection}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Catálogo Geral</span>
                    )}
                  </td>
                  <td className="p-3 text-[#10b981] font-black whitespace-nowrap">
                    {p.preco.includes('#') ? 'Variações' : p.preco.toLowerCase().includes('consulte') ? 'Sob Consulta' : `R$ ${p.preco}`}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                      {p.estoque ?? 100} un
                    </span>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => toggleStatus(p)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
                        p.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                      title="Clique para alternar status do produto"
                    >
                      {p.status}
                    </button>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                        title="Editar produto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        disabled={deleting === p.id}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 transition-colors disabled:opacity-50"
                        title="Excluir produto"
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

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Itens por página:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">
              (Mostrando {Math.min(filtered.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filtered.length, currentPage * pageSize)} de {filtered.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-40 font-bold flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>

            <span className="px-3 py-1 font-bold text-slate-800">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-40 font-bold flex items-center gap-1 transition-all"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Produto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#064e3b] to-[#047857] text-white rounded-t-3xl border-b border-emerald-800/30">
              <div>
                <h3 className="font-black text-base">{editing ? 'Editar Produto no Catálogo' : 'Cadastrar Novo Produto'}</h3>
                <p className="text-xs text-emerald-100">Configuração completa para loja online e balcão físico</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 space-y-4 flex-1">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-750 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  {error}
                </div>
              )}

              {/* SKU e Código EAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Código SKU Interno *</label>
                  <input
                    className={inputCls}
                    placeholder="Ex: MED001"
                    value={form.sku}
                    onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Código de Barras / EAN-13 (Opcional)</label>
                  <input
                    className={inputCls}
                    placeholder="Ex: 7891234567890"
                    value={form.ean || ''}
                    onChange={e => setForm(prev => ({ ...prev, ean: e.target.value }))}
                  />
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs text-slate-600 font-bold mb-1.5 block">Nome do Produto *</label>
                <input
                  className={inputCls}
                  placeholder="Ex: Dipirona 500mg (10 comprimidos)"
                  value={form.nome}
                  onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              {/* Categoria + Opção Criar Nova Categoria */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-700 font-bold">Categoria do Produto *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCategory(!isCreatingNewCategory);
                      setNewCategoryName('');
                    }}
                    className="text-xs font-bold text-[#10b981] hover:text-[#059669] hover:underline"
                  >
                    {isCreatingNewCategory ? '← Selecionar existente' : '+ Criar Nova Categoria'}
                  </button>
                </div>

                {isCreatingNewCategory ? (
                  <div>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="Digite o nome da nova categoria (ex: Ortopédicos)..."
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981] font-bold"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Essa categoria será salva e ficará disponível para os próximos produtos.</p>
                  </div>
                ) : (
                  <select
                    className={inputCls}
                    value={form.categoria}
                    onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                  >
                    {allCategories.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Vitrine Promocional */}
              <div>
                <label className="text-xs text-slate-600 font-bold mb-1.5 block">Vitrine / Seção Promocional</label>
                <select
                  className={inputCls}
                  value={form.promotionalSection || 'geral'}
                  onChange={e => setForm(prev => ({ ...prev, promotionalSection: e.target.value as PromotionalSection }))}
                >
                  {PROMO_SECTIONS_LIST.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">O produto aparecerá no destaque correspondente na loja online.</p>
              </div>

              {/* Preço, Estoque e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Preço (R$) *</label>
                  <input
                    className={inputCls}
                    placeholder='Ex: 49,90 ou "Consulte"'
                    value={form.preco}
                    onChange={e => setForm(prev => ({ ...prev, preco: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Estoque Inicial (un)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    placeholder="100"
                    value={form.estoque ?? 100}
                    onChange={e => setForm(prev => ({ ...prev, estoque: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-bold mb-1.5 block">Status no Catálogo</label>
                  <select
                    className={inputCls}
                    value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value as 'Ativo' | 'Inativo' }))}
                  >
                    <option value="Ativo">Ativo (Visível)</option>
                    <option value="Inativo">Inativo (Oculto)</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs text-slate-600 font-bold mb-1.5 block">Descrição do Produto</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Informações, dosagem, indicação e benefícios..."
                  value={form.descricao}
                  onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>

              {/* Imagem do Produto */}
              <div>
                <label className="text-xs text-slate-600 font-bold mb-1.5 block">Imagem do Produto (URL ou Arquivo)</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="https://exemplo.com/imagem.png"
                    value={form.imagem || ''}
                    onChange={e => setForm(prev => ({ ...prev, imagem: e.target.value }))}
                  />
                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-center shrink-0">
                    Anexar
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              {/* Observações Farmacêuticas */}
              <div>
                <label className="text-xs text-slate-600 font-bold mb-1.5 block">Observações Farmacêuticas / Bula</label>
                <input
                  className={inputCls}
                  placeholder="Ex: Venda sob prescrição médica ou uso adulto"
                  value={form.observacoes || ''}
                  onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-6 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-100 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {editing ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
