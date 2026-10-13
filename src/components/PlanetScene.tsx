import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORKS } from '../data';

// 3D-сцена первого экрана: светящаяся планета из шума, атмосфера, кольцо из частиц,
// звёзды и карточки наших сайтов на орбите. Всё процедурное — без внешних моделей.

const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float f=0.;float a=.5;for(int i=0;i<5;i++){f+=a*snoise(p);p*=2.03;a*=.5;}return f;}
`;

const Planet: React.FC = () => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    if (mesh.current) mesh.current.rotation.y += dt * 0.06;
  });
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.35, 128, 128]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
            void main(){
              vPos = position;
              vNormal = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position,1.);
              vView = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`}
          fragmentShader={`
            uniform float uTime; varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
            ${noise}
            void main(){
              vec3 p = vPos * .9;
              float t = uTime * .035;
              // мягкие «газовые» полосы, как у газового гиганта: крупный шум + вихри
              float warp = fbm(p * .9 + vec3(t, -t * .6, t * .3));
              float swirl = fbm(p * 2.1 + warp * 1.4 - vec3(0., t * 1.5, 0.));
              float lat = p.y + warp * .55 + swirl * .12;
              float bands = sin(lat * 5.2 + uTime * .12) * .5 + .5;
              float fine = sin(lat * 17. + swirl * 3.) * .5 + .5;
              vec3 deep = vec3(.05,.04,.14);
              vec3 indigo = vec3(.22,.16,.55);
              vec3 violet = vec3(.56,.43,1.);
              vec3 cyan = vec3(.25,.88,1.);
              vec3 lime = vec3(.78,1.,.3);
              vec3 col = mix(deep, indigo, smoothstep(.0,.6,bands));
              col = mix(col, violet, smoothstep(.45,.95,bands) * .85);
              col = mix(col, cyan, smoothstep(.62,1.,fine) * smoothstep(.3,.9,bands) * .45);
              col += lime * smoothstep(.93,1.,bands * fine) * .35;
              // свет слева сверху, тёмная ночная сторона
              vec3 L = normalize(vec3(-.55,.45,.7));
              float diff = smoothstep(-.25, 1., dot(vNormal, L));
              col *= .12 + diff * 1.15;
              // тонкая кромка-сияние со стороны света
              float fr = pow(1. - max(dot(vNormal, vView), 0.), 3.4);
              col += fr * mix(violet, cyan, .55) * (.35 + diff * .8);
              gl_FragColor = vec4(col, 1.);
            }`}
        />
      </mesh>
      {/* атмосфера */}
      <mesh scale={1.16}>
        <sphereGeometry args={[1.35, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vNormal; varying vec3 vView;
            void main(){ vNormal = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`
            varying vec3 vNormal; varying vec3 vView;
            void main(){ float i = pow(max(.68 - dot(vNormal, vView), 0.), 3.2); gl_FragColor = vec4(vec3(.45,.4,1.) * i * 1.25, i * .8); }`}
        />
      </mesh>
    </group>
  );
};

// Кольцо из тысяч частиц вокруг планеты
const Ring: React.FC<{ count: number }> = ({ count }) => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color('#8b6cff');
    const c2 = new THREE.Color('#3ee6ff');
    const c3 = new THREE.Color('#c8ff4d');
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.0 + Math.pow(Math.random(), 1.6) * 0.9;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      pos[i * 3 + 2] = Math.sin(a) * r;
      const c = r < 2.3 ? c2 : r < 2.6 ? c1 : c3;
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  return (
    <points ref={ref} geometry={geo} rotation={[0.42, 0, -0.32]}>
      <pointsMaterial size={0.018} vertexColors transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
};

const Stars: React.FC<{ count: number }> = ({ count }) => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 22;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) - 6], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.008;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.06} color="#ece9ff" transparent opacity={0.75} depthWrite={false} sizeAttenuation />
    </points>
  );
};

// Скруглённая карточка-скриншот: маска углов и лёгкое свечение по краю
const cardVertex = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const cardFragment = `
  uniform sampler2D uMap; uniform float uHover; uniform float uOpacity; varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
  void main(){
    vec2 p = vUv - .5;
    float d = rbox(p * vec2(1.6, 1.), vec2(.8, .5), .06);
    float a = 1. - smoothstep(0., .006, d);
    vec3 c = texture2D(uMap, vUv).rgb;
    float edge = smoothstep(-.035, 0., d);
    c = mix(c, vec3(.78,1.,.3), edge * uHover * .9);
    c *= .78 + uHover * .3;
    gl_FragColor = vec4(c, a * uOpacity);
  }`;

const OrbitCard: React.FC<{ index: number; total: number; src: string; onPick: () => void; onHover: (on: boolean) => void; radius: number }> = ({
  index,
  total,
  src,
  onPick,
  onHover,
  radius,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const hover = useRef(0);
  const [isHover, setHover] = useState(false);
  const { camera } = useThree();
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [src]);
  const uniforms = useMemo(() => ({ uMap: { value: tex }, uHover: { value: 0 }, uOpacity: { value: 1 } }), [tex]);
  const base = (index / total) * Math.PI * 2;
  const tilt = new THREE.Euler(0.42, 0, -0.32);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    const m = ref.current;
    if (!m) return;
    hover.current += ((isHover ? 1 : 0) - hover.current) * Math.min(1, dt * 8);
    const a = base + clock.elapsedTime * 0.11;
    v.set(Math.cos(a) * radius, 0, Math.sin(a) * radius).applyEuler(tilt);
    m.position.copy(v);
    m.quaternion.copy(camera.quaternion);
    // за планетой — тусклее и меньше
    const front = (v.z + radius) / (2 * radius);
    const s = (0.62 + front * 0.38) * (1 + hover.current * 0.35);
    m.scale.setScalar(s);
    uniforms.uHover.value = hover.current;
    uniforms.uOpacity.value = 0.35 + front * 0.65;
    m.renderOrder = v.z > 0 ? 2 : 0;
  });

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        onHover(true);
      }}
      onPointerOut={() => {
        setHover(false);
        onHover(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      <planeGeometry args={[1.12, 0.7]} />
      <shaderMaterial uniforms={uniforms} vertexShader={cardVertex} fragmentShader={cardFragment} transparent depthWrite={false} />
    </mesh>
  );
};

// Камера отъезжает на узких экранах, чтобы планета с орбитой помещалась целиком
const CameraFit: React.FC = () => {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.z = aspect < 0.7 ? 12.5 : aspect < 1.1 ? 9.6 : 6.6;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
};

// Планета наклоняется за курсором и отъезжает при прокрутке
const Rig: React.FC<{ children: React.ReactNode; scroll: React.MutableRefObject<number>; offsetX: number; offsetY: number }> = ({ children, scroll, offsetX, offsetY }) => {
  const g = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    const el = g.current;
    if (!el) return;
    const k = Math.min(1, dt * 3);
    el.rotation.x += (pointer.y * 0.18 - el.rotation.x) * k;
    el.rotation.y += (pointer.x * 0.3 - el.rotation.y) * k;
    const s = scroll.current;
    el.position.y = offsetY + s * 1.6;
    el.position.x = offsetX;
    el.position.z = -s * 2.2;
  });
  return <group ref={g}>{children}</group>;
};

const PlanetScene: React.FC<{ onPick: (slug: string) => void; scroll: React.MutableRefObject<number>; active: boolean; compact: boolean }> = ({
  onPick,
  scroll,
  active,
  compact,
}) => {
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hovering ? 'pointer' : '';
    const host = document.querySelector<HTMLElement>('[data-planet]');
    if (host) host.dataset.cursor = hovering ? 'Открыть' : '';
    if (host && !hovering) delete host.dataset.cursor;
  }, [hovering]);
  const base = import.meta.env.BASE_URL;
  return (
    <Canvas
      camera={{ position: [0, 0, compact ? 8.4 : 6.6], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
    >
      <CameraFit />
      <Stars count={compact ? 600 : 1400} />
      <Rig scroll={scroll} offsetX={compact ? 0 : 1.75} offsetY={compact ? 1.25 : 0.3}>
        <Planet />
        <Ring count={compact ? 2500 : 5000} />
        {WORKS.map((w, i) => (
          <OrbitCard
            key={w.slug}
            index={i}
            total={WORKS.length}
            src={`${base}works/${w.slug}-thumb.webp`}
            radius={compact ? 2.5 : 3.05}
            onPick={() => onPick(w.slug)}
            onHover={setHovering}
          />
        ))}
      </Rig>
    </Canvas>
  );
};

export default PlanetScene;
