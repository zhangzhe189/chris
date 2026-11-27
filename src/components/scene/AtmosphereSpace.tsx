import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AppearanceSpaceConfig } from '../../types';

interface AtmosphereSpaceProps {
  space: AppearanceSpaceConfig;
  isLite: boolean;
}

function createSoftNebulaTexture(innerHex: string, midHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const inner = new THREE.Color(innerHex);
    const mid = new THREE.Color(midHex);
    const r1 = Math.round(inner.r * 255);
    const g1 = Math.round(inner.g * 255);
    const b1 = Math.round(inner.b * 255);
    const r2 = Math.round(mid.r * 255);
    const g2 = Math.round(mid.g * 255);
    const b2 = Math.round(mid.b * 255);

    const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    grad.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, 0.92)`);
    grad.addColorStop(0.38, `rgba(${r2}, ${g2}, ${b2}, 0.42)`);
    grad.addColorStop(0.72, `rgba(${r2}, ${g2}, ${b2}, 0.1)`);
    grad.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStarDotTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.28, 'rgba(245, 238, 224, 0.72)');
    grad.addColorStop(0.65, 'rgba(180, 200, 235, 0.14)');
    grad.addColorStop(1, 'rgba(180, 200, 235, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Layers 1 & 2 of the 4-layer depth space system:
 * - Far Layer: Atmospheric midnight sky dome gradient + ultra-slow distant stardust.
 * - Midground Layer: Soft breathing mist / nebula clouds drifting at an intermediate parallax speed.
 */
export function AtmosphereSpace({ space, isLite }: AtmosphereSpaceProps) {
  const farDustRef = useRef<THREE.Points | null>(null);
  const nebulaGroupRef = useRef<THREE.Group | null>(null);
  const nebulaMatsRef = useRef<Array<THREE.SpriteMaterial | null>>([]);

  const starDotTex = useMemo(() => createStarDotTexture(), []);
  const coolMistTex = useMemo(
    () => createSoftNebulaTexture(space.nebulaSecondary, space.nebulaPrimary),
    [space.nebulaPrimary, space.nebulaSecondary]
  );
  const warmAuraTex = useMemo(
    () => createSoftNebulaTexture(space.nebulaWarmCore, space.nebulaPrimary),
    [space.nebulaWarmCore, space.nebulaPrimary]
  );

  // Smooth color targets for theatrical sky-dome crossfade on Appearance switch
  const skyUniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(space.skyZenith) },
      uHorizon: { value: new THREE.Color(space.skyHorizon) },
    }),
    []
  );
  const targetZenithRef = useRef(new THREE.Color(space.skyZenith));
  const targetHorizonRef = useRef(new THREE.Color(space.skyHorizon));

  useEffect(() => {
    targetZenithRef.current.set(space.skyZenith);
    targetHorizonRef.current.set(space.skyHorizon);
  }, [space.skyZenith, space.skyHorizon]);

  useEffect(() => {
    return () => {
      starDotTex.dispose();
    };
  }, [starDotTex]);

  useEffect(() => {
    return () => {
      coolMistTex.dispose();
    };
  }, [coolMistTex]);

  useEffect(() => {
    return () => {
      warmAuraTex.dispose();
    };
  }, [warmAuraTex]);

  // Layer 1: Low-luminance far stardust shell
  const dustCount = isLite ? 900 : 2400;
  const farDust = useMemo(() => {
    const positions = new Float32Array(dustCount * 3);
    const colors = new Float32Array(dustCount * 3);
    const c1 = new THREE.Color(space.farDustColor1);
    const c2 = new THREE.Color(space.farDustColor2);
    const tmp = new THREE.Color();

    for (let i = 0; i < dustCount; i++) {
      const r = 42 + Math.random() * 24;
      const theta = Math.random() * Math.PI * 2;
      // Slightly denser along a gentle tilted celestial band
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.72 + 4;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const mix = Math.random();
      const dim = 0.42 + Math.random() * 0.58;
      tmp.copy(c1).lerp(c2, mix > 0.78 ? 0.85 : mix * 0.35).multiplyScalar(dim);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    return { positions, colors };
  }, [dustCount, space.farDustColor1, space.farDustColor2]);

  // Layer 2: Midground breathing mist/nebula clouds around the backdrop
  const nebulaClouds = useMemo(() => {
    const all = [
      { pos: [0, 0.6, -20] as [number, number, number], scale: [30, 26, 1] as [number, number, number], warm: true, baseOpacity: 0.14, phase: 0 },
      { pos: [-16, 4.5, -24] as [number, number, number], scale: [32, 22, 1] as [number, number, number], warm: false, baseOpacity: 0.22, phase: 1.4 },
      { pos: [17, 2.2, -23] as [number, number, number], scale: [30, 22, 1] as [number, number, number], warm: false, baseOpacity: 0.2, phase: 2.7 },
      { pos: [0, 9.5, -26] as [number, number, number], scale: [38, 18, 1] as [number, number, number], warm: false, baseOpacity: 0.18, phase: 3.9 },
      { pos: [-13, -3.2, -19] as [number, number, number], scale: [22, 16, 1] as [number, number, number], warm: true, baseOpacity: 0.08, phase: 5.1 },
      { pos: [14, -2.5, -21] as [number, number, number], scale: [24, 16, 1] as [number, number, number], warm: false, baseOpacity: 0.15, phase: 0.8 },
    ];
    return isLite ? all.slice(0, 3) : all;
  }, [isLite]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.getElapsedTime();
    const colorLerp = Math.min(1, delta * 3.4);

    skyUniforms.uZenith.value.lerp(targetZenithRef.current, colorLerp);
    skyUniforms.uHorizon.value.lerp(targetHorizonRef.current, colorLerp);

    if (farDustRef.current) {
      farDustRef.current.rotation.y += delta * space.farDustSpeed;
    }

    if (nebulaGroupRef.current) {
      nebulaGroupRef.current.rotation.y += delta * space.nebulaDriftSpeed;
    }

    for (let i = 0; i < nebulaClouds.length; i++) {
      const mat = nebulaMatsRef.current[i];
      if (!mat) continue;
      const cloud = nebulaClouds[i];
      const breath = 0.82 + 0.18 * Math.sin(t * space.nebulaBreathSpeed + cloud.phase);
      mat.opacity = cloud.baseOpacity * (space.nebulaOpacity / 0.14) * breath;
    }
  });

  return (
    <group>
      {/* Layer 1A: Atmospheric Midnight Sky Dome */}
      <mesh renderOrder={-10}>
        <sphereGeometry args={[72, 32, 24]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={skyUniforms}
          vertexShader={`
            varying vec3 vWorldPos;
            void main() {
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorldPos = normalize(wp.xyz);
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `}
          fragmentShader={`
            uniform vec3 uZenith;
            uniform vec3 uHorizon;
            varying vec3 vWorldPos;
            void main() {
              // Subtle starry-blue lift around the mid-lower horizon, deep polar night overhead & below
              float band = exp(-pow((vWorldPos.y + 0.06) * 2.35, 2.0));
              vec3 col = mix(uZenith, uHorizon, band * 0.72);
              gl_FragColor = vec4(col, 1.0);
            }
          `}
        />
      </mesh>

      {/* Layer 1B: Ultra-slow Distant Low-Luminance Stardust */}
      <points key={`far-dust-${dustCount}`} ref={farDustRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[farDust.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[farDust.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starDotTex}
          size={0.34}
          vertexColors
          transparent
          opacity={space.farDustOpacity}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Layer 2: Midground Soft Breathing Nebula / Atmospheric Mist */}
      <group ref={nebulaGroupRef}>
        {nebulaClouds.map((cloud, idx) => (
          <sprite key={idx} position={cloud.pos} scale={cloud.scale}>
            <spriteMaterial
              ref={(el) => {
                nebulaMatsRef.current[idx] = el;
              }}
              map={cloud.warm ? warmAuraTex : coolMistTex}
              transparent
              opacity={cloud.baseOpacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}
