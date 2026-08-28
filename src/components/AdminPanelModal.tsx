import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  ShoppingBag,
  Package,
  Users,
  RefreshCw,
  Volume2,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  Check,
  Percent,
  Tag,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Save,
  BarChart3,
  FileText,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { api } from '../services/api';
import { Order, Product, UserProfile } from '../types';
import { INITIAL_CATEGORIES } from '../data/pharmacyData';

// Preset pharmacy images for quick selection in product creation/editing
const PHARMACY_IMAGE_PRESETS = [
  { label: 'Medicamento / Cápsulas', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' },
  { label: 'Comprimidos / Cartela', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80' },
  { label: 'Frasco / Solução Oral', url: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=80' },
  { label: 'Soro / Solução Estéril', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&auto=format&fit=crop&q=80' },
  { label: 'Higiene / Sabonete', url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=80' },
  { label: 'Álcool Gel / Antisséptico', url: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=500&auto=format&fit=crop&q=80' },
  { label: 'Vitaminas / Suplemento', url: 'https://images.unsplash.com/photo-1616671285454-94c95d6f8a20?w=500&auto=format&fit=crop&q=80' },
  { label: 'Ômega 3 / Pote Ambar', url: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=500&auto=format&fit=crop&q=80' },
  { label: 'Linha Infantil / Fraldas', url: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=500&auto=format&fit=crop&q=80' },
  { label: 'Protetor Solar / Dermocosmético', url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80' },
];

export const AdminPanelModal: React.FC = () => {
  const { isAdminModalOpen, closeAdminModal } = useAuth();
  const { products, createProduct, updateProduct, updateProductPrice, deleteProduct, refreshProducts } = useProducts();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'users' | 'metrics'>('products');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state for catalog
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Ativo' | 'Inativo'>('todos');

  // Inline Quick Price Edit State
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<string>('');
  const [inlineSaving, setInlineSaving] = useState(false);

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('medicamentos');
  const [formPrice, setFormPrice] = useState('19,90');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [formImage, setFormImage] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formClassificacao, setFormClassificacao] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Product Delete Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch Price Adjustment Modal State
  const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false);
  const [batchPercent, setBatchPercent] = useState<number>(5);
  const [batchCategory, setBatchCategory] = useState<string>('todos');
  const [batchDirection, setBatchDirection] = useState<'increase' | 'decrease'>('increase');
  const [isBatchApplying, setIsBatchApplying] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Audio tone generator for alert sound
  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, ctx.currentTime);
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 150);
    } catch (e) {
      console.warn('Audio Context bloqueado:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, usersData] = await Promise.all([
        api.getOrders().catch(() => []),
        api.getAdminUsers().catch(() => [])
      ]);
      setOrders(ordersData);
      setUsers(usersData);
      await refreshProducts();
    } catch (err) {
      console.error('Erro ao carregar dados do admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminModalOpen) {
      loadData();
    }
  }, [isAdminModalOpen]);

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory =
        selectedCategoryFilter === 'todos' ||
        prod.categoria.toLowerCase() === selectedCategoryFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'todos' || prod.status === statusFilter;

      const query = productSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        prod.nome.toLowerCase().includes(query) ||
        prod.sku.toLowerCase().includes(query) ||
        (prod.descricao && prod.descricao.toLowerCase().includes(query)) ||
        (prod.observacoes && prod.observacoes.toLowerCase().includes(query));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [products, selectedCategoryFilter, statusFilter, productSearch]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const activeCount = products.filter(p => p.status === 'Ativo').length;
    const consultCount = products.filter(p => p.preco.toLowerCase().includes('consulte')).length;
    const pricedProducts = products.filter(p => !p.preco.toLowerCase().includes('consulte') && !p.preco.includes('#'));
    
    let totalPricesSum = 0;
    pricedProducts.forEach(p => {
      const num = parseFloat(p.preco.replace(',', '.')) || 0;
      totalPricesSum += num;
    });
    const avgPrice = pricedProducts.length > 0 ? (totalPricesSum / pricedProducts.length) : 0;

    const totalOrdersRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      totalCount,
      activeCount,
      consultCount,
      avgPrice,
      totalOrdersRevenue,
      totalOrdersCount: orders.length,
      pendingOrdersCount: orders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length,
      totalMembersCount: users.length
    };
  }, [products, orders, users]);

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      showToast(`Status do pedido ${orderId} atualizado para ${status}!`);
    } catch (err) {
      showToast('Erro ao atualizar status do pedido.', 'error');
    }
  };

  // Simulating incoming live order
  const handleSimulateNewOrder = async () => {
    const randomProduct = products[Math.floor(Math.random() * products.length)] || {
      id: 1,
      nome: 'Dipirona 500mg',
      sku: 'MED001',
      preco: '12.90'
    };
    const priceNum = parseFloat(String(randomProduct.preco).replace(/[^0-9.,]/g, '').replace(',', '.')) || 19.9;

    const names = ['Carlos Eduardo', 'Patrícia Souza', 'Lucas Fernandes', 'Fernanda Lima', 'Rodrigo Mendes', 'Juliana Rocha'];
    const neighborhoods = ['Centro', 'Meia Praia', 'Morretes', 'Tabuleiro', 'Canto da Praia'];

    const simulatedOrder: Partial<Order> = {
      customerName: names[Math.floor(Math.random() * names.length)],
      customerPhone: '(47) 99887-1122',
      deliveryType: 'delivery',
      address: {
        id: 'addr_sim',
        street: 'Av. Nereu Ramos',
        number: String(Math.floor(100 + Math.random() * 1800)),
        neighborhood: neighborhoods[Math.floor(Math.random() * neighborhoods.length)],
        city: 'Itapema',
        state: 'SC',
        cep: '88220-000'
      },
      items: [
        {
          id: randomProduct.id,
          name: randomProduct.nome,
          sku: randomProduct.sku,
          price: priceNum,
          quantity: Math.floor(1 + Math.random() * 2)
        }
      ],
      subtotal: priceNum,
      deliveryFee: 5.0,
      discount: 0,
      total: priceNum + 5.0,
      paymentMethod: 'mercadopago_pix',
      paymentStatus: 'paid',
      status: 'recebido',
      notes: 'Solicitou entrega prioritária em Itapema.'
    };

    try {
      const created = await api.createOrder(simulatedOrder);
      setOrders(prev => [created, ...prev]);
      playAlertSound();
      showToast(`Novo pedido ${created.id} recebido de ${created.customerName}!`);
    } catch (err) {
      console.error('Erro ao simular pedido:', err);
    }
  };

  // Quick Inline Price Editing
  const startInlinePriceEdit = (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditingId(prod.id);
    setInlinePriceValue(prod.preco);
  };

  const handleSaveInlinePrice = async (prodId: number) => {
    if (!inlinePriceValue.trim()) return;
    setInlineSaving(true);
    try {
      await updateProductPrice(prodId, inlinePriceValue.trim());
      showToast(`Preço do produto atualizado com sucesso para R$ ${inlinePriceValue}!`);
      setInlineEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar valor.', 'error');
    } finally {
      setInlineSaving(false);
    }
  };

  const handleQuickAdjustPrice = async (prod: Product, deltaPercent: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPriceStr = prod.preco.replace(',', '.');
    const currentPrice = parseFloat(currentPriceStr);
    if (isNaN(currentPrice)) {
      showToast('Produto com preço sob consulta ou composto.', 'info');
      return;
    }
    const newPriceVal = (currentPrice * (1 + deltaPercent / 100)).toFixed(2).replace('.', ',');
    try {
      await updateProductPrice(prod.id, newPriceVal);
      showToast(`Preço de "${prod.nome}" ajustado para R$ ${newPriceVal} (${deltaPercent > 0 ? '+' : ''}${deltaPercent}%)`);
    } catch (err) {
      showToast('Erro ao atualizar preço.', 'error');
    }
  };

  // Quick Status Toggle (Ativo <-> Inativo)
  const handleToggleProductStatus = async (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = prod.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      await updateProduct(prod.id, { status: newStatus });
      showToast(`Status de "${prod.nome}" alterado para ${newStatus}.`);
    } catch (err) {
      showToast('Erro ao alternar status do produto.', 'error');
    }
  };

  // Open Full Add / Edit Modal
  const openProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormSku(product.sku);
      setFormName(product.nome);
      setFormCategory(product.categoria);
      setFormPrice(product.preco);
      setFormDesc(product.descricao || '');
      setFormStatus(product.status);
      setFormImage(product.imagem || '');
      setFormObservacoes(product.observacoes || '');
      setFormClassificacao(product.classificacaoAdicional || '');
    } else {
      setEditingProduct(null);
      setFormSku(`PROD${Math.floor(100 + Math.random() * 900)}`);
      setFormName('');
      setFormCategory('medicamentos');
      setFormPrice('19,90');
      setFormDesc('');
      setFormStatus('Ativo');
      setFormImage(PHARMACY_IMAGE_PRESETS[0].url);
      setFormObservacoes('');
      setFormClassificacao('');
    }
    setIsProductModalOpen(true);
  };

  // Submit Full Product Form
  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim()) {
      showToast('Preencha ao menos Nome e Preço do produto.', 'error');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const productPayload: Partial<Product> = {
        sku: formSku.trim() || `PROD${Math.floor(100 + Math.random() * 900)}`,
        nome: formName.trim(),
        categoria: formCategory,
        preco: formPrice.trim(),
        descricao: formDesc.trim(),
        status: formStatus,
        imagem: formImage.trim() || PHARMACY_IMAGE_PRESETS[0].url,
        observacoes: formObservacoes.trim(),
        classificacaoAdicional: formClassificacao.trim()
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
        showToast(`Produto "${formName}" atualizado com sucesso!`);
      } else {
        await createProduct(productPayload);
        showToast(`Produto "${formName}" cadastrado no catálogo!`);
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar produto.', 'error');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Delete product handling
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      showToast(`Produto "${productToDelete.nome}" removido do catálogo com sucesso.`);
      setProductToDelete(null);
    } catch (err) {
      showToast('Erro ao remover produto.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch price adjustment
  const handleApplyBatchAdjustment = async () => {
    setIsBatchApplying(true);
    let updatedCount = 0;
    try {
      const multiplier = batchDirection === 'increase' ? (1 + batchPercent / 100) : (1 - batchPercent / 100);

      for (const prod of products) {
        if (batchCategory === 'todos' || prod.categoria.toLowerCase() === batchCategory.toLowerCase()) {
          const currentPrice = parseFloat(prod.preco.replace(',', '.'));
          if (!isNaN(currentPrice) && !prod.preco.toLowerCase().includes('consulte') && !prod.preco.includes('#')) {
            const newPriceVal = (currentPrice * multiplier).toFixed(2).replace('.', ',');
            await updateProductPrice(prod.id, newPriceVal);
            updatedCount++;
          }
        }
      }
      showToast(`Reajuste aplicado com sucesso em ${updatedCount} produtos (${batchDirection === 'increase' ? '+' : '-'}${batchPercent}%)!`);
      setIsBatchPriceModalOpen(false);
    } catch (err) {
      showToast('Erro ao aplicar reajuste em lote.', 'error');
    } finally {
      setIsBatchApplying(false);
    }
  };

  if (!isAdminModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Toast Alert Floating Box */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-70 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs font-bold animate-in slide-in-from-top-3 ${
          toastMessage.type === 'success'
            ? 'bg-[#064e3b] text-emerald-100 border-emerald-500/50 shadow-emerald-950/80'
            : toastMessage.type === 'error'
            ? 'bg-[#7f1d1d] text-red-100 border-red-500/50 shadow-red-950/80'
            : 'bg-[#1e1b4b] text-purple-100 border-purple-500/50 shadow-purple-950/80'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Admin Card */}
      <div className="relative w-full max-w-6xl bg-[#101010] rounded-3xl shadow-2xl border border-[#262626] overflow-hidden flex flex-col max-h-[94vh] text-[#d1d5db]">
        
        {/* Top Header of Admin */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0c0c0c] via-[#1a1228] to-[#0c0c0c] text-white flex items-center justify-between border-b border-purple-900/30">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-600/25 border border-purple-500/40 rounded-2xl shadow-inner text-purple-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Painel Administrativo & Gestão Farmacêutica
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400/40 rounded-full shadow-sm">
                  Super Popular Itapema
                </span>
              </div>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                Controle de catálogo, cadastro e exclusão de produtos, alteração rápida de valores e pedidos em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playAlertSound}
              className="p-2.5 text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 rounded-full transition-all"
              title="Testar campainha sonora de pedidos"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={closeAdminModal}
              className="p-2.5 text-[#9ca3af] hover:text-white bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333333] rounded-full transition-all"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex border-b border-[#222222] bg-[#0c0c0c] px-4 sm:px-6 gap-1.5 overflow-x-auto scrollbar-none">
          
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-purple-500 text-purple-400 bg-[#171717] rounded-t-2xl'
                : 'border-transparent text-[#9ca3af] hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" /> Gestão de Produtos & Preços ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-purple-500 text-purple-400 bg-[#171717] rounded-t-2xl'
                : 'border-transparent text-[#9ca3af] hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Pedidos em Tempo Real ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-400 bg-[#171717] rounded-t-2xl'
                : 'border-transparent text-[#9ca3af] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Clientes & Membros ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'border-purple-500 text-purple-400 bg-[#171717] rounded-t-2xl'
                : 'border-transparent text-[#9ca3af] hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Indicadores & Métricas
          </button>

        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* ======================================================== */}
          {/* TAB 1: PRODUCT MANAGEMENT & PRICE UPDATES (MAIN REQUIREMENT) */}
          {/* ======================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              
              {/* Top Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Total de Itens</span>
                  <p className="text-lg sm:text-xl font-black text-white mt-0.5">{metrics.totalCount}</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">{metrics.activeCount} ativos na loja</span>
                </div>

                <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Preço Médio</span>
                  <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                    R$ {metrics.avgPrice.toFixed(2).replace('.', ',')}
                  </p>
                  <span className="text-[10px] text-[#9ca3af]">Catálogo regular</span>
                </div>

                <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Sob Consulta</span>
                  <p className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">{metrics.consultCount}</p>
                  <span className="text-[10px] text-[#9ca3af]">Tarja vermelha/receita</span>
                </div>

                <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Categorias</span>
                  <p className="text-lg sm:text-xl font-black text-purple-400 mt-0.5">{INITIAL_CATEGORIES.length}</p>
                  <span className="text-[10px] text-[#9ca3af]">Medicamentos e mais</span>
                </div>
              </div>

              {/* Action Toolbar: Search, Filters, Add Product, Batch Price */}
              <div className="p-4 bg-[#141414] border border-[#262626] rounded-3xl space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#666666]" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar por nome do produto, código SKU ou categoria..."
                      className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs sm:text-sm text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-3 top-2.5 text-xs text-[#888888] hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Buttons: Add Product & Batch Adjust */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => setIsBatchPriceModalOpen(true)}
                      className="px-3.5 py-2 bg-[#1e1b4b] hover:bg-[#2e1065] text-purple-300 border border-purple-700/50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                      title="Reajustar preços em lote"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>Reajuste Rápido</span>
                    </button>

                    <button
                      onClick={() => openProductForm()}
                      className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/80 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Produto</span>
                    </button>
                  </div>

                </div>

                {/* Secondary Filters: Category pills & Status select */}
                <div className="pt-2 border-t border-[#222222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  
                  {/* Category tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setSelectedCategoryFilter('todos')}
                      className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                        selectedCategoryFilter === 'todos'
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#2a2a2a]'
                      }`}
                    >
                      Todas ({products.length})
                    </button>
                    {INITIAL_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryFilter(cat.nome_categoria)}
                        className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                          selectedCategoryFilter === cat.nome_categoria
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#2a2a2a]'
                        }`}
                      >
                        {cat.titulo_exibicao}
                      </button>
                    ))}
                  </div>

                  {/* Status filter toggle */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] text-[#888888] font-semibold">Exibir:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="todos">Todos os Status</option>
                      <option value="Ativo">Apenas Ativos</option>
                      <option value="Inativo">Apenas Inativos</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Products Table with Inline Price Editing and Actions */}
              <div className="border border-[#262626] rounded-3xl bg-[#141414] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#0e0e0e] font-bold text-[#888888] uppercase border-b border-[#222222]">
                        <th className="p-3.5 pl-4">Produto & Foto</th>
                        <th className="p-3.5">SKU</th>
                        <th className="p-3.5">Categoria</th>
                        <th className="p-3.5">Valor / Preço (R$)</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 text-right pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222]">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((prod) => {
                          const isInline = inlineEditingId === prod.id;
                          const isConsult = prod.preco.toLowerCase().includes('consulte');

                          return (
                            <tr key={prod.id} className="hover:bg-[#1a1a1a]/60 transition-colors group">
                              
                              {/* Product Image and Name */}
                              <td className="p-3.5 pl-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-xl bg-[#1e1e1e] border border-[#2e2e2e] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                    <img
                                      src={prod.imagem}
                                      alt={prod.nome}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                                      {prod.nome}
                                    </h4>
                                    <p className="text-[11px] text-[#888888] line-clamp-1">
                                      {prod.descricao || 'Sem descrição detalhada'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* SKU */}
                              <td className="p-3.5 font-mono text-[11px] text-[#aaaaaa]">
                                <span className="px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md font-bold">
                                  {prod.sku}
                                </span>
                              </td>

                              {/* Category */}
                              <td className="p-3.5 uppercase text-[10px] font-bold text-purple-400">
                                {prod.categoria}
                              </td>

                              {/* Price with Inline Quick Editor */}
                              <td className="p-3.5">
                                {isInline ? (
                                  <div className="flex items-center gap-1.5 animate-in zoom-in-95 duration-100">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-[10px] text-[#888888] font-bold">R$</span>
                                      <input
                                        type="text"
                                        autoFocus
                                        value={inlinePriceValue}
                                        onChange={(e) => setInlinePriceValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlinePrice(prod.id);
                                          if (e.key === 'Escape') setInlineEditingId(null);
                                        }}
                                        className="w-24 pl-6 pr-2 py-1 bg-[#1a1a1a] border border-purple-500 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleSaveInlinePrice(prod.id)}
                                      disabled={inlineSaving}
                                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                                      title="Salvar novo valor"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setInlineEditingId(null)}
                                      className="p-1 bg-[#262626] hover:bg-[#333333] text-[#aaaaaa] rounded-lg transition-all"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className={`font-extrabold text-sm ${
                                      isConsult ? 'text-amber-400 font-semibold' : 'text-emerald-400'
                                    }`}>
                                      {isConsult ? 'Sob Consulta' : `R$ ${prod.preco}`}
                                    </span>
                                    
                                    {/* Quick edit price button */}
                                    <button
                                      onClick={(e) => startInlinePriceEdit(prod, e)}
                                      className="p-1 text-[#666666] hover:text-purple-400 hover:bg-[#1f1f1f] rounded-md transition-colors"
                                      title="Alterar valor diretamente"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>

                                    {/* Quick +5% and -5% adjustment shortcuts */}
                                    {!isConsult && !prod.preco.includes('#') && (
                                      <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => handleQuickAdjustPrice(prod, 5, e)}
                                          className="px-1.5 py-0.5 bg-[#1a1a1a] hover:bg-purple-950 text-purple-300 border border-[#2a2a2a] rounded text-[9px] font-bold"
                                          title="Aumentar +5%"
                                        >
                                          +5%
                                        </button>
                                        <button
                                          onClick={(e) => handleQuickAdjustPrice(prod, -5, e)}
                                          className="px-1.5 py-0.5 bg-[#1a1a1a] hover:bg-purple-950 text-purple-300 border border-[#2a2a2a] rounded text-[9px] font-bold"
                                          title="Aplicar desconto -5%"
                                        >
                                          -5%
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Status Toggle Badge */}
                              <td className="p-3.5 text-center">
                                <button
                                  onClick={(e) => handleToggleProductStatus(prod, e)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                                    prod.status === 'Ativo'
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/80'
                                      : 'bg-red-950/60 text-red-300 border-red-700/50 hover:bg-red-900/80'
                                  }`}
                                  title="Clique para alternar entre Ativo e Inativo"
                                >
                                  {prod.status === 'Ativo' ? '● Ativo' : '○ Inativo'}
                                </button>
                              </td>

                              {/* Action Buttons: Edit and Delete */}
                              <td className="p-3.5 text-right pr-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openProductForm(prod)}
                                    className="p-1.5 text-[#9ca3af] hover:text-purple-300 hover:bg-purple-950/40 border border-transparent hover:border-purple-800/40 rounded-xl transition-all"
                                    title="Editar todos os dados do produto"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setProductToDelete(prod)}
                                    className="p-1.5 text-[#9ca3af] hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/40 rounded-xl transition-all"
                                    title="Excluir este produto do catálogo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-[#888888]">
                            <Package className="w-10 h-10 mx-auto text-[#444444] mb-2" />
                            <p className="text-sm font-bold text-white">Nenhum produto encontrado com os filtros atuais.</p>
                            <p className="text-xs text-[#888888] mt-1">Tente buscar por outro termo ou adicione um novo produto ao catálogo.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: LIVE ORDERS MONITORING */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-black text-base text-white">Fila de Separação & Entregas</h3>
                  <p className="text-xs text-[#888888]">Atualize o status dos pedidos em tempo real para os motoboys e clientes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateNewOrder}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" /> Simular Pedido Novo
                  </button>
                  <button
                    onClick={loadData}
                    className="p-2 text-[#9ca3af] hover:text-purple-400 hover:bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {orders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-[#141414] border border-[#262626] rounded-2xl shadow-sm hover:border-purple-700/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-xs text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                            {ord.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.paymentStatus === 'paid'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-700/40'
                          }`}>
                            {ord.paymentStatus === 'paid' ? '● Pago' : '○ Aguardando Pagamento'}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-white">{ord.customerName}</h4>
                        <p className="text-xs text-[#9ca3af] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-purple-400" /> {ord.customerPhone}
                        </p>

                        {/* Order Address */}
                        {ord.address && typeof ord.address === 'object' && (
                          <p className="text-xs text-[#888888] flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>
                              {ord.address.street}, {ord.address.number} • {ord.address.neighborhood} ({ord.address.city})
                            </span>
                          </p>
                        )}

                        {/* Items list */}
                        <div className="mt-3 p-3 bg-[#0d0d0d] border border-[#222222] rounded-xl space-y-1 text-xs">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-[#cccccc]">
                              <span>{it.quantity}x {it.name}</span>
                              <span className="font-bold text-white">
                                R$ {(it.price * it.quantity).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-[#222222] flex justify-between font-extrabold text-xs">
                            <span className="text-[#888888]">Total Final:</span>
                            <span className="text-emerald-400 text-sm">R$ {ord.total.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>

                        {ord.notes && (
                          <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/30 p-2.5 rounded-xl mt-2">
                            <strong>Instruções do Cliente:</strong> {ord.notes}
                          </p>
                        )}
                      </div>

                      {/* Status Action Buttons */}
                      <div className="pt-2 border-t border-[#222222] space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'preparando')}
                            className={`py-1.5 rounded-xl transition-all ${
                              ord.status === 'preparando'
                                ? 'bg-amber-600 text-white font-black shadow'
                                : 'bg-[#1a1a1a] hover:bg-amber-950/40 text-[#9ca3af] border border-[#2a2a2a]'
                            }`}
                          >
                            Separando
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'em_rota')}
                            className={`py-1.5 rounded-xl transition-all ${
                              ord.status === 'em_rota'
                                ? 'bg-purple-600 text-white font-black shadow'
                                : 'bg-[#1a1a1a] hover:bg-purple-950/40 text-[#9ca3af] border border-[#2a2a2a]'
                            }`}
                          >
                            Em Rota
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'concluido')}
                            className={`py-1.5 rounded-xl transition-all ${
                              ord.status === 'concluido'
                                ? 'bg-emerald-600 text-white font-black shadow'
                                : 'bg-[#1a1a1a] hover:bg-emerald-950/40 text-[#9ca3af] border border-[#2a2a2a]'
                            }`}
                          >
                            Entregue
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#888888] bg-[#141414] rounded-3xl border border-dashed border-[#262626]">
                  <ShoppingBag className="w-10 h-10 mx-auto text-[#444444] mb-2" />
                  <p className="text-xs font-semibold">Nenhum pedido ativo no momento.</p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: USERS AND PATIENTS DIRECTORY */}
          {/* ======================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-base text-white">Diretório de Membros do Clube Super Popular</h3>
                <p className="text-xs text-[#888888]">Acesso seguro às informações cadastrais, histórico farmacêutico e pontuação fidelidade</p>
              </div>

              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{u.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-700 text-white rounded-full">
                          {u.membershipTier}
                        </span>
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-600 text-white rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-400">
                        {u.loyaltyPoints || 0} Pontos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#888888]">
                      <p><strong className="text-[#cccccc]">E-mail:</strong> {u.email}</p>
                      <p><strong className="text-[#cccccc]">Telefone:</strong> {u.phone}</p>
                      <p><strong className="text-[#cccccc]">CPF:</strong> {u.cpf || 'Não informado'}</p>
                    </div>

                    {u.healthNotes && (
                      <div className="p-2.5 bg-amber-950/40 border border-amber-800/30 rounded-xl text-xs text-amber-200">
                        <strong className="text-amber-300">Histórico Farmacêutico / Alergias:</strong> {u.healthNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: METRICS & REPORTS */}
          {/* ======================================================== */}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-base text-white">Indicadores de Desempenho Farmacêutico</h3>
                <p className="text-xs text-[#888888]">Métricas financeiras, volume de entregas e estatísticas do catálogo</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-[#888888] uppercase">Receita Total Confirmada</span>
                  <p className="text-2xl font-black text-emerald-400">
                    R$ {metrics.totalOrdersRevenue.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[11px] text-[#888888]">Pedidos pagos via PIX e Cartão</p>
                </div>

                <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-[#888888] uppercase">Pedidos em Aberto</span>
                  <p className="text-2xl font-black text-purple-400">
                    {metrics.pendingOrdersCount}
                  </p>
                  <p className="text-[11px] text-[#888888]">Em preparação ou rota de entrega</p>
                </div>

                <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-[#888888] uppercase">Membros Registrados</span>
                  <p className="text-2xl font-black text-amber-400">
                    {metrics.totalMembersCount}
                  </p>
                  <p className="text-[11px] text-[#888888]">No Clube Super Popular</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT FORM */}
      {/* ======================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121212] border border-[#262626] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#d1d5db]">
            
            {/* Header */}
            <div className="p-5 bg-[#171717] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
                  {editingProduct ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-black text-base text-white">
                    {editingProduct ? 'Editar Dados do Produto' : 'Cadastrar Novo Produto / Medicamento'}
                  </h4>
                  <p className="text-xs text-[#888888]">
                    {editingProduct ? `Editando item ID #${editingProduct.id}` : 'Insira as informações do medicamento ou cosmético'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-[#888888] hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProductForm} className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Product Name */}
              <div>
                <label className="font-bold block mb-1 text-[#cccccc]">
                  Nome do Item / Medicamento *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Dipirona 500mg (20 comprimidos), Protetor Solar FPS 50..."
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* SKU & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#cccccc]">Código SKU / Registro *</label>
                    <button
                      type="button"
                      onClick={() => setFormSku(`PROD${Math.floor(100 + Math.random() * 900)}`)}
                      className="text-[10px] text-purple-400 hover:underline"
                    >
                      Gerar SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Ex: MED001, HIG004"
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#cccccc]">
                    Preço de Venda (R$ ou Consulte) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex: 19,90, 45,00 ou Consulte"
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-bold text-emerald-400 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-[#cccccc]">Categoria *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-semibold text-white focus:ring-1 focus:ring-purple-500"
                  >
                    {INITIAL_CATEGORIES.map(c => (
                      <option key={c.id} value={c.nome_categoria} className="bg-[#121212] text-white">
                        {c.titulo_exibicao}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[#cccccc]">Status de Disponibilidade</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-semibold text-white focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Ativo" className="bg-[#121212] text-emerald-400">● Ativo na Loja</option>
                    <option value="Inativo" className="bg-[#121212] text-red-400">○ Inativo / Oculto</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold block mb-1 text-[#cccccc]">Descrição & Indicação</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Informações principais para o cliente..."
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Pharmaceutical Notes */}
              <div>
                <label className="font-bold block mb-1 text-[#cccccc]">Observações Farmacêuticas / Posologia</label>
                <input
                  type="text"
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Ex: Uso sob orientação médica. Não exceder a dose diária."
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Image URL & Presets */}
              <div className="space-y-2">
                <label className="font-bold block text-[#cccccc]">Foto / Imagem do Produto</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="URL da foto (ex: https://...)"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />

                {/* Preset quick selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-[#888888] font-semibold">Ou escolha uma imagem farmacêutica padrão:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {PHARMACY_IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormImage(preset.url)}
                        className={`p-1.5 rounded-xl border text-[10px] font-semibold text-left truncate transition-all flex items-center gap-1.5 ${
                          formImage === preset.url
                            ? 'bg-purple-950 border-purple-500 text-purple-200'
                            : 'bg-[#181818] border-[#2a2a2a] text-[#aaaaaa] hover:text-white hover:bg-[#222222]'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#262626] text-[#aaaaaa] hover:text-white rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-black rounded-xl shadow-lg shadow-emerald-950/80 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DELETE PRODUCT CONFIRMATION */}
      {/* ======================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-[#d1d5db]">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-950/60 border border-red-800/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">Excluir Produto</h4>
                <p className="text-xs text-[#888888]">Esta ação removerá o item permanentemente do catálogo</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#0e0e0e] border border-[#222222] rounded-2xl space-y-1 text-xs">
              <p className="font-bold text-white text-sm">{productToDelete.nome}</p>
              <p className="text-[#888888]">Código: <span className="font-mono text-purple-400">{productToDelete.sku}</span></p>
              <p className="text-[#888888]">Categoria: <span className="uppercase font-semibold">{productToDelete.categoria}</span></p>
            </div>

            <p className="text-xs text-[#999999]">
              Tem certeza que deseja remover este produto da Farmácia Super Popular?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-[#aaaaaa] hover:text-white rounded-xl font-bold text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-lg shadow-red-950/80 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: BATCH PRICE ADJUSTMENT */}
      {/* ======================================================== */}
      {isBatchPriceModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-[#d1d5db]">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="p-2.5 bg-purple-950/60 border border-purple-800/50 rounded-2xl">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">Reajuste Rápido de Preços</h4>
                <p className="text-xs text-[#888888]">Ajuste os valores dos produtos percentualmente</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 text-[#cccccc]">Categoria Alvo</label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-semibold text-white focus:ring-1 focus:ring-purple-500"
                >
                  <option value="todos">Todas as Categorias</option>
                  {INITIAL_CATEGORIES.map(c => (
                    <option key={c.id} value={c.nome_categoria}>
                      {c.titulo_exibicao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1 text-[#cccccc]">Tipo de Reajuste</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchDirection('increase')}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      batchDirection === 'increase'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a]'
                    }`}
                  >
                    + Aumento
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchDirection('decrease')}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      batchDirection === 'decrease'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a]'
                    }`}
                  >
                    - Desconto / Promoção
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-[#cccccc]">Percentual (%)</label>
                <div className="flex items-center gap-2">
                  {[3, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBatchPercent(pct)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        batchPercent === pct
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchPercent}
                    onChange={(e) => setBatchPercent(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-center font-bold text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchPriceModalOpen(false)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-[#aaaaaa] rounded-xl font-bold text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyBatchAdjustment}
                disabled={isBatchApplying}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5"
              >
                {isBatchApplying ? 'Aplicando...' : 'Aplicar Reajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
