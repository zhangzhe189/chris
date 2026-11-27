import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AppearanceSpaceConfig } from '../../types';
import { TREE_BOTTOM_Y } from './constants';

interface SnowAndGroundProps {
  space: AppearanceSpaceConfig;
  groundCoreColor: string;
  isLite: boolean;
}

function createSoftBokehTexture(softness: 'crisp' | 'bokeh'): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    if (softness === 'crisp') {
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.32, 'rgba(242, 246, 255, 0.82)');
      grad.addColorStop(0.68, 'rgba(210, 224, 245, 0.18)');
      grad.addColorStop(1, 'rgba(210, 224, 245, 0)');
    } else {
      // Soft out-of-focus cinematic bokeh disc
      grad.addColorStop(0, 'rgba(255, 252, 244, 0.72)');
      grad.addColorStop(0.55, 'rgba(245, 236, 218, 0.34)');
      grad.addColorStop(0.84, 'rgba(235, 224, 200, 0.1)');
      grad.addColorStop(1, 'rgba(235, 224, 200, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createEllipticalHaloTexture(coreHex: string, midHex: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const core = new THREE.Color(coreHex);
    const mid = new THREE.Color(midHex);
    const r1 = Math.round(core.r * 255);
    const g1 = Math.round(core.g * 255);
    const b1 = Math.round(core.b * 255);
    const r2 = Math.round(mid.r * 255);
    const g2 = Math.round(mid.g * 255);
    const b2 = Math.round(mid.b * 255);

    const grad = ctx.createRadialGradient(256, 256, 6, 256, 256, 252);
    grad.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, 0.78)`);
    grad.addColorStop(0.24, `rgba(${r1}, ${g1}, ${b1}, 0.34)`);
    grad.addColorStop(0.52, `rgba(${r2}, ${g2}, ${b2}, 0.22)`);
    grad.addColorStop(0.8, `rgba(${r2}, ${g2}, ${b2}, 0.06)`);
    grad.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface FlakeMeta {
  speed: number;
  phase: number;
  drift: number;
}

/**
 * Layers 3 & 4 of the 4-layer depth space system:
 * - Foreground Layer: Dual-depth snowflakes (fine mid snow + larger blurred foreground bokeh motes).
 * - Ground Layer: Soft feathered elliptical aura under the tree + scattered twinkling ground embers.
 */
export function SnowAndGround({ space, groundCoreColor, isLite }: SnowAndGroundProps) {
  const fineSnowRef = useRef<THREE.Points | null>(null);
  const bokehSnowRef = useRef<THREE.Points | null>(null);
  const groundEmbersRef = useRef<THREE.Points | null>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const crispTex = useMemo(() => createSoftBokehTexture('crisp'), []);
  const bokehTex = useMemo(() => createSoftBokehTexture('bokeh'), []);
  const haloTex = useMemo(
    () => createEllipticalHaloTexture(groundCoreColor, space.groundMidColor),
    [groundCoreColor, space.groundMidColor]
  );

  useEffect(() => {
    return () => {
      crispTex.dispose();
      bokehTex.dispose();
    };
  }, [crispTex, bokehTex]);

  useEffect(() => {
    return () => {
      haloTex.dispose();
    };
  }, [haloTex]);

  const fineCount = isLite ? 280 : 820;
  const bokehCount = isLite ? 64 : 180;
  const emberCount = isLite ? 55 : 150;

  const maxY = 17;
  const minY = TREE_BOTTOM_Y - 0.8;
  const fineRadius = 26;
  const bokehRadius = 22;

  const fineSnow = useMemo(() => {
    const positions = new Float32Array(fineCount * 3);
    const meta: FlakeMeta[] = [];
    for (let i = 0; i < fineCount; i++) {
      const r = Math.sqrt(Math.random()) * fineRadius;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = minY + Math.random() * (maxY - minY);
      positions[i * 3 + 2] = Math.sin(theta) * r;
      meta.push({
        speed: 0.48 + Math.random() * 0.85,
        phase: Math.random() * Math.PI * 2,
        drift: 0.14 + Math.random() * 0.38,
      });
    }
    return { positions, meta };
  }, [fineCount, minY]);

  const bokehSnow = useMemo(() => {
    const positions = new Float32Array(bokehCount * 3);
    const colors = new Float32Array(bokehCount * 3);
    const meta: FlakeMeta[] = [];
    const cCool = new THREE.Color(space.snowColor);
    const cWarm = new THREE.Color(space.bokehWarmColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < bokehCount; i++) {
      // Positioned slightly farther out / closer to camera orbit for stronger parallax
      const r = 7 + Math.sqrt(Math.random()) * (bokehRadius - 7);
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = minY + Math.random() * (maxY - minY);
      positions[i * 3 + 2] = Math.sin(theta) * r;

      tmp.copy(Math.random() < 0.42 ? cWarm : cCool);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;

      meta.push({
        speed: 0.72 + Math.random() * 1.15,
        phase: Math.random() * Math.PI * 2,
        drift: 0.24 + Math.random() * 0.52,
      });
    }
    return { positions, colors, meta };
  }, [bokehCount, minY, space.snowColor, space.bokehWarmColor]);

  // Layer 4: Scattered subtle floor shimmer motes around tree base
  const groundEmbers = useMemo(() => {
    const positions = new Float32Array(emberCount * 3);
    const baseColors = new Float32Array(emberCount * 3);
    const phases = new Float32Array(emberCount);
    const c1 = new THREE.Color(groundCoreColor);
    const c2 = new THREE.Color(space.groundEmberColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < emberCount; i++) {
      const r = 1.4 + Math.pow(Math.random(), 0.72) * 11.2;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r * 1.12;
      positions[i * 3 + 1] = TREE_BOTTOM_Y - 0.22 + Math.random() * 0.18;
      positions[i * 3 + 2] = Math.sin(theta) * r * 0.94;

      const falloff = Math.max(0.25, 1 - r / 13.5);
      tmp.copy(c1).lerp(c2, Math.random() * 0.65).multiplyScalar(falloff);
      baseColors[i * 3] = tmp.r;
      baseColors[i * 3 + 1] = tmp.g;
      baseColors[i * 3 + 2] = tmp.b;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return {
      positions,
      colors: new Float32Array(baseColors),
      baseColors,
      phases,
    };
  }, [emberCount, groundCoreColor, space.groundEmberColor]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const fallMul = space.snowFallMultiplier;

    if (haloMatRef.current) {
      haloMatRef.current.opacity =
        space.groundGlowOpacity * (0.88 + 0.12 * Math.sin(time * 0.95));
    }

    if (fineSnowRef.current) {
      const attr = fineSnowRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < fineCount; i++) {
        const idx = i * 3;
        const flake = fineSnow.meta[i];
        arr[idx + 1] -= flake.speed * fallMul * delta;
        arr[idx] += Math.sin(time * 0.65 + flake.phase) * flake.drift * delta;
        arr[idx + 2] += Math.cos(time * 0.52 + flake.phase) * flake.drift * delta;
        if (arr[idx + 1] < minY) {
          const r = Math.sqrt(Math.random()) * fineRadius;
          const theta = Math.random() * Math.PI * 2;
          arr[idx] = Math.cos(theta) * r;
          arr[idx + 1] = maxY;
          arr[idx + 2] = Math.sin(theta) * r;
        }
      }
      attr.needsUpdate = true;
    }

    if (bokehSnowRef.current) {
      const attr = bokehSnowRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < bokehCount; i++) {
        const idx = i * 3;
        const flake = bokehSnow.meta[i];
        arr[idx + 1] -= flake.speed * fallMul * delta;
        arr[idx] += Math.sin(time * 0.8 + flake.phase) * flake.drift * delta;
        arr[idx + 2] += Math.cos(time * 0.6 + flake.phase) * flake.drift * delta;
        if (arr[idx + 1] < minY) {
          const r = 7 + Math.sqrt(Math.random()) * (bokehRadius - 7);
          const theta = Math.random() * Math.PI * 2;
          arr[idx] = Math.cos(theta) * r;
          arr[idx + 1] = maxY;
          arr[idx + 2] = Math.sin(theta) * r;
        }
      }
      attr.needsUpdate = true;
    }

    if (groundEmbersRef.current) {
      const attr = groundEmbersRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const { baseColors, phases } = groundEmbers;
      for (let i = 0; i < emberCount; i++) {
        const idx = i * 3;
        const shimmer = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.6 + phases[i]));
        arr[idx] = baseColors[idx] * shimmer;
        arr[idx + 1] = baseColors[idx + 1] * shimmer;
        arr[idx + 2] = baseColors[idx + 2] * shimmer;
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Layer 3A: Mid-distance Crisp Snowflakes */}
      <points key={`fine-snow-${fineCount}`} ref={fineSnowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[fineSnow.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={crispTex}
          size={0.18}
          color={space.snowColor}
          transparent
          opacity={0.62}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Layer 3B: Near-camera Soft Blurred Bokeh Snow & Champagne Motes */}
      <points key={`bokeh-snow-${bokehCount}`} ref={bokehSnowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[bokehSnow.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[bokehSnow.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={bokehTex}
          size={0.54}
          vertexColors
          transparent
          opacity={0.32}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Layer 4A: Feathered Elliptical Ground Halo (blends organically into night void) */}
      <group position={[0, TREE_BOTTOM_Y - 0.34, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.18, 0.94, 1]}>
          <planeGeometry args={[26, 26]} />
          <meshBasicMaterial
            ref={haloMatRef}
            map={haloTex}
            transparent
            opacity={space.groundGlowOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Subtle dark wood tree trunk grounded softly in the halo */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.42, 0.72, 2.3, 14]} />
          <meshStandardMaterial color="#362418" roughness={0.9} metalness={0.05} />
        </mesh>
      </group>

      {/* Layer 4B: Scattered Ground Micro-Light Particles */}
      <points key={`ground-embers-${emberCount}`} ref={groundEmbersRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[groundEmbers.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[groundEmbers.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={crispTex}
          size={0.16}
          vertexColors
          transparent
          opacity={0.78}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
