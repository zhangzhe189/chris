import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CelestialOrbitsProps {
  visible: boolean;
  primaryColor: string;
  secondaryColor: string;
  isLite: boolean;
}

interface OrbitSpec {
  radius: number;
  tiltX: number;
  tiltZ: number;
  yOffset: number;
  speed: number;
  useSecondary: boolean;
  starlets: Array<{ x: number; z: number; size: number }>;
}

/**
 * Multi-layer tilted celestial orbits & crystal starlets (signature element of Memory Galaxy).
 * Smoothly crossfades opacity 0 <-> 1 during Appearance transitions.
 */
export function CelestialOrbits({
  visible,
  primaryColor,
  secondaryColor,
  isLite,
}: CelestialOrbitsProps) {
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const opacityRef = useRef(visible ? 1 : 0);

  const primaryCol = useMemo(() => new THREE.Color(primaryColor), [primaryColor]);
  const secondaryCol = useMemo(() => new THREE.Color(secondaryColor), [secondaryColor]);

  const orbits = useMemo<OrbitSpec[]>(() => {
    const specs = [
      { radius: 6.9, tiltX: 0.34, tiltZ: -0.22, yOffset: 0.4, speed: 0.12, useSecondary: false, count: 5 },
      { radius: 9.1, tiltX: -0.26, tiltZ: 0.3, yOffset: -0.5, speed: -0.085, useSecondary: true, count: 6 },
      { radius: 11.4, tiltX: 0.18, tiltZ: 0.15, yOffset: 1.2, speed: 0.055, useSecondary: false, count: 4 },
    ];
    const active = isLite ? specs.slice(0, 2) : specs;
    return active.map((o) => ({
      radius: o.radius,
      tiltX: o.tiltX,
      tiltZ: o.tiltZ,
      yOffset: o.yOffset,
      speed: o.speed,
      useSecondary: o.useSecondary,
      starlets: Array.from({ length: o.count }, (_, idx) => {
        const angle = (idx / o.count) * Math.PI * 2;
        return {
          x: Math.cos(angle) * o.radius,
          z: Math.sin(angle) * o.radius,
          size: idx % 2 === 0 ? 0.08 : 0.052,
        };
      }),
    }));
  }, [isLite]);

  const materials = useMemo(() => {
    return orbits.map((o) => ({
      ring: new THREE.MeshBasicMaterial({
        color: o.useSecondary ? secondaryColor : primaryColor,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      starlet: new THREE.MeshBasicMaterial({
        color: o.useSecondary ? primaryColor : secondaryColor,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbits.length]);

  useEffect(() => {
    return () => {
      materials.forEach((m) => {
        m.ring.dispose();
        m.starlet.dispose();
      });
    };
  }, [materials]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.getElapsedTime();
    const target = visible ? 1 : 0;
    opacityRef.current += (target - opacityRef.current) * Math.min(1, delta * 3.0);

    const alpha = opacityRef.current;
    const colRate = Math.min(1, delta * 3.8);

    for (let i = 0; i < orbits.length; i++) {
      const grp = groupRefs.current[i];
      if (grp && alpha > 0.004) {
        grp.rotation.y += delta * orbits[i].speed;
      }

      const matPair = materials[i];
      if (!matPair) continue;

      const ringCol = orbits[i].useSecondary ? secondaryCol : primaryCol;
      const starCol = orbits[i].useSecondary ? primaryCol : secondaryCol;
      matPair.ring.color.lerp(ringCol, colRate);
      matPair.starlet.color.lerp(starCol, colRate);

      const pulse = 0.84 + 0.16 * Math.sin(t * 0.9 + i * 1.7);
      matPair.ring.opacity = alpha * (i === 0 ? 0.24 : 0.17) * pulse;
      matPair.ring.visible = alpha > 0.005;

      matPair.starlet.opacity = alpha * 0.86 * pulse;
      matPair.starlet.visible = alpha > 0.005;
    }
  });

  return (
    <group>
      {orbits.map((orbit, idx) => (
        <group
          key={idx}
          position={[0, orbit.yOffset, 0]}
          rotation={[orbit.tiltX, 0, orbit.tiltZ]}
        >
          <group
            ref={(el) => {
              groupRefs.current[idx] = el;
            }}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]} material={materials[idx].ring}>
              <torusGeometry args={[orbit.radius, 0.014, 8, isLite ? 72 : 128]} />
            </mesh>

            {orbit.starlets.map((st, sIdx) => (
              <mesh key={sIdx} position={[st.x, 0, st.z]} material={materials[idx].starlet}>
                <octahedronGeometry args={[st.size, 0]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}
