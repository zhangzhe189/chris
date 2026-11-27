import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioMetrics } from '../../types';
import { TREE_HEIGHT, TREE_RADIUS } from './constants';

interface LightGarlandProps {
  bloomProgressRef: MutableRefObject<number>;
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  colors: [string, string, string];
  flowSpeed?: number;
  count?: number;
}

/**
 * Slender spiral Christmas garland that unfurls smoothly into an expanded luminous
 * equatorial galaxy ribbon in Bloom mode and winds cleanly back onto the tree in Quiet mode.
 */
export function LightGarland({
  bloomProgressRef,
  audioMetricsRef,
  colors,
  flowSpeed = 1.45,
  count = 240,
}: LightGarlandProps) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const data = useMemo(() => {
    const treePos = new Float32Array(count * 3);
    const orbitRadius = new Float32Array(count);
    const orbitAngle0 = new Float32Array(count);
    const orbitY = new Float32Array(count);
    const phases = new Float32Array(count);
    const paletteIdx = new Uint8Array(count);

    const turns = 5.5;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = (t - 0.5) * (TREE_HEIGHT * 0.92);
      const r = (1 - (y + TREE_HEIGHT / 2) / TREE_HEIGHT) * TREE_RADIUS * 1.05 + 0.16;
      const angle = t * turns * Math.PI * 2;

      treePos[i * 3] = Math.cos(angle) * r;
      treePos[i * 3 + 1] = y;
      treePos[i * 3 + 2] = Math.sin(angle) * r;

      // In Bloom mode, garland unwinds into a flowing multi-turn luminous galaxy ring
      orbitRadius[i] = 6.2 + t * 7.2;
      orbitAngle0[i] = angle * 0.55;
      orbitY[i] = Math.sin(t * Math.PI * 3) * 1.85;

      phases[i] = Math.random() * Math.PI * 2;
      const pick = Math.random();
      paletteIdx[i] = pick < 0.68 ? 0 : pick < 0.88 ? 1 : 2;
    }

    return { treePos, orbitRadius, orbitAngle0, orbitY, phases, paletteIdx };
  }, [count]);

  const curPalette = useRef<[THREE.Color, THREE.Color, THREE.Color]>([
    new THREE.Color(colors[0]),
    new THREE.Color(colors[1]),
    new THREE.Color(colors[2]),
  ]);
  const tgtPalette = useMemo(
    () => [new THREE.Color(colors[0]), new THREE.Color(colors[1]), new THREE.Color(colors[2])],
    [colors]
  );

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const audioLevel = audioMetricsRef.current.level;

    const p = bloomProgressRef.current;
    const ease = p * p * (3 - 2 * p);
    const transitArc = Math.sin(ease * Math.PI);

    const colRate = Math.min(1, delta * 4.2);
    curPalette.current[0].lerp(tgtPalette[0], colRate);
    curPalette.current[1].lerp(tgtPalette[1], colRate);
    curPalette.current[2].lerp(tgtPalette[2], colRate);

    const { treePos, orbitRadius, orbitAngle0, orbitY, phases, paletteIdx } = data;
    const tiltSin = Math.sin(0.18);
    const tiltCos = Math.cos(0.18);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const tx = treePos[idx];
      const ty = treePos[idx + 1];
      const tz = treePos[idx + 2];

      let px = tx;
      let py = ty;
      let pz = tz;

      if (ease > 0.0005) {
        const ang = orbitAngle0[i] + time * 0.16;
        const r = orbitRadius[i];
        const rx = Math.cos(ang) * r;
        const rz = Math.sin(ang) * r;
        const ry = orbitY[i];

        const ox = rx;
        const oy = ry * tiltCos - rz * tiltSin;
        const oz = ry * tiltSin + rz * tiltCos;

        const bx = tx + (ox - tx) * ease;
        const by = ty + (oy - ty) * ease;
        const bz = tz + (oz - tz) * ease;

        const swirl = transitArc * 0.75;
        const cs = Math.cos(swirl);
        const sn = Math.sin(swirl);
        px = bx * cs - bz * sn;
        py = by;
        pz = bx * sn + bz * cs;
      }

      const phase = phases[i];
      const travelWave =
        0.55 +
        0.45 * (0.5 + 0.5 * Math.sin(time * flowSpeed - (i / count) * 14 + phase * 0.35));
      const beat = 1 + audioLevel * 1.05 * (0.5 + 0.5 * Math.sin(time * 5 + phase * 2));
      const intensity = travelWave * beat * 1.06;

      const base = curPalette.current[paletteIdx[i]];
      tempColor.setRGB(base.r * intensity, base.g * intensity, base.b * intensity);
      mesh.setColorAt(i, tempColor);

      const scale =
        0.068 *
        (1 + ease * 0.12) *
        (1 + audioLevel * 0.42 * (0.5 + 0.5 * Math.sin(time * 5 + phase)));
      dummy.position.set(px, py, pz);
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
