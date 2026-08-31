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
      title: "Promoção de Verão - Farmácia Super Popular",
      subtitle: "Energia e Proteção para sua Família!",
      buttonText: "Aproveite agora!",
      buttonLink: "#catalog-section",
      imageUrl: "/banner-principal.png",
      bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50/50",
      textColor: "text-slate-800",
      borderColor: "border-emerald-100/80",
      buttonColor: "bg-[#10b981] hover:bg-[#059669] text-white"
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

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play when multiple banners exist
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) {
    return (
      <div className="w-full h-44 sm:h-64 bg-slate-100 border border-slate-200 rounded-3xl animate-pulse" />
    );
  }

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex] || banners[0];
  const IconComponent = currentBanner.iconName ? (Icons as any)[currentBanner.iconName] : null;

  const handleBannerClick = (e: React.MouseEvent<HTMLAnchorElement>, link?: string) => {
    if (link?.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(link.substring(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="w-full relative group">
      {currentBanner.imageUrl ? (
        <a
          href={currentBanner.buttonLink || '#catalog-section'}
          onClick={(e) => handleBannerClick(e, currentBanner.buttonLink)}
          className="block w-full overflow-hidden rounded-3xl shadow-lg hover:shadow-xl hover:scale-[1.002] active:scale-[0.998] transition-all duration-300 border border-slate-200/50 bg-slate-100"
        >
          <img
            src={currentBanner.imageUrl}
            alt={currentBanner.title || 'Promoção'}
            className="w-full h-auto max-h-[340px] md:max-h-[400px] object-cover object-center block"
          />
        </a>
      ) : (
        <div
          className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row justify-between items-center overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 gap-6 ${currentBanner.bgColor} ${currentBanner.borderColor || 'border-slate-200/50'}`}
        >
          {/* Content Container */}
          <div className="space-y-3 flex-1 text-center sm:text-left">
            {/* Badge text */}
            {currentBanner.badgeText && (
              <span className="inline-block text-[10px] font-black tracking-wider uppercase px-2.5 py-1 bg-red-600 text-white rounded-md mb-1">
                {currentBanner.badgeText}
              </span>
            )}
            <h3 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-snug line-clamp-2 ${currentBanner.textColor}`}>
              {currentBanner.title}
            </h3>
            <p className={`text-xs sm:text-sm font-semibold leading-relaxed line-clamp-2 opacity-90 ${currentBanner.textColor}`}>
              {currentBanner.subtitle}
            </p>

            {/* Button call to action */}
            <div className="pt-2">
              <a
                href={currentBanner.buttonLink || '#catalog-section'}
                onClick={(e) => handleBannerClick(e, currentBanner.buttonLink)}
                className={`inline-block px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md ${currentBanner.buttonColor}`}
              >
                {currentBanner.buttonText}
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
      )}

      {/* Multiple Banners Navigation (Dots & Arrows) */}
      {banners.length > 1 && (
        <>
          {/* Left / Right Buttons */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all z-10"
            aria-label="Banner anterior"
          >
            <Icons.ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all z-10"
            aria-label="Próximo banner"
          >
            <Icons.ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-5 h-1.5 bg-white shadow-sm'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Ir para banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

