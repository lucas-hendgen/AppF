import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [itemNotes, setItemNotes] = useState<string>('');
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setItemNotes('');
      setIsAdded(false);

      // Parse first variation if multiple prices exist
      if (product.preco.includes('#')) {
        const parts = product.preco.split('#')[1].split('/');
        if (parts.length > 0) {
          setSelectedVariation(parts[0]);
        }
      }
    }
  }, [product]);

  if (!product) return null;

  // Check if multiple sizes/variations exist in preco (e.g. "Tamanho#P:42,90/M:45,90")
  let variationOptions: Array<{ name: string; price: number; raw: string }> = [];
  if (product.preco.includes('#')) {
    const rawVars = product.preco.split('#')[1].split('/');
    variationOptions = rawVars.map(v => {
      const [vName, vPrice] = v.split(':');
      const num = parseFloat(String(vPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      return { name: vName.trim(), price: num, raw: v };
    });
  }

  // Calculate current unit price
  let currentPrice = 0;
  if (variationOptions.length > 0 && selectedVariation) {
    const found = variationOptions.find(vo => vo.raw === selectedVariation);
    currentPrice = found ? found.price : variationOptions[0].price;
  } else {
    currentPrice = parseFloat(String(product.preco).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  }

  const handleAddToCart = () => {
    const selectedVarObj = variationOptions.find(vo => vo.raw === selectedVariation);
    const varText = selectedVarObj ? selectedVarObj.name : undefined;

    addToCart(
      {
        ...product,
        selectedBasePrice: currentPrice,
        selectedBaseName: varText
      },
      quantity,
      selectedVarObj ? { variation: selectedVarObj.name } : undefined,
      varText,
      undefined,
      itemNotes
    );

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111111] rounded-3xl shadow-2xl border border-[#1f2937] overflow-hidden flex flex-col max-h-[90vh] text-[#d1d5db]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-[#9ca3af] hover:text-white bg-[#161616]/80 hover:bg-[#222222] backdrop-blur border border-[#27272a] rounded-full shadow-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Banner */}
        <div className="relative w-full h-64 bg-[#161616] flex items-center justify-center p-6 border-b border-[#1f2937]">
          <img
            src={product.imagem}
            alt={product.nome}
            className="w-full h-full object-contain"
          />
          <span className="absolute bottom-3 left-4 text-xs font-mono font-bold px-2.5 py-1 bg-black/80 text-[#9ca3af] border border-[#27272a] rounded-lg backdrop-blur-sm">
            SKU: {product.sku}
          </span>
        </div>

        {/* Product Details Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <span className="text-xs uppercase font-extrabold text-[#10b981] tracking-wider block mb-1">
              {product.categoria}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#f3f4f6] leading-tight">
              {product.nome}
            </h2>
            <p className="text-xs text-[#9ca3af] leading-relaxed mt-2">
              {product.descricao}
            </p>
          </div>

          {/* Observations / Warning */}
          {product.observacoes && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/40 rounded-2xl text-xs text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" /> Orientação Farmacêutica
              </span>
              <p className="text-[11px] text-amber-300/80">{product.observacoes}</p>
            </div>
          )}

          {/* Variations Selector (e.g. Diaper sizes P, M, G, XG) */}
          {variationOptions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#9ca3af] uppercase">
                Selecione a Opção / Tamanho:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {variationOptions.map((vo) => (
                  <button
                    key={vo.raw}
                    type="button"
                    onClick={() => setSelectedVariation(vo.raw)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      selectedVariation === vo.raw
                        ? 'border-[#10b981] bg-emerald-950/60 text-[#10b981] shadow-md'
                        : 'border-[#27272a] bg-[#161616] text-[#d1d5db] hover:bg-[#222222] hover:text-white'
                    }`}
                  >
                    <p className="font-bold">{vo.name}</p>
                    <p className="text-xs text-[#10b981]">R$ {vo.price.toFixed(2).replace('.', ',')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special Notes Input */}
          <div>
            <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-1">
              Observações Especiais para este Item (Opcional)
            </label>
            <input
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Ex: Embalagem para presente, bula lacrada..."
              className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Footer with Quantity and Add Button */}
        <div className="p-5 border-t border-[#1f2937] bg-[#0d0d0d] flex items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-[#161616] px-3 py-1.5 rounded-2xl border border-[#27272a] shadow-md">
            <button
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="p-1 text-[#9ca3af] hover:text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-[#f3f4f6] w-5 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(prev => prev + 1)}
              className="p-1 text-[#9ca3af] hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to cart action */}
          <button
            onClick={handleAddToCart}
            className={`flex-1 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-emerald-950/60'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-5 h-5" /> Adicionado com Sucesso!
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                <span>
                  Adicionar • {currentPrice > 0 ? `R$ ${(currentPrice * quantity).toFixed(2).replace('.', ',')}` : 'Sob Consulta'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
