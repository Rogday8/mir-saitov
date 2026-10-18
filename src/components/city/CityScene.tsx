import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Skyline, { SKY_HORIZON } from './Skyline';
import Office, { BASE, H } from './Office';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';

// 3D-карта: Москва-Сити и наша башня в разрезе. selected — номер этажа (камера подлетает к нему), null — вид на город.

const Rig: React.FC<{ selected: number | null; yaw: React.MutableRefObject<number> }> = ({ selected, yaw }) => {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(4, 14, -20));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  useFrame((st, dt) => {
    const narrow = size.width / size.height < 1;
    if (selected === null) {
      // обзор: медленный облёт + поворот мышью/пальцем
      const a = yaw.current + Math.sin(st.clock.elapsedTime * 0.07) * 0.22;
      // башня в центре кадра, Сити — за ней
      const R = narrow ? 64 : 46;
      tgt.set(narrow ? -1 : 4, narrow ? 13 : 7.5, narrow ? -1 : -6);
      pos.set(tgt.x + Math.sin(0.55 + a) * R, narrow ? 22 : 16, tgt.z + Math.cos(0.55 + a) * R);
    } else {
      // этаж: камера напротив открытой стороны башни
      const y = selected * H + BASE;
      // камера чуть ниже потолка и левее — комната по центру, карточка справа её не закрывает
      // на телефоне снизу карточка — смотрим ниже комнаты, чтобы она оказалась в верхней половине кадра
      tgt.set(narrow ? -0.4 : 1.4, y + (narrow ? -1.6 : 1.35), -0.8);
      pos.set(narrow ? 2.6 : 7.2, y + (narrow ? 1.9 : 2.5), narrow ? 17 : 13.5);
    }
    const k = Math.min(1, dt * 2.2);
    camera.position.lerp(pos, k);
    look.current.lerp(tgt, k);
    camera.lookAt(look.current);
  });
  return null;
};

// Свечение неона, окон и фар (только на компьютере — на телефоне дорого)
const Bloom: React.FC<{ soft: boolean }> = ({ soft }) => {
  const { gl, scene, camera, size } = useThree();
  const { composer, bloom } = useMemo(() => {
    const pr = gl.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.width * pr, size.height * pr, { type: THREE.HalfFloatType });
    const composer = new EffectComposer(gl, rt);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width / 2, size.height / 2), 0.6, 0.4, 1.0);
    // размытие считаем в половинном разрешении — для мягкого свечения этого хватает, а кадр в 2–3 раза дешевле
    const setSize = bloom.setSize.bind(bloom);
    bloom.setSize = (w: number, h: number) => setSize(Math.round(w / 2), Math.round(h / 2));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // сглаживание после цветокоррекции: MSAA в буфере свечения стоил треть кадра
    composer.addPass(new FXAAPass());
    return { composer, bloom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame((_, dt) => {
    // в комнате свечение тише, чтобы интерьер не «плыл»
    bloom.strength += ((soft ? 0.04 : 0.5) - bloom.strength) * Math.min(1, dt * 3);
    composer.render(dt);
  }, 1);
  return null;
};

// отражения для стекла и металла (без внешних HDR-файлов)
const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.35;
    return () => {
      scene.environment = null;
      tex.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
};

const CityScene: React.FC<{
  selected: number | null;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (i: number) => void;
  active: boolean;
  compact: boolean;
}> = ({ selected, hovered, onHover, onSelect, active, compact }) => {
  const yaw = useRef(0);
  const wrap = useRef<HTMLDivElement>(null);

  // перетаскивание поворачивает город (только в обзоре)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let down = false;
    let x0 = 0;
    const d = (e: PointerEvent) => {
      down = true;
      x0 = e.clientX;
    };
    const m = (e: PointerEvent) => {
      if (!down || selected !== null) return;
      yaw.current -= (e.clientX - x0) * 0.005; // город можно обойти по кругу
      x0 = e.clientX;
    };
    const u = () => (down = false);
    el.addEventListener('pointerdown', d);
    window.addEventListener('pointermove', m);
    window.addEventListener('pointerup', u);
    return () => {
      el.removeEventListener('pointerdown', d);
      window.removeEventListener('pointermove', m);
      window.removeEventListener('pointerup', u);
    };
  }, [selected]);

  return (
    <div ref={wrap} className="h-full w-full" style={{ touchAction: 'pan-y' }}>
      <Canvas
        shadows={!compact}
        dpr={[1, compact ? 1.25 : 1.6]}
        camera={{ position: [60, 36, 70], fov: 34, near: 1, far: 1400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        frameloop={active ? 'always' : 'never'}
      >
        <color attach="background" args={[SKY_HORIZON]} />
        <fog attach="fog" args={[SKY_HORIZON, 110, 420]} />
        <hemisphereLight args={['#4a52a0', '#0e0b18', 0.42]} />
        <ambientLight intensity={0.12} />
        <directionalLight
          position={[-40, 70, 45]}
          intensity={0.8}
          color="#c9d4ff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-6}
          shadow-camera-near={10}
          shadow-camera-far={160}
          shadow-bias={-0.0004}
        />
        <Env />
        <Rig selected={selected} yaw={yaw} />
        <Skyline />
        <Office selected={selected} hovered={hovered} onHover={onHover} onSelect={onSelect} />
        {!compact && <Bloom soft={selected !== null} />}
      </Canvas>
    </div>
  );
};

export default CityScene;
