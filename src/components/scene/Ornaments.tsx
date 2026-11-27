import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioMetrics, OrnamentStyle } from '../../types';
import { TREE_HEIGHT, TREE_RADIUS } from './constants';

interface OrnamentsProps {
  bloomProgressRef: MutableRefObject<number>;
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  boxCount: number;
  bellCount: number;
  boxColor1: string;
  boxColor2: string;
  ribbonColor: string;
  bellColor: string;
  ornamentStyle?: OrnamentStyle;
  boxMetalness?: number;
  boxRoughness?: number;
  bellMetalness?: number;
  bellRoughness?: number;
}

interface OrnamentItem {
  treePos: THREE.Vector3;
  orbitRadius: number;
  orbitAngle0: number;
  orbitSpeed: number;
  orbitY: number;
  orbitTilt: number;
  swirlSign: number;
  baseScale: number;
  rotation: THREE.Euler;
  variant: 1 | 2;
}

function generateItems(
  count: number,
  minScale: number,
  scaleRange: number,
  orbitMinR: number,
  orbitSpanR: number
): OrnamentItem[] {
  return Array.from({ length: count }, (_, idx) => {
    const hNorm = Math.pow(Math.random(), 1.25);
    const y = hNorm * (TREE_HEIGHT * 0.92) - TREE_HEIGHT / 2 + 0.35;
    const radius = (1 - hNorm) * TREE_RADIUS * (0.62 + Math.random() * 0.45);
    const angle = Math.random() * Math.PI * 2;

    const treePos = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    const layer = idx % 2;

    return {
      treePos,
      orbitRadius: orbitMinR + Math.random() * orbitSpanR,
      orbitAngle0: angle + (Math.random() - 0.5) * 0.6,
      orbitSpeed: layer === 0 ? 0.16 : -0.11,
      orbitY: (hNorm - 0.5) * 5.2 + (Math.random() - 0.5) * 0.9,
      orbitTilt: layer === 0 ? 0.2 : -0.16,
      swirlSign: layer === 0 ? 1 : -1,
      baseScale: minScale + Math.random() * scaleRange,
      rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ),
      variant: Math.random() > 0.5 ? 1 : 2,
    };
  });
}

export function Ornaments({
  bloomProgressRef,
  audioMetricsRef,
  boxCount,
  bellCount,
  boxColor1,
  boxColor2,
  ribbonColor,
  bellColor,
  ornamentStyle = 'velvet',
  boxMetalness = 0.36,
  boxRoughness = 0.42,
  bellMetalness = 0.9,
  bellRoughness = 0.16,
}: OrnamentsProps) {
  const boxMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const ribbonAMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const ribbonBMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const bellMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const ribbonMatARef = useRef<THREE.MeshStandardMaterial | null>(null);
  const ribbonMatBRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Smooth color interpolation refs for seamless Appearance switching
  const curBox1 = useRef(new THREE.Color(boxColor1));
  const curBox2 = useRef(new THREE.Color(boxColor2));
  const curRibbon = useRef(new THREE.Color(ribbonColor));
  const curBell = useRef(new THREE.Color(bellColor));
  const tgtBox1 = useRef(new THREE.Color(boxColor1));
  const tgtBox2 = useRef(new THREE.Color(boxColor2));
  const tgtRibbon = useRef(new THREE.Color(ribbonColor));
  const tgtBell = useRef(new THREE.Color(bellColor));
  const colorSettledRef = useRef(false);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const warmHighlight = useMemo(() => new THREE.Color('#f5ede0'), []);

  useEffect(() => {
    tgtBox1.current.set(boxColor1);
    tgtBox2.current.set(boxColor2);
    tgtRibbon.current.set(ribbonColor);
    tgtBell.current.set(bellColor);
    colorSettledRef.current = false;
  }, [boxColor1, boxColor2, ribbonColor, bellColor, ornamentStyle, boxCount, bellCount]);

  // Refined, jewel-sized gifts and baubles that preserve the tree silhouette
  const boxes = useMemo(() => generateItems(boxCount, 0.17, 0.14, 6.2, 5.4), [boxCount]);
  const bells = useMemo(() => generateItems(bellCount, 0.14, 0.12, 5.4, 7.6), [bellCount]);

  const isCrystal = ornamentStyle === 'crystal';
  const isVintage = ornamentStyle === 'vintage';

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const audioLevel = audioMetricsRef.current.level;

    const p = bloomProgressRef.current;
    const ease = p * p * (3 - 2 * p);
    const transitArc = Math.sin(ease * Math.PI);

    // Smoothly crossfade instance colors until settled
    if (!colorSettledRef.current) {
      const colStep = Math.min(1, delta * 4.5);
      curBox1.current.lerp(tgtBox1.current, colStep);
      curBox2.current.lerp(tgtBox2.current, colStep);
      curRibbon.current.lerp(tgtRibbon.current, colStep);
      curBell.current.lerp(tgtBell.current, colStep);

      if (boxMeshRef.current && boxCount > 0) {
        for (let i = 0; i < boxes.length; i++) {
          boxMeshRef.current.setColorAt(
            i,
            boxes[i].variant === 1 ? curBox1.current : curBox2.current
          );
        }
        if (boxMeshRef.current.instanceColor) boxMeshRef.current.instanceColor.needsUpdate = true;
      }

      if (ribbonMatARef.current) {
        ribbonMatARef.current.color.copy(curRibbon.current);
        ribbonMatARef.current.emissive.copy(curRibbon.current);
      }
      if (ribbonMatBRef.current) {
        ribbonMatBRef.current.color.copy(curRibbon.current);
        ribbonMatBRef.current.emissive.copy(curRibbon.current);
      }

      if (bellMeshRef.current && bellCount > 0) {
        for (let i = 0; i < bells.length; i++) {
          tempColor.copy(curBell.current);
          if (bells[i].variant === 2) tempColor.lerp(warmHighlight, 0.24);
          bellMeshRef.current.setColorAt(i, tempColor);
        }
        if (bellMeshRef.current.instanceColor) bellMeshRef.current.instanceColor.needsUpdate = true;
      }

      const diff =
        Math.abs(curBox1.current.r - tgtBox1.current.r) +
        Math.abs(curBox1.current.g - tgtBox1.current.g) +
        Math.abs(curBox2.current.b - tgtBox2.current.b) +
        Math.abs(curBell.current.r - tgtBell.current.r) +
        Math.abs(curRibbon.current.r - tgtRibbon.current.r);
      if (diff < 0.004) {
        colorSettledRef.current = true;
      }
    }

    const computeOrbitalPos = (item: OrnamentItem) => {
      if (ease <= 0.0005) {
        return { x: item.treePos.x, y: item.treePos.y, z: item.treePos.z };
      }
      const ang = item.orbitAngle0 + time * item.orbitSpeed;
      const rawX = Math.cos(ang) * item.orbitRadius;
      const rawZ = Math.sin(ang) * item.orbitRadius;
      const rawY = item.orbitY + Math.sin(time * 0.7 + item.orbitAngle0) * 0.24;

      const sinT = Math.sin(item.orbitTilt);
      const cosT = Math.cos(item.orbitTilt);
      const ox = rawX;
      const oy = rawY * cosT - rawZ * sinT;
      const oz = rawY * sinT + rawZ * cosT;

      const bx = item.treePos.x + (ox - item.treePos.x) * ease;
      const by = item.treePos.y + (oy - item.treePos.y) * ease;
      const bz = item.treePos.z + (oz - item.treePos.z) * ease;

      const swirl = transitArc * 0.85 * item.swirlSign;
      const cs = Math.cos(swirl);
      const sn = Math.sin(swirl);
      return {
        x: bx * cs - bz * sn,
        y: by,
        z: bx * sn + bz * cs,
      };
    };

    if (boxCount > 0 && boxMeshRef.current) {
      const spin = isCrystal ? 0.32 : isVintage ? 0.14 : 0.2;
      for (let i = 0; i < boxes.length; i++) {
        const item = boxes[i];
        const pos = computeOrbitalPos(item);

        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.rotation.set(
          item.rotation.x + time * spin * 0.75,
          item.rotation.y + time * spin,
          item.rotation.z
        );
        const s = item.baseScale * (isCrystal ? 1.15 : 1) * (1 + audioLevel * 0.32);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        boxMeshRef.current.setMatrixAt(i, dummy.matrix);
        if (ribbonAMeshRef.current) ribbonAMeshRef.current.setMatrixAt(i, dummy.matrix);
        if (ribbonBMeshRef.current) ribbonBMeshRef.current.setMatrixAt(i, dummy.matrix);
      }

      boxMeshRef.current.instanceMatrix.needsUpdate = true;
      if (ribbonAMeshRef.current) ribbonAMeshRef.current.instanceMatrix.needsUpdate = true;
      if (ribbonBMeshRef.current) ribbonBMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (bellCount > 0 && bellMeshRef.current) {
      for (let i = 0; i < bells.length; i++) {
        const item = bells[i];
        const pos = computeOrbitalPos(item);

        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.rotation.set(item.rotation.x, item.rotation.y + time * 0.38, item.rotation.z);
        const s = item.baseScale * (1 + audioLevel * 0.34);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        bellMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      bellMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {boxCount > 0 && (
        <>
          <instancedMesh
            key={`gift-body-${ornamentStyle}-${boxCount}`}
            ref={boxMeshRef}
            args={[undefined, undefined, boxCount]}
            frustumCulled={false}
          >
            {isCrystal ? (
              <octahedronGeometry args={[0.72, 0]} />
            ) : (
              <boxGeometry args={[1, 0.92, 1]} />
            )}
            <meshStandardMaterial
              metalness={boxMetalness}
              roughness={boxRoughness}
              envMapIntensity={isCrystal ? 2.5 : 1.2}
              transparent={isCrystal}
              opacity={isCrystal ? 0.8 : 1}
              emissive={isCrystal ? '#C5B3EF' : '#000000'}
              emissiveIntensity={isCrystal ? 0.16 : 0}
            />
          </instancedMesh>

          {isCrystal ? (
            <instancedMesh
              key={`gift-crystal-ring-${boxCount}`}
              ref={ribbonAMeshRef}
              args={[undefined, undefined, boxCount]}
              frustumCulled={false}
            >
              <torusGeometry args={[0.88, 0.045, 6, 20]} />
              <meshStandardMaterial
                ref={ribbonMatARef}
                color={ribbonColor}
                emissive={ribbonColor}
                emissiveIntensity={0.4}
                metalness={0.9}
                roughness={0.14}
                envMapIntensity={2.2}
              />
            </instancedMesh>
          ) : (
            <>
              <instancedMesh
                key={`gift-ribbon-a-${ornamentStyle}-${boxCount}`}
                ref={ribbonAMeshRef}
                args={[undefined, undefined, boxCount]}
                frustumCulled={false}
              >
                <boxGeometry args={[1.03, 0.95, isVintage ? 0.18 : 0.15]} />
                <meshStandardMaterial
                  ref={ribbonMatARef}
                  color={ribbonColor}
                  emissive={ribbonColor}
                  emissiveIntensity={isVintage ? 0.08 : 0.14}
                  metalness={isVintage ? 0.45 : 0.88}
                  roughness={isVintage ? 0.36 : 0.22}
                  envMapIntensity={isVintage ? 1.3 : 1.6}
                />
              </instancedMesh>
              <instancedMesh
                key={`gift-ribbon-b-${ornamentStyle}-${boxCount}`}
                ref={ribbonBMeshRef}
                args={[undefined, undefined, boxCount]}
                frustumCulled={false}
              >
                <boxGeometry args={[isVintage ? 0.18 : 0.15, 0.95, 1.03]} />
                <meshStandardMaterial
                  ref={ribbonMatBRef}
                  color={ribbonColor}
                  emissive={ribbonColor}
                  emissiveIntensity={isVintage ? 0.08 : 0.14}
                  metalness={isVintage ? 0.45 : 0.88}
                  roughness={isVintage ? 0.36 : 0.22}
                  envMapIntensity={isVintage ? 1.3 : 1.6}
                />
              </instancedMesh>
            </>
          )}
        </>
      )}

      {bellCount > 0 && (
        <instancedMesh
          key={`baubles-${ornamentStyle}-${bellCount}`}
          ref={bellMeshRef}
          args={[undefined, undefined, bellCount]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.56, 16, 16]} />
          <meshStandardMaterial
            metalness={bellMetalness}
            roughness={bellRoughness}
            envMapIntensity={isCrystal ? 2.1 : 1.85}
          />
        </instancedMesh>
      )}
    </group>
  );
}
