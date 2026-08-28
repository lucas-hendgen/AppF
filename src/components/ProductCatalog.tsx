import React, { useState } from 'react';
import { Search, Plus, Eye, Sparkles, Filter, Check } from 'lucide-react';
import { Product, Category } from '../types';
import { INITIAL_CATEGORIES } from '../data/pharmacyData';
import { useCart } from '../context/CartContext';

interface ProductCatalogProps {
  products: Product[];
  onOpenProductDetail: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, onOpenProductDetail }) => {
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedAnimationId, setAddedAnimationId] = useState<number | null>(null);

  const categories = INITIAL_CATEGORIES;

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
      <div className="bg-[#111111] rounded-3xl p-4 shadow-xl border border-[#1f2937] space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#6b7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por medicamento, vitamina, cosmético ou código SKU..."
            className="w-full pl-11 pr-4 py-3 bg-[#161616] border border-[#27272a] rounded-2xl text-sm font-medium text-[#f3f4f6] placeholder-[#6b7280] focus:bg-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs text-[#9ca3af] hover:text-white bg-[#27272a] hover:bg-[#374151] w-6 h-6 rounded-full flex items-center justify-center font-bold"
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
                ? 'bg-[#10b981] text-white shadow-emerald-950/60'
                : 'bg-[#161616] text-[#d1d5db] hover:bg-[#222222] hover:text-white border border-[#27272a]'
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
                  ? 'bg-[#10b981] text-white shadow-emerald-950/60'
                  : 'bg-[#161616] text-[#d1d5db] hover:bg-[#222222] hover:text-white border border-[#27272a]'
              }`}
            >
              {cat.titulo_exibicao}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredProducts.map((product) => {
            const isAdded = addedAnimationId === product.id;
            const isConsult = product.preco.toLowerCase().includes('consulte');
            const hasVariations = product.preco.includes('#') || Boolean(product.classificacaoAdicional);

            return (
              <div
                key={product.id}
                onClick={() => onOpenProductDetail(product)}
                className="group bg-[#111111] rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-[#1f2937] shadow-lg hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                <div>
                  {/* Product Image Container */}
                  <div className="relative w-full aspect-square bg-[#161616] rounded-2xl overflow-hidden mb-3 border border-[#27272a] flex items-center justify-center p-2 group-hover:scale-[1.02] transition-transform duration-300">
                    <img
                      src={product.imagem}
                      alt={product.nome}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 bg-black/80 text-[#9ca3af] border border-[#27272a] rounded-md backdrop-blur-sm">
                      {product.sku}
                    </span>
                  </div>

                  {/* Category Tag */}
                  <span className="text-[10px] uppercase font-bold text-[#10b981] tracking-wider block mb-1">
                    {product.categoria}
                  </span>

                  {/* Product Title */}
                  <h3 className="font-bold text-xs sm:text-sm text-[#f3f4f6] line-clamp-2 leading-tight group-hover:text-[#10b981] transition-colors">
                    {product.nome}
                  </h3>

                  {/* Short Description */}
                  <p className="text-[11px] text-[#9ca3af] line-clamp-2 mt-1 leading-snug">
                    {product.descricao}
                  </p>
                </div>

                {/* Card Footer: Price & Add button */}
                <div className="pt-3 mt-3 border-t border-[#1f2937] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-[#6b7280] block leading-none">Preço</span>
                    <span className={`font-extrabold text-xs sm:text-sm ${
                      isConsult ? 'text-amber-400 font-semibold' : 'text-white'
                    }`}>
                      {isConsult ? 'Sob Consulta' : `R$ ${product.preco.split('#')[0]}`}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleQuickAdd(e, product)}
                    className={`p-2 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shadow-md ${
                      isAdded
                        ? 'bg-[#10b981] text-white'
                        : 'bg-[#161616] hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#27272a]'
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
        <div className="text-center py-16 bg-[#111111] rounded-3xl border border-[#1f2937] p-8 space-y-3">
          <Search className="w-12 h-12 mx-auto text-[#4b5563]" />
          <h4 className="text-base font-bold text-[#f3f4f6]">Nenhum produto encontrado</h4>
          <p className="text-xs text-[#9ca3af] max-w-md mx-auto">
            Não encontramos resultados para a busca "{searchQuery}". Tente usar outro termo ou navegue pelas categorias acima.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('todos');
            }}
            className="px-4 py-2 bg-[#161616] hover:bg-[#222222] text-[#10b981] font-bold text-xs rounded-xl border border-[#27272a]"
          >
            Limpar Filtros
          </button>
        </div>
      )}

    </div>
  );
};
