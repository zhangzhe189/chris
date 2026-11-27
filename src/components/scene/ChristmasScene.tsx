import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type {
  AppearanceConfig,
  AppearanceLightingConfig,
  AudioMetrics,
  GalleryPhoto,
  HandData,
  SceneConfig,
  SceneState,
  SnowBurstRequest,
} from '../../types';
import { StarlightTree } from './StarlightTree';
import { Ornaments } from './Ornaments';
import { LightGarland } from './LightGarland';
import { AtmosphereSpace } from './AtmosphereSpace';
import { CelestialOrbits } from './CelestialOrbits';
import { SnowAndGround } from './SnowAndGround';
import { SnowBurstSystem } from './SnowBurstSystem';
import { PhotoGallery3D } from './PhotoGallery3D';

interface ChristmasSceneProps {
  sceneState: SceneState;
  appearance: AppearanceConfig;
  config: SceneConfig;
  photos: GalleryPhoto[];
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  burstQueueRef: MutableRefObject<SnowBurstRequest[]>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  onTriggerSkyBurst: (nx: number, ny: number) => void;
  isLite: boolean;
}

function SceneLightingRig({
  bgColor,
  lighting,
}: {
  bgColor: string;
  lighting: AppearanceLightingConfig;
}) {
  const { scene, gl } = useThree();
  const ambientRef = useRef<THREE.AmbientLight | null>(null);
  const rimRef = useRef<THREE.DirectionalLight | null>(null);
  const keyRef = useRef<THREE.PointLight | null>(null);
  const fillRef = useRef<THREE.PointLight | null>(null);

  const curBg = useRef(new THREE.Color(bgColor));
  const tgtBg = useRef(new THREE.Color(bgColor));
  const curFog = useRef(new THREE.Color(lighting.fogColor));
  const tgtFog = useRef(new THREE.Color(lighting.fogColor));
  const tgtKey = useRef(new THREE.Color(lighting.keyColor));
  const tgtRim = useRef(new THREE.Color(lighting.rimColor));
  const tgtFill = useRef(new THREE.Color(lighting.fillColor));

  useEffect(() => {
    scene.background = curBg.current.clone();
    scene.fog = new THREE.Fog(curFog.current.clone(), lighting.fogNear, lighting.fogFar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    tgtBg.current.set(bgColor);
    tgtFog.current.set(lighting.fogColor);
    tgtKey.current.set(lighting.keyColor);
    tgtRim.current.set(lighting.rimColor);
    tgtFill.current.set(lighting.fillColor);
  }, [bgColor, lighting]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.getElapsedTime();
    const rate = Math.min(1, delta * 3.4);

    curBg.current.lerp(tgtBg.current, rate);
    curFog.current.lerp(tgtFog.current, rate);

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(curBg.current);
    } else {
      scene.background = curBg.current.clone();
    }

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(curFog.current);
      scene.fog.near += (lighting.fogNear - scene.fog.near) * rate;
      scene.fog.far += (lighting.fogFar - scene.fog.far) * rate;
    }

    gl.toneMappingExposure += (lighting.exposure - gl.toneMappingExposure) * rate;

    const flicker = lighting.candleFlicker
      ? 1 + 0.055 * Math.sin(t * 4.1) + 0.035 * Math.sin(t * 7.3) + 0.018 * Math.sin(t * 13.7)
      : 1;

    if (ambientRef.current) {
      ambientRef.current.intensity +=
        (lighting.ambientIntensity - ambientRef.current.intensity) * rate;
    }

    if (rimRef.current) {
      rimRef.current.color.lerp(tgtRim.current, rate);
      rimRef.current.intensity += (lighting.rimIntensity - rimRef.current.intensity) * rate;
    }

    if (keyRef.current) {
      keyRef.current.color.lerp(tgtKey.current, rate);
      const targetKey = lighting.keyIntensity * flicker;
      keyRef.current.intensity += (targetKey - keyRef.current.intensity) * rate;
    }

    if (fillRef.current) {
      fillRef.current.color.lerp(tgtFill.current, rate);
      const targetFill = lighting.fillIntensity * (lighting.candleFlicker ? flicker : 1);
      fillRef.current.intensity += (targetFill - fillRef.current.intensity) * rate;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={lighting.ambientIntensity} />
      <directionalLight
        ref={rimRef}
        position={[-12, 15, -9]}
        intensity={lighting.rimIntensity}
        color={lighting.rimColor}
      />
      <pointLight
        ref={keyRef}
        position={[11, 5, 11]}
        intensity={lighting.keyIntensity}
        distance={44}
        decay={2}
        color={lighting.keyColor}
      />
      <pointLight
        ref={fillRef}
        position={[-10, -2, 8]}
        intensity={lighting.fillIntensity}
        distance={36}
        decay={2}
        color={lighting.fillColor}
      />
    </>
  );
}

interface RotatingTreeAssemblyProps {
  sceneState: SceneState;
  appearance: AppearanceConfig;
  config: SceneConfig;
  photos: GalleryPhoto[];
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  isLite: boolean;
}

/**
 * Coordinates continuous Quiet <-> Bloom orbital morph progress (0..1)
 * and smooth inertial hand-driven galaxy rotation with damping & pinch lock.
 */
function RotatingTreeAssembly({
  sceneState,
  appearance,
  config,
  photos,
  audioMetricsRef,
  handDataRef,
  focusedPhotoId,
  onSelectPhoto,
  isLite,
}: RotatingTreeAssemblyProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const bloomProgressRef = useRef(sceneState === 'BLOOM' ? 1 : 0);

  // Inertial rotation & subtle pitch exploration state for moving-hand gesture
  const rotVelYRef = useRef(0);
  const pitchRef = useRef(0);
  const pinchLockUntilRef = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    // Smoothly advance Quiet (0) <-> Bloom (1) progress independent of Appearance
    const bloomTarget = sceneState === 'BLOOM' ? 1 : 0;
    const morphSpeed = bloomTarget > bloomProgressRef.current ? 1.45 : 1.7;
    const diff = bloomTarget - bloomProgressRef.current;
    if (Math.abs(diff) > 0.0005) {
      bloomProgressRef.current += Math.sign(diff) * Math.min(Math.abs(diff), delta * morphSpeed);
    } else {
      bloomProgressRef.current = bloomTarget;
    }

    const group = groupRef.current;
    if (!group) return;

    const hand = handDataRef.current;
    const nowMs = performance.now();

    // Lock rotational impulse during/right after PINCH so selecting photos never spins the galaxy
    if (hand.source === 'camera' && hand.gesture === 'PINCH') {
      pinchLockUntilRef.current = nowMs + 480;
    }

    const allowHandExplore =
      hand.source === 'camera' &&
      hand.isPresent &&
      !focusedPhotoId &&
      nowMs > pinchLockUntilRef.current &&
      hand.gesture !== 'PINCH';

    if (allowHandExplore) {
      // Inject smoothed horizontal momentum & gentle vertical tilt from palm motion
      if (Math.abs(hand.vx) > 0.0001) {
        const gain = sceneState === 'BLOOM' ? 3.8 : 2.9;
        rotVelYRef.current = THREE.MathUtils.clamp(
          rotVelYRef.current + hand.vx * gain,
          -2.4,
          2.4
        );
      }
      if (Math.abs(hand.vy) > 0.0001) {
        pitchRef.current = THREE.MathUtils.clamp(pitchRef.current + hand.vy * 0.55, -0.22, 0.22);
      }
    }

    // Exponential physical damping so galaxy glides to a silky stop
    const damping = Math.exp(-delta * 3.4);
    rotVelYRef.current *= damping;
    if (Math.abs(rotVelYRef.current) < 0.0005) rotVelYRef.current = 0;

    // Gentle pitch relaxation back to horizon when hand is idle/away
    if (!allowHandExplore || Math.abs(hand.vy) < 0.0001) {
      pitchRef.current *= Math.exp(-delta * 1.8);
    }

    const baseSpin = focusedPhotoId
      ? 0
      : sceneState === 'BLOOM'
        ? appearance.motion.treeRotationSpeed * 0.55
        : appearance.motion.treeRotationSpeed;

    group.rotation.y += (baseSpin + rotVelYRef.current) * delta;
    group.rotation.x += (pitchRef.current - group.rotation.x) * Math.min(1, delta * 4.5);
  });

  return (
    <group ref={groupRef}>
      <StarlightTree
        bloomProgressRef={bloomProgressRef}
        audioMetricsRef={audioMetricsRef}
        count={config.particleCount}
        color1={config.particleColor1}
        color2={config.particleColor2}
        starColor={config.starColor}
        twinkleIntensity={appearance.motion.twinkleIntensity}
      />
      <Ornaments
        bloomProgressRef={bloomProgressRef}
        audioMetricsRef={audioMetricsRef}
        boxCount={config.boxCount}
        bellCount={config.bellCount}
        boxColor1={config.boxColor1}
        boxColor2={config.boxColor2}
        ribbonColor={config.ribbonColor}
        bellColor={config.bellColor}
        ornamentStyle={appearance.features.ornamentStyle}
        boxMetalness={appearance.defaults.boxMetalness}
        boxRoughness={appearance.defaults.boxRoughness}
        bellMetalness={appearance.defaults.bellMetalness}
        bellRoughness={appearance.defaults.bellRoughness}
      />
      <LightGarland
        bloomProgressRef={bloomProgressRef}
        audioMetricsRef={audioMetricsRef}
        colors={config.garlandColors}
        flowSpeed={appearance.motion.garlandFlowSpeed}
        count={isLite ? 150 : 300}
      />
      <PhotoGallery3D
        photos={photos}
        bloomProgressRef={bloomProgressRef}
        handDataRef={handDataRef}
        focusedPhotoId={focusedPhotoId}
        onSelectPhoto={onSelectPhoto}
        accentColor={config.accentColor}
        polaroidStyle={appearance.features}
        floatAmp={appearance.motion.polaroidFloatAmp}
      />
    </group>
  );
}

export function ChristmasScene({
  sceneState,
  appearance,
  config,
  photos,
  audioMetricsRef,
  handDataRef,
  burstQueueRef,
  focusedPhotoId,
  onSelectPhoto,
  onTriggerSkyBurst,
  isLite,
}: ChristmasSceneProps) {
  const { lighting, space, features } = appearance;
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="w-full h-screen relative transition-colors duration-700"
      style={{ background: config.bgColor }}
      onPointerDown={(e) => {
        if (e.button === 0) {
          pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
        }
      }}
    >
      <Canvas
        camera={{ position: [0, 1.35, 22.5], fov: 44 }}
        gl={{
          antialias: isLite,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: lighting.exposure,
          powerPreference: 'high-performance',
        }}
        dpr={isLite ? [1, 1.5] : [1, 2]}
        onPointerMissed={(e) => {
          const down = pointerDownPosRef.current;
          pointerDownPosRef.current = null;
          if (!down) return;
          const moveDist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
          // Ignore camera drags; treat crisp tap/click on empty sky as dismiss OR trailing snow burst
          if (moveDist > 6) return;
          if (focusedPhotoId) {
            onSelectPhoto(null);
            return;
          }
          const nx = e.clientX / Math.max(1, window.innerWidth);
          const ny = e.clientY / Math.max(1, window.innerHeight);
          onTriggerSkyBurst(nx, ny);
        }}
      >
        <SceneLightingRig bgColor={config.bgColor} lighting={lighting} />

        <Environment resolution={256}>
          <group>
            <Lightformer
              intensity={2.4}
              position={[0, 5, 10]}
              scale={[10, 6, 1]}
              color={lighting.envWarmColor}
            />
            <Lightformer
              intensity={1.15}
              position={[-9, 3, -6]}
              rotation-y={Math.PI / 3}
              scale={[7, 5, 1]}
              color={lighting.envCoolColor}
            />
            <Lightformer
              intensity={0.7}
              position={[0, 10, 0]}
              rotation-x={Math.PI / 2}
              scale={[8, 8, 1]}
              color="#f5e8cf"
            />
            <Lightformer
              intensity={0.45}
              position={[0, -6, 0]}
              rotation-x={-Math.PI / 2}
              scale={[10, 10, 1]}
              color={space.skyHorizon}
            />
          </group>
        </Environment>

        <AtmosphereSpace space={space} isLite={isLite} />

        <CelestialOrbits
          visible={features.orbitalRings}
          primaryColor={features.orbitalRingPrimary}
          secondaryColor={features.orbitalRingSecondary}
          isLite={isLite}
        />

        <group rotation={[0, -Math.PI / 4, 0]}>
          <RotatingTreeAssembly
            sceneState={sceneState}
            appearance={appearance}
            config={config}
            photos={photos}
            audioMetricsRef={audioMetricsRef}
            handDataRef={handDataRef}
            focusedPhotoId={focusedPhotoId}
            onSelectPhoto={onSelectPhoto}
            isLite={isLite}
          />
        </group>

        <SnowAndGround space={space} groundCoreColor={config.ringColor} isLite={isLite} />

        <SnowBurstSystem
          burstQueueRef={burstQueueRef}
          primaryColor={appearance.ui.ivory}
          accentColor={config.accentColor}
          isLite={isLite}
        />

        {!isLite && (
          <EffectComposer enableNormalPass={false}>
            <Bloom
              luminanceThreshold={lighting.bloomThreshold}
              mipmapBlur
              intensity={lighting.bloomIntensity}
              radius={lighting.bloomRadius}
            />
            <Vignette eskil={false} offset={0.22} darkness={lighting.vignetteDarkness} />
          </EffectComposer>
        )}

        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          maxDistance={42}
          minDistance={8.5}
          maxPolarAngle={Math.PI * 0.56}
          enableDamping
          dampingFactor={0.055}
        />
      </Canvas>
    </div>
  );
}
