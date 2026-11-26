import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalleryPhoto, HandData } from '../../types';

interface PhotoGallery3DProps {
  photos: GalleryPhoto[];
  handDataRef: MutableRefObject<HandData>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  accentColor: string;
}

interface PolaroidPlacement {
  photo: GalleryPhoto;
  initialPos: THREE.Vector3;
  initialRot: THREE.Euler;
  tiltZ: number;
  phase: number;
}

function createPolaroidFrontTexture(
  img: HTMLImageElement | null,
  caption: string
): THREE.CanvasTexture {
  const width = 512;
  const height = 630;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm cream Polaroid paper background
    const paperGrad = ctx.createLinearGradient(0, 0, width, height);
    paperGrad.addColorStop(0, '#fbf7ee');
    paperGrad.addColorStop(0.55, '#f6efe0');
    paperGrad.addColorStop(1, '#ede3cf');
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle warm outer border sheen
    ctx.strokeStyle = 'rgba(218, 178, 102, 0.42)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Photo window dimensions
    const padX = 34;
    const padTop = 36;
    const boxSize = width - padX * 2; // 444 x 444

    // Photo recess shadow
    ctx.fillStyle = '#14192b';
    ctx.fillRect(padX, padTop, boxSize, boxSize);

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      // Center-crop (object-fit: cover) so any aspect ratio looks balanced
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

    // Crisp inner hairline around photo
    ctx.strokeStyle = 'rgba(30, 24, 18, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, padTop, boxSize, boxSize);

    // Warm handwritten caption in bottom Polaroid chin
    ctx.fillStyle = '#473c32';
    ctx.font = 'italic 600 32px "Caveat", "Noto Serif SC", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(caption || 'Winter Memory', width / 2, padTop + boxSize + 72, boxSize);

    // Tiny decorative gold star dot under caption
    ctx.fillStyle = 'rgba(202, 152, 68, 0.65)';
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

    // Minimalist golden snowflake emblem on the back
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
  isFocused: boolean;
  onToggleFocus: (id: string) => void;
  registerGroup: (id: string, group: THREE.Group | null) => void;
}

function PolaroidCard({
  placement,
  backTexture,
  accentColor,
  isFocused,
  onToggleFocus,
  registerGroup,
}: PolaroidCardProps) {
  const [frontTexture, setFrontTexture] = useState<THREE.CanvasTexture>(() =>
    createPolaroidFrontTexture(null, placement.photo.caption)
  );
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      const nextTex = createPolaroidFrontTexture(img, placement.photo.caption);
      setFrontTexture((prev) => {
        prev.dispose();
        return nextTex;
      });
    };
    img.src = placement.photo.url;
    return () => {
      active = false;
    };
  }, [placement.photo.url, placement.photo.caption]);

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
      ref={(el) => registerGroup(placement.photo.id, el)}
      position={placement.initialPos}
      rotation={placement.initialRot}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Polaroid card body (warm cream edge) */}
      <mesh>
        <boxGeometry args={[1.38, 1.7, 0.036]} />
        <meshStandardMaterial
          color="#f6efe0"
          roughness={0.78}
          metalness={0.04}
          emissive={isFocused || hovered ? accentColor : '#000000'}
          emissiveIntensity={isFocused ? 0.14 : hovered ? 0.09 : 0}
        />
      </mesh>

      {/* Front photo + caption face */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.36, 1.68]} />
        <meshStandardMaterial
          map={frontTexture}
          roughness={0.62}
          metalness={0.02}
          toneMapped={false}
        />
      </mesh>

      {/* Back side card with subtle golden snowflake */}
      <mesh position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.36, 1.68]} />
        <meshStandardMaterial map={backTexture} roughness={0.82} metalness={0.04} />
      </mesh>

      {/* Delicate golden clip pin on top of the Polaroid */}
      <mesh position={[0, 0.87, 0]}>
        <boxGeometry args={[0.24, 0.09, 0.07]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.95}
          roughness={0.18}
          envMapIntensity={2}
        />
      </mesh>
    </group>
  );
}

export function PhotoGallery3D({
  photos,
  handDataRef,
  focusedPhotoId,
  onSelectPhoto,
  accentColor,
}: PhotoGallery3DProps) {
  const { camera } = useThree();
  const containerRef = useRef<THREE.Group | null>(null);
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const placementCacheRef = useRef<Map<string, { y: number; tiltZ: number; phase: number }>>(
    new Map()
  );
  const pinchLatchedRef = useRef(false);
  const cycleIndexRef = useRef(0);

  // Reusable math temporaries to avoid per-frame allocations
  const tmpForward = useMemo(() => new THREE.Vector3(), []);
  const tmpTargetWorld = useMemo(() => new THREE.Vector3(), []);
  const tmpTargetLocal = useMemo(() => new THREE.Vector3(), []);
  const tmpLookObj = useMemo(() => new THREE.Object3D(), []);
  const tmpContainerQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpLocalQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpTargetQuat = useMemo(() => new THREE.Quaternion(), []);

  const backTexture = useMemo(() => createPolaroidBackTexture(), []);

  useEffect(() => {
    return () => backTexture.dispose();
  }, [backTexture]);

  const placements = useMemo<PolaroidPlacement[]>(() => {
    const count = Math.max(photos.length, 1);
    const orbitRadius = 7.6;

    return photos.map((photo, index) => {
      let cached = placementCacheRef.current.get(photo.id);
      if (!cached) {
        cached = {
          y: ((index % 3) - 1) * 2.15 + (Math.random() - 0.5) * 1.1,
          tiltZ: (Math.random() - 0.5) * 0.16,
          phase: Math.random() * Math.PI * 2,
        };
        placementCacheRef.current.set(photo.id, cached);
      }
      const angle = (index / count) * Math.PI * 2;
      const initialPos = new THREE.Vector3(
        Math.sin(angle) * orbitRadius,
        cached.y,
        Math.cos(angle) * orbitRadius
      );
      // Face outward from the tree center
      const initialRot = new THREE.Euler(0, angle, cached.tiltZ);
      return {
        photo,
        initialPos,
        initialRot,
        tiltZ: cached.tiltZ,
        phase: cached.phase,
      };
    });
  }, [photos]);

  const registerGroup = (id: string, group: THREE.Group | null) => {
    if (group) groupRefs.current.set(id, group);
    else groupRefs.current.delete(id);
  };

  const handleToggleFocus = (id: string) => {
    onSelectPhoto(focusedPhotoId === id ? null : id);
  };

  useFrame((state, rawDelta) => {
    const container = containerRef.current;
    if (!container) return;

    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const hand = handDataRef.current;

    // Camera gesture PINCH edge detection -> cycle to next Polaroid
    if (hand.source === 'camera') {
      if (hand.gesture === 'PINCH' && !pinchLatchedRef.current && placements.length > 0) {
        pinchLatchedRef.current = true;
        const nextIdx = cycleIndexRef.current % placements.length;
        cycleIndexRef.current = (nextIdx + 1) % placements.length;
        onSelectPhoto(placements[nextIdx].photo.id);
      } else if (hand.gesture !== 'PINCH') {
        pinchLatchedRef.current = false;
      }

      // Opening palm dismisses focused photo cleanly so the full bloom is unobstructed
      if (hand.gesture === 'OPEN' && focusedPhotoId !== null) {
        onSelectPhoto(null);
      }
    }

    container.getWorldQuaternion(tmpContainerQuat);
    const invContainerQuat = tmpContainerQuat.clone().invert();
    const lerpSpeed = Math.min(1, delta * 5.8);

    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const group = groupRefs.current.get(p.photo.id);
      if (!group) continue;

      const isFocused = focusedPhotoId === p.photo.id;

      if (isFocused) {
        // Place smoothly 5.8 units directly in front of camera
        tmpForward.set(0, 0, -5.8).applyQuaternion(camera.quaternion);
        tmpTargetWorld.copy(camera.position).add(tmpForward);
        tmpTargetLocal.copy(tmpTargetWorld);
        container.worldToLocal(tmpTargetLocal);

        tmpLookObj.position.copy(tmpTargetWorld);
        tmpLookObj.lookAt(camera.position);
        tmpLocalQuat.copy(invContainerQuat).multiply(tmpLookObj.quaternion);

        group.position.lerp(tmpTargetLocal, lerpSpeed);
        group.quaternion.slerp(tmpLocalQuat, lerpSpeed);
        const s = THREE.MathUtils.lerp(group.scale.x, 2.25, lerpSpeed);
        group.scale.setScalar(s);
      } else {
        tmpTargetLocal.copy(p.initialPos);
        tmpTargetLocal.y += Math.sin(time * 1.15 + p.phase) * 0.24;
        tmpTargetQuat.setFromEuler(p.initialRot);

        group.position.lerp(tmpTargetLocal, lerpSpeed);
        group.quaternion.slerp(tmpTargetQuat, lerpSpeed);
        const s = THREE.MathUtils.lerp(group.scale.x, 1, lerpSpeed);
        group.scale.setScalar(s);
      }
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
          isFocused={focusedPhotoId === placement.photo.id}
          onToggleFocus={handleToggleFocus}
          registerGroup={registerGroup}
        />
      ))}
    </group>
  );
}
