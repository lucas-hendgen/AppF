import React, { useState, useEffect } from 'react';
import { X, User, MapPin, ShoppingBag, Award, Plus, Trash2, Check, Clock, Phone, AlertCircle, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, UserAddress } from '../types';

export const MemberProfileModal: React.FC = () => {
  const { user, isProfileModalOpen, closeProfileModal, updateProfile, addAddress, deleteAddress } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders' | 'club'>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [healthNotes, setHealthNotes] = useState('');

  // Add address state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newComplement, setNewComplement] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('Centro');
  const [newCep, setNewCep] = useState('88220-000');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setCpf(user.cpf || '');
      setHealthNotes(user.healthNotes || '');
    }
  }, [user]);

  // Load user orders when orders tab is active
  useEffect(() => {
    if (isProfileModalOpen && user && activeTab === 'orders') {
      loadUserOrders();
    }
  }, [isProfileModalOpen, user, activeTab]);

  const loadUserOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const userOrders = await api.getOrders(user.id);
      setOrders(userOrders);
    } catch (err) {
      console.error('Erro ao buscar histórico de pedidos:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (!isProfileModalOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedbackMsg(null);
    try {
      await updateProfile({ name, phone, cpf, healthNotes });
      setFeedbackMsg({ type: 'success', text: 'Dados atualizados com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao atualizar dados.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet || !newNeighborhood) return;

    try {
      await addAddress({
        street: newStreet,
        number: newNumber || 'S/N',
        complement: newComplement,
        neighborhood: newNeighborhood,
        city: 'Itapema',
        state: 'SC',
        cep: newCep,
        isDefault: user.addresses.length === 0
      });
      setIsAddingAddress(false);
      setNewStreet('');
      setNewNumber('');
      setNewComplement('');
      setFeedbackMsg({ type: 'success', text: 'Endereço salvo com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao salvar endereço.' });
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (confirm('Deseja realmente excluir este endereço salvo?')) {
      await deleteAddress(id);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'recebido':
        return <span className="px-2.5 py-0.5 bg-blue-950/60 text-blue-300 border border-blue-800/40 rounded-full text-[11px] font-bold">📥 Recebido</span>;
      case 'preparando':
        return <span className="px-2.5 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-800/40 rounded-full text-[11px] font-bold">💊 Em Separação</span>;
      case 'em_rota':
        return <span className="px-2.5 py-0.5 bg-purple-950/60 text-purple-300 border border-purple-800/40 rounded-full text-[11px] font-bold">🛵 Em Rota</span>;
      case 'concluido':
        return <span className="px-2.5 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded-full text-[11px] font-bold">✅ Entregue</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-[#161616] text-[#9ca3af] border border-[#27272a] rounded-full text-[11px] font-bold">Processando</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111111] rounded-3xl shadow-2xl border border-[#1f2937] overflow-hidden flex flex-col max-h-[90vh] text-[#d1d5db]">
        
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#059669] text-white flex items-center justify-between border-b border-[#065f46]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white font-bold text-lg flex items-center justify-center border border-white/20 shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{user.name}</h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-amber-400 text-amber-950 rounded-full">
                  {user.membershipTier}
                </span>
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                Saldo: <strong className="font-bold text-white">{user.loyaltyPoints || 0} Pontos Fidelidade</strong>
              </p>
            </div>
          </div>
          <button
            onClick={closeProfileModal}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1f2937] bg-[#0d0d0d] px-6 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#10b981] text-[#10b981] bg-[#161616] rounded-t-xl'
                : 'border-transparent text-[#9ca3af] hover:text-[#f3f4f6]'
            }`}
          >
            <User className="w-4 h-4" /> Meus Dados
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'addresses'
                ? 'border-[#10b981] text-[#10b981] bg-[#161616] rounded-t-xl'
                : 'border-transparent text-[#9ca3af] hover:text-[#f3f4f6]'
            }`}
          >
            <MapPin className="w-4 h-4" /> Endereços ({user.addresses?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#10b981] text-[#10b981] bg-[#161616] rounded-t-xl'
                : 'border-transparent text-[#9ca3af] hover:text-[#f3f4f6]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Meus Pedidos
          </button>

          <button
            onClick={() => setActiveTab('club')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'club'
                ? 'border-[#10b981] text-[#10b981] bg-[#161616] rounded-t-xl'
                : 'border-transparent text-[#9ca3af] hover:text-[#f3f4f6]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> Clube & Pontos
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {feedbackMsg && (
            <div className={`p-3.5 mb-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
              feedbackMsg.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-red-950/60 text-red-300 border border-red-800/50'
            }`}>
              {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* TAB 1: MEUS DADOS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-1">E-mail Cadastrado</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3.5 py-2.5 bg-[#0d0d0d] border border-[#27272a] rounded-xl text-sm text-[#6b7280] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-1">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-1">
                  Observações Farmacêuticas & Alergias (Apenas a equipe de saúde tem acesso)
                </label>
                <textarea
                  rows={3}
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  placeholder="Medicamentos de uso contínuo, alergias a substâncias (ex: Dipirona, Penicilina), restrições alimentares..."
                  className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#27272a] rounded-xl text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:ring-2 focus:ring-[#10b981] focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ENDEREÇOS SALVOS */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#f3f4f6]">Locais de Entrega Cadastrados</h3>
                  <p className="text-xs text-[#9ca3af]">Selecione rapidamente qualquer endereço no checkout</p>
                </div>
                {!isAddingAddress && (
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Novo Endereço
                  </button>
                )}
              </div>

              {isAddingAddress && (
                <form onSubmit={handleSaveNewAddress} className="p-4 bg-[#161616] border border-[#1f2937] rounded-2xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase">Cadastrar Novo Endereço em Itapema</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-[#9ca3af]">Rua / Avenida *</label>
                      <input
                        type="text"
                        required
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        placeholder="Ex: Rua 230"
                        className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-lg text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-1 focus:ring-[#10b981]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#9ca3af]">Número *</label>
                      <input
                        type="text"
                        required
                        value={newNumber}
                        onChange={(e) => setNewNumber(e.target.value)}
                        placeholder="Ex: 450"
                        className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-lg text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-1 focus:ring-[#10b981]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#9ca3af]">Bairro *</label>
                      <select
                        value={newNeighborhood}
                        onChange={(e) => setNewNeighborhood(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-lg text-xs text-[#f3f4f6] focus:ring-1 focus:ring-[#10b981]"
                      >
                        <option value="Centro" className="bg-[#111111] text-white">Centro (R$ 3,00)</option>
                        <option value="Meia Praia" className="bg-[#111111] text-white">Meia Praia (R$ 5,00)</option>
                        <option value="Morretes" className="bg-[#111111] text-white">Morretes (R$ 6,00)</option>
                        <option value="Canto da Praia" className="bg-[#111111] text-white">Canto da Praia (R$ 7,00)</option>
                        <option value="Tabuleiro" className="bg-[#111111] text-white">Tabuleiro (R$ 6,50)</option>
                        <option value="Várzea" className="bg-[#111111] text-white">Várzea (R$ 8,00)</option>
                        <option value="Alto São Bento" className="bg-[#111111] text-white">Alto São Bento (R$ 8,50)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#9ca3af]">Complemento</label>
                      <input
                        type="text"
                        value={newComplement}
                        onChange={(e) => setNewComplement(e.target.value)}
                        placeholder="Apto, Bloco..."
                        className="w-full px-3 py-2 bg-[#111111] border border-[#27272a] rounded-lg text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:ring-1 focus:ring-[#10b981]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-3 py-1.5 bg-[#161616] hover:bg-[#222222] text-[#d1d5db] border border-[#27272a] text-xs font-semibold rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Salvar Endereço
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {user.addresses && user.addresses.length > 0 ? (
                  user.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 bg-[#161616] border border-[#1f2937] rounded-2xl flex items-start justify-between gap-3 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-950 text-[#10b981] rounded-xl mt-0.5 border border-emerald-800/40">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#f3f4f6]">
                              {addr.street}, {addr.number}
                            </span>
                            {addr.isDefault && (
                              <span className="px-2 py-0.5 bg-[#10b981] text-white rounded-full text-[10px] font-bold">
                                Principal
                              </span>
                            )}
                          </div>
                          {addr.complement && (
                            <p className="text-xs text-[#9ca3af]">{addr.complement}</p>
                          )}
                          <p className="text-xs text-[#9ca3af] font-medium mt-0.5">
                            Bairro: {addr.neighborhood} • {addr.city}/{addr.state}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-2 text-[#9ca3af] hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-all"
                        title="Remover endereço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#9ca3af] bg-[#161616] rounded-2xl border border-dashed border-[#27272a]">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Nenhum endereço cadastrado ainda.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HISTÓRICO DE PEDIDOS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#f3f4f6]">Seus Pedidos Realizados</h3>
                  <p className="text-xs text-[#9ca3af]">Acompanhe a entrega em tempo real</p>
                </div>
                <button
                  onClick={loadUserOrders}
                  className="p-1.5 text-[#9ca3af] hover:text-[#10b981] hover:bg-[#161616] rounded-lg"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingOrders ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-3 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-[#9ca3af]">Carregando seus pedidos...</p>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-[#161616] border border-[#1f2937] rounded-2xl shadow-sm hover:border-emerald-800/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#1f2937]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#f3f4f6]">{ord.id}</span>
                          {getStatusBadge(ord.status)}
                        </div>
                        <span className="text-[11px] text-[#9ca3af] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ord.createdAt).toLocaleDateString('pt-BR')} às {new Date(ord.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-[#d1d5db]">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="font-semibold text-[#f3f4f6]">R$ {(it.price * it.quantity).toFixed(2).replace('.', ',')}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer & Payment info */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#1f2937] text-xs">
                        <div>
                          <span className="text-[#9ca3af]">Pagamento: </span>
                          <span className="font-bold text-[#f3f4f6] uppercase">
                            {ord.paymentMethod.replace('mercadopago_', 'Mercado Pago ').replace('_', ' ')}
                          </span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.paymentStatus === 'paid' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          }`}>
                            {ord.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#9ca3af] mr-1">Total:</span>
                          <span className="font-bold text-sm text-[#10b981]">
                            R$ {ord.total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-[#161616] rounded-2xl border border-dashed border-[#27272a]">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[#9ca3af]" />
                  <p className="text-xs font-semibold text-[#f3f4f6]">Você ainda não realizou pedidos com esta conta.</p>
                  <p className="text-[11px] text-[#9ca3af] mt-1">Navegue pelo catálogo e faça seu primeiro pedido com benefícios!</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLUBE & PONTOS */}
          {activeTab === 'club' && (
            <div className="space-y-5">
              <div className="p-5 bg-gradient-to-br from-[#161616] to-[#1f2937] border border-amber-500/30 rounded-3xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Seu Nível no Programa
                  </span>
                  <h3 className="text-xl font-black text-[#f3f4f6] mt-0.5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> {user.membershipTier}
                  </h3>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Acumule 2 pontos a cada R$ 1,00 em compras pelo aplicativo!
                  </p>
                </div>
                <div className="text-right p-3 bg-[#111111]/80 backdrop-blur rounded-2xl shadow-sm border border-amber-500/20">
                  <span className="text-[10px] text-[#9ca3af] font-bold uppercase">Pontuação Atual</span>
                  <p className="text-2xl font-black text-[#10b981]">{user.loyaltyPoints || 0}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#9ca3af] mb-3">
                  Seus Cupons de Desconto Disponíveis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#161616] border border-dashed border-[#10b981] rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-[#10b981] font-mono">POPULAR10</span>
                      <span className="text-[10px] bg-emerald-950/60 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-800/40">10% OFF</span>
                    </div>
                    <p className="text-xs text-[#9ca3af]">Válido em todos os produtos do catálogo.</p>
                  </div>

                  <div className="p-3.5 bg-[#161616] border border-dashed border-[#10b981] rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-[#10b981] font-mono">FRETEGRATIS</span>
                      <span className="text-[10px] bg-blue-950/60 text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-800/40">Frete Grátis</span>
                    </div>
                    <p className="text-xs text-[#9ca3af]">Entrega gratuita para todos os bairros de Itapema.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
