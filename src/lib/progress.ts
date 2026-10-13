import { useEffect, type RefObject } from 'react';
import { useMotionValue, type MotionValue } from 'motion/react';

// Прогресс прохождения блока через экран: 0 — блок только показался снизу, 1 — ушёл вверх.
// Считаем сами от getBoundingClientRect: useScroll({ target }) иногда уходит в нативный ScrollTimeline
// и расходится с плавной прокруткой Lenis.
export function useSectionProgress(ref: RefObject<HTMLElement | null>): MotionValue<number> {
  const p = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      p.set(Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh))));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, [ref, p]);
  return p;
}
