import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_BOTTOM_Y, TREE_RADIUS } from './constants';

interface SnowAndGroundProps {
  snowCount: number;
  groundColor: string;
  ringColor: string;
}

function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(240, 248, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(210, 230, 255, 0.25)');
    grad.addColorStop(1, 'rgba(210, 230, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function SnowAndGround({ snowCount, groundColor, ringColor }: SnowAndGroundProps) {
  const snowRef = useRef<THREE.Points | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const snowTexture = useMemo(() => createSnowflakeTexture(), []);

  useEffect(() => {
    return () => snowTexture.dispose();
  }, [snowTexture]);

  const radius = 28;
  const maxY = 17;
  const minY = TREE_BOTTOM_Y - 1.2;

  const { positions, flakes } = useMemo(() => {
    const pos = new Float32Array(snowCount * 3);
    const meta: Array<{ speed: number; phase: number; drift: number }> = [];
    for (let i = 0; i < snowCount; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = minY + Math.random() * (maxY - minY);
      pos[i * 3 + 2] = Math.sin(theta) * r;
      meta.push({
        speed: 0.65 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        drift: 0.16 + Math.random() * 0.48,
      });
    }
    return { positions: pos, flakes: meta };
  }, [snowCount, minY]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();

    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.34 + Math.sin(time * 1.3) * 0.09;
    }

    if (snowRef.current) {
      const attr = snowRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < snowCount; i++) {
        const idx = i * 3;
        const flake = flakes[i];
        arr[idx + 1] -= flake.speed * delta;
        arr[idx] += Math.sin(time * 0.8 + flake.phase) * flake.drift * delta;
        arr[idx + 2] += Math.cos(time * 0.6 + flake.phase) * flake.drift * delta;
        if (arr[idx + 1] < minY) {
          const r = Math.sqrt(Math.random()) * radius;
          const theta = Math.random() * Math.PI * 2;
          arr[idx] = Math.cos(theta) * r;
          arr[idx + 1] = maxY;
          arr[idx + 2] = Math.sin(theta) * r;
        }
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Falling snow */}
      <points key={`snow-${snowCount}`} ref={snowRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={snowTexture}
          size={0.26}
          color="#ffffff"
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Snow ground, golden aura ring, and wooden tree trunk */}
      <group position={[0, TREE_BOTTOM_Y - 0.35, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[44, 64]} />
          <meshStandardMaterial
            color={groundColor}
            roughness={0.92}
            metalness={0.05}
            emissive="#121a30"
            emissiveIntensity={0.24}
            envMapIntensity={0.32}
          />
        </mesh>

        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[TREE_RADIUS * 0.42, TREE_RADIUS * 1.85, 64]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.52, 0.88, 2.5, 14]} />
          <meshStandardMaterial color="#4a2f1d" roughness={0.88} metalness={0.06} />
        </mesh>
      </group>
    </group>
  );
}
