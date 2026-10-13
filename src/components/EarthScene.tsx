import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { WORKS } from '../data';

// Первый экран: Земля (снимки NASA — общественное достояние) со спутниками-сайтами на орбите.
// Клик по Земле — она «растворяется», а внутри растёт планета, собранная из наших сайтов.

const base = import.meta.env.BASE_URL;

const NOISE = /* glsl */ `
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float f = 0.; float a = .5; for (int i = 0; i < 4; i++) { f += a * vnoise(p); p *= 2.07; a *= .5; } return f; }
`;

// R3F копирует объект uniforms при создании материала — подменяем на наш, чтобы изменения из useFrame доходили до шейдера
type Uniforms = Record<string, THREE.IUniform>;
function useBind(ref: React.RefObject<THREE.ShaderMaterial | null>, u: Uniforms) {
  useLayoutEffect(() => {
    if (ref.current) ref.current.uniforms = u;
  }, [ref, u]);
}

const SUN = new THREE.Vector3(-0.75, 0.35, 0.6).normalize(); // солнце слева сверху, в мировых координатах

// общая вершинная часть Земли и облаков: нормаль и точка в мировых координатах
const EARTH_VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
  void main(){
    vUv = uv; vPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.);
    vWP = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const useTex = (path: string, color = true) =>
  useMemo(() => {
    const t = new THREE.TextureLoader().load(`${base}${path}`);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [path, color]);

// ——— Земля ———
const Earth: React.FC<{ t: React.MutableRefObject<number>; onEnter: () => void; onHover: (on: boolean) => void }> = ({ t, onEnter, onHover }) => {
  const day = useTex('earth/day.jpg');
  const night = useTex('earth/night.jpg', false);
  const clouds = useTex('earth/clouds.jpg', false);
  const spin = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);
  const u = useMemo(
    () => ({ uDay: { value: day }, uNight: { value: night }, uClouds: { value: clouds }, uSun: { value: SUN.clone() }, uDissolve: { value: 0 }, uTime: { value: 0 } }),
    [day, night, clouds],
  );
  const atmo = useMemo(() => ({ uFade: { value: 1 } }), []);
  const earthMat = useRef<THREE.ShaderMaterial>(null);
  const cloudMat = useRef<THREE.ShaderMaterial>(null);
  const atmoMat = useRef<THREE.ShaderMaterial>(null);
  useBind(earthMat, u);
  useBind(cloudMat, u);
  useBind(atmoMat, atmo);

  useFrame((_, dt) => {
    u.uTime.value += dt;
    if (spin.current) spin.current.rotation.y += dt * 0.045;
    if (cloudMesh.current) cloudMesh.current.rotation.y += dt * 0.012;
    u.uDissolve.value = THREE.MathUtils.smoothstep(t.current, 0.01, 0.7) * 1.15;
    atmo.uFade.value = 1 - THREE.MathUtils.smoothstep(t.current, 0, 0.5);
  });

  return (
    <group rotation={[0, 0, 0.41]}>
      <group ref={spin} rotation={[0, -1.9, 0]}>
        <mesh
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (t.current < 0.1) onEnter();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(true);
          }}
          onPointerOut={() => onHover(false)}
        >
          <sphereGeometry args={[1.35, 96, 96]} />
          <shaderMaterial
            ref={earthMat}
            uniforms={u}
            transparent
            vertexShader={EARTH_VERT}
            fragmentShader={`
              uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uClouds; uniform vec3 uSun; uniform float uDissolve; uniform float uTime;
              varying vec2 vUv; varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
              ${NOISE}
              void main(){
                vec3 vN = normalize(vWN);
                vec3 V = normalize(cameraPosition - vWP);
                // растворение: шум с тлеющим краем
                float n = fbm(vPos * 2.4 + uTime * .05);
                if (n < uDissolve - .05) discard;
                float edge = 1. - smoothstep(0., .07, n - (uDissolve - .05));
                vec3 dayC = texture2D(uDay, vUv).rgb;
                float lights = texture2D(uNight, vUv).r;
                float ndl = dot(vN, uSun);
                float dayMix = smoothstep(-.18, .3, ndl);
                vec3 col = dayC * (.18 + max(ndl, 0.) * 1.05);
                vec3 nightC = vec3(1., .78, .45) * pow(lights, 1.6) * 1.7 + dayC * .03;
                col = mix(nightC, col, dayMix);
                // блик солнца на воде
                float water = smoothstep(.02, .12, dayC.b - max(dayC.r, dayC.g) * .92);
                float spec = pow(max(dot(reflect(-uSun, vN), V), 0.), 40.) * water * dayMix;
                col += vec3(1., .95, .85) * spec * .55;
                // облака-тени и кромка атмосферы
                float fr = pow(1. - max(dot(vN, V), 0.), 3.);
                col += vec3(.3, .55, 1.) * fr * (.25 + dayMix * .9);
                col = mix(col, vec3(.78, 1., .3) * 1.6, edge * step(.001, uDissolve));
                gl_FragColor = vec4(col, 1.);
              }`}
          />
        </mesh>
        {/* облака */}
        <mesh ref={cloudMesh} scale={1.012}>
          <sphereGeometry args={[1.35, 64, 64]} />
          <shaderMaterial
            ref={cloudMat}
            uniforms={u}
            transparent
            depthWrite={false}
            vertexShader={EARTH_VERT}
            fragmentShader={`
              uniform sampler2D uClouds; uniform vec3 uSun; uniform float uDissolve; uniform float uTime;
              varying vec2 vUv; varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
              ${NOISE}
              void main(){
                vec3 vN = normalize(vWN);
                float n = fbm(vPos * 2.4 + uTime * .05);
                if (n < uDissolve + .02) discard;
                float c = texture2D(uClouds, vUv).r;
                float light = smoothstep(-.2, .4, dot(vN, uSun));
                gl_FragColor = vec4(vec3(1.) * (.25 + light * .85), c * .85 * (.15 + light * .85));
              }`}
          />
        </mesh>
      </group>
      {/* атмосфера */}
      <mesh scale={1.1}>
        <sphereGeometry args={[1.35, 64, 64]} />
        <shaderMaterial
          ref={atmoMat}
          uniforms={atmo}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          vertexShader={`varying vec3 vN; varying vec3 vView; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`uniform float uFade; varying vec3 vN; varying vec3 vView; void main(){ float i = pow(max(.7 - dot(vN, vView), 0.), 3.); gl_FragColor = vec4(vec3(.32,.58,1.) * i * 1.6, i * uFade); }`}
        />
      </mesh>
    </group>
  );
};

// ——— Планета из сайтов ———
const tileFrag = `
  uniform sampler2D uMap; uniform float uHover; uniform float uShow; varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
  void main(){
    vec2 p = vUv - .5;
    float d = rbox(p * vec2(1.6, 1.), vec2(.8, .5), .08);
    if (d > 0.) discard;
    vec3 c = texture2D(uMap, vUv).rgb * (.72 + uHover * .4);
    float edge = smoothstep(-.05, 0., d);
    c = mix(c, vec3(.78,1.,.3), edge * (.25 + uHover * .75));
    gl_FragColor = vec4(c, uShow);
  }`;

const Tile: React.FC<{ i: number; pos: THREE.Vector3; slug: string; tex: THREE.Texture; show: React.MutableRefObject<number>; hovered: boolean }> = ({ i, pos, slug, tex, show, hovered }) => {
  const ref = useRef<THREE.Mesh>(null);
  const h = useRef(0);
  const u = useMemo(() => ({ uMap: { value: tex }, uHover: { value: 0 }, uShow: { value: 0 } }), [tex]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useBind(mat, u);
  useEffect(() => {
    ref.current?.lookAt(pos.clone().multiplyScalar(2));
  }, [pos]);
  useFrame((_, dt) => {
    h.current += ((hovered ? 1 : 0) - h.current) * Math.min(1, dt * 10);
    u.uHover.value = h.current;
    u.uShow.value = show.current;
    if (ref.current) {
      const s = 1 + h.current * 0.45;
      ref.current.scale.setScalar(s);
      ref.current.position.copy(pos).multiplyScalar(1 + h.current * 0.12);
    }
  });
  return (
    <mesh ref={ref} position={pos} userData={{ slug, i }}>
      <planeGeometry args={[0.42, 0.26]} />
      <shaderMaterial ref={mat} uniforms={u} transparent depthWrite={false} side={THREE.FrontSide} vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`} fragmentShader={tileFrag} />
    </mesh>
  );
};

const SitesPlanet: React.FC<{ t: React.MutableRefObject<number>; onHover: (slug: string | null) => void; onPick: (slug: string) => void }> = ({ t, onHover, onPick }) => {
  const group = useRef<THREE.Group>(null);
  const show = useRef(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const textures = useMemo(
    () =>
      Object.fromEntries(
        WORKS.map((w) => {
          const tx = new THREE.TextureLoader().load(`${base}works/${w.slug}-thumb.webp`);
          tx.colorSpace = THREE.SRGBColorSpace;
          return [w.slug, tx];
        }),
      ),
    [],
  );
  // плитки по «спирали Фибоначчи» — ровно покрывают шар
  const tiles = useMemo(() => {
    const N = 46;
    const out: { pos: THREE.Vector3; slug: string }[] = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * Math.PI * (3 - Math.sqrt(5));
      out.push({ pos: new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(1.08), slug: WORKS[i % WORKS.length].slug });
    }
    return out;
  }, []);
  // вращение: само + перетаскивание с инерцией
  const drag = useRef({ on: false, x: 0, y: 0, vx: 0.18, vy: 0 });
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (t.current < 0.6) return;
      drag.current.on = true;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on) return;
      d.vx = (e.clientX - d.x) * 0.006 * 60;
      d.vy = (e.clientY - d.y) * 0.006 * 60;
      d.x = e.clientX;
      d.y = e.clientY;
    };
    const up = () => (drag.current.on = false);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, t]);

  useFrame((_, dt) => {
    show.current = THREE.MathUtils.smoothstep(t.current, 0.3, 0.95);
    const g = group.current;
    if (!g) return;
    const s = 0.2 + show.current * 0.8;
    g.scale.setScalar(s);
    g.visible = show.current > 0.01;
    const d = drag.current;
    if (!d.on) {
      d.vx += (0.18 - d.vx) * Math.min(1, dt * 1.5);
      d.vy += (0 - d.vy) * Math.min(1, dt * 2);
    }
    g.rotation.y += d.vx * dt;
    g.rotation.x = THREE.MathUtils.clamp(g.rotation.x + d.vy * dt, -0.8, 0.8);
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const slug = (e.object.userData as { slug?: string }).slug;
    if (slug && t.current > 0.8) onPick(slug);
  };

  return (
    <group ref={group}>
      {/* светящееся ядро */}
      <mesh>
        <sphereGeometry args={[0.98, 48, 48]} />
        <shaderMaterial
          transparent
          uniforms={{ uShow: { value: 1 } }}
          vertexShader={`varying vec3 vN; varying vec3 vView; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`varying vec3 vN; varying vec3 vView; void main(){ float fr = pow(1. - max(dot(vN, vView), 0.), 2.); vec3 c = mix(vec3(.06,.04,.16), vec3(.55,.42,1.), fr); c += vec3(.24,.9,1.) * pow(fr, 4.) * .8; gl_FragColor = vec4(c, .96); }`}
        />
      </mesh>
      <group
        onPointerMove={(e) => {
          e.stopPropagation();
          const ud = e.object.userData as { i?: number };
          const idx = typeof ud.i === 'number' ? ud.i : null;
          if (idx !== hovered) {
            setHovered(idx);
            onHover(idx === null ? null : tiles[idx].slug);
          }
        }}
        onPointerOut={() => {
          setHovered(null);
          onHover(null);
        }}
        onClick={pick}
      >
        {tiles.map((tl, i) => (
          <Tile key={i} i={i} pos={tl.pos} slug={tl.slug} tex={textures[tl.slug]} show={show} hovered={hovered === i} />
        ))}
      </group>
    </group>
  );
};

// ——— спутники-сайты на орбите вокруг Земли ———
const cardFrag = `
  uniform sampler2D uMap; uniform float uHover; uniform float uOpacity; varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
  void main(){
    vec2 p = vUv - .5;
    float d = rbox(p * vec2(1.6, 1.), vec2(.8, .5), .06);
    float a = 1. - smoothstep(0., .006, d);
    vec3 c = texture2D(uMap, vUv).rgb;
    float edge = smoothstep(-.035, 0., d);
    c = mix(c, vec3(.78,1.,.3), edge * uHover * .9);
    c *= .8 + uHover * .3;
    gl_FragColor = vec4(c, a * uOpacity);
  }`;

const OrbitCard: React.FC<{ index: number; total: number; slug: string; radius: number; t: React.MutableRefObject<number>; onPick: () => void; onHover: (on: boolean) => void }> = ({
  index,
  total,
  slug,
  radius,
  t,
  onPick,
  onHover,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const hover = useRef(0);
  const [isHover, setHover] = useState(false);
  const { camera } = useThree();
  const tex = useTex(`works/${slug}-thumb.webp`);
  const u = useMemo(() => ({ uMap: { value: tex }, uHover: { value: 0 }, uOpacity: { value: 1 } }), [tex]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useBind(mat, u);
  const tilt = useMemo(() => new THREE.Euler(0.38, 0, -0.28), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const a0 = (index / total) * Math.PI * 2;

  useFrame(({ clock }, dt) => {
    const m = ref.current;
    if (!m) return;
    hover.current += ((isHover ? 1 : 0) - hover.current) * Math.min(1, dt * 8);
    const away = THREE.MathUtils.smoothstep(t.current, 0, 0.5);
    const r = radius * (1 + away * 0.9);
    const a = a0 + clock.elapsedTime * 0.1;
    v.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyEuler(tilt);
    m.position.copy(v);
    m.quaternion.copy(camera.quaternion);
    const front = (v.z + r) / (2 * r);
    m.scale.setScalar((0.6 + front * 0.4) * (1 + hover.current * 0.35));
    u.uHover.value = hover.current;
    u.uOpacity.value = (0.35 + front * 0.65) * (1 - away);
    m.visible = away < 0.99;
    m.renderOrder = v.z > 0 ? 2 : 0;
  });

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (t.current > 0.1) return;
        setHover(true);
        onHover(true);
      }}
      onPointerOut={() => {
        setHover(false);
        onHover(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (t.current < 0.1) onPick();
      }}
    >
      <planeGeometry args={[1.0, 0.625]} />
      <shaderMaterial ref={mat} uniforms={u} vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`} fragmentShader={cardFrag} transparent depthWrite={false} />
    </mesh>
  );
};

const Stars: React.FC<{ count: number }> = ({ count }) => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 9 + Math.random() * 22;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) - 6], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.006;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.055} color="#ece9ff" transparent opacity={0.7} depthWrite={false} sizeAttenuation />
    </points>
  );
};

// Камера: отъезжает на узких экранах; при входе внутрь — приближается
const CameraRig: React.FC<{ t: React.MutableRefObject<number> }> = ({ t }) => {
  const { camera, size } = useThree();
  useFrame(() => {
    const aspect = size.width / size.height;
    const z = aspect < 0.7 ? 12 : aspect < 1.1 ? 9.4 : 6.6;
    camera.position.z = z - THREE.MathUtils.smoothstep(t.current, 0, 1) * (aspect < 1.1 ? 2.6 : 1.4);
  });
  return null;
};

// Группа: наклон за курсором, «наплыв» при загрузке, сдвиг при прокрутке
const Rig: React.FC<{ children: React.ReactNode; scroll: React.MutableRefObject<number>; t: React.MutableRefObject<number>; offsetX: number; offsetY: number }> = ({
  children,
  scroll,
  t,
  offsetX,
  offsetY,
}) => {
  const g = useRef<THREE.Group>(null);
  const intro = useRef(0);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    const el = g.current;
    if (!el) return;
    const k = Math.min(1, dt * 3);
    const inside = t.current;
    el.rotation.x += (pointer.y * 0.16 * (1 - inside) - el.rotation.x) * k;
    el.rotation.y += (pointer.x * 0.26 * (1 - inside) - el.rotation.y) * k;
    intro.current = Math.min(1, intro.current + dt / 2.2);
    const e = 1 - Math.pow(1 - intro.current, 3);
    el.scale.setScalar(0.72 + e * 0.28);
    const s = scroll.current;
    el.position.set(offsetX * (1 - inside * 0.35), offsetY + s * 1.6, -s * 2.2);
  });
  return <group ref={g}>{children}</group>;
};

// Плавный переход «Земля ↔ внутри»: t тянется к цели
const Transition: React.FC<{ inside: boolean; t: React.MutableRefObject<number> }> = ({ inside, t }) => {
  useFrame((_, dt) => {
    const target = inside ? 1 : 0;
    t.current += (target - t.current) * Math.min(1, dt * (inside ? 0.75 : 1.6));
    if (Math.abs(target - t.current) < 0.001) t.current = target;
  });
  return null;
};

export interface EarthSceneProps {
  inside: boolean;
  onEnter: () => void;
  onPickWork: (slug: string) => void;
  onHoverSite: (slug: string | null) => void;
  onHoverEarth: (on: boolean) => void;
  scroll: React.MutableRefObject<number>;
  active: boolean;
  compact: boolean;
}

const EarthScene: React.FC<EarthSceneProps> = ({ inside, onEnter, onPickWork, onHoverSite, onHoverEarth, scroll, active, compact }) => {
  const t = useRef(0);
  return (
    <Canvas camera={{ position: [0, 0, 6.6], fov: 42 }} dpr={compact ? [1, 1.5] : [1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} frameloop={active ? 'always' : 'never'}>
      <Transition inside={inside} t={t} />
      <CameraRig t={t} />
      <Stars count={compact ? 500 : 1200} />
      <Rig scroll={scroll} t={t} offsetX={compact ? 0 : 1.75} offsetY={compact ? 1.2 : 0.25}>
        <Earth t={t} onEnter={onEnter} onHover={onHoverEarth} />
        <SitesPlanet t={t} onHover={onHoverSite} onPick={onPickWork} />
        {WORKS.map((w, i) => (
          <OrbitCard key={w.slug} index={i} total={WORKS.length} slug={w.slug} radius={compact ? 2.45 : 2.9} t={t} onPick={() => onPickWork(w.slug)} onHover={onHoverEarth} />
        ))}
      </Rig>
    </Canvas>
  );
};

export default EarthScene;
