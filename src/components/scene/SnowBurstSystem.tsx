import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SnowBurstRequest } from '../../types';

interface SnowBurstSystemProps {
  burstQueueRef: MutableRefObject<SnowBurstRequest[]>;
  primaryColor: string;
  accentColor: string;
  isLite: boolean;
}

const TRAIL_STEPS = 6;

interface ActiveFlake {
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  swirlPhase: number;
  useAccent: boolean;
  trail: Float32Array; // TRAIL_STEPS * 3
}

function createStarSnowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 248, 232, 0.9)');
    grad.addColorStop(0.6, 'rgba(235, 224, 200, 0.25)');
    grad.addColorStop(1, 'rgba(235, 224, 200, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle crisp 6-point crystal sparkle core
    ctx.save();
    ctx.translate(32, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -16);
      ctx.stroke();
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Pooled 3D luminous snowflake cluster burst with fading stardust trails.
 * Triggered by single-finger pointing gesture OR clicking/tapping empty sky.
 */
export function SnowBurstSystem({
  burstQueueRef,
  primaryColor,
  accentColor,
  isLite,
}: SnowBurstSystemProps) {
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points | null>(null);

  const maxFlakes = isLite ? 48 : 96;
  const flakesPerBurst = isLite ? 8 : 13;
  const totalPoints = maxFlakes * TRAIL_STEPS;

  const spriteTex = useMemo(() => createStarSnowTexture(), []);
  useEffect(() => {
    return () => spriteTex.dispose();
  }, [spriteTex]);

  const primaryCol = useMemo(() => new THREE.Color(primaryColor), [primaryColor]);
  const accentCol = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  // Pre-allocated pool & buffers for zero GC churn
  const poolRef = useRef<ActiveFlake[]>([]);
  const nextCursorRef = useRef(0);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(totalPoints * 3);
    const col = new Float32Array(totalPoints * 3);
    // Park inactive points far offscreen
    for (let i = 0; i < totalPoints; i++) {
      pos[i * 3 + 1] = -9999;
    }

    poolRef.current = Array.from({ length: maxFlakes }, () => ({
      active: false,
      age: 0,
      life: 1.4,
      pos: new THREE.Vector3(0, -9999, 0),
      vel: new THREE.Vector3(),
      swirlPhase: 0,
      useAccent: false,
      trail: new Float32Array(TRAIL_STEPS * 3),
    }));

    return { positions: pos, colors: col };
  }, [maxFlakes, totalPoints]);

  const tmpNdc = useMemo(() => new THREE.Vector3(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpSpawn = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const pool = poolRef.current;

    // Drain any queued burst requests from pointer tap or single-finger gesture
    const queue = burstQueueRef.current;
    while (queue.length > 0) {
      const req = queue.shift()!;
      const ndcX = req.nx * 2 - 1;
      const ndcY = -(req.ny * 2 - 1);

      tmpNdc.set(ndcX, ndcY, 0.5).unproject(camera);
      tmpDir.copy(tmpNdc).sub(camera.position).normalize();
      // Place burst cleanly in mid-foreground (~11.5 units from camera)
      tmpSpawn.copy(camera.position).addScaledVector(tmpDir, 11.5);

      for (let k = 0; k < flakesPerBurst; k++) {
        const idx = nextCursorRef.current % maxFlakes;
        nextCursorRef.current = (idx + 1) % maxFlakes;

        const flake = pool[idx];
        flake.active = true;
        flake.age = 0;
        flake.life = 1.15 + Math.random() * 0.75;
        flake.pos.copy(tmpSpawn);

        const theta = (k / flakesPerBurst) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        const speed = 1.1 + Math.random() * 1.9;
        const elev = (Math.random() - 0.35) * 1.4;
        flake.vel.set(Math.cos(theta) * speed, elev + 0.55, Math.sin(theta) * speed * 0.65);
        flake.swirlPhase = Math.random() * Math.PI * 2;
        flake.useAccent = Math.random() < 0.48;

        for (let s = 0; s < TRAIL_STEPS; s++) {
          flake.trail[s * 3] = tmpSpawn.x;
          flake.trail[s * 3 + 1] = tmpSpawn.y;
          flake.trail[s * 3 + 2] = tmpSpawn.z;
        }
      }
    }

    const pts = pointsRef.current;
    if (!pts) return;

    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = pts.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let anyUpdated = false;

    for (let i = 0; i < maxFlakes; i++) {
      const flake = pool[i];
      if (!flake.active) continue;
      anyUpdated = true;

      flake.age += delta;
      if (flake.age >= flake.life) {
        flake.active = false;
        const basePt = i * TRAIL_STEPS;
        for (let s = 0; s < TRAIL_STEPS; s++) {
          const pIdx = (basePt + s) * 3;
          posArr[pIdx + 1] = -9999;
          colArr[pIdx] = 0;
          colArr[pIdx + 1] = 0;
          colArr[pIdx + 2] = 0;
        }
        continue;
      }

      // Gentle air drag + soft gravity + flutter
      const drag = Math.exp(-delta * 1.75);
      flake.vel.multiplyScalar(drag);
      flake.vel.y -= 0.72 * delta;

      flake.pos.x += (flake.vel.x + Math.sin(time * 4 + flake.swirlPhase) * 0.28) * delta;
      flake.pos.y += flake.vel.y * delta;
      flake.pos.z += (flake.vel.z + Math.cos(time * 3.4 + flake.swirlPhase) * 0.22) * delta;

      // Shift trail tail backward smoothly
      for (let s = TRAIL_STEPS - 1; s > 0; s--) {
        const dst = s * 3;
        const src = (s - 1) * 3;
        flake.trail[dst] = THREE.MathUtils.lerp(flake.trail[dst], flake.trail[src], 0.52);
        flake.trail[dst + 1] = THREE.MathUtils.lerp(
          flake.trail[dst + 1],
          flake.trail[src + 1],
          0.52
        );
        flake.trail[dst + 2] = THREE.MathUtils.lerp(
          flake.trail[dst + 2],
          flake.trail[src + 2],
          0.52
        );
      }
      flake.trail[0] = flake.pos.x;
      flake.trail[1] = flake.pos.y;
      flake.trail[2] = flake.pos.z;

      const lifeNorm = flake.age / flake.life;
      const envelope =
        lifeNorm < 0.14 ? lifeNorm / 0.14 : Math.pow(Math.max(0, 1 - (lifeNorm - 0.14) / 0.86), 1.6);

      const baseCol = flake.useAccent ? accentCol : primaryCol;
      const basePt = i * TRAIL_STEPS;

      for (let s = 0; s < TRAIL_STEPS; s++) {
        const pIdx = (basePt + s) * 3;
        const tIdx = s * 3;
        posArr[pIdx] = flake.trail[tIdx];
        posArr[pIdx + 1] = flake.trail[tIdx + 1];
        posArr[pIdx + 2] = flake.trail[tIdx + 2];

        const tailFade = Math.pow(1 - s / TRAIL_STEPS, 1.55) * envelope * 1.35;
        colArr[pIdx] = baseCol.r * tailFade;
        colArr[pIdx + 1] = baseCol.g * tailFade;
        colArr[pIdx + 2] = baseCol.b * tailFade;
      }
    }

    if (anyUpdated) {
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  return (
    <points key={`snow-burst-${totalPoints}`} ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={spriteTex}
        size={0.42}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
