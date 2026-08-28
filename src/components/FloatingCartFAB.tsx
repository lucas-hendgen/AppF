import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Sparkles, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  shape: 'circle' | 'sparkle' | 'ring' | 'star';
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
}

const PARTICLE_COLORS = [
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#f59e0b', // amber-500
  '#fbbf24', // amber-400
  '#38bdf8', // sky-400
  '#ffffff', // white
  '#a7f3d0'  // emerald-200
];

export const FloatingCartFAB: React.FC = () => {
  const { totalItems, finalTotal, openCart, lastItemAdded } = useCart();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingBadges, setFloatingBadges] = useState<Array<{ id: number; text: string }>>([]);
  const [ripples, setRipples] = useState<number[]>([]);
  const [isBouncing, setIsBouncing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastProcessedTimestamp = useRef<number>(0);

  // Trigger particle burst effect when an item is added to the cart
  useEffect(() => {
    if (!lastItemAdded || lastItemAdded.timestamp === lastProcessedTimestamp.current) {
      return;
    }

    lastProcessedTimestamp.current = lastItemAdded.timestamp;

    // 1. Button Bounce & Jiggle State
    setIsBouncing(true);
    const bounceTimer = setTimeout(() => setIsBouncing(false), 800);

    // 2. Spawn Expanding Shockwave Ripple
    const rippleId = Date.now();
    setRipples((prev) => [...prev, rippleId]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((id) => id !== rippleId));
    }, 1000);

    // 3. Spawn Floating "+Qtd" Toast Badge
    const badgeId = Date.now() + Math.random();
    const badgeText = `+${lastItemAdded.quantity || 1}`;
    setFloatingBadges((prev) => [...prev, { id: badgeId, text: badgeText }]);
    setTimeout(() => {
      setFloatingBadges((prev) => prev.filter((b) => b.id !== badgeId));
    }, 1400);

    // 4. Generate 20-26 radial burst particles
    const particleCount = 24;
    const newParticles: Particle[] = [];
    const shapes: Array<'circle' | 'sparkle' | 'ring' | 'star'> = ['circle', 'sparkle', 'ring', 'star'];

    for (let i = 0; i < particleCount; i++) {
      // 360-degree spread with slight bias towards top/left (away from screen edge)
      const angle = (i * (360 / particleCount) + (Math.random() * 20 - 10)) * (Math.PI / 180);
      const distance = 45 + Math.random() * 55; // 45px to 100px radius
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      newParticles.push({
        id: Date.now() + i + Math.random(),
        x,
        y,
        size: 5 + Math.random() * 7,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.7,
        duration: 0.6 + Math.random() * 0.35,
        delay: Math.random() * 0.08
      });
    }

    setParticles(newParticles);
    const particleTimer = setTimeout(() => setParticles([]), 1200);

    // 5. Fire celebratory micro confetti blast from button position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;

      try {
        confetti({
          particleCount: 22,
          angle: 110,
          spread: 70,
          startVelocity: 28,
          origin: { x: originX, y: originY },
          colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ffffff', '#38bdf8'],
          ticks: 80,
          gravity: 0.9,
          scalar: 0.75,
          disableForReducedMotion: true
        });
      } catch (e) {
        // Fallback silently if confetti encounters canvas error
      }
    }

    return () => {
      clearTimeout(bounceTimer);
      clearTimeout(particleTimer);
    };
  }, [lastItemAdded]);

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      <div className="relative flex items-center justify-center">
        
        {/* Shockwave Rings */}
        <AnimatePresence>
          {ripples.map((id) => (
            <motion.div
              key={id}
              initial={{ scale: 0.8, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400 pointer-events-none z-0"
              style={{
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)'
              }}
            />
          ))}
        </AnimatePresence>

        {/* Secondary Inner Glow Ripple */}
        <AnimatePresence>
          {ripples.map((id) => (
            <motion.div
              key={`inner-${id}`}
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
              className="absolute inset-0 rounded-full bg-emerald-400/30 pointer-events-none z-0 blur-sm"
            />
          ))}
        </AnimatePresence>

        {/* Dynamic Flying Particles Burst */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: 0,
                y: 0,
                scale: 0.2,
                opacity: 1,
                rotate: 0
              }}
              animate={{
                x: p.x,
                y: p.y,
                scale: [0.2, p.scale, 0],
                opacity: [1, 1, 0],
                rotate: p.rotation + 180
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="absolute pointer-events-none z-50 flex items-center justify-center"
              style={{
                width: p.size * 2,
                height: p.size * 2,
                top: '50%',
                left: '50%',
                marginTop: -p.size,
                marginLeft: -p.size
              }}
            >
              {p.shape === 'circle' && (
                <div
                  className="rounded-full shadow-lg"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    boxShadow: `0 0 10px ${p.color}`
                  }}
                />
              )}
              {p.shape === 'ring' && (
                <div
                  className="rounded-full border-2"
                  style={{
                    width: p.size * 1.3,
                    height: p.size * 1.3,
                    borderColor: p.color,
                    boxShadow: `0 0 8px ${p.color}`
                  }}
                />
              )}
              {p.shape === 'sparkle' && (
                <Sparkles
                  style={{
                    width: p.size * 1.5,
                    height: p.size * 1.5,
                    color: p.color,
                    filter: `drop-shadow(0 0 6px ${p.color})`
                  }}
                />
              )}
              {p.shape === 'star' && (
                <div
                  className="rotate-45"
                  style={{
                    width: p.size * 1.1,
                    height: p.size * 1.1,
                    backgroundColor: p.color,
                    boxShadow: `0 0 8px ${p.color}`
                  }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating "+1" / "+Qtd" Floating Badge Animation */}
        <AnimatePresence>
          {floatingBadges.map((badge) => (
            <motion.div
              key={badge.id}
              initial={{ y: 0, scale: 0.5, opacity: 0 }}
              animate={{
                y: -65,
                scale: [0.5, 1.25, 1],
                opacity: [0, 1, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.2,
                times: [0, 0.2, 0.8, 1],
                ease: 'easeOut'
              }}
              className="absolute -top-3 right-4 pointer-events-none z-50 flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-white font-black text-xs rounded-full shadow-2xl border border-white/60 backdrop-blur-md"
              style={{
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.8)'
              }}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Item Adicionado!</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Main Floating Cart Button (FAB) */}
        <motion.button
          ref={buttonRef}
          id="floating-cart-fab"
          onClick={openCart}
          animate={
            isBouncing
              ? {
                  scale: [1, 1.24, 0.94, 1.12, 1],
                  rotate: [0, -5, 5, -2, 0],
                  boxShadow: [
                    '0 15px 35px rgba(16, 185, 129, 0.35)',
                    '0 20px 45px rgba(16, 185, 129, 0.8)',
                    '0 15px 35px rgba(16, 185, 129, 0.35)'
                  ]
                }
              : {
                  scale: 1,
                  rotate: 0,
                  boxShadow: '0 15px 35px rgba(16, 185, 129, 0.35)'
                }
          }
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="relative z-10 flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] hover:from-[#059669] hover:to-[#047857] text-white rounded-full font-extrabold text-sm border border-emerald-300/40 cursor-pointer overflow-visible group"
        >
          {/* Animated Background Shimmer */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Bag Icon with Counter Badge */}
          <div className="relative">
            <ShoppingBag className="w-5 h-5 transition-transform group-hover:scale-110" />
            <motion.span
              key={totalItems}
              initial={{ scale: 1.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="absolute -top-2.5 -right-2.5 bg-white text-emerald-900 text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-md border border-emerald-100"
            >
              {totalItems}
            </motion.span>
          </div>

          {/* Label and Total */}
          <span className="tracking-tight text-white drop-shadow-sm whitespace-nowrap">
            Ver Carrinho • R$ {finalTotal.toFixed(2).replace('.', ',')}
          </span>
        </motion.button>

      </div>
    </div>
  );
};
