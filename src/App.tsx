import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import Cursor from './components/Cursor';
import Loader from './components/Loader';
import Header from './components/Header';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Works from './components/Works';
import Skills from './components/Skills';
import Process from './components/Process';
import BugGame from './components/BugGame';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { startSmooth } from './lib/smooth';

const App: React.FC = () => {
  const [ready, setReady] = useState(false);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  useEffect(() => startSmooth(), []);

  return (
    <>
      <Loader onDone={() => setReady(true)} />
      <Cursor />
      <motion.div className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-violet via-cyan to-lime" style={{ scaleX: bar }} />
      <Header />
      <main>
        <Hero ready={ready} />
        <Marquee />
        <Works />
        <Skills />
        <Process />
        <BugGame />
        <Contact />
      </main>
      <Footer />
      <div className="grain" aria-hidden />
    </>
  );
};

export default App;
