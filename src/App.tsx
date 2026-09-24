import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { MercadoPagoModal } from './components/MercadoPagoModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { AuthModal } from './components/AuthModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import AdminPage from './pages/AdminPage';
import { Product, Order } from './types';
import { DynamicBanners } from './components/DynamicBanners';
import { ShoppingBag, ShieldCheck, Sparkles, Truck, Phone, Award } from 'lucide-react';

function MainAppContent() {
  const { user, isAuthenticated, openAuthModal, openProfileModal } = useAuth();
  const { totalItems, finalTotal, openCart } = useCart();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modals state
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [pixPaymentData, setPixPaymentData] = useState<any>(null);
  const [preferenceData, setPreferenceData] = useState<any>(null);
  const [isMercadoPagoModalOpen, setIsMercadoPagoModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Check URL params for Mercado Pago callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const orderId = params.get('order_id');

    if (paymentStatus === 'success' && orderId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOrderCreated = (
    order: Order,
    paymentType: 'mercadopago_pix' | 'mercadopago_card' | 'other',
    pixData?: any,
    prefData?: any
  ) => {
    setCreatedOrder(order);

    if (paymentType === 'mercadopago_pix') {
      setPixPaymentData(pixData);
      setIsMercadoPagoModalOpen(true);
    } else if (paymentType === 'mercadopago_card') {
      setPreferenceData(prefData);
      setIsMercadoPagoModalOpen(true);
    } else {
      setIsSuccessModalOpen(true);
    }
  };

  const handlePaymentSuccess = (updatedOrder: Order) => {
    setCreatedOrder(updatedOrder);
    setIsMercadoPagoModalOpen(false);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-white via-slate-50 to-blue-50/25 text-slate-750 selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden">
      {/* 🌈 Ambient RGB Glowing Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Orb 1: Electric Blue / Cyan Glow */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-blue-600/15 via-cyan-400/15 to-indigo-600/10 blur-3xl animate-float-orb-1 opacity-75" />
        {/* Orb 2: Sapphire Navy / Violet Glow */}
        <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-indigo-600/12 via-blue-500/15 to-teal-400/10 blur-3xl animate-float-orb-2 opacity-75" />
        {/* Orb 3: Deep Navy / Ambient Aurora Glow */}
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-t from-blue-800/15 via-sky-400/10 to-indigo-500/10 blur-3xl animate-float-orb-3 opacity-65" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Header />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Member Welcome Banner (If Logged In) */}
        {isAuthenticated && user && (
          <div className="bg-gradient-to-r from-[#0a192f] via-[#1e3a8a] to-[#0f172a] border border-blue-500/30 rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-blue-300 font-black text-xl flex items-center justify-center border border-blue-400/20 shadow-inner">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Olá, {user.name}!
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-amber-400 text-amber-950 rounded-full shadow-xs">
                    {user.membershipTier}
                  </span>
                </div>
                <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  Você possui <strong>{user.loyaltyPoints || 0} Pontos Fidelidade</strong> disponíveis.
                </p>
              </div>
            </div>

            <button
              onClick={openProfileModal}
              className="px-4 py-2.5 bg-white hover:bg-blue-50 text-[#0a192f] font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all shrink-0 self-start sm:self-center hover:scale-105 active:scale-95"
            >
              Minha Área de Membro
            </button>
          </div>
        )}

        {/* Hero Features Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:border-blue-200 transition-colors">
            <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-850">Entrega Rápida em Itapema</h3>
              <p className="text-[11px] text-slate-550">Motoboy expresso para todos os bairros</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:border-blue-200 transition-colors">
            <div className="p-2.5 bg-sky-50 text-[#009EE3] border border-sky-100 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-850">Mercado Pago & PIX</h3>
              <p className="text-[11px] text-slate-550">Pagamento seguro, prático e instantâneo</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:border-blue-200 transition-colors">
            <div className="p-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-850">Clube de Benefícios</h3>
              <p className="text-[11px] text-slate-550">Descontos exclusivos e histórico seguro</p>
            </div>
          </div>
        </div>

        {/* Dynamic Marketing Banners */}
        <div className="!mt-4">
          <DynamicBanners />
        </div>

        {/* Products Catalog Grid with Search & Filters */}
        <section id="catalog-section" className="!mt-6">
          <ProductCatalog
            onOpenProductDetail={(prod) => setSelectedProduct(prod)}
          />
        </section>

      </main>

      {/* Floating Cart Button (FAB) */}
      {totalItems > 0 && (
        <div className="fixed bottom-28 right-6 z-40 animate-in bounce-in duration-300">
          <button
            id="floating-cart-fab"
            onClick={openCart}
            className="flex items-center gap-3 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-950/60 font-bold text-sm transition-all hover:scale-105 border border-blue-400/30"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-white text-blue-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-extrabold shadow">
                {totalItems}
              </span>
            </div>
            <span>Ver Carrinho • R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <Footer />

      {/* MODALS */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer />

      <CheckoutModal onOrderCreated={handleOrderCreated} />

      <MercadoPagoModal
        isOpen={isMercadoPagoModalOpen}
        onClose={() => {
          setIsMercadoPagoModalOpen(false);
        }}
        order={createdOrder}
        pixData={pixPaymentData}
        preferenceData={preferenceData}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <OrderSuccessModal
        order={createdOrder}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setCreatedOrder(null);
        }}
        onOpenProfileOrders={() => openProfileModal()}
      />

      <AuthModal />

      <MemberProfileModal />

      {/* Botão Flutuante do WhatsApp */}
      <a
        href="https://api.whatsapp.com/send?phone=5547996724745"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25d366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group animate-bounce"
        title="Fale Conosco no WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.01-5.078-2.852-6.923C16.386 2.039 13.932 1.01 11.312 1.01c-5.41 0-9.811 4.399-9.813 9.804-.001 1.547.411 3.053 1.196 4.385l-.973 3.55 3.639-.955zm11.135-6.52c-.313-.156-1.854-.915-2.133-1.016-.279-.101-.482-.152-.684.152-.202.304-.78.98-.957 1.18-.178.201-.355.226-.668.069-1.258-.622-2.107-1.1-2.952-2.548-.224-.384.224-.356.642-1.193.07-.14.035-.262-.018-.368-.052-.107-.482-1.16-.66-1.59-.174-.417-.367-.36-.51-.367-.132-.006-.284-.008-.436-.008-.152 0-.4-.057-.61.178-.21.235-.8.78-.8 1.9s.815 2.202.929 2.355c.114.152 1.605 2.45 3.887 3.434.542.234.965.374 1.294.479.544.173 1.039.149 1.43.09.436-.066 1.854-.76 2.115-1.456.262-.697.262-1.296.183-1.423-.079-.126-.29-.202-.603-.359z" />
        </svg>
      </a>
      </div>
    </div>
  );
}

function ProtectedAdminRoute() {
  return <AdminPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/admin" element={<ProtectedAdminRoute />} />
          <Route path="/*" element={<MainAppContent />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
