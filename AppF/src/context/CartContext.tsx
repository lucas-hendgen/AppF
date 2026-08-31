import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Coupon, Neighborhood } from '../types';
import { api } from '../services/api';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variations?: Record<string, any>, variationText?: string, removalText?: string, notes?: string) => void;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (bairro: string) => void;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  finalTotal: number;
  neighborhoods: Neighborhood[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('fsp_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  useEffect(() => {
    api.fetchNeighborhoods().then(setNeighborhoods).catch(console.warn);
  }, []);

  // Sincronizar preços dos itens do carrinho com a base de dados
  useEffect(() => {
    if (cart.length === 0) return;
    api.fetchProducts()
      .then(products => {
        setCart(prev => {
          let changed = false;
          const updated = prev.map(item => {
            const dbProd = products.find(p => p.id === item.id);
            if (dbProd) {
              let latestPrice = 0;
              if (dbProd.preco.includes('#')) {
                const rawVars = dbProd.preco.split('#')[1].split('/');
                const targetVar = item.variationText ? String(item.variationText).trim() : '';
                let foundVarPrice = null;
                for (const v of rawVars) {
                  const [vName, vPrice] = v.split(':');
                  if (vName.trim() === targetVar) {
                    foundVarPrice = parseFloat(String(vPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
                    break;
                  }
                }
                if (foundVarPrice === null) {
                  const firstPriceRaw = rawVars[0].split(':')[1];
                  latestPrice = parseFloat(String(firstPriceRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
                } else {
                  latestPrice = foundVarPrice;
                }
              } else {
                latestPrice = parseFloat(String(dbProd.preco).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
              }
              if (item.preco !== latestPrice) {
                changed = true;
                return { ...item, preco: latestPrice };
              }
            }
            return item;
          });
          return changed ? updated : prev;
        });
      })
      .catch(console.warn);
  }, [isCheckoutOpen]);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('fsp_cart_v1', JSON.stringify(cart));
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e);
    }
  }, [cart]);

  const addToCart = (
    product: Product,
    quantity = 1,
    variations?: Record<string, any>,
    variationText = '',
    removalText = '',
    notes = ''
  ) => {
    let numericPrice = 0;
    if (product.selectedBasePrice) {
      numericPrice = product.selectedBasePrice;
    } else {
      const cleanPrice = String(product.preco).replace(/[^0-9.,]/g, '').replace(',', '.');
      numericPrice = parseFloat(cleanPrice) || 0;
    }

    const varKey = variationText ? `-${variationText.replace(/\s+/g, '_')}` : '';
    const notesKey = notes ? `-${notes.slice(0, 10).replace(/\s+/g, '_')}` : '';
    const itemKey = `${product.id}${varKey}${notesKey}`;

    setCart(prev => {
      const existing = prev.find(item => item.itemKey === itemKey);
      if (existing) {
        return prev.map(item =>
          item.itemKey === itemKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          itemKey,
          nome: product.nome,
          sku: product.sku,
          descricao: product.descricao,
          preco: numericPrice,
          quantity,
          imagem: product.imagem,
          variations,
          variationText,
          removalText,
          notes
        }
      ];
    });
  };

  const removeFromCart = (itemKey: string) => {
    setCart(prev => prev.filter(item => item.itemKey !== itemKey));
  };

  const updateQuantity = (itemKey: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.itemKey === itemKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setDeliveryFee(0);
    setSelectedNeighborhood('');
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);

  // Calculate discount from coupon
  let couponDiscount = 0;
  if (appliedCoupon) {
    const val = appliedCoupon.valor_desconto;
    if (appliedCoupon.tipo_desconto === 'produtos') {
      if (val.includes('%')) {
        const pct = parseFloat(val.replace('%', '')) || 0;
        couponDiscount = (subtotal * pct) / 100;
      } else {
        couponDiscount = parseFloat(val.replace(',', '.')) || 0;
      }
    } else if (appliedCoupon.tipo_desconto === 'frete') {
      if (val.includes('%')) {
        const pct = parseFloat(val.replace('%', '')) || 0;
        couponDiscount = (deliveryFee * pct) / 100;
      } else {
        couponDiscount = Math.min(deliveryFee, parseFloat(val.replace(',', '.')) || 0);
      }
    } else if (appliedCoupon.tipo_desconto === 'total') {
      const base = subtotal + deliveryFee;
      if (val.includes('%')) {
        const pct = parseFloat(val.replace('%', '')) || 0;
        couponDiscount = (base * pct) / 100;
      } else {
        couponDiscount = parseFloat(val.replace(',', '.')) || 0;
      }
    }
  }

  const finalTotal = cart.length === 0 ? 0 : Math.max(0, subtotal + deliveryFee - couponDiscount);

  const applyCoupon = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    try {
      const found = await api.validateCoupon(cleanCode);
      setAppliedCoupon(found);
      return { success: true, message: `Cupom ${found.codigo} aplicado com sucesso!` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Cupom não encontrado ou inválido.' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        deliveryFee,
        setDeliveryFee,
        selectedNeighborhood,
        setSelectedNeighborhood,
        appliedCoupon,
        couponDiscount,
        applyCoupon,
        removeCoupon,
        finalTotal,
        neighborhoods,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        isCheckoutOpen,
        openCheckout: () => setIsCheckoutOpen(true),
        closeCheckout: () => setIsCheckoutOpen(false)
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
