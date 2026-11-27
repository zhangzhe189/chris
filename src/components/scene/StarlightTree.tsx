import { useLayoutEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioMetrics, HandData, TreeMode } from '../../types';
import { TREE_HEIGHT, TREE_RADIUS, TREE_TOP_Y } from './constants';

interface StarlightTreeProps {
  mode: TreeMode;
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  count: number;
  color1: string;
  color2: string;
  starColor: string;
  bloomActiveRef: MutableRefObject<boolean>;
}

function createStarGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = 5;
  const outerRadius = 0.72;
  const innerRadius = 0.31;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points + Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function StarlightTree({
  mode,
  audioMetricsRef,
  handDataRef,
  count,
  color1,
  color2,
  starColor,
  bloomActiveRef,
}: StarlightTreeProps) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const starRef = useRef<THREE.Mesh | null>(null);
  const starLightRef = useRef<THREE.PointLight | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const starGeo = useMemo(() => createStarGeometry(), []);

  const data = useMemo(() => {
    const tree = new Float32Array(count * 3);
    const random = new Float32Array(count * 3);
    const current = new Float32Array(count * 3);
    const explosion = new Float32Array(count * 3);
    const twinkleSpeed = new Float32Array(count);
    const twinklePhase = new Float32Array(count);
    const baseSizes = new Float32Array(count);
    const colorMix = new Float32Array(count);

    const tiers = 9;
    for (let i = 0; i < count; i++) {
      // Skew slightly denser toward lower/mid canopy for full evergreen silhouette
      const hNorm = Math.pow(Math.random(), 1.18);
      const y = hNorm * TREE_HEIGHT - TREE_HEIGHT / 2;
      const tierWave = 0.88 + 0.16 * (1 - ((hNorm * tiers) % 1));
      const maxR = Math.pow(1 - hNorm, 1.05) * TREE_RADIUS * tierWave;
      // Bias points toward outer shell while retaining lush interior glow
      const shellFactor = 0.35 + 0.65 * Math.sqrt(Math.random());
      const r = maxR * shellFactor;
      const angle = Math.random() * Math.PI * 2;

      const tx = Math.cos(angle) * r;
      const ty = y + (Math.random() - 0.5) * 0.28;
      const tz = Math.sin(angle) * r;

      tree[i * 3] = tx;
      tree[i * 3 + 1] = ty;
      tree[i * 3 + 2] = tz;

      // Floating galaxy nebula position
      const fRadius = 6 + Math.random() * 14;
      const fTheta = Math.random() * Math.PI * 2;
      const fPhi = Math.acos(2 * Math.random() - 1);
      random[i * 3] = fRadius * Math.sin(fPhi) * Math.cos(fTheta);
      random[i * 3 + 1] = (Math.random() - 0.5) * 16;
      random[i * 3 + 2] = fRadius * Math.sin(fPhi) * Math.sin(fTheta);

      // Start slightly dispersed so initial mount smoothly gathers into the tree
      const initR = r + 5.5 + Math.random() * 7;
      const initAngle = angle + 1.4;
      current[i * 3] = Math.cos(initAngle) * initR;
      current[i * 3 + 1] = ty + (Math.random() - 0.5) * 6;
      current[i * 3 + 2] = Math.sin(initAngle) * initR;

      const dir = new THREE.Vector3(
        tx + (Math.random() - 0.5) * 1.5,
        ty * 0.35 + (Math.random() - 0.5) * 2.5,
        tz + (Math.random() - 0.5) * 1.5
      ).normalize();
      explosion[i * 3] = dir.x;
      explosion[i * 3 + 1] = dir.y;
      explosion[i * 3 + 2] = dir.z;

      twinkleSpeed[i] = 1.2 + Math.random() * 2.8;
      twinklePhase[i] = Math.random() * Math.PI * 2;
      baseSizes[i] = 0.032 + Math.pow(Math.random(), 2.4) * 0.052;
      colorMix[i] = Math.random();
    }

    return {
      tree,
      random,
      current,
      explosion,
      twinkleSpeed,
      twinklePhase,
      baseSizes,
      colorMix,
    };
  }, [count]);

  // Apply two-tone HDR instance colors whenever theme/colors or count change
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const temp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const m = data.colorMix[i];
      if (m < 0.72) {
        temp.copy(c1).lerp(c2, m * 0.35);
      } else {
        temp.copy(c2).lerp(c1, (1 - m) * 0.4);
      }
      // Restrained HDR lift for fine cinema-grade sparkle without harsh blowout
      const lift = 0.94 + (i % 8 === 0 ? 0.38 : 0.1);
      temp.multiplyScalar(lift);
      mesh.setColorAt(i, temp);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, color1, color2, data.colorMix]);

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const audioLevel = audioMetricsRef.current.level;
    const bass = audioMetricsRef.current.bassEnergy;
    const isBlooming =
      handDataRef.current.gesture === 'OPEN' || bloomActiveRef.current;

    if (starRef.current) {
      starRef.current.rotation.y += delta * 0.85;
      const starScale = 1 + Math.sin(time * 2.4) * 0.08 + bass * 0.28;
      starRef.current.scale.setScalar(starScale);
      // Slightly lift topper when blooming
      const targetStarY =
        mode === 'TREE' ? TREE_TOP_Y + 0.72 + (isBlooming ? 1.4 : 0) : TREE_TOP_Y + 2.2;
      starRef.current.position.y += (targetStarY - starRef.current.position.y) * delta * 3;
    }

    if (starLightRef.current) {
      starLightRef.current.intensity = 10 + Math.sin(time * 2.8) * 2.2 + bass * 10;
    }

    const explosionDist = 9.5;
    const lerpRate = Math.min(1, (isBlooming ? 4.2 : 2.3) * delta);
    const { tree, random, current, explosion, twinkleSpeed, twinklePhase, baseSizes } = data;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let tx = mode === 'TREE' ? tree[idx] : random[idx];
      let ty = mode === 'TREE' ? tree[idx + 1] : random[idx + 1];
      let tz = mode === 'TREE' ? tree[idx + 2] : random[idx + 2];

      if (isBlooming) {
        const amp = 1 + audioLevel * 0.55;
        tx += explosion[idx] * explosionDist * amp;
        ty += explosion[idx + 1] * explosionDist * amp;
        tz += explosion[idx + 2] * explosionDist * amp;
      }

      current[idx] += (tx - current[idx]) * lerpRate;
      current[idx + 1] += (ty - current[idx + 1]) * lerpRate;
      current[idx + 2] += (tz - current[idx + 2]) * lerpRate;

      let px = current[idx];
      let py = current[idx + 1];
      const pz = current[idx + 2];

      if (mode === 'FLOAT' && !isBlooming) {
        py += Math.sin(time * 0.9 + i) * 0.04;
        px += Math.cos(time * 0.5 + i) * 0.03;
      }

      const twinkle = 0.72 + 0.28 * Math.sin(time * twinkleSpeed[i] + twinklePhase[i]);
      const beatScale =
        mode === 'TREE' && i % 9 === 0 ? 1 + bass * 1.4 : 1 + audioLevel * 0.45;
      const scale = baseSizes[i] * twinkle * beatScale;

      dummy.position.set(px, py, pz);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <pointLight
        ref={starLightRef}
        position={[0, TREE_TOP_Y + 1.1, 0]}
        distance={26}
        decay={2}
        color={starColor}
        intensity={10}
      />
      <mesh ref={starRef} position={[0, TREE_TOP_Y + 0.72, 0]} geometry={starGeo}>
        <meshStandardMaterial
          color={starColor}
          emissive={starColor}
          emissiveIntensity={1.25}
          metalness={0.85}
          roughness={0.18}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh
        key={`starlight-${count}`}
        ref={meshRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 7, 7]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.92} />
      </instancedMesh>
    </group>
  );
}
