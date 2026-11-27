import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioMetrics } from '../../types';
import { TREE_HEIGHT, TREE_RADIUS, TREE_TOP_Y } from './constants';

interface StarlightTreeProps {
  bloomProgressRef: MutableRefObject<number>;
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  count: number;
  color1: string;
  color2: string;
  starColor: string;
  twinkleIntensity?: number;
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

/**
 * 3D Particle Christmas Tree with smooth continuous morph between:
 * - Quiet Mode (bloomProgress = 0): Complete layered evergreen silhouette.
 * - Bloom Mode (bloomProgress = 1): Ordered 3-tier tilted 3D celestial orbital galaxy
 *   with continuous spiral unwinding & rewinding trajectories and depth-scaled sparkle.
 */
export function StarlightTree({
  bloomProgressRef,
  audioMetricsRef,
  count,
  color1,
  color2,
  starColor,
  twinkleIntensity = 0.24,
}: StarlightTreeProps) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const starRef = useRef<THREE.Mesh | null>(null);
  const starMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const starLightRef = useRef<THREE.PointLight | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const starGeo = useMemo(() => createStarGeometry(), []);
  const introRef = useRef(0);

  // Smooth Appearance color crossfade refs
  const curC1 = useRef(new THREE.Color(color1));
  const curC2 = useRef(new THREE.Color(color2));
  const curStar = useRef(new THREE.Color(starColor));
  const tgtC1 = useRef(new THREE.Color(color1));
  const tgtC2 = useRef(new THREE.Color(color2));
  const tgtStar = useRef(new THREE.Color(starColor));
  const colorSettledRef = useRef(false);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const data = useMemo(() => {
    const tree = new Float32Array(count * 3);
    const introOffset = new Float32Array(count * 3);

    // Ordered 3-tier orbital parameters for Bloom mode
    const orbitRadius = new Float32Array(count);
    const orbitAngle0 = new Float32Array(count);
    const orbitSpeed = new Float32Array(count);
    const orbitBandY = new Float32Array(count);
    const orbitTiltSin = new Float32Array(count);
    const orbitTiltCos = new Float32Array(count);
    const swirlSign = new Float32Array(count);

    const twinkleSpeed = new Float32Array(count);
    const twinklePhase = new Float32Array(count);
    const baseSizes = new Float32Array(count);
    const colorMix = new Float32Array(count);

    const tiers = 9;
    const orbitTilts = [0.24, -0.19, 0.12]; // 3 distinct inclined orbital planes

    for (let i = 0; i < count; i++) {
      // Quiet mode: layered conifer silhouette
      const hNorm = Math.pow(Math.random(), 1.18);
      const y = hNorm * TREE_HEIGHT - TREE_HEIGHT / 2;
      const tierWave = 0.88 + 0.16 * (1 - ((hNorm * tiers) % 1));
      const maxR = Math.pow(1 - hNorm, 1.05) * TREE_RADIUS * tierWave;
      const shellFactor = 0.35 + 0.65 * Math.sqrt(Math.random());
      const r = maxR * shellFactor;
      const angle = Math.random() * Math.PI * 2;

      const tx = Math.cos(angle) * r;
      const ty = y + (Math.random() - 0.5) * 0.28;
      const tz = Math.sin(angle) * r;

      tree[i * 3] = tx;
      tree[i * 3 + 1] = ty;
      tree[i * 3 + 2] = tz;

      // Gentle mount-gather starting offset
      const initR = r + 4.8 + Math.random() * 5.2;
      const initAngle = angle + 1.1;
      introOffset[i * 3] = Math.cos(initAngle) * initR - tx;
      introOffset[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      introOffset[i * 3 + 2] = Math.sin(initAngle) * initR - tz;

      // Bloom mode: structured 3-layer spiral galaxy orbits
      const layer = i % 10 < 3 ? 0 : i % 10 < 7 ? 1 : 2;
      const armIndex = i % 3;
      const armOffset = (armIndex / 3) * Math.PI * 2;

      const layerMinR = layer === 0 ? 5.2 : layer === 1 ? 8.2 : 11.8;
      const layerSpan = layer === 0 ? 2.8 : layer === 1 ? 3.8 : 4.6;
      const oR = layerMinR + Math.random() * layerSpan;
      // Spiral arm twist proportional to orbital radius
      const spiralTwist = oR * 0.34 + (Math.random() - 0.5) * 0.65;

      orbitRadius[i] = oR;
      orbitAngle0[i] = armOffset + spiralTwist;
      orbitSpeed[i] = layer === 0 ? 0.22 : layer === 1 ? 0.14 : 0.085;
      orbitBandY[i] = (hNorm - 0.5) * (layer === 0 ? 4.4 : layer === 1 ? 3.2 : 5.4) + (Math.random() - 0.5) * 0.85;

      const tilt = orbitTilts[layer];
      orbitTiltSin[i] = Math.sin(tilt);
      orbitTiltCos[i] = Math.cos(tilt);
      swirlSign[i] = layer === 1 ? -1 : 1;

      twinkleSpeed[i] = 1.2 + Math.random() * 2.8;
      twinklePhase[i] = Math.random() * Math.PI * 2;
      baseSizes[i] = 0.032 + Math.pow(Math.random(), 2.4) * 0.052;
      colorMix[i] = Math.random();
    }

    return {
      tree,
      introOffset,
      orbitRadius,
      orbitAngle0,
      orbitSpeed,
      orbitBandY,
      orbitTiltSin,
      orbitTiltCos,
      swirlSign,
      twinkleSpeed,
      twinklePhase,
      baseSizes,
      colorMix,
    };
  }, [count]);

  useEffect(() => {
    tgtC1.current.set(color1);
    tgtC2.current.set(color2);
    tgtStar.current.set(starColor);
    colorSettledRef.current = false;
  }, [count, color1, color2, starColor]);

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const audioLevel = audioMetricsRef.current.level;
    const bass = audioMetricsRef.current.bassEnergy;

    // Initial gentle mount convergence (1 -> 0 over ~1.4s)
    if (introRef.current < 1) {
      introRef.current = Math.min(1, introRef.current + delta * 0.72);
    }
    const introRemain = Math.pow(1 - introRef.current, 3);

    // Smoothly eased Quiet <-> Bloom orbital morph progress (0..1)
    const p = bloomProgressRef.current;
    const ease = p * p * (3 - 2 * p);
    const transitArc = Math.sin(ease * Math.PI); // peaks at mid-transition for graceful spiral swirl

    // Smoothly crossfade particle & star colors during Appearance transitions
    if (!colorSettledRef.current) {
      const step = Math.min(1, delta * 4.2);
      curC1.current.lerp(tgtC1.current, step);
      curC2.current.lerp(tgtC2.current, step);
      curStar.current.lerp(tgtStar.current, step);

      for (let i = 0; i < count; i++) {
        const m = data.colorMix[i];
        if (m < 0.72) {
          tempColor.copy(curC1.current).lerp(curC2.current, m * 0.35);
        } else {
          tempColor.copy(curC2.current).lerp(curC1.current, (1 - m) * 0.4);
        }
        const lift = 0.94 + (i % 8 === 0 ? 0.38 : 0.1);
        tempColor.multiplyScalar(lift);
        mesh.setColorAt(i, tempColor);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      if (starMatRef.current) {
        starMatRef.current.color.copy(curStar.current);
        starMatRef.current.emissive.copy(curStar.current);
      }
      if (starLightRef.current) {
        starLightRef.current.color.copy(curStar.current);
      }

      const diff =
        Math.abs(curC1.current.r - tgtC1.current.r) +
        Math.abs(curC1.current.g - tgtC1.current.g) +
        Math.abs(curC1.current.b - tgtC1.current.b) +
        Math.abs(curC2.current.r - tgtC2.current.r) +
        Math.abs(curC2.current.b - tgtC2.current.b);
      if (diff < 0.004) {
        colorSettledRef.current = true;
      }
    }

    if (starRef.current) {
      starRef.current.rotation.y += delta * (0.75 + ease * 0.45);
      const starScale = (1 + Math.sin(time * 2.4) * 0.08 + bass * 0.25) * (1 - ease * 0.12);
      starRef.current.scale.setScalar(starScale);
      // In Bloom mode, star gracefully descends toward the luminous galaxy core
      const targetStarY = THREE.MathUtils.lerp(TREE_TOP_Y + 0.72, 0.35, ease);
      starRef.current.position.y += (targetStarY - starRef.current.position.y) * Math.min(1, delta * 4);
    }

    if (starLightRef.current) {
      starLightRef.current.position.y = starRef.current ? starRef.current.position.y + 0.35 : TREE_TOP_Y + 1;
      starLightRef.current.intensity = 9.5 + Math.sin(time * 2.6) * 2.0 + bass * 9;
    }

    const camX = camera.position.x;
    const camZ = camera.position.z;
    const {
      tree,
      introOffset,
      orbitRadius,
      orbitAngle0,
      orbitSpeed,
      orbitBandY,
      orbitTiltSin,
      orbitTiltCos,
      swirlSign,
      twinkleSpeed,
      twinklePhase,
      baseSizes,
    } = data;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const tx = tree[idx] + introOffset[idx] * introRemain;
      const ty = tree[idx + 1] + introOffset[idx + 1] * introRemain;
      const tz = tree[idx + 2] + introOffset[idx + 2] * introRemain;

      let px = tx;
      let py = ty;
      let pz = tz;
      let depthScale = 1;

      if (ease > 0.0005) {
        // Compute ordered 3D tilted orbital position
        const ang = orbitAngle0[i] + time * orbitSpeed[i] * swirlSign[i];
        const r = orbitRadius[i];
        const rawX = Math.cos(ang) * r;
        const rawZ = Math.sin(ang) * r;
        const rawY = orbitBandY[i] + Math.sin(time * 0.65 + twinklePhase[i]) * 0.28;

        // Apply orbital plane inclination around X axis
        const ox = rawX;
        const oy = rawY * orbitTiltCos[i] - rawZ * orbitTiltSin[i];
        const oz = rawY * orbitTiltSin[i] + rawZ * orbitTiltCos[i];

        // Blend along a continuous swirling spiral trajectory (no jagged linear snap)
        const bx = tx + (ox - tx) * ease;
        const by = ty + (oy - ty) * ease;
        const bz = tz + (oz - tz) * ease;

        const swirlAngle = transitArc * 0.95 * swirlSign[i];
        const cs = Math.cos(swirlAngle);
        const sn = Math.sin(swirlAngle);
        px = bx * cs - bz * sn;
        py = by;
        pz = bx * sn + bz * cs;

        // Subtle perspective depth-scaling so foreground orbital stars feel closer & richer
        const distToCam = Math.hypot(px - camX, pz - camZ);
        const depthNorm = THREE.MathUtils.clamp(1.22 - distToCam / 46, 0.58, 1.24);
        depthScale = THREE.MathUtils.lerp(1, depthNorm, ease);
      }

      const twinkle =
        1 - twinkleIntensity + twinkleIntensity * Math.sin(time * twinkleSpeed[i] + twinklePhase[i]);
      const beatScale = i % 9 === 0 ? 1 + bass * 1.2 : 1 + audioLevel * 0.4;
      const scale = baseSizes[i] * twinkle * beatScale * depthScale;

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
          ref={starMatRef}
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
