import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { AppearanceFeaturesConfig, GalleryPhoto, HandData } from '../../types';

interface PhotoGallery3DProps {
  photos: GalleryPhoto[];
  bloomProgressRef: MutableRefObject<number>;
  handDataRef: MutableRefObject<HandData>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  accentColor: string;
  polaroidStyle: Pick<
    AppearanceFeaturesConfig,
    'polaroidPaperTop' | 'polaroidPaperBottom' | 'polaroidBorderTint' | 'polaroidCaptionColor'
  >;
  floatAmp?: number;
}

interface PolaroidPlacement {
  photo: GalleryPhoto;
  quietPos: THREE.Vector3;
  quietRot: THREE.Euler;
  /** Layered 3D orbital parameters when in Bloom Mode */
  bloomRadius: number;
  bloomAngle0: number;
  bloomOrbitSpeed: number;
  bloomY: number;
  bloomTilt: number;
  tiltZ: number;
  phase: number;
}

interface CardRuntimeHandles {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial | null;
  frontMat: THREE.MeshStandardMaterial | null;
  backMat: THREE.MeshStandardMaterial | null;
  clipMat: THREE.MeshStandardMaterial | null;
}

function createPolaroidFrontTexture(
  img: HTMLImageElement | null,
  caption: string,
  style: Pick<
    AppearanceFeaturesConfig,
    'polaroidPaperTop' | 'polaroidPaperBottom' | 'polaroidBorderTint' | 'polaroidCaptionColor'
  >
): THREE.CanvasTexture {
  const width = 512;
  const height = 630;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const paperGrad = ctx.createLinearGradient(0, 0, width, height);
    paperGrad.addColorStop(0, style.polaroidPaperTop);
    paperGrad.addColorStop(1, style.polaroidPaperBottom);
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = style.polaroidBorderTint;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    const padX = 34;
    const padTop = 36;
    const boxSize = width - padX * 2;

    ctx.fillStyle = '#14192b';
    ctx.fillRect(padX, padTop, boxSize, boxSize);

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(boxSize / iw, boxSize / ih);
      const sw = boxSize / scale;
      const sh = boxSize / scale;
      const sx = (iw - sw) / 2;
      const sy = (ih - sh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(padX, padTop, boxSize, boxSize);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, padX, padTop, boxSize, boxSize);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(30, 24, 18, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, padTop, boxSize, boxSize);

    ctx.fillStyle = style.polaroidCaptionColor;
    ctx.font = 'italic 600 32px "Caveat", "Noto Serif SC", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(caption || 'Winter Memory', width / 2, padTop + boxSize + 72, boxSize);

    ctx.fillStyle = style.polaroidBorderTint;
    ctx.beginPath();
    ctx.arc(width / 2, padTop + boxSize + 112, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createPolaroidBackTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 315;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#f2ead9';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(202, 156, 78, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.strokeStyle = 'rgba(186, 140, 68, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -34);
      ctx.moveTo(0, -22);
      ctx.lineTo(-8, -28);
      ctx.moveTo(0, -22);
      ctx.lineTo(8, -28);
      ctx.stroke();
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface PolaroidCardProps {
  placement: PolaroidPlacement;
  backTexture: THREE.CanvasTexture;
  accentColor: string;
  polaroidStyle: Pick<
    AppearanceFeaturesConfig,
    'polaroidPaperTop' | 'polaroidPaperBottom' | 'polaroidBorderTint' | 'polaroidCaptionColor'
  >;
  isFocused: boolean;
  onToggleFocus: (id: string) => void;
  registerHandles: (id: string, handles: CardRuntimeHandles | null) => void;
}

function PolaroidCard({
  placement,
  backTexture,
  accentColor,
  polaroidStyle,
  isFocused,
  onToggleFocus,
  registerHandles,
}: PolaroidCardProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const frontMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const backMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const clipMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const [frontTexture, setFrontTexture] = useState<THREE.CanvasTexture>(() =>
    createPolaroidFrontTexture(null, placement.photo.caption, polaroidStyle)
  );
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (groupRef.current) {
      registerHandles(placement.photo.id, {
        group: groupRef.current,
        bodyMat: bodyMatRef.current,
        frontMat: frontMatRef.current,
        backMat: backMatRef.current,
        clipMat: clipMatRef.current,
      });
    }
    return () => registerHandles(placement.photo.id, null);
  }, [placement.photo.id, registerHandles]);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      const nextTex = createPolaroidFrontTexture(img, placement.photo.caption, polaroidStyle);
      setFrontTexture((prev) => {
        prev.dispose();
        return nextTex;
      });
    };
    img.src = placement.photo.url;
    return () => {
      active = false;
    };
  }, [
    placement.photo.url,
    placement.photo.caption,
    polaroidStyle.polaroidPaperTop,
    polaroidStyle.polaroidPaperBottom,
    polaroidStyle.polaroidBorderTint,
    polaroidStyle.polaroidCaptionColor,
  ]);

  useEffect(() => {
    return () => {
      frontTexture.dispose();
    };
  }, [frontTexture]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = 'pointer';
    }
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    onToggleFocus(placement.photo.id);
  };

  return (
    <group
      ref={groupRef}
      position={placement.quietPos}
      rotation={placement.quietRot}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[1.38, 1.7, 0.036]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#f6efe0"
          roughness={0.78}
          metalness={0.04}
          transparent
          opacity={1}
          emissive={isFocused || hovered ? accentColor : '#000000'}
          emissiveIntensity={isFocused ? 0.14 : hovered ? 0.09 : 0}
        />
      </mesh>

      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.36, 1.68]} />
        <meshStandardMaterial
          ref={frontMatRef}
          map={frontTexture}
          roughness={0.62}
          metalness={0.02}
          transparent
          opacity={1}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.36, 1.68]} />
        <meshStandardMaterial
          ref={backMatRef}
          map={backTexture}
          roughness={0.82}
          metalness={0.04}
          transparent
          opacity={1}
        />
      </mesh>

      <mesh position={[0, 0.87, 0]}>
        <boxGeometry args={[0.24, 0.09, 0.07]} />
        <meshStandardMaterial
          ref={clipMatRef}
          color={accentColor}
          metalness={0.92}
          roughness={0.18}
          envMapIntensity={1.8}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}

/**
 * 3D Polaroid gallery that nests gracefully around the tree in Quiet Mode,
 * expands onto multi-layered tilted 3D orbits with perspective depth-opacity & scale
 * in Bloom Mode, and supports both click/tap zoom and gesture pinch cycling.
 */
export function PhotoGallery3D({
  photos,
  bloomProgressRef,
  handDataRef,
  focusedPhotoId,
  onSelectPhoto,
  accentColor,
  polaroidStyle,
  floatAmp = 0.24,
}: PhotoGallery3DProps) {
  const { camera } = useThree();
  const containerRef = useRef<THREE.Group | null>(null);
  const handlesMapRef = useRef<Map<string, CardRuntimeHandles>>(new Map());
  const placementCacheRef = useRef<Map<string, { y: number; tiltZ: number; phase: number }>>(
    new Map()
  );

  const pinchLatchedRef = useRef(false);
  const lastPinchAtRef = useRef(0);
  const cycleIndexRef = useRef(0);

  const tmpForward = useMemo(() => new THREE.Vector3(), []);
  const tmpTargetWorld = useMemo(() => new THREE.Vector3(), []);
  const tmpTargetLocal = useMemo(() => new THREE.Vector3(), []);
  const tmpLookObj = useMemo(() => new THREE.Object3D(), []);
  const tmpContainerQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpLocalQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpTargetQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpWorldPos = useMemo(() => new THREE.Vector3(), []);
  const tmpEuler = useMemo(() => new THREE.Euler(), []);

  const backTexture = useMemo(() => createPolaroidBackTexture(), []);

  useEffect(() => {
    return () => backTexture.dispose();
  }, [backTexture]);

  const placements = useMemo<PolaroidPlacement[]>(() => {
    const count = Math.max(photos.length, 1);
    const quietOrbitRadius = 7.4;
    const bloomTierRadii = [7.4, 9.8, 12.0];
    const bloomTierSpeeds = [0.15, -0.1, 0.075];
    const bloomTierTilts = [0.22, -0.17, 0.12];

    return photos.map((photo, index) => {
      let cached = placementCacheRef.current.get(photo.id);
      if (!cached) {
        cached = {
          y: ((index % 3) - 1) * 2.1 + (Math.random() - 0.5) * 0.9,
          tiltZ: (Math.random() - 0.5) * 0.14,
          phase: Math.random() * Math.PI * 2,
        };
        placementCacheRef.current.set(photo.id, cached);
      }

      const angle = (index / count) * Math.PI * 2;
      const tier = index % 3;

      const quietPos = new THREE.Vector3(
        Math.sin(angle) * quietOrbitRadius,
        cached.y,
        Math.cos(angle) * quietOrbitRadius
      );
      const quietRot = new THREE.Euler(0, angle, cached.tiltZ);

      return {
        photo,
        quietPos,
        quietRot,
        bloomRadius: bloomTierRadii[tier],
        bloomAngle0: angle + tier * 0.55,
        bloomOrbitSpeed: bloomTierSpeeds[tier],
        bloomY: (tier - 1) * 2.35 + (cached.y * 0.35),
        bloomTilt: bloomTierTilts[tier],
        tiltZ: cached.tiltZ,
        phase: cached.phase,
      };
    });
  }, [photos]);

  const registerHandles = useMemo(
    () => (id: string, handles: CardRuntimeHandles | null) => {
      if (handles) handlesMapRef.current.set(id, handles);
      else handlesMapRef.current.delete(id);
    },
    []
  );

  const handleToggleFocus = (id: string) => {
    onSelectPhoto(focusedPhotoId === id ? null : id);
  };

  useFrame((state, rawDelta) => {
    const container = containerRef.current;
    if (!container) return;

    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const hand = handDataRef.current;

    const p = bloomProgressRef.current;
    const ease = p * p * (3 - 2 * p);

    // Camera gesture PINCH -> cycle/select next Polaroid with anti-double-trigger cooldown
    if (hand.source === 'camera') {
      const nowMs = performance.now();
      if (hand.gesture === 'PINCH') {
        if (
          !pinchLatchedRef.current &&
          placements.length > 0 &&
          nowMs - lastPinchAtRef.current > 550
        ) {
          pinchLatchedRef.current = true;
          lastPinchAtRef.current = nowMs;
          const nextIdx = cycleIndexRef.current % placements.length;
          cycleIndexRef.current = (nextIdx + 1) % placements.length;
          onSelectPhoto(placements[nextIdx].photo.id);
        }
      } else {
        pinchLatchedRef.current = false;
        // Making a fist smoothly dismisses zoomed card while regathering the tree
        if (hand.gesture === 'FIST' && focusedPhotoId !== null && nowMs - lastPinchAtRef.current > 650) {
          onSelectPhoto(null);
        }
      }
    }

    container.getWorldQuaternion(tmpContainerQuat);
    const invContainerQuat = tmpContainerQuat.clone().invert();
    const lerpSpeed = Math.min(1, delta * 5.6);

    for (let i = 0; i < placements.length; i++) {
      const pl = placements[i];
      const handles = handlesMapRef.current.get(pl.photo.id);
      if (!handles) continue;

      const { group, bodyMat, frontMat, backMat, clipMat } = handles;
      const isFocused = focusedPhotoId === pl.photo.id;

      let targetScale = 1;
      let targetOpacity = 1;

      if (isFocused) {
        tmpForward.set(0, 0, -5.8).applyQuaternion(camera.quaternion);
        tmpTargetWorld.copy(camera.position).add(tmpForward);
        tmpTargetLocal.copy(tmpTargetWorld);
        container.worldToLocal(tmpTargetLocal);

        tmpLookObj.position.copy(tmpTargetWorld);
        tmpLookObj.lookAt(camera.position);
        tmpLocalQuat.copy(invContainerQuat).multiply(tmpLookObj.quaternion);

        group.position.lerp(tmpTargetLocal, lerpSpeed);
        group.quaternion.slerp(tmpLocalQuat, lerpSpeed);
        targetScale = 2.25;
        targetOpacity = 1;
      } else {
        const bob = Math.sin(time * 1.1 + pl.phase) * floatAmp;
        const qx = pl.quietPos.x;
        const qy = pl.quietPos.y + bob;
        const qz = pl.quietPos.z;

        if (ease > 0.001) {
          // Layered orbital placement in Bloom mode
          const ang = pl.bloomAngle0 + time * pl.bloomOrbitSpeed;
          const rx = Math.sin(ang) * pl.bloomRadius;
          const rz = Math.cos(ang) * pl.bloomRadius;
          const ry = pl.bloomY + bob * 1.35;

          const sinT = Math.sin(pl.bloomTilt);
          const cosT = Math.cos(pl.bloomTilt);
          const ox = rx;
          const oy = ry * cosT - rz * sinT;
          const oz = ry * sinT + rz * cosT;

          tmpTargetLocal.set(
            qx + (ox - qx) * ease,
            qy + (oy - qy) * ease,
            qz + (oz - qz) * ease
          );
          // Gently face outward along current blended orbital angle
          const blendedAngle = Math.atan2(tmpTargetLocal.x, tmpTargetLocal.z);
          tmpEuler.set(0, blendedAngle, pl.tiltZ);
          tmpTargetQuat.setFromEuler(tmpEuler);
        } else {
          tmpTargetLocal.set(qx, qy, qz);
          tmpTargetQuat.setFromEuler(pl.quietRot);
        }

        group.position.lerp(tmpTargetLocal, lerpSpeed);
        group.quaternion.slerp(tmpTargetQuat, lerpSpeed);

        // Atmospheric depth perception: cards farther behind subtly recede in scale & opacity
        group.getWorldPosition(tmpWorldPos);
        const dist = tmpWorldPos.distanceTo(camera.position);
        const depthT = THREE.MathUtils.clamp((dist - 12) / 22, 0, 1);
        const depthScale = THREE.MathUtils.lerp(1.06, 0.78, depthT);
        const depthOpacity = THREE.MathUtils.lerp(1.0, 0.46, depthT);

        // Keep Quiet mode mostly solid; accentuate layered depth gracefully in Bloom mode
        targetScale = THREE.MathUtils.lerp(1, depthScale, ease * 0.85);
        targetOpacity = THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(1, 0.78, depthT),
          depthOpacity,
          ease
        );

        // Dim non-focused cards slightly when another photo is zoomed in
        if (focusedPhotoId !== null) {
          targetOpacity *= 0.45;
        }
      }

      const nextScale = THREE.MathUtils.lerp(group.scale.x, targetScale, lerpSpeed);
      group.scale.setScalar(nextScale);

      const applyOpacity = (mat: THREE.MeshStandardMaterial | null) => {
        if (!mat) return;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, lerpSpeed);
      };
      applyOpacity(bodyMat);
      applyOpacity(frontMat);
      applyOpacity(backMat);
      applyOpacity(clipMat);
    }
  });

  return (
    <group ref={containerRef}>
      {placements.map((placement) => (
        <PolaroidCard
          key={placement.photo.id}
          placement={placement}
          backTexture={backTexture}
          accentColor={accentColor}
          polaroidStyle={polaroidStyle}
          isFocused={focusedPhotoId === placement.photo.id}
          onToggleFocus={handleToggleFocus}
          registerHandles={registerHandles}
        />
      ))}
    </group>
  );
}
