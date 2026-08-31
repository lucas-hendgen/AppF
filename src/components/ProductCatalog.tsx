import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Eye, Sparkles, Filter, Check, Flame, Award, Tag, Zap, Star } from 'lucide-react';
import { Product, Category, PromotionalSection } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/pharmacyData';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

interface ProductCatalogProps {
  onOpenProductDetail: (product: Product) => void;
}

const PROMOTIONAL_SECTIONS: { key: PromotionalSection; label: string; icon: any; gradient: string; badgeCls: string }[] = [
  { key: 'ofertas_imperdiveis', label: 'Ofertas Imperdíveis', icon: Flame, gradient: 'from-amber-500 to-rose-600', badgeCls: 'bg-rose-500 text-white' },
  { key: 'leve_mais', label: 'Leve Mais por Muito Menos', icon: Zap, gradient: 'from-emerald-500 to-teal-600', badgeCls: 'bg-emerald-600 text-white' },
  { key: 'super_ofertas', label: 'Super Ofertas da Semana', icon: Star, gradient: 'from-blue-500 to-indigo-600', badgeCls: 'bg-blue-600 text-white' },
  { key: 'mais_vendidos', label: 'Os Mais Vendidos', icon: Award, gradient: 'from-purple-500 to-pink-600', badgeCls: 'bg-purple-600 text-white' },
  { key: 'lancamentos', label: 'Principais Lançamentos', icon: Sparkles, gradient: 'from-emerald-600 to-teal-700', badgeCls: 'bg-teal-600 text-white' },
];

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onOpenProductDetail }) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | PromotionalSection>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedAnimationId, setAddedAnimationId] = useState<number | null>(null);

  useEffect(() => {
    api.fetchProducts()
      .then(setProducts)
      .catch(() => setProducts(INITIAL_PRODUCTS))
      .finally(() => setIsLoading(false));
  }, []);

  // Unique categories list derived dynamically from products + initial categories
  const categories = useMemo(() => {
    const set = new Set<string>(INITIAL_CATEGORIES.map(c => c.nome_categoria.toLowerCase()));
    products.forEach(p => {
      if (p.categoria) set.add(p.categoria.toLowerCase());
    });
    return Array.from(set);
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (prod.status !== 'Ativo') return false;

      // Filter by promotional showcase tab
      if (activeTab !== 'all') {
        if (prod.promotionalSection !== activeTab) return false;
      }

      // Filter by category
      if (selectedCategory !== 'todos') {
        if (prod.categoria.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Search query
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesName = prod.nome.toLowerCase().includes(query);
        const matchesSku = prod.sku?.toLowerCase().includes(query);
        const matchesDesc = prod.descricao?.toLowerCase().includes(query);
        const matchesCat = prod.categoria?.toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [products, activeTab, selectedCategory, searchQuery]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    // If product has variations (multiple sizes, radio), open details modal instead
    if (product.preco.includes('#') || product.classificacaoAdicional) {
      onOpenProductDetail(product);
      return;
    }

    addToCart(product, 1);
    setAddedAnimationId(product.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  const getPromoBadge = (section?: PromotionalSection) => {
    if (!section || section === 'geral') return null;
    const found = PROMOTIONAL_SECTIONS.find(s => s.key === section);
    if (!found) return null;
    const Icon = found.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${found.badgeCls}`}>
        <Icon className="w-3 h-3" />
        {found.label.split(' ')[0]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Navigation Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-md border border-slate-200/80 space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por medicamento, vitamina, cosmético ou sintoma..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 w-6 h-6 rounded-full flex items-center justify-center font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Vitrines Promocionais (Tabs Principais) */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2 px-1">
            Vitrines & Promoções
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('todos');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
                activeTab === 'all' && selectedCategory === 'todos'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🏪 Todos os Produtos ({products.filter(p => p.status === 'Ativo').length})
            </button>

            {PROMOTIONAL_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const count = products.filter(p => p.status === 'Ativo' && p.promotionalSection === sec.key).length;
              return (
                <button
                  key={sec.key}
                  onClick={() => {
                    setActiveTab(sec.key);
                    setSelectedCategory('todos');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
                    activeTab === sec.key
                      ? `bg-gradient-to-r ${sec.gradient} text-white shadow-md`
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sec.label}
                  {count > 0 && <span className="opacity-80 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorias Gerais */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'todos'
                  ? 'bg-[#10b981] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas as Categorias
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setActiveTab('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#10b981] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Active Section Header Banner if specific showcase selected */}
      {activeTab !== 'all' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-[#064e3b] to-emerald-800 text-white shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              {React.createElement(PROMOTIONAL_SECTIONS.find(s => s.key === activeTab)?.icon || Sparkles, { className: 'w-5 h-5 text-amber-300' })}
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {PROMOTIONAL_SECTIONS.find(s => s.key === activeTab)?.label}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">Produtos selecionados e administrados pela nossa equipe farmacêutica</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('all')}
            className="text-xs font-bold px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Ver Todos
          </button>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-md animate-pulse">
              <div className="w-full aspect-square bg-slate-200 rounded-2xl mb-3" />
              <div className="h-3 bg-slate-200 rounded mb-2 w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredProducts.map((product) => {
            const isAdded = addedAnimationId === product.id;
            const isConsult = product.preco.toLowerCase().includes('consulte');
            const hasVariations = product.preco.includes('#') || Boolean(product.classificacaoAdicional);

            return (
              <div
                key={product.id}
                onClick={() => onOpenProductDetail(product)}
                className="group bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-md hover:shadow-xl hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                <div>
                  {/* Product Image Container (SEM código SKU visível no card) */}
                  <div className="relative w-full aspect-square bg-slate-50/50 rounded-2xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center p-2 group-hover:scale-[1.02] transition-transform duration-300">
                    <img
                      src={product.imagem}
                      alt={product.nome}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Promotional Badge on Top Left */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {getPromoBadge(product.promotionalSection)}
                    </div>
                  </div>

                  {/* Category Tag */}
                  <span className="text-[10px] uppercase font-bold text-[#10b981] tracking-wider block mb-1">
                    {product.categoria}
                  </span>

                  {/* Product Title */}
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-tight group-hover:text-[#10b981] transition-colors">
                    {product.nome}
                  </h3>

                  {/* Short Description */}
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                    {product.descricao}
                  </p>
                </div>

                {/* Card Footer: Price & Add button */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-none">Preço</span>
                    <span className={`font-extrabold text-xs sm:text-sm ${
                      isConsult ? 'text-amber-600 font-semibold' : 'text-slate-900'
                    }`}>
                      {isConsult ? 'Sob Consulta' : `R$ ${product.preco.split('#')[0]}`}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleQuickAdd(e, product)}
                    className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-md shadow-emerald-100/40 hover:scale-105 active:scale-95'
                    }`}
                    title={hasVariations ? "Ver opções do produto" : "Adicionar ao carrinho"}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Adicionado</span>
                      </>
                    ) : hasVariations ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Opções</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-700">Nenhum produto encontrado nesta vitrine</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tente buscar com outro termo ou selecione "Todos os Produtos".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('todos');
              setActiveTab('all');
            }}
            className="px-4 py-2 bg-[#10b981] text-white text-xs font-bold rounded-xl shadow-md"
          >
            Limpar Filtros
          </button>
        </div>
      )}

    </div>
  );
};
