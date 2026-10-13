import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { WORKS } from '../data';

// Первый экран: Земля (снимки NASA — общественное достояние).
// Клик по Земле — она «растворяется», и появляется Сатурн, вокруг которого летают наши сайты.

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
          <sphereGeometry args={[1.35, 72, 72]} />
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

// ——— Сатурн: полосатый газовый гигант с кольцами (всё процедурное) ———
const SATURN_FRAG = /* glsl */ `
  uniform float uTime; uniform float uShow; uniform vec3 uSun;
  varying vec2 vUv; varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
  ${NOISE}
  void main(){
    vec3 N = normalize(vWN);
    vec3 V = normalize(cameraPosition - vWP);
    float lat = vUv.y;
    float b = lat + (fbm(vec3(vUv.x * 7., lat * 22., uTime * .03)) - .5) * .05;
    vec3 c1 = vec3(.93, .83, .63), c2 = vec3(.78, .62, .42), c3 = vec3(.99, .93, .8), c4 = vec3(.62, .48, .34);
    vec3 col = mix(c2, c1, sin(b * 64.) * .5 + .5);
    col = mix(col, c3, (sin(b * 23. + 1.3) * .5 + .5) * .35);
    col = mix(col, c4, smoothstep(.8, 1., sin(b * 9.) * .5 + .5) * .45);
    col *= .72 + .28 * smoothstep(0., .22, min(lat, 1. - lat));
    float diff = smoothstep(-.25, .9, dot(N, uSun));
    col *= .1 + diff * 1.08;
    col += vec3(1., .86, .62) * pow(1. - max(dot(N, V), 0.), 3.) * .35 * diff;
    gl_FragColor = vec4(col, uShow);
  }`;

const RING_IN = 1.32;
const RING_OUT = 2.35;
const RING_FRAG = /* glsl */ `
  uniform float uShow; varying vec3 vLocal;
  void main(){
    float u = (length(vLocal.xy) - ${RING_IN.toFixed(2)}) / ${(RING_OUT - RING_IN).toFixed(2)};
    float bands = .55 + .45 * sin(u * 92.) * sin(u * 37. + 1.);
    float edge = smoothstep(0., .04, u) * (1. - smoothstep(.95, 1., u));
    float cassini = 1. - smoothstep(.55, .575, u) * (1. - smoothstep(.62, .645, u));
    float inner = mix(.25, 1., smoothstep(0., .3, u));
    float a = edge * cassini * inner * (.4 + .6 * bands) * uShow * .9;
    vec3 col = mix(vec3(.72, .62, .48), vec3(.97, .9, .75), bands);
    gl_FragColor = vec4(col, a);
  }`;

const Saturn: React.FC<{ show: React.MutableRefObject<number> }> = ({ show }) => {
  const group = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const pu = useMemo(() => ({ uTime: { value: 0 }, uShow: { value: 0 }, uSun: { value: SUN.clone() } }), []);
  const ru = useMemo(() => ({ uShow: { value: 0 } }), []);
  const pm = useRef<THREE.ShaderMaterial>(null);
  const rm = useRef<THREE.ShaderMaterial>(null);
  useBind(pm, pu);
  useBind(rm, ru);
  useFrame((_, dt) => {
    const sh = show.current;
    pu.uTime.value += dt;
    pu.uShow.value = Math.min(1, sh * 1.4);
    ru.uShow.value = THREE.MathUtils.smoothstep(sh, 0.25, 1);
    if (ball.current) ball.current.rotation.y += dt * 0.09;
    const g = group.current;
    if (g) {
      // «распускается»: планета растёт, кольца разворачиваются
      const e = 1 - Math.pow(1 - sh, 3);
      g.scale.setScalar(0.35 + e * 0.65);
      g.visible = sh > 0.005;
    }
  });
  return (
    <group ref={group} rotation={[0.42, 0, -0.2]}>
      <mesh ref={ball}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial ref={pm} uniforms={pu} transparent vertexShader={EARTH_VERT} fragmentShader={SATURN_FRAG} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_IN, RING_OUT, 160, 1]} />
        <shaderMaterial
          ref={rm}
          uniforms={ru}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={`varying vec3 vLocal; void main(){ vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`}
          fragmentShader={RING_FRAG}
        />
      </mesh>
    </group>
  );
};

// ——— карточки сайтов на орбите вокруг Сатурна ———
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
    c *= .82 + uHover * .28;
    gl_FragColor = vec4(c, a * uOpacity);
  }`;

const OrbitCard: React.FC<{
  index: number;
  total: number;
  slug: string;
  radius: number;
  show: React.MutableRefObject<number>;
  onPick: () => void;
  onHover: (slug: string | null) => void;
}> = ({ index, total, slug, radius, show, onPick, onHover }) => {
  const ref = useRef<THREE.Mesh>(null);
  const hover = useRef(0);
  const [isHover, setHover] = useState(false);
  const { camera } = useThree();
  const tex = useTex(`works/${slug}-thumb.webp`);
  const u = useMemo(() => ({ uMap: { value: tex }, uHover: { value: 0 }, uOpacity: { value: 0 } }), [tex]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useBind(mat, u);
  const tilt = useMemo(() => new THREE.Euler(0.42, 0, -0.2), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const a0 = (index / total) * Math.PI * 2;
  const angle = useRef(a0);

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const sh = THREE.MathUtils.smoothstep(show.current, 0.45, 1);
    hover.current += ((isHover ? 1 : 0) - hover.current) * Math.min(1, dt * 8);
    // при наведении карточка почти останавливается — по ней легко попасть
    angle.current += dt * 0.1 * (1 - hover.current * 0.85);
    const r = radius * (0.6 + sh * 0.4);
    v.set(Math.cos(angle.current) * r, 0, Math.sin(angle.current) * r).applyEuler(tilt);
    m.position.copy(v);
    m.quaternion.copy(camera.quaternion);
    const front = (v.z + r) / (2 * r);
    m.scale.setScalar((0.62 + front * 0.38) * (1 + hover.current * 0.4) * (0.4 + sh * 0.6));
    u.uHover.value = hover.current;
    u.uOpacity.value = (0.45 + front * 0.55) * sh;
    m.visible = sh > 0.01;
    m.renderOrder = v.z > 0 ? 3 : 0;
  });

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (show.current < 0.8) return;
        setHover(true);
        onHover(slug);
      }}
      onPointerOut={() => {
        setHover(false);
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (show.current > 0.8) onPick();
      }}
    >
      <planeGeometry args={[1.0, 0.625]} />
      <shaderMaterial
        ref={mat}
        uniforms={u}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`}
        fragmentShader={cardFrag}
        transparent
        depthWrite={false}
      />
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

// Камера: отъезжает на узких экранах; внутри — чуть дальше, чтобы Сатурн с орбитой помещался целиком
const CameraRig: React.FC<{ t: React.MutableRefObject<number> }> = ({ t }) => {
  const { camera, size } = useThree();
  useFrame(() => {
    const aspect = size.width / size.height;
    const z = aspect < 0.7 ? 12 : aspect < 1.1 ? 9.4 : 6.6;
    camera.position.z = z + THREE.MathUtils.smoothstep(t.current, 0, 1) * (aspect < 1.1 ? 1.5 : 1.1);
  });
  return null;
};

// Группа: наклон за курсором, «наплыв» при загрузке, сдвиг при прокрутке; внутри — по центру экрана
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
    el.rotation.x += (pointer.y * 0.14 - el.rotation.x) * k;
    el.rotation.y += (pointer.x * 0.22 - el.rotation.y) * k;
    intro.current = Math.min(1, intro.current + dt / 2.2);
    const e = 1 - Math.pow(1 - intro.current, 3);
    el.scale.setScalar(0.72 + e * 0.28);
    const s = scroll.current;
    const c = THREE.MathUtils.smoothstep(t.current, 0, 1);
    el.position.set(offsetX * (1 - c), offsetY * (1 - c) + s * 1.6, -s * 2.2);
  });
  return <group ref={g}>{children}</group>;
};

// Плавный переход «Земля ↔ внутри»: t тянется к цели
const Transition: React.FC<{ inside: boolean; t: React.MutableRefObject<number>; show: React.MutableRefObject<number> }> = ({ inside, t, show }) => {
  useFrame((_, dt) => {
    const target = inside ? 1 : 0;
    t.current += (target - t.current) * Math.min(1, dt * (inside ? 0.75 : 1.6));
    if (Math.abs(target - t.current) < 0.001) t.current = target;
    // Сатурн появляется, когда Земля уже почти растворилась
    show.current = THREE.MathUtils.smoothstep(t.current, 0.3, 0.97);
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
  const show = useRef(0);
  return (
    <Canvas
      camera={{ position: [0, 0, 6.6], fov: 42 }}
      dpr={[1, compact ? 1.25 : 1.5]}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
    >
      <Transition inside={inside} t={t} show={show} />
      <CameraRig t={t} />
      <Stars count={compact ? 400 : 900} />
      <Rig scroll={scroll} t={t} offsetX={compact ? 0 : 1.75} offsetY={compact ? 1.2 : 0.25}>
        <Earth t={t} onEnter={onEnter} onHover={onHoverEarth} />
        <group scale={compact ? 0.68 : 1}>
          <Saturn show={show} />
          {WORKS.map((w, i) => (
            <OrbitCard key={w.slug} index={i} total={WORKS.length} slug={w.slug} radius={compact ? 2.75 : 3.05} show={show} onPick={() => onPickWork(w.slug)} onHover={onHoverSite} />
          ))}
        </group>
      </Rig>
    </Canvas>
  );
};

export default EarthScene;
