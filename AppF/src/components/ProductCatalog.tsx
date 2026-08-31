import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Sparkles, Filter, Check } from 'lucide-react';
import { Product, Category } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/pharmacyData';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

interface ProductCatalogProps {
  onOpenProductDetail: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onOpenProductDetail }) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedAnimationId, setAddedAnimationId] = useState<number | null>(null);

  const categories = INITIAL_CATEGORIES;

  useEffect(() => {
    api.fetchProducts()
      .then(setProducts)
      .catch(() => setProducts(INITIAL_PRODUCTS))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter products by category & search query
  const filteredProducts = products.filter((prod) => {
    if (prod.status !== 'Ativo') return false;

    const matchesCategory = selectedCategory === 'todos' || prod.categoria.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      prod.nome.toLowerCase().includes(query) ||
      prod.sku.toLowerCase().includes(query) ||
      prod.descricao.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

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

  return (
    <div className="space-y-6">
      
      {/* Category Pills & Search Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-md border border-emerald-100/60 space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por medicamento, vitamina, cosmético ou código SKU..."
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

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-md ${
              selectedCategory === 'todos'
                ? 'bg-[#10b981] text-white shadow-emerald-100/30'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60'
            }`}
          >
            🏪 Todos os Itens ({products.filter(p => p.status === 'Ativo').length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.nome_categoria)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-md ${
                selectedCategory === cat.nome_categoria
                  ? 'bg-[#10b981] text-white shadow-emerald-100/30'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60'
              }`}
            >
              {cat.titulo_exibicao}
            </button>
          ))}
        </div>
      </div>

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
                  {/* Product Image Container */}
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
                    <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-200/70 text-slate-500 border border-slate-300/30 rounded-md backdrop-blur-sm">
                      {product.sku}
                    </span>
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
                    className={`p-2 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shadow-md ${
                      isAdded
                        ? 'bg-[#10b981] text-white'
                        : 'bg-slate-50 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-slate-200/60'
                    }`}
                  >
                    {isAdded ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Adicionado
                      </span>
                    ) : hasVariations ? (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Ver Opções
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-md p-8 space-y-3">
          <Search className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="text-base font-bold text-slate-800">Nenhum produto encontrado</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos resultados para a busca "{searchQuery}". Tente usar outro termo ou navegue pelas categorias acima.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('todos');
            }}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#10b981] font-bold text-xs rounded-xl border border-slate-200/60"
          >
            Limpar Filtros
          </button>
        </div>
      )}

    </div>
  );
};
