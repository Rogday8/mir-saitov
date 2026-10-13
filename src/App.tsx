import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import Cursor from './components/Cursor';
import Loader from './components/Loader';
import Header from './components/Header';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Works from './components/Works';
import Skills from './components/Skills';
import Process from './components/Process';
import Console from './components/Console';
import Team from './components/Team';
import BugGame from './components/BugGame';
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
      <Suspense fallback={<div className="grid h-[100svh] place-items-center font-mono text-xs uppercase tracking-[0.3em] text-haze">Загрузка…</div>}>
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
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  useEffect(() => startSmooth(), []);

  return (
    <>
      <div id="page-bg" className="page-bg" aria-hidden>
        <i />
      </div>
      <Loader onDone={() => setReady(true)} />
      <Cursor />
      <motion.div className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-violet via-cyan to-lime" style={{ scaleX: bar }} />
      <Header />
      <main>
        <Hero ready={ready} />
        <Marquee />
        <Works />
        <Skills />
        <Console />
        <Team />
        <Process />
        <BugGame />
        <Contact />
      </main>
      <Footer />
      <div className="grain hidden sm:block" aria-hidden />
    </>
  );
};

export default App;
