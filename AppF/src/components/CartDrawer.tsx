import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, closeCart, updateQuantity, removeFromCart, clearCart, totalItems, subtotal, openCheckout } = useCart();
  const { isAuthenticated, user, openAuthModal } = useAuth();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={closeCart} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-100 shadow-2xl flex flex-col text-slate-600">
          
          {/* Drawer Header */}
          <div className="p-5 bg-gradient-to-r from-[#064e3b] to-[#047857] text-white flex items-center justify-between border-b border-[#065f46]/30">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-emerald-300" />
              <div>
                <h2 className="text-base font-bold text-white">Seu Carrinho</h2>
                <p className="text-xs text-emerald-100">{totalItems} {totalItems === 1 ? 'item' : 'itens'} selecionados</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-emerald-100 hover:text-white px-2 py-1 hover:bg-white/10 rounded-lg transition-all"
                  title="Limpar carrinho"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={closeCart}
                className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Member Banner Notification */}
          {!isAuthenticated ? (
            <div className="p-3.5 bg-amber-50 border-b border-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  Login obrigatório para compras: crie sua conta ou entre para finalizar seu pedido!
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openAuthModal('login', 'Faça login para continuar com seu pedido.')}
                  className="flex-1 text-xs font-bold text-white bg-[#10b981] hover:bg-[#059669] py-1.5 px-3 rounded-lg shadow-sm text-center transition-all"
                >
                  Entrar na Conta
                </button>
                <button
                  onClick={() => openAuthModal('register', 'Crie sua conta em 1 minuto para finalizar sua compra.')}
                  className="flex-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200/80 text-center transition-all"
                >
                  Criar Conta Grátis
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700 font-medium">
                  Conectado como <strong className="text-slate-800">{user?.name}</strong> • {user?.membershipTier}
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-600">
                {user?.loyaltyPoints || 0} pts
              </span>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div
                  key={item.itemKey}
                  className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center gap-3 hover:border-emerald-300 transition-colors"
                >
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200/50 bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-800 truncate">{item.nome}</h4>
                      <button
                        onClick={() => removeFromCart(item.itemKey)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">{item.sku}</span>
                    {item.variationText && (
                      <span className="text-[10px] text-emerald-600 font-medium block truncate">
                        ✓ {item.variationText}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-[#10b981]">
                        R$ {(item.preco * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                      <div className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.itemKey, -1)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.itemKey, 1)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-200" />
                <p className="text-sm font-semibold text-slate-500">Seu carrinho está vazio</p>
                <p className="text-xs text-slate-400">Escolha os medicamentos e itens desejados no catálogo.</p>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Subtotal dos Itens</span>
                <span className="font-bold text-slate-800">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                * A taxa de entrega será calculada no próximo passo de acordo com o seu bairro.
              </p>

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal('login', 'Para sua segurança e emissão correta do pedido, faça login ou crie sua conta para finalizar a compra.');
                    return;
                  }
                  closeCart();
                  openCheckout();
                }}
                className="w-full py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Avançar para o Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
