import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { Banner } from '../types';
import { api } from '../services/api';

export const DynamicBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackBanners: Banner[] = [
    {
      id: "b1",
      title: "Sua saúde merece o melhor cuidado!",
      subtitle: "Descontos especiais em medicamentos e cuidados diários.",
      buttonText: "Aproveite agora!",
      buttonLink: "#catalog-section",
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
      bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50/50",
      textColor: "text-slate-800",
      borderColor: "border-emerald-100/80",
      buttonColor: "bg-[#10b981] hover:bg-[#059669] text-white"
    },
    {
      id: "b2",
      title: "Ofertas da Semana",
      subtitle: "até 40% OFF",
      buttonText: "Ver Ofertas",
      buttonLink: "#catalog-section",
      imageUrl: "",
      bgColor: "bg-gradient-to-br from-rose-50 to-red-50/50",
      textColor: "text-slate-850",
      borderColor: "border-red-100",
      buttonColor: "bg-red-600 hover:bg-red-700 text-white",
      badgeText: "40% OFF",
      iconName: "Tag"
    },
    {
      id: "b3",
      title: "Cuidar de você é nossa missão!",
      subtitle: "Apoio e atenção farmacêutica de verdade.",
      buttonText: "Saiba Mais",
      buttonLink: "#catalog-section",
      imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=60",
      bgColor: "bg-gradient-to-br from-[#064e3b] to-[#047857]",
      textColor: "text-white",
      borderColor: "border-emerald-800/30",
      buttonColor: "bg-white text-emerald-900 hover:bg-emerald-50"
    }
  ];

  useEffect(() => {
    async function loadBanners() {
      try {
        const data = await api.fetchBanners();
        if (data && data.length > 0) {
          setBanners(data);
        } else {
          setBanners(fallbackBanners);
        }
      } catch (err) {
        console.warn('Erro ao carregar banners da API, usando fallbacks:', err);
        setBanners(fallbackBanners);
      } finally {
        setLoading(false);
      }
    }
    loadBanners();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-44 bg-slate-100 border border-slate-200 rounded-3xl animate-pulse" />
    );
  }

  if (banners.length === 0) return null;

  const banner = banners[0];
  const IconComponent = banner.iconName ? (Icons as any)[banner.iconName] : null;

  if (banner.imageUrl) {
    return (
      <div className="w-full">
        <a
          href={banner.buttonLink || '#catalog-section'}
          onClick={(e) => {
            if (banner.buttonLink?.startsWith('#')) {
              e.preventDefault();
              const el = document.getElementById(banner.buttonLink.substring(1));
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
          className="block w-full overflow-hidden rounded-3xl shadow-lg hover:shadow-xl hover:scale-[1.005] active:scale-[0.995] transition-all duration-300 border border-slate-200/50"
        >
          <img
            src={banner.imageUrl}
            alt={banner.title || 'Promoção'}
            className="w-full h-auto object-cover block"
          />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row justify-between items-center overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 gap-6 ${banner.bgColor} ${banner.borderColor || 'border-slate-200/50'}`}
      >
        {/* Content Container */}
        <div className="space-y-3 flex-1 text-center sm:text-left">
          {/* Badge text */}
          {banner.badgeText && (
            <span className="inline-block text-[10px] font-black tracking-wider uppercase px-2.5 py-1 bg-red-600 text-white rounded-md mb-1">
              {banner.badgeText}
            </span>
          )}
          <h3 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-snug line-clamp-2 ${banner.textColor}`}>
            {banner.title}
          </h3>
          <p className={`text-xs sm:text-sm font-semibold leading-relaxed line-clamp-2 opacity-90 ${banner.textColor}`}>
            {banner.subtitle}
          </p>

          {/* Button call to action */}
          <div className="pt-2">
            <a
              href={banner.buttonLink || '#catalog-section'}
              onClick={(e) => {
                if (banner.buttonLink?.startsWith('#')) {
                  e.preventDefault();
                  const el = document.getElementById(banner.buttonLink.substring(1));
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
              className={`inline-block px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md ${banner.buttonColor}`}
            >
              {banner.buttonText}
            </a>
          </div>
        </div>

        {/* Icon fallback */}
        {IconComponent && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/30 text-red-650 flex items-center justify-center shrink-0 shadow-inner">
            <IconComponent className="w-10 h-10" />
          </div>
        )}
      </div>
    </div>
  );
};
