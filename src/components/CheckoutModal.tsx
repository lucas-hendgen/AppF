import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Truck, Store, CreditCard, QrCode, Banknote, Tag, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, Sparkles, AlertCircle, Clock, Navigation, LocateFixed, Loader2, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { NEIGHBORHOODS } from '../data/pharmacyData';
import { api } from '../services/api';
import { Order, UserAddress } from '../types';
import {
  PHARMACY_LOCATION,
  calculateDistanceKm,
  estimateDeliveryTime,
  estimateByNeighborhood,
  DeliveryEstimate
} from '../utils/geolocation';

interface CheckoutModalProps {
  onOrderCreated: (order: Order, paymentType: 'mercadopago_pix' | 'mercadopago_card' | 'other', pixData?: any, prefData?: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onOrderCreated }) => {
  const {
    cart,
    isCheckoutOpen,
    closeCheckout,
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
    clearCart
  } = useCart();

  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Step 1: Receiving type & address
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | 'local'>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('centro');
  const [cep, setCep] = useState('88220-000');

  // Step 2: Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago_pix' | 'mercadopago_card' | 'pix' | 'dinheiro' | 'cartao_entrega'>('mercadopago_pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');

  // Initialize fields with member data if logged in
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');
      setCustomerCpf(user.cpf || '');

      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
        setSelectedAddressId(defaultAddr.id);
        setStreet(defaultAddr.street);
        setNumber(defaultAddr.number);
        setComplement(defaultAddr.complement || '');
        setNeighborhood(defaultAddr.neighborhood.toLowerCase());
        setCep(defaultAddr.cep || '88220-000');
      }
    }
  }, [user, isCheckoutOpen]);

  // Geolocation & Delivery Time Estimation State
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate>(() => estimateByNeighborhood('centro'));
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoFeedback, setGeoFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Recalculate neighborhood fee & default estimate when neighborhood changes
  useEffect(() => {
    if (deliveryType === 'delivery') {
      const found = NEIGHBORHOODS.find(n => n.bairro.toLowerCase() === neighborhood.toLowerCase());
      const fee = found ? found.taxa : 5.0;
      setDeliveryFee(fee);
      setSelectedNeighborhood(neighborhood);

      // If user hasn't overridden with GPS, compute estimate based on neighborhood
      if (!gpsActive) {
        setDeliveryEstimate(estimateByNeighborhood(neighborhood));
      }
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryType, neighborhood, gpsActive]);

  // Request browser geolocation to compute exact distance and ETA in minutes
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoFeedback({
        type: 'error',
        message: 'Seu navegador não suporta geolocalização. Estimativa calculada pelo bairro selecionado.'
      });
      return;
    }

    setIsLocatingGps(true);
    setGeoFeedback({
      type: 'info',
      message: 'Obtendo sua posição via GPS com precisão...'
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        const distKm = calculateDistanceKm(
          PHARMACY_LOCATION.lat,
          PHARMACY_LOCATION.lng,
          latitude,
          longitude
        );

        const estimate = estimateDeliveryTime(distKm, true, accuracy);
        setDeliveryEstimate(estimate);
        setGpsActive(true);
        setIsLocatingGps(false);
        setGeoFeedback({
          type: 'success',
          message: `GPS Ativo! Você está a ~${distKm.toFixed(1)} km da matriz da farmácia no Centro.`
        });
      },
      (error) => {
        setIsLocatingGps(false);
        let errorMsg = 'Permissão de localização não concedida. Usando estimativa padrão por bairro.';
        if (error.code === error.TIMEOUT) {
          errorMsg = 'Tempo limite esgotado ao buscar GPS. Usando estimativa por bairro.';
        }
        setGeoFeedback({
          type: 'error',
          message: errorMsg
        });
        // Fallback to neighborhood
        setDeliveryEstimate(estimateByNeighborhood(neighborhood));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [neighborhood]);

  if (!isCheckoutOpen) return null;

  const handleSelectSavedAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setStreet(addr.street);
    setNumber(addr.number);
    setComplement(addr.complement || '');
    setNeighborhood(addr.neighborhood.toLowerCase());
    setCep(addr.cep || '88220-000');
  };

  const handleApplyCoupon = () => {
    if (!couponInput) return;
    const res = applyCoupon(couponInput);
    setCouponFeedback({ success: res.success, text: res.message });
  };

  const handleFinalizeOrder = async () => {
    if (!isAuthenticated || !user) {
      openAuthModal('login', 'Você precisa estar logado para finalizar seu pedido.');
      return;
    }

    if (!customerName || !customerPhone) {
      alert('Por favor, informe seu nome e telefone WhatsApp.');
      return;
    }

    if (deliveryType === 'delivery' && (!street || !neighborhood)) {
      alert('Por favor, informe o endereço de entrega completo.');
      return;
    }

    setLoading(true);
    try {
      const orderPayload: Partial<Order> = {
        userId: user?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryType,
        address: deliveryType === 'delivery' ? {
          id: selectedAddressId || 'addr_custom',
          street,
          number: number || 'S/N',
          complement,
          neighborhood,
          city: 'Itapema',
          state: 'SC',
          cep
        } : undefined,
        items: cart.map(i => ({
          id: i.id,
          name: i.nome,
          sku: i.sku,
          price: i.preco,
          quantity: i.quantity,
          variations: i.variationText,
          notes: i.notes
        })),
        subtotal,
        deliveryFee,
        discount: couponDiscount,
        couponCode: appliedCoupon?.codigo,
        total: finalTotal,
        paymentMethod,
        paymentStatus: 'pending',
        changeAmount: needsChange ? changeAmount : undefined,
        notes: orderNotes
      };

      // 1. Create order in Node.js backend
      const createdOrder = await api.createOrder(orderPayload);

      // 2. Process Mercado Pago if selected
      if (paymentMethod === 'mercadopago_pix') {
        const pixRes = await api.createMercadoPagoPix({
          orderId: createdOrder.id,
          amount: finalTotal,
          payerEmail: user?.email || 'cliente@farmaciasuperpopular.com.br',
          payerName: customerName,
          payerCpf: customerCpf
        });
        clearCart();
        closeCheckout();
        onOrderCreated(createdOrder, 'mercadopago_pix', pixRes);
      } else if (paymentMethod === 'mercadopago_card') {
        const prefRes = await api.createMercadoPagoPreference({
          orderId: createdOrder.id,
          items: cart,
          payer: {
            name: customerName,
            email: user?.email || 'cliente@farmaciasuperpopular.com.br',
            phone: customerPhone
          },
          deliveryFee,
          discount: couponDiscount
        });
        clearCart();
        closeCheckout();
        onOrderCreated(createdOrder, 'mercadopago_card', null, prefRes);
      } else {
        clearCart();
        closeCheckout();
        onOrderCreated(createdOrder, 'other');
      }
    } catch (err: any) {
      console.error('Erro ao finalizar pedido:', err);
      alert(err.message || 'Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#111111] rounded-3xl shadow-2xl border border-[#1f2937] overflow-hidden flex flex-col max-h-[92vh] text-[#d1d5db]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#064e3b] to-[#047857] text-white flex items-center justify-between border-b border-[#065f46]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-emerald-300 rounded-xl border border-emerald-400/20 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Finalização de Pedido</h2>
              <p className="text-xs text-emerald-100">
                Passo {step} de 3 • Total: R$ {finalTotal.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          <button
            onClick={closeCheckout}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-[#1f2937] h-1.5 w-full flex">
          <div className={`h-full transition-all duration-300 bg-[#10b981] ${
            step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
          }`} />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Unauthenticated Security Gate */}
          {!isAuthenticated ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-700/50 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white">Login Obrigatório para Compras</h3>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Para sua segurança, rastreabilidade dos medicamentos e acúmulo de pontos fidelidade, você precisa estar conectado à sua conta.
                </p>
              </div>

              <div className="p-4 bg-[#161616] border border-[#27272a] rounded-2xl max-w-md mx-auto text-left space-y-2 text-xs">
                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Vantagens de ser Membro Super Popular:
                </p>
                <ul className="space-y-1 text-[11px] text-[#d1d5db]">
                  <li>✓ Endereços de entrega salvos para compras com 1 clique</li>
                  <li>✓ Acompanhamento em tempo real via WhatsApp e painel</li>
                  <li>✓ Acúmulo automático de pontos a cada R$ 1 gasto</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'Faça login para continuar com a finalização do seu pedido.')}
                  className="flex-1 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all text-center"
                >
                  Fazer Login
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register', 'Crie sua conta em segundos para concluir sua compra.')}
                  className="flex-1 py-3 bg-[#161616] hover:bg-[#222222] text-[#d1d5db] border border-[#27272a] font-bold text-xs rounded-xl transition-all text-center"
                >
                  Criar Conta Grátis
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: RECEIVING TYPE & ADDRESS */}
              {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">
                  1. Como deseja receber seus medicamentos?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                      deliveryType === 'delivery'
                        ? 'border-[#10b981] bg-emerald-950/40 text-white'
                        : 'border-[#27272a] bg-[#161616] hover:bg-[#1a1a1a] text-[#d1d5db]'
                    }`}
                  >
                    <Truck className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs block text-[#f3f4f6]">Entrega Delivery</span>
                      <span className="text-[11px] text-[#9ca3af]">Motoboy em Itapema</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                      deliveryType === 'pickup'
                        ? 'border-[#10b981] bg-emerald-950/40 text-white'
                        : 'border-[#27272a] bg-[#161616] hover:bg-[#1a1a1a] text-[#d1d5db]'
                    }`}
                  >
                    <Store className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs block text-[#f3f4f6]">Retirar no Balcão</span>
                      <span className="text-[11px] text-[#9ca3af]">Loja Centro (Sem taxa)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery Address Details */}
              {deliveryType === 'delivery' && (
                <div className="space-y-3 pt-2">
                  
                  {/* Saved Addresses for Members */}
                  {isAuthenticated && user && user.addresses && user.addresses.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-[#9ca3af] uppercase block mb-1.5">
                        Endereços Salvos da sua Conta:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {user.addresses.map(addr => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                              selectedAddressId === addr.id
                                ? 'border-[#10b981] bg-emerald-950/50 text-white font-semibold'
                                : 'border-[#27272a] bg-[#161616] text-[#d1d5db]'
                            }`}
                          >
                            <p className="font-bold truncate text-[#f3f4f6]">{addr.street}, {addr.number}</p>
                            <p className="text-[11px] text-[#9ca3af]">{addr.neighborhood} - {addr.city}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-[#161616] border border-[#1f2937] rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-[#f3f4f6] uppercase block">
                      Local de Entrega em Itapema
                    </span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[11px] font-semibold text-[#9ca3af] block mb-1">Rua / Av *</label>
                        <input
                          type="text"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Ex: Av. Nereu Ramos"
                          className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-xl text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#9ca3af] block mb-1">Número *</label>
                        <input
                          type="text"
                          required
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="123"
                          className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-xl text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-[#9ca3af] block mb-1">Bairro *</label>
                        <select
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-xl text-xs text-[#f3f4f6] focus:ring-2 focus:ring-[#10b981] focus:outline-none capitalize"
                        >
                          {NEIGHBORHOODS.map(n => (
                            <option key={n.bairro} value={n.bairro} className="bg-[#111111] text-white">
                              {n.bairro.charAt(0).toUpperCase() + n.bairro.slice(1)} (Taxa: R$ {n.taxa.toFixed(2).replace('.', ',')})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#9ca3af] block mb-1">Complemento</label>
                        <input
                          type="text"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Apto, Bloco, etc."
                          className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-xl text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Geolocation & Delivery Time Estimation Card */}
                  <div className="p-4 bg-gradient-to-br from-[#121f19] to-[#162920] border border-emerald-800/50 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Estimativa de Entrega
                            </h4>
                            {gpsActive && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                GPS Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9ca3af]">
                            Tempo calculado pela distância até a matriz
                          </p>
                        </div>
                      </div>

                      {/* Live Estimated Minutes Badge */}
                      <div className="text-right shrink-0">
                        <div className="inline-block px-3 py-1 bg-emerald-950 border border-emerald-500/40 rounded-xl text-emerald-300 font-extrabold text-sm shadow-inner">
                          ⚡ {deliveryEstimate.formattedTime}
                        </div>
                        <p className="text-[10px] text-emerald-400/80 mt-0.5 font-medium">
                          ~{deliveryEstimate.distanceKm.toFixed(1)} km da farmácia
                        </p>
                      </div>
                    </div>

                    {/* Geolocation Trigger Button & Info */}
                    <div className="pt-2 border-t border-emerald-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="text-[11px] text-[#9ca3af] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Base: <strong>Av. Nereu Ramos, 897 (Centro)</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocatingGps}
                        className={`w-full sm:w-auto px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          gpsActive
                            ? 'bg-emerald-900/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/50'
                            : 'bg-emerald-950 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
                        }`}
                      >
                        {isLocatingGps ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            <span>Calculando GPS...</span>
                          </>
                        ) : gpsActive ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Recalcular com GPS</span>
                          </>
                        ) : (
                          <>
                            <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Calcular via Meu GPS</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feedback message if any */}
                    {geoFeedback && (
                      <div className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 ${
                        geoFeedback.type === 'success'
                          ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-700/50'
                          : geoFeedback.type === 'error'
                          ? 'bg-amber-950/90 text-amber-200 border border-amber-800/50'
                          : 'bg-[#1f2937] text-[#9ca3af]'
                      }`}>
                        {geoFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span>{geoFeedback.message}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-[#6b7280] italic">
                      * O tempo estimado inclui separação com conferência farmacêutica (15 min) + deslocamento do motoboy.
                    </p>
                  </div>
                </div>
              )}

              {/* Pickup Estimation Card */}
              {deliveryType === 'pickup' && (
                <div className="p-4 bg-gradient-to-br from-[#121f19] to-[#162920] border border-emerald-800/50 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Retirada Rápida no Balcão</h4>
                      <p className="text-[11px] text-[#9ca3af]">Farmácia Super Popular • Av. Nereu Ramos, 897 (Centro)</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs">
                      ⚡ 15 a 20 min
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2"
                >
                  <span>Continuar para Identificação</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER IDENTIFICATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">
                  2. Dados do Comprador / Recebedor
                </label>

                {!isAuthenticated && (
                  <div className="p-3 mb-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-emerald-200 font-medium">Já possui conta de membro?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="px-2.5 py-1 bg-[#10b981] text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Fazer Login
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#9ca3af] uppercase block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Carlos Silveira"
                      className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#9ca3af] uppercase block mb-1">WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(47) 99999-9999"
                        className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#9ca3af] uppercase block mb-1">CPF (Opcional)</label>
                      <input
                        type="text"
                        value={customerCpf}
                        onChange={(e) => setCustomerCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#9ca3af] uppercase block mb-1">
                      Observações para a Entrega / Farmácia
                    </label>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Ex: Deixar na portaria, troco para nota de R$ 50..."
                      className="w-full px-3.5 py-2 bg-[#161616] border border-[#27272a] rounded-xl text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 bg-[#161616] hover:bg-[#222222] text-[#d1d5db] border border-[#27272a] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2"
                >
                  <span>Forma de Pagamento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT & CONFIRMATION */}
          {step === 3 && (
            <div className="space-y-4">
              
              {/* Coupon Field */}
              <div className="p-3.5 bg-[#161616] border border-[#1f2937] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f3f4f6] uppercase flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#10b981]" /> Cupom de Desconto
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-[11px] font-bold text-red-400 hover:underline"
                    >
                      Remover ({appliedCoupon.codigo})
                    </button>
                  )}
                </div>

                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Digite POPULAR10 ou FRETEGRATIS"
                      className="flex-1 px-3 py-2 bg-[#111111] border border-[#27272a] rounded-xl text-xs uppercase font-mono text-[#f3f4f6] placeholder-[#6b7280] focus:ring-1 focus:ring-[#10b981] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-[#10b981] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#059669]"
                    >
                      Aplicar
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-xs text-emerald-300 font-semibold flex items-center justify-between">
                    <span>✓ Cupom {appliedCoupon.codigo} aplicado</span>
                    <span className="text-emerald-400 font-bold">- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {couponFeedback && !appliedCoupon && (
                  <p className={`text-[11px] font-medium ${couponFeedback.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {couponFeedback.text}
                  </p>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">
                  3. Escolha a Forma de Pagamento
                </label>

                <div className="space-y-2">
                  
                  {/* Mercado Pago PIX Instantaneo */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago_pix'
                      ? 'border-[#009EE3] bg-blue-950/40 shadow-sm text-white'
                      : 'border-[#27272a] bg-[#161616] hover:bg-[#1a1a1a] text-[#d1d5db]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'mercadopago_pix'}
                        onChange={() => setPaymentMethod('mercadopago_pix')}
                        className="text-[#009EE3] focus:ring-[#009EE3]"
                      />
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-[#009EE3]" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#f3f4f6]">Mercado Pago (PIX Instantâneo)</span>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#009EE3] text-white rounded">
                              Recomendado
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9ca3af]">QR Code gerado na hora com aprovação imediata</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Mercado Pago Cartao */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago_card'
                      ? 'border-[#009EE3] bg-blue-950/40 shadow-sm text-white'
                      : 'border-[#27272a] bg-[#161616] hover:bg-[#1a1a1a] text-[#d1d5db]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'mercadopago_card'}
                        onChange={() => setPaymentMethod('mercadopago_card')}
                        className="text-[#009EE3] focus:ring-[#009EE3]"
                      />
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#009EE3]" />
                        <div>
                          <span className="text-xs font-bold text-[#f3f4f6]">Mercado Pago (Cartão de Crédito / Débito)</span>
                          <p className="text-[11px] text-[#9ca3af]">Parcele em até 6x com proteção ao comprador</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Dinheiro */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'dinheiro'
                      ? 'border-[#10b981] bg-emerald-950/40 shadow-sm text-white'
                      : 'border-[#27272a] bg-[#161616] hover:bg-[#1a1a1a] text-[#d1d5db]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'dinheiro'}
                        onChange={() => setPaymentMethod('dinheiro')}
                        className="text-[#10b981] focus:ring-[#10b981]"
                      />
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-[#10b981]" />
                        <div>
                          <span className="text-xs font-bold text-[#f3f4f6]">Dinheiro na Entrega / Balcão</span>
                          <p className="text-[11px] text-[#9ca3af]">Pague em espécie ao receber os produtos</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Troco se dinheiro */}
                  {paymentMethod === 'dinheiro' && (
                    <div className="p-3 bg-[#161616] rounded-xl border border-[#27272a] space-y-2 text-xs">
                      <label className="flex items-center gap-2 font-semibold text-[#d1d5db]">
                        <input
                          type="checkbox"
                          checked={needsChange}
                          onChange={(e) => setNeedsChange(e.target.checked)}
                          className="rounded text-[#10b981]"
                        />
                        Precisa de troco?
                      </label>
                      {needsChange && (
                        <input
                          type="text"
                          value={changeAmount}
                          onChange={(e) => setChangeAmount(e.target.value)}
                          placeholder="Troco para quanto? (Ex: R$ 50,00)"
                          className="w-full px-3 py-1.5 bg-[#111111] border border-[#27272a] rounded-lg text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-1 focus:ring-[#10b981]"
                        />
                      )}
                    </div>
                  )}

                  {/* Cartao Maquininha */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cartao_entrega'
                      ? 'border-[#10b981] bg-emerald-950/40 shadow-sm text-white'
                      : 'border-[#27272a] bg-[#161616] hover:bg-[#1a1a1a] text-[#d1d5db]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cartao_entrega'}
                        onChange={() => setPaymentMethod('cartao_entrega')}
                        className="text-[#10b981] focus:ring-[#10b981]"
                      />
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#9ca3af]" />
                        <div>
                          <span className="text-xs font-bold text-[#f3f4f6]">Maquininha de Cartão na Entrega</span>
                          <p className="text-[11px] text-[#9ca3af]">Crédito, Débito ou Vale-Alimentação/Refeição</p>
                        </div>
                      </div>
                    </div>
                  </label>

                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-[#161616] rounded-2xl border border-[#1f2937] space-y-2 text-xs">
                <div className="flex justify-between text-[#9ca3af]">
                  <span>Subtotal dos Produtos</span>
                  <span className="text-[#f3f4f6]">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-[#9ca3af]">
                  <span>Taxa de Entrega</span>
                  <span className="text-[#f3f4f6]">{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis'}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Desconto do Cupom</span>
                    <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {/* Live Delivery Time Estimate Indicator */}
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-200 font-medium">
                      {deliveryType === 'delivery' ? 'Previsão de Entrega (Motoboy)' : 'Retirada no Balcão'}
                    </span>
                  </div>
                  <span className="font-extrabold text-emerald-300">
                    {deliveryType === 'delivery' ? deliveryEstimate.formattedTime : '15 a 20 min'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#1f2937] flex justify-between font-extrabold text-sm text-[#f3f4f6]">
                  <span>Total Final</span>
                  <span className="text-[#10b981] text-base">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3.5 bg-[#161616] hover:bg-[#222222] text-[#d1d5db] border border-[#27272a] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalizeOrder}
                  className="w-2/3 py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Processando Pedido...</span>
                  ) : paymentMethod.startsWith('mercadopago') ? (
                    <span className="flex items-center gap-1.5">
                      Pagar com Mercado Pago <ArrowRight className="w-4 h-4" />
                    </span>
                  ) : (
                    <span>Confirmar Pedido</span>
                  )}
                </button>
              </div>
            </div>
          )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
