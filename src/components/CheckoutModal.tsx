import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Truck, Store, CreditCard, QrCode, Banknote, Tag, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, Sparkles, AlertCircle, Clock, Navigation, LocateFixed, Loader2, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
// NEIGHBORHOODS is now loaded dynamically from CartContext
import { api } from '../services/api';
import { Order, UserAddress } from '../types';
import {
  PHARMACY_LOCATION,
  calculateDistanceKm,
  estimateDeliveryTime,
  estimateByNeighborhood,
  DeliveryEstimate
} from '../utils/geolocation';

function checkScheduledOrder(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;

  if (day === 0) { // Domingo
    return currentTime < 8 || currentTime >= 14;
  } else { // Segunda a Sábado
    return currentTime < 8 || currentTime >= 20;
  }
}

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
    clearCart,
    neighborhoods
  } = useCart();

  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hoursAccepted, setHoursAccepted] = useState(false);

  useEffect(() => {
    if (!isCheckoutOpen) {
      setHoursAccepted(false);
    }
  }, [isCheckoutOpen]);

  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Step 1: Receiving type & address
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | 'local'>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
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
        setApartmentNumber(defaultAddr.apartmentNumber || '');
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
      const found = (neighborhoods || []).find(n => n.bairro.toLowerCase() === neighborhood.toLowerCase());
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
    setApartmentNumber(addr.apartmentNumber || '');
    setComplement(addr.complement || '');
    setNeighborhood(addr.neighborhood.toLowerCase());
    setCep(addr.cep || '88220-000');
  };

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    try {
      const res = await applyCoupon(couponInput);
      setCouponFeedback({ success: res.success, text: res.message });
    } catch (err) {
      setCouponFeedback({ success: false, text: 'Erro ao validar cupom.' });
    }
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
          apartmentNumber: apartmentNumber.trim() || undefined,
          complement: complement.trim() || undefined,
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
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] text-slate-600">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0a192f] via-[#172554] to-[#1e3a8a] text-white flex items-center justify-between border-b border-blue-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-blue-300 rounded-xl border border-blue-400/20 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Finalização de Pedido</h2>
              <p className="text-xs text-blue-100">
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
        <div className="bg-slate-100 h-1.5 w-full flex">
          <div className={`h-full transition-all duration-300 bg-blue-600 ${
            step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
          }`} />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Operating Hours Alert Interceptor */}
          {checkScheduledOrder() && !hoursAccepted ? (
            <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto text-amber-600 shadow-inner">
                <Clock className="w-8 h-8 text-amber-800" />
              </div>
              <div className="space-y-2.5 max-w-md mx-auto">
                <h3 className="text-base font-black text-amber-900 tracking-tight flex items-center justify-center gap-1.5 uppercase">
                  ⚠️ Fora do Horário de Atendimento
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  A farmácia está fechada no momento (Atendimento: Seg. a Sáb. 08h-20h, Dom. 08h-14h). Seu pedido será recebido e agendado para o próximo período de funcionamento (dia útil seguinte a partir das 08h00).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto pt-2">
                <button
                  type="button"
                  onClick={closeCheckout}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  Sair da Compra
                </button>
                <button
                  type="button"
                  onClick={() => setHoursAccepted(true)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Aceitar Agendamento
                </button>
              </div>
            </div>
          ) : !isAuthenticated ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-3xl flex items-center justify-center mx-auto text-blue-700 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">Login Obrigatório para Compras</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para sua segurança, rastreabilidade dos medicamentos e acúmulo de pontos fidelidade, você precisa estar conectado à sua conta.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-left space-y-2 text-xs">
                <p className="text-blue-700 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Vantagens de ser Membro Super Popular:
                </p>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  <li>✓ Endereços de entrega salvos para compras com 1 clique</li>
                  <li>✓ Acompanhamento em tempo real via WhatsApp e painel</li>
                  <li>✓ Acúmulo automático de pontos a cada R$ 1 gasto</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'Faça login para continuar com a finalização do seu pedido.')}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950/20 transition-all text-center"
                >
                  Fazer Login
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register', 'Crie sua conta em segundos para concluir sua compra.')}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-bold text-xs rounded-xl transition-all text-center"
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  1. Como deseja receber seus medicamentos?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                      deliveryType === 'delivery'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Truck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-bold text-xs block ${deliveryType === 'delivery' ? 'text-blue-950' : 'text-slate-800'}`}>Entrega Delivery</span>
                      <span className={`text-[11px] ${deliveryType === 'delivery' ? 'text-blue-700' : 'text-slate-500'}`}>Motoboy em Itapema</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                      deliveryType === 'pickup'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Store className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-bold text-xs block ${deliveryType === 'pickup' ? 'text-blue-950' : 'text-slate-800'}`}>Retirar no Balcão</span>
                      <span className={`text-[11px] ${deliveryType === 'pickup' ? 'text-blue-700' : 'text-slate-500'}`}>Loja Centro (Sem taxa)</span>
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
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
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
                                ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            <p className={`font-bold truncate ${selectedAddressId === addr.id ? 'text-blue-950' : 'text-slate-800'}`}>{addr.street}, {addr.number}</p>
                            <p className="text-[11px] text-slate-500">{addr.neighborhood} - {addr.city}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-slate-800 uppercase block">
                      Local de Entrega em Itapema
                    </span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Rua / Av *</label>
                        <input
                          type="text"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Ex: Av. Nereu Ramos"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Número *</label>
                        <input
                          type="text"
                          required
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="123"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Bairro *</label>
                        <select
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none capitalize"
                        >
                          {(neighborhoods || []).map(n => (
                            <option key={n.bairro} value={n.bairro} className="bg-white text-slate-800">
                              {n.bairro.charAt(0).toUpperCase() + n.bairro.slice(1)} (Taxa: R$ {n.taxa.toFixed(2).replace('.', ',')})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Nº Apartamento / Bloco <span className="text-slate-400 font-normal">(Opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={apartmentNumber}
                          onChange={(e) => setApartmentNumber(e.target.value)}
                          placeholder="Ex: Apto 302, Bloco B"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Ponto de Referência / Complemento <span className="text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Ex: Próximo ao supermercado, interfone nº 302"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Geolocation & Delivery Time Estimation Card */}
                  <div className="p-4 bg-gradient-to-br from-blue-50/70 via-slate-50 to-blue-50/40 border border-blue-200/60 rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600/10 border border-blue-600/25 rounded-xl text-blue-700">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Estimativa de Entrega
                            </h4>
                            {gpsActive && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                GPS Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Tempo calculado pela distância até a matriz
                          </p>
                        </div>
                      </div>

                      {/* Live Estimated Minutes Badge */}
                      <div className="text-right shrink-0">
                        <div className="inline-block px-3 py-1 bg-blue-600 border border-blue-500 rounded-xl text-white font-extrabold text-sm shadow-inner">
                          ⚡ {deliveryEstimate.formattedTime}
                        </div>
                        <p className="text-[10px] text-blue-800 mt-0.5 font-medium">
                          ~{deliveryEstimate.distanceKm.toFixed(1)} km da farmácia
                        </p>
                      </div>
                    </div>

                    {/* Geolocation Trigger Button & Info */}
                    <div className="pt-2 border-t border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Base: <strong>Av. Nereu Ramos, 897 (Centro)</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocatingGps}
                        className={`w-full sm:w-auto px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          gpsActive
                            ? 'bg-blue-800 hover:bg-blue-900 text-white border border-blue-700'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {isLocatingGps ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>Calculando GPS...</span>
                          </>
                        ) : gpsActive ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Recalcular com GPS</span>
                          </>
                        ) : (
                          <>
                            <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
                            <span>Calcular via Meu GPS</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feedback message if any */}
                    {geoFeedback && (
                      <div className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 ${
                        geoFeedback.type === 'success'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : geoFeedback.type === 'error'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {geoFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span>{geoFeedback.message}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 italic">
                      * O tempo estimado inclui separação com conferência farmacêutica (15 min) + deslocamento do motoboy.
                    </p>
                  </div>
                </div>
              )}

              {/* Pickup Estimation Card */}
              {deliveryType === 'pickup' && (
                <div className="p-4 bg-gradient-to-br from-blue-50/70 via-slate-50 to-blue-50/40 border border-blue-200/60 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-600/10 border border-blue-600/25 text-blue-700 rounded-xl">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Retirada Rápida no Balcão</h4>
                      <p className="text-[11px] text-slate-500">Farmácia Super Popular • Av. Nereu Ramos, 897 (Centro)</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 bg-blue-600 text-white border border-blue-500 rounded-xl font-bold text-xs">
                      ⚡ 15 a 20 min
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2"
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  2. Dados do Comprador / Recebedor
                </label>

                {!isAuthenticated && (
                  <div className="p-3 mb-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs text-blue-800 font-medium">Já possui conta de membro?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Fazer Login
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Carlos Silveira"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(47) 99999-9999"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">CPF (Opcional)</label>
                      <input
                        type="text"
                        value={customerCpf}
                        onChange={(e) => setCustomerCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Observações para a Entrega / Farmácia
                    </label>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Ex: Deixar na portaria, troco para nota de R$ 50..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none focus:bg-white"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2"
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
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" /> Cupom de Desconto
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-[11px] font-bold text-red-600 hover:underline"
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
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-700"
                    >
                      Aplicar
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center justify-between">
                    <span>✓ Cupom {appliedCoupon.codigo} aplicado</span>
                    <span className="text-blue-700 font-bold">- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {couponFeedback && !appliedCoupon && (
                  <p className={`text-[11px] font-medium ${couponFeedback.success ? 'text-blue-700' : 'text-red-600'}`}>
                    {couponFeedback.text}
                  </p>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  3. Escolha a Forma de Pagamento
                </label>

                <div className="space-y-2">
                  
                  {/* Mercado Pago PIX Instantaneo */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago_pix'
                      ? 'border-[#009EE3] bg-sky-50 shadow-sm text-sky-900'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-600'
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
                            <span className={`text-xs font-bold ${paymentMethod === 'mercadopago_pix' ? 'text-sky-950' : 'text-slate-800'}`}>Mercado Pago (PIX Instantâneo)</span>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#009EE3] text-white rounded">
                              Recomendado
                            </span>
                          </div>
                          <p className={`text-[11px] ${paymentMethod === 'mercadopago_pix' ? 'text-sky-800' : 'text-slate-400'}`}>QR Code gerado na hora com aprovação imediata</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Mercado Pago Cartao */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago_card'
                      ? 'border-[#009EE3] bg-sky-50 shadow-sm text-sky-900'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-600'
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
                          <span className={`text-xs font-bold ${paymentMethod === 'mercadopago_card' ? 'text-sky-950' : 'text-slate-800'}`}>Mercado Pago (Cartão de Crédito / Débito)</span>
                          <p className={`text-[11px] ${paymentMethod === 'mercadopago_card' ? 'text-sky-800' : 'text-slate-400'}`}>Parcele em até 6x com proteção ao comprador</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Dinheiro */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'dinheiro'
                      ? 'border-blue-600 bg-blue-50 shadow-sm text-blue-950'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'dinheiro'}
                        onChange={() => setPaymentMethod('dinheiro')}
                        className="text-blue-600 focus:ring-blue-600"
                      />
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-blue-600" />
                        <div>
                          <span className={`text-xs font-bold ${paymentMethod === 'dinheiro' ? 'text-blue-950' : 'text-slate-800'}`}>Dinheiro na Entrega / Balcão</span>
                          <p className={`text-[11px] ${paymentMethod === 'dinheiro' ? 'text-blue-800' : 'text-slate-400'}`}>Pague em espécie ao receber os produtos</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Troco se dinheiro */}
                  {paymentMethod === 'dinheiro' && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <label className="flex items-center gap-2 font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={needsChange}
                          onChange={(e) => setNeedsChange(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-600"
                        />
                        Precisa de troco?
                      </label>
                      {needsChange && (
                        <input
                          type="text"
                          value={changeAmount}
                          onChange={(e) => setChangeAmount(e.target.value)}
                          placeholder="Troco para quanto? (Ex: R$ 50,00)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-blue-600"
                        />
                      )}
                    </div>
                  )}

                  {/* Cartao Maquininha */}
                  <label className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cartao_entrega'
                      ? 'border-blue-600 bg-blue-50 shadow-sm text-blue-950'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cartao_entrega'}
                        onChange={() => setPaymentMethod('cartao_entrega')}
                        className="text-blue-600 focus:ring-blue-600"
                      />
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <div>
                          <span className={`text-xs font-bold ${paymentMethod === 'cartao_entrega' ? 'text-blue-950' : 'text-slate-800'}`}>Maquininha de Cartão na Entrega</span>
                          <p className={`text-[11px] ${paymentMethod === 'cartao_entrega' ? 'text-blue-800' : 'text-slate-400'}`}>Crédito, Débito ou Vale-Alimentação/Refeição</p>
                        </div>
                      </div>
                    </div>
                  </label>

                </div>
              </div>

              {/* operating hours scheduled warning */}
              {checkScheduledOrder() && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-1 text-[11px] text-amber-800 leading-relaxed font-bold animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                    <Clock className="w-4 h-4 text-amber-800 shrink-0" />
                    <span>⚠️ Fora do Horário de Atendimento</span>
                  </div>
                  <p className="font-semibold text-amber-750">
                    A farmácia está fechada no momento (Atendimento: Seg. a Sáb. 08h-20h, Dom. 08h-14h). Seu pedido será recebido e agendado para o próximo período de funcionamento (dia útil seguinte a partir das 08h00).
                  </p>
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal dos Produtos</span>
                  <span className="text-slate-800 font-semibold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Taxa de Entrega</span>
                  <span className="text-slate-800 font-semibold">{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis'}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-blue-700 font-semibold">
                    <span>Desconto do Cupom</span>
                    <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {/* Live Delivery Time Estimate Indicator */}
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-blue-900 font-medium">
                      {deliveryType === 'delivery' ? 'Previsão de Entrega (Motoboy)' : 'Retirada no Balcão'}
                    </span>
                  </div>
                  <span className="font-extrabold text-blue-800">
                    {deliveryType === 'delivery' ? deliveryEstimate.formattedTime : '15 a 20 min'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-slate-800">
                  <span>Total Final</span>
                  <span className="text-blue-700 text-base">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalizeOrder}
                  className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
