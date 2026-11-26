import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioMetrics, HandData, TreeMode } from '../../types';
import { TREE_HEIGHT, TREE_RADIUS } from './constants';

interface LightGarlandProps {
  mode: TreeMode;
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  bloomActiveRef: MutableRefObject<boolean>;
  colors: [string, string, string];
  count?: number;
}

export function LightGarland({
  mode,
  audioMetricsRef,
  handDataRef,
  bloomActiveRef,
  colors,
  count = 240,
}: LightGarlandProps) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const data = useMemo(() => {
    const treePos = new Float32Array(count * 3);
    const floatPos = new Float32Array(count * 3);
    const currentPos = new Float32Array(count * 3);
    const explosionDir = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const paletteIdx = new Uint8Array(count);

    const turns = 5.5;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = (t - 0.5) * (TREE_HEIGHT * 0.92);
      const r = (1 - (y + TREE_HEIGHT / 2) / TREE_HEIGHT) * TREE_RADIUS * 1.05 + 0.16;
      const angle = t * turns * Math.PI * 2;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      treePos[i * 3] = x;
      treePos[i * 3 + 1] = y;
      treePos[i * 3 + 2] = z;

      const fr = 8 + Math.random() * 10;
      const fa = Math.random() * Math.PI * 2;
      floatPos[i * 3] = Math.cos(fa) * fr;
      floatPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      floatPos[i * 3 + 2] = Math.sin(fa) * fr;

      currentPos[i * 3] = x;
      currentPos[i * 3 + 1] = y;
      currentPos[i * 3 + 2] = z;

      const dir = new THREE.Vector3(x, y * 0.25, z).normalize();
      explosionDir[i * 3] = dir.x;
      explosionDir[i * 3 + 1] = dir.y;
      explosionDir[i * 3 + 2] = dir.z;

      phases[i] = Math.random() * Math.PI * 2;
      const pick = Math.random();
      paletteIdx[i] = pick < 0.68 ? 0 : pick < 0.88 ? 1 : 2;
    }

    return { treePos, floatPos, currentPos, explosionDir, phases, paletteIdx };
  }, [count]);

  const palette = useMemo(
    () => [new THREE.Color(colors[0]), new THREE.Color(colors[1]), new THREE.Color(colors[2])],
    [colors]
  );

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const audioLevel = audioMetricsRef.current.level;
    const isBlooming =
      handDataRef.current.gesture === 'OPEN' || bloomActiveRef.current;
    const lerpRate = Math.min(1, (isBlooming ? 4.2 : 2.5) * delta);

    const { treePos, floatPos, currentPos, explosionDir, phases, paletteIdx } = data;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let tx = mode === 'TREE' ? treePos[idx] : floatPos[idx];
      let ty = mode === 'TREE' ? treePos[idx + 1] : floatPos[idx + 1];
      let tz = mode === 'TREE' ? treePos[idx + 2] : floatPos[idx + 2];

      if (isBlooming) {
        const dist = 7.2 * (1 + audioLevel * 0.45);
        tx += explosionDir[idx] * dist;
        ty += explosionDir[idx + 1] * dist;
        tz += explosionDir[idx + 2] * dist;
      }

      currentPos[idx] += (tx - currentPos[idx]) * lerpRate;
      currentPos[idx + 1] += (ty - currentPos[idx + 1]) * lerpRate;
      currentPos[idx + 2] += (tz - currentPos[idx + 2]) * lerpRate;

      const phase = phases[i];
      const wave = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2.3 + phase));
      const beat = 1 + audioLevel * 1.45 * (0.5 + 0.5 * Math.sin(time * 6 + phase * 3));
      const intensity = wave * beat * 1.25;

      const base = palette[paletteIdx[i]];
      tempColor.setRGB(base.r * intensity, base.g * intensity, base.b * intensity);
      mesh.setColorAt(i, tempColor);

      const scale = 0.105 * (1 + audioLevel * 0.55 * (0.5 + 0.5 * Math.sin(time * 6 + phase)));
      dummy.position.set(currentPos[idx], currentPos[idx + 1], currentPos[idx + 2]);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      key={`garland-${count}`}
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
