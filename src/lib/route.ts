import { useEffect, useState } from 'react';

// Маршруты на «решётке» — работают на GitHub Pages без настроек сервера:
//   #/stage — большой экран зала, #/play?r=КОД — пульт в телефоне зрителя, остальное — главная
export interface Route {
  page: 'main' | 'stage' | 'play';
  params: URLSearchParams;
}

const parse = (): Route => {
  const h = window.location.hash.replace(/^#/, '');
  const [path, query = ''] = h.split('?');
  const page = path === '/stage' ? 'stage' : path === '/play' ? 'play' : 'main';
  return { page, params: new URLSearchParams(query) };
};

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => {
      setR(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
