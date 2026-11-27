import { useLayoutEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioMetrics, HandData, TreeMode } from '../../types';
import { TREE_HEIGHT, TREE_RADIUS } from './constants';

interface OrnamentsProps {
  mode: TreeMode;
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  bloomActiveRef: MutableRefObject<boolean>;
  boxCount: number;
  bellCount: number;
  boxColor1: string;
  boxColor2: string;
  ribbonColor: string;
  bellColor: string;
  boxMetalness?: number;
  boxRoughness?: number;
  bellMetalness?: number;
  bellRoughness?: number;
}

interface OrnamentItem {
  treePos: THREE.Vector3;
  randomPos: THREE.Vector3;
  explosionDir: THREE.Vector3;
  currentPos: THREE.Vector3;
  baseScale: number;
  rotation: THREE.Euler;
  variant: 1 | 2;
}

function generateItems(count: number, minScale: number, scaleRange: number): OrnamentItem[] {
  return Array.from({ length: count }, () => {
    const hNorm = Math.pow(Math.random(), 1.25);
    const y = hNorm * (TREE_HEIGHT * 0.92) - TREE_HEIGHT / 2 + 0.35;
    const radius = (1 - hNorm) * TREE_RADIUS * (0.62 + Math.random() * 0.48);
    const angle = Math.random() * Math.PI * 2;

    const treePos = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    const randomPos = new THREE.Vector3(
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 20
    );
    const explosionDir = new THREE.Vector3(
      treePos.x + (Math.random() - 0.5) * 2,
      (Math.random() - 0.4) * 3,
      treePos.z + (Math.random() - 0.5) * 2
    ).normalize();

    return {
      treePos,
      randomPos,
      explosionDir,
      currentPos: treePos.clone().multiplyScalar(1.35),
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
  mode,
  audioMetricsRef,
  handDataRef,
  bloomActiveRef,
  boxCount,
  bellCount,
  boxColor1,
  boxColor2,
  ribbonColor,
  bellColor,
  boxMetalness = 0.36,
  boxRoughness = 0.42,
  bellMetalness = 0.9,
  bellRoughness = 0.16,
}: OrnamentsProps) {
  const boxMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const ribbonAMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const ribbonBMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const bellMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Refined, jewel-sized gifts and baubles that preserve the tree silhouette
  const boxes = useMemo(() => generateItems(boxCount, 0.17, 0.14), [boxCount]);
  const bells = useMemo(() => generateItems(bellCount, 0.14, 0.12), [bellCount]);

  useLayoutEffect(() => {
    const mesh = boxMeshRef.current;
    if (!mesh || boxCount === 0) return;
    const c1 = new THREE.Color(boxColor1);
    const c2 = new THREE.Color(boxColor2);
    boxes.forEach((item, idx) => {
      mesh.setColorAt(idx, item.variant === 1 ? c1 : c2);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, boxCount, boxColor1, boxColor2]);

  useLayoutEffect(() => {
    const mesh = bellMeshRef.current;
    if (!mesh || bellCount === 0) return;
    const base = new THREE.Color(bellColor);
    const warmHighlight = new THREE.Color('#fff1cc');
    const c = new THREE.Color();
    bells.forEach((item, idx) => {
      c.copy(base);
      if (item.variant === 2) c.lerp(warmHighlight, 0.22);
      mesh.setColorAt(idx, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bells, bellCount, bellColor]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const audioLevel = audioMetricsRef.current.level;
    const isBlooming =
      handDataRef.current.gesture === 'OPEN' || bloomActiveRef.current;
    const explosionDist = 9.8;
    const lerpRate = Math.min(1, (isBlooming ? 4.0 : 2.1) * delta);

    if (boxCount > 0 && boxMeshRef.current && ribbonAMeshRef.current && ribbonBMeshRef.current) {
      for (let i = 0; i < boxes.length; i++) {
        const item = boxes[i];
        let tx = mode === 'TREE' ? item.treePos.x : item.randomPos.x;
        let ty = mode === 'TREE' ? item.treePos.y : item.randomPos.y;
        let tz = mode === 'TREE' ? item.treePos.z : item.randomPos.z;

        if (isBlooming) {
          const amp = 1 + audioLevel * 0.5;
          tx += item.explosionDir.x * explosionDist * amp;
          ty += item.explosionDir.y * explosionDist * amp;
          tz += item.explosionDir.z * explosionDist * amp;
        }

        item.currentPos.x += (tx - item.currentPos.x) * lerpRate;
        item.currentPos.y += (ty - item.currentPos.y) * lerpRate;
        item.currentPos.z += (tz - item.currentPos.z) * lerpRate;

        dummy.position.copy(item.currentPos);
        dummy.rotation.set(
          item.rotation.x + time * 0.18,
          item.rotation.y + time * 0.24,
          item.rotation.z
        );
        const s = item.baseScale * (1 + audioLevel * 0.38);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        boxMeshRef.current.setMatrixAt(i, dummy.matrix);
        ribbonAMeshRef.current.setMatrixAt(i, dummy.matrix);
        ribbonBMeshRef.current.setMatrixAt(i, dummy.matrix);
      }

      boxMeshRef.current.instanceMatrix.needsUpdate = true;
      ribbonAMeshRef.current.instanceMatrix.needsUpdate = true;
      ribbonBMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (bellCount > 0 && bellMeshRef.current) {
      for (let i = 0; i < bells.length; i++) {
        const item = bells[i];
        let tx = mode === 'TREE' ? item.treePos.x : item.randomPos.x;
        let ty = mode === 'TREE' ? item.treePos.y : item.randomPos.y;
        let tz = mode === 'TREE' ? item.treePos.z : item.randomPos.z;

        if (isBlooming) {
          const amp = 1 + audioLevel * 0.5;
          tx += item.explosionDir.x * explosionDist * amp;
          ty += item.explosionDir.y * explosionDist * amp;
          tz += item.explosionDir.z * explosionDist * amp;
        }

        item.currentPos.x += (tx - item.currentPos.x) * lerpRate;
        item.currentPos.y += (ty - item.currentPos.y) * lerpRate;
        item.currentPos.z += (tz - item.currentPos.z) * lerpRate;

        dummy.position.copy(item.currentPos);
        dummy.rotation.set(item.rotation.x, item.rotation.y + time * 0.45, item.rotation.z);
        const s = item.baseScale * (1 + audioLevel * 0.42);
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
            key={`gift-body-${boxCount}`}
            ref={boxMeshRef}
            args={[undefined, undefined, boxCount]}
            frustumCulled={false}
          >
            <boxGeometry args={[1, 0.92, 1]} />
            <meshStandardMaterial
              metalness={boxMetalness}
              roughness={boxRoughness}
              envMapIntensity={1.2}
            />
          </instancedMesh>
          {/* Delicate champagne-gold cross-ribbons wrapping each gift box */}
          <instancedMesh
            key={`gift-ribbon-a-${boxCount}`}
            ref={ribbonAMeshRef}
            args={[undefined, undefined, boxCount]}
            frustumCulled={false}
          >
            <boxGeometry args={[1.03, 0.95, 0.15]} />
            <meshStandardMaterial
              color={ribbonColor}
              emissive={ribbonColor}
              emissiveIntensity={0.14}
              metalness={0.88}
              roughness={0.22}
              envMapIntensity={1.6}
            />
          </instancedMesh>
          <instancedMesh
            key={`gift-ribbon-b-${boxCount}`}
            ref={ribbonBMeshRef}
            args={[undefined, undefined, boxCount]}
            frustumCulled={false}
          >
            <boxGeometry args={[0.15, 0.95, 1.03]} />
            <meshStandardMaterial
              color={ribbonColor}
              emissive={ribbonColor}
              emissiveIntensity={0.14}
              metalness={0.88}
              roughness={0.22}
              envMapIntensity={1.6}
            />
          </instancedMesh>
        </>
      )}

      {bellCount > 0 && (
        <instancedMesh
          key={`baubles-${bellCount}`}
          ref={bellMeshRef}
          args={[undefined, undefined, bellCount]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.56, 16, 16]} />
          <meshStandardMaterial
            metalness={bellMetalness}
            roughness={bellRoughness}
            envMapIntensity={1.85}
          />
        </instancedMesh>
      )}
    </group>
  );
}
