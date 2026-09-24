import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, RefreshCw, Image, Sparkles, Upload } from 'lucide-react';
import { api } from '../../services/api';
import { Banner, Product } from '../../types';

interface AdminBannersProps {
  setGlobalLoading?: (loading: boolean) => void;
}

const BG_PRESETS = [
  { label: 'Verde Claro (Esmeralda)', bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50/50', textColor: 'text-slate-800', borderColor: 'border-emerald-100/80', buttonColor: 'bg-[#10b981] hover:bg-[#059669] text-white' },
  { label: 'Rosa Claro (Ofertas)', bgColor: 'bg-gradient-to-br from-rose-50 to-red-50/50', textColor: 'text-slate-850', borderColor: 'border-red-100', buttonColor: 'bg-red-600 hover:bg-red-700 text-white' },
  { label: 'Verde Escuro (Institucional)', bgColor: 'bg-gradient-to-br from-[#064e3b] to-[#047857]', textColor: 'text-white', borderColor: 'border-emerald-800/30', buttonColor: 'bg-white text-emerald-900 hover:bg-emerald-50' },
  { label: 'Azul Claro (Info)', bgColor: 'bg-gradient-to-br from-sky-50 to-blue-50/50', textColor: 'text-slate-800', borderColor: 'border-sky-100', buttonColor: 'bg-sky-600 hover:bg-sky-750 text-white' },
  { label: 'Roxo Claro (Clube)', bgColor: 'bg-gradient-to-br from-purple-50 to-indigo-50/50', textColor: 'text-slate-800', borderColor: 'border-purple-100', buttonColor: 'bg-purple-650 hover:bg-purple-750 text-white' }
];

export const AdminBanners: React.FC<AdminBannersProps> = ({ setGlobalLoading }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('Saiba Mais');
  const [buttonLink, setButtonLink] = useState('#catalog-section');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [iconName, setIconName] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const loadBanners = async (showFullLoader = false) => {
    if (showFullLoader || banners.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      const data = await api.fetchBanners();
      setBanners(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar banners do servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBanners(true);
    api.fetchProducts().then(setProducts).catch(console.warn);
  }, []);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setButtonText('Saiba Mais');
    setButtonLink('#catalog-section');
    setImageUrl('');
    setBadgeText('');
    setIconName('');
    setSelectedPresetIndex(0);
    setSelectedProductIds([]);
  };

  const handleStartEdit = (banner: Banner) => {
    setIsEditing(true);
    setEditingId(banner.id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle);
    setButtonText(banner.buttonText);
    setButtonLink(banner.buttonLink);
    setImageUrl(banner.imageUrl || '');
    setBadgeText(banner.badgeText || '');
    setIconName(banner.iconName || '');
    setSelectedProductIds(banner.productIds || []);

    // Find closest matching preset index or default to 0
    const pIndex = BG_PRESETS.findIndex(p => p.bgColor === banner.bgColor);
    setSelectedPresetIndex(pIndex !== -1 ? pIndex : 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem é muito grande. Escolha uma imagem com menos de 2MB para garantir a performance.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buttonLink.trim()) {
      alert('O link de destino é obrigatório.');
      return;
    }

    const bannerPayload: Partial<Banner> = {
      title: 'Promoção Especial',
      subtitle: '',
      buttonText: 'Aproveitar',
      buttonLink: buttonLink.trim(),
      imageUrl: imageUrl.trim() || undefined,
      bgColor: 'bg-white',
      textColor: 'text-slate-800',
      borderColor: 'border-slate-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
      productIds: selectedProductIds
    };

    if (setGlobalLoading) setGlobalLoading(true);
    try {
      if (editingId) {
        // Edit existing banner
        const updated = await api.updateBanner(editingId, bannerPayload);
        setBanners(prev => prev.map(b => b.id === editingId ? updated : b));
        alert('Banner atualizado com sucesso!');
      } else {
        // Create new banner
        const created = await api.createBanner(bannerPayload);
        setBanners(prev => [...prev, created]);
        alert('Banner criado com sucesso!');
      }
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar banner.');
    } finally {
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este banner? Ele sumirá da página inicial do cliente imediatamente.')) return;
    if (setGlobalLoading) setGlobalLoading(true);
    try {
      await api.deleteBanner(id);
      setBanners(prev => prev.filter(b => b.id !== id));
      alert('Banner removido com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao remover banner.');
    } finally {
      if (setGlobalLoading) setGlobalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Gerenciamento de Banners de Marketing</h3>
          <p className="text-xs text-slate-500 font-semibold">Altere as campanhas promocionais que aparecem no topo da página do cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadBanners(false)}
            disabled={refreshing || loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Banner
            </button>
          )}
        </div>
      </div>

      {/* Editing / Creating form */}
      {isEditing && (
        <form onSubmit={handleSaveBanner} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {editingId ? 'Editar Banner' : 'Novo Banner Promocional'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {/* Image upload */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Imagem do Banner *</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={imageUrl.startsWith('data:') ? 'Imagem anexada' : imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="Cole uma URL ou anexe um arquivo"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      disabled={imageUrl.startsWith('data:')}
                    />
                  </div>
                  <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Anexar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold shrink-0"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-blue-700 font-bold mt-1.5 leading-relaxed bg-blue-50 p-2 rounded-xl border border-blue-100">
                  💡 <strong>Tamanho Recomendado:</strong> Crie a imagem com <strong>1200 x 300 pixels</strong> (proporção 4:1) e sem margens ou bordas brancas integradas nas laterais do arquivo para um encaixe perfeito e profissional.
                </p>
              </div>

              {/* Destination link */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Link de Destino / Redirecionamento *</label>
                <input
                  type="text"
                  required
                  value={buttonLink}
                  onChange={e => setButtonLink(e.target.value)}
                  placeholder="Ex: #catalog-section ou URL"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            {/* Associated products checklist */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Vincular Produtos em Promoção neste Banner
              </label>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs">
                {products.length === 0 ? (
                  <p className="text-slate-400 italic">Carregando produtos...</p>
                ) : (
                  products.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-600/20"
                      />
                      <span className="font-bold text-slate-800">{p.nome}</span>
                      <span className="text-[10px] text-slate-400">({p.sku})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Salvar Alterações' : 'Criar Banner'}
            </button>
          </div>
        </form>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Carregando banners...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl">
          <Image className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-500">Nenhum banner cadastrado</p>
          <p className="text-xs text-slate-400 mt-0.5">Cadastre uma campanha para exibir aos clientes na página inicial.</p>
        </div>
      ) : (
        /* List of banners */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="p-4 border rounded-3xl flex items-center justify-between gap-4 bg-white hover:shadow-md transition-all border-slate-200/80"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {banner.imageUrl ? (
                  <div className="w-20 h-10 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                    <img src={banner.imageUrl} className="w-full h-full object-contain" alt="Preview" />
                  </div>
                ) : (
                  <div className="w-20 h-10 rounded-lg border border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-[9px] shrink-0 font-bold">
                    Sem Imagem
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">
                    ID: {banner.id}
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1 truncate">Link: {banner.buttonLink}</p>
                  {banner.productIds && banner.productIds.length > 0 && (
                    <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
                      🏷️ {banner.productIds.length} produto(s) vinculado(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleStartEdit(banner)}
                  className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-200/60 rounded-xl transition-all"
                  title="Editar Banner"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="p-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200/60 rounded-xl transition-all"
                  title="Remover Banner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
