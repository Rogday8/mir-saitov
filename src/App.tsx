import React, { Suspense, lazy, useEffect, useState } from 'react';
import Cursor from './components/Cursor';
import Loader from './components/Loader';
import Header from './components/Header';
import Hero from './components/Hero';
import Works from './components/Works';
import Skills from './components/Skills';
import Process from './components/Process';
import Console from './components/Console';
import Team from './components/Team';
import Security from './components/Security';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { startSmooth } from './lib/smooth';
import { useRoute } from './lib/route';

// Отдельные экраны для выступления: большой экран зала и пульт в телефоне зрителя
const Stage = lazy(() => import('./stage/Stage'));
const Play = lazy(() => import('./stage/Play'));

const App: React.FC = () => {
  const route = useRoute();
  if (route.page === 'stage' || route.page === 'play')
    return (
      <Suspense fallback={<div className="grid h-[100svh] place-items-center text-[15px] text-haze">Загрузка…</div>}>
        <div id="page-bg" className="page-bg" aria-hidden>
        <i />
      </div>
        {route.page === 'stage' ? <Stage /> : <Play params={route.params} />}
      </Suspense>
    );
  return <Main />;
};

const Main: React.FC = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => startSmooth(), []);

  return (
    <>
      <div id="page-bg" className="page-bg" aria-hidden>
        <i />
      </div>
      <Loader onDone={() => setReady(true)} />
      <Cursor />
      <Header />
      <main>
        <Hero ready={ready} />
        <Works />
        <Skills />
        <Console />
        <Team />
        <Process />
        <Security />
        <Contact />
      </main>
      <Footer />
      <div className="grain hidden sm:block" aria-hidden />
    </>
  );
};

export default App;
