import React, { useEffect, useRef } from 'react';
import { reducedMotion } from '../lib/smooth';

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Видео играет только пока его видно (и не играет, если человек попросил «меньше движения»)
function useAutoplay(ref: React.RefObject<HTMLVideoElement | null>, enabled = true) {
  useEffect(() => {
    const v = ref.current;
    if (!v || !enabled) return;
    // заранее (за ~экран до появления) начинаем подгружать — старт видео не дёргает прокрутку
    const near = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && v.preload !== 'auto') {
          v.preload = 'auto';
          v.load();
        }
      },
      { rootMargin: '100% 0px' },
    );
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && !reducedMotion()) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    near.observe(v);
    io.observe(v);
    return () => {
      near.disconnect();
      io.disconnect();
    };
  }, [ref, enabled]);
}

// Запись сайта: видео прокрутки без нарисованной рамки браузера — только сама страница и её адрес подписью.
export const BrowserFrame: React.FC<{ url: string; video: string; poster: string; accent?: string; onOpen?: () => void; label: string; play?: boolean }> = ({
  url,
  video,
  poster,
  onOpen,
  label,
  play = true,
}) => {
  const vid = useRef<HTMLVideoElement>(null);
  useAutoplay(vid, play);
  return (
    <figure>
      <button
        type="button"
        onClick={onOpen}
        data-cursor={onOpen ? 'Открыть' : undefined}
        className="group relative block w-full overflow-hidden rounded-[6px] bg-black"
        aria-label={`Открыть ${label}`}
      >
        <video
          ref={vid}
          className="block aspect-[16/10] w-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.02]"
          src={play ? video : undefined}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={`Видео: ${label}`}
        />
      </button>
      <figcaption className="mt-3 text-[13px] opacity-60">{host(url)}</figcaption>
    </figure>
  );
};

// Экран телефона: видео прокрутки (если есть) или скриншот — без нарисованного корпуса
export const PhoneFrame: React.FC<{ src: string; video?: string; alt: string; className?: string; label?: string }> = ({ src, video, alt, className = '', label }) => {
  const vid = useRef<HTMLVideoElement>(null);
  useAutoplay(vid, !!video);
  return (
    <figure className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-[22px] bg-black shadow-[0_24px_60px_-24px_rgba(0,0,0,.7)]">
        {video ? (
          <video ref={vid} src={video} poster={src} muted loop playsInline preload="none" aria-label={alt} className="block aspect-[390/844] w-full object-cover object-top" />
        ) : (
          <img src={src} alt={alt} loading="lazy" className="block aspect-[390/844] w-full object-cover object-top" draggable={false} />
        )}
      </div>
      {label && <figcaption className="mt-2 text-center text-[12px] opacity-60">{label}</figcaption>}
    </figure>
  );
};
