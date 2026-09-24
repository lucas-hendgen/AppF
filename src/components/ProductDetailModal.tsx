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
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-700">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-slate-100 backdrop-blur border border-slate-200 rounded-full shadow-md transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Banner */}
        <div className="relative w-full h-64 bg-slate-50 flex items-center justify-center p-6 border-b border-slate-100">
          <img
            src={product.imagem}
            alt={product.nome}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.opacity = '0.3';
            }}
          />
          <span className="absolute bottom-3 left-4 text-xs font-mono font-bold px-2.5 py-1 bg-slate-200/70 text-slate-600 border border-slate-300/40 rounded-lg backdrop-blur-sm">
            SKU: {product.sku}
          </span>
        </div>

        {/* Product Details Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <span className="text-xs uppercase font-extrabold text-blue-600 tracking-wider block mb-1">
              {product.categoria}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {product.nome}
            </h2>
            <p className="text-xs text-slate-550 leading-relaxed mt-2">
              {product.descricao}
            </p>
          </div>

          {/* Observations / Warning */}
          {product.observacoes && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-700">
                <ShieldCheck className="w-4 h-4 text-amber-600" /> Orientação Farmacêutica
              </span>
              <p className="text-[11px] text-amber-700/80">{product.observacoes}</p>
            </div>
          )}

          {/* Variations Selector (e.g. Diaper sizes P, M, G, XG) */}
          {variationOptions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">
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
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <p className="font-bold">{vo.name}</p>
                    <p className="text-xs text-blue-600">R$ {vo.price.toFixed(2).replace('.', ',')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Observações Especiais para este Item (Opcional)
            </label>
            <input
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Ex: Embalagem para presente, bula lacrada..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Footer with Quantity and Add Button */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="p-1 text-slate-500 hover:text-slate-800"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-slate-800 w-5 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(prev => prev + 1)}
              className="p-1 text-slate-500 hover:text-slate-800"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to cart action */}
          <button
            onClick={handleAddToCart}
            className={`flex-1 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              isAdded
                ? 'bg-blue-800 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-950/40'
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
