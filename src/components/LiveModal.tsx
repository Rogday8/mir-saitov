import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Work } from '../data';
import { lockScroll } from '../lib/smooth';
import { Arrow } from './ui';

type Device = 'desktop' | 'phone';
const SIZE: Record<Device, { w: number; h: number }> = { desktop: { w: 1440, h: 900 }, phone: { w: 390, h: 844 } };

// Сайт вживую прямо в портфолио: в рамке компьютера или телефона, масштабируется под экран
const LiveModal: React.FC<{ work: Work | null; onClose: () => void }> = ({ work, onClose }) => {
  const [device, setDevice] = useState<Device>('desktop');
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lockScroll(!!work);
    if (!work) return;
    setLoaded(false);
    setDevice(window.innerWidth < 768 ? 'phone' : 'desktop');
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [work, onClose]);

  useEffect(() => {
    if (!work) return;
    const fit = () => {
      const el = stage.current;
      if (!el) return;
      const { w, h } = SIZE[device];
      const pad = device === 'phone' ? 28 : 16;
      setScale(Math.min(1, (el.clientWidth - pad * 2) / w, (el.clientHeight - pad * 2) / h));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [device, work]);

  const { w, h } = SIZE[device];

  return (
    <AnimatePresence>
      {work && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-void/90 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${work.name} — вживую`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: work.accent }} />
              <span className="font-display text-lg font-semibold">{work.name}</span>
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-haze sm:inline">вживую</span>
            </div>
            <div className="order-3 flex w-full justify-center sm:order-none sm:w-auto">
              <div className="relative flex rounded-full border border-white/15 p-1">
                {(['desktop', 'phone'] as Device[]).map((d) => (
                  <button key={d} onClick={() => setDevice(d)} className="relative z-10 rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors" style={{ color: device === d ? '#07060c' : undefined }}>
                    {device === d && <motion.span layoutId="dev-pill" className="absolute inset-0 -z-10 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    {d === 'desktop' ? 'Компьютер' : 'Телефон'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={work.url} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13px] font-bold hover:border-white/40 sm:flex">
                В новой вкладке <Arrow />
              </a>
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20" aria-label="Закрыть">
                ×
              </button>
            </div>
          </div>

          <div ref={stage} className="relative flex flex-1 items-center justify-center overflow-hidden">
            {/* при смене устройства сайт не перезагружается — рамка плавно сжимается, и вёрстка перестраивается на глазах */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, width: w * scale, height: h * scale, borderRadius: device === 'phone' ? 34 : 12 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`relative overflow-hidden bg-white shadow-[0_40px_140px_-30px_rgba(0,0,0,.9)] transition-[box-shadow] ${device === 'phone' ? 'ring-[6px] ring-[#1d1c26]' : 'ring-1 ring-white/15'}`}
            >
              {!loaded && (
                <div className="absolute inset-0 grid place-items-center bg-[#0e0c17]">
                  <div className="flex flex-col items-center gap-4">
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-lime" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Загружаем сайт</span>
                  </div>
                </div>
              )}
              <iframe
                key={work.slug}
                src={work.url}
                title={work.name}
                onLoad={() => setLoaded(true)}
                style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', transition: 'width .8s cubic-bezier(.16,1,.3,1), height .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1)' }}
                className="border-0"
                loading="lazy"
              />
            </motion.div>
          </div>
          <p className="pb-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-haze/70">Это настоящий сайт — можно листать и нажимать</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveModal;
