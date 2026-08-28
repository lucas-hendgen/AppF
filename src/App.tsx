import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProductProvider, useProducts } from './context/ProductContext';
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
import { AdminPanelModal } from './components/AdminPanelModal';
import { FloatingCartFAB } from './components/FloatingCartFAB';
import { Product, Order } from './types';
import { ShieldCheck, Sparkles, Truck, Award } from 'lucide-react';

function MainAppContent() {
  const { user, isAuthenticated, openProfileModal } = useAuth();
  const { products } = useProducts();

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
      // Remove query params cleanly from url
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
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-[#d1d5db] selection:bg-[#10b981] selection:text-white">
      {/* Top Navbar */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Member Welcome Banner (If Logged In) */}
        {isAuthenticated && user && (
          <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] border border-[#059669]/30 rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-300 font-black text-xl flex items-center justify-center border border-emerald-400/20 shadow-inner">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Olá, {user.name}!
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-400 text-amber-950 rounded-full">
                    {user.membershipTier}
                  </span>
                </div>
                <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  Você possui <strong>{user.loyaltyPoints || 0} Pontos Fidelidade</strong> disponíveis.
                </p>
              </div>
            </div>

            <button
              onClick={openProfileModal}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#064e3b] font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all shrink-0 self-start sm:self-center"
            >
              Minha Área de Membro
            </button>
          </div>
        )}

        {/* Hero Features Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-[#111111] p-4 rounded-2xl border border-[#1f2937] shadow-lg flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/60 text-[#10b981] border border-emerald-800/40 rounded-xl shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#f3f4f6]">Entrega Rápida em Itapema</h3>
              <p className="text-[11px] text-[#9ca3af]">Motoboy expresso para todos os bairros</p>
            </div>
          </div>

          <div className="bg-[#111111] p-4 rounded-2xl border border-[#1f2937] shadow-lg flex items-center gap-3">
            <div className="p-2.5 bg-blue-950/60 text-[#009EE3] border border-blue-800/40 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#f3f4f6]">Mercado Pago & PIX</h3>
              <p className="text-[11px] text-[#9ca3af]">Pagamento seguro, prático e instantâneo</p>
            </div>
          </div>

          <div className="bg-[#111111] p-4 rounded-2xl border border-[#1f2937] shadow-lg flex items-center gap-3">
            <div className="p-2.5 bg-amber-950/60 text-amber-400 border border-amber-800/40 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#f3f4f6]">Clube de Benefícios</h3>
              <p className="text-[11px] text-[#9ca3af]">Descontos exclusivos e histórico seguro</p>
            </div>
          </div>
        </div>

        {/* Products Catalog Grid with Search & Filters */}
        <section id="catalog-section">
          <ProductCatalog
            products={products}
            onOpenProductDetail={(prod) => setSelectedProduct(prod)}
          />
        </section>

      </main>

      {/* Floating Cart Button (FAB) with Particle Burst on Add */}
      <FloatingCartFAB />

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

      <AdminPanelModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <MainAppContent />
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
