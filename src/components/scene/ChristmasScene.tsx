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
  TreeMode,
} from '../../types';
import { StarlightTree } from './StarlightTree';
import { Ornaments } from './Ornaments';
import { LightGarland } from './LightGarland';
import { AtmosphereSpace } from './AtmosphereSpace';
import { CelestialOrbits } from './CelestialOrbits';
import { SnowAndGround } from './SnowAndGround';
import { PhotoGallery3D } from './PhotoGallery3D';

interface ChristmasSceneProps {
  mode: TreeMode;
  appearance: AppearanceConfig;
  config: SceneConfig;
  photos: GalleryPhoto[];
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  bloomActiveRef: MutableRefObject<boolean>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  isLite: boolean;
}

/**
 * Smoothly crossfades scene background, fog, key/rim/fill lighting, exposure,
 * and organic warm candlelight flicker across Appearance transitions.
 */
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

    // Subtle organic candlelight flicker for Vintage Noel
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
  mode: TreeMode;
  appearance: AppearanceConfig;
  config: SceneConfig;
  photos: GalleryPhoto[];
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  handDataRef: MutableRefObject<HandData>;
  bloomActiveRef: MutableRefObject<boolean>;
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  isLite: boolean;
}

function RotatingTreeAssembly({
  mode,
  appearance,
  config,
  photos,
  audioMetricsRef,
  handDataRef,
  bloomActiveRef,
  focusedPhotoId,
  onSelectPhoto,
  isLite,
}: RotatingTreeAssemblyProps) {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current && mode === 'TREE' && !focusedPhotoId) {
      groupRef.current.rotation.y += delta * appearance.motion.treeRotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <StarlightTree
        mode={mode}
        audioMetricsRef={audioMetricsRef}
        handDataRef={handDataRef}
        bloomActiveRef={bloomActiveRef}
        count={config.particleCount}
        color1={config.particleColor1}
        color2={config.particleColor2}
        starColor={config.starColor}
        twinkleIntensity={appearance.motion.twinkleIntensity}
      />
      <Ornaments
        mode={mode}
        audioMetricsRef={audioMetricsRef}
        handDataRef={handDataRef}
        bloomActiveRef={bloomActiveRef}
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
        mode={mode}
        audioMetricsRef={audioMetricsRef}
        handDataRef={handDataRef}
        bloomActiveRef={bloomActiveRef}
        colors={config.garlandColors}
        flowSpeed={appearance.motion.garlandFlowSpeed}
        count={isLite ? 150 : 300}
      />
      <PhotoGallery3D
        photos={photos}
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
  mode,
  appearance,
  config,
  photos,
  audioMetricsRef,
  handDataRef,
  bloomActiveRef,
  focusedPhotoId,
  onSelectPhoto,
  isLite,
}: ChristmasSceneProps) {
  const { lighting, space, features } = appearance;

  return (
    <div
      className="w-full h-screen relative transition-colors duration-700"
      style={{ background: config.bgColor }}
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
        onPointerMissed={() => {
          if (focusedPhotoId) onSelectPhoto(null);
        }}
      >
        {/* Smoothly interpolated atmospheric lighting rig + background/fog + Vintage Noel candlelight */}
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

        {/* Layers 1 & 2: Far sky dome + slow stardust + midground breathing mist */}
        <AtmosphereSpace space={space} isLite={isLite} />

        {/* Memory Galaxy signature multi-layer tilted celestial orbital rings */}
        <CelestialOrbits
          visible={features.orbitalRings}
          primaryColor={features.orbitalRingPrimary}
          secondaryColor={features.orbitalRingSecondary}
          isLite={isLite}
        />

        {/* Hero 3D Tree Assembly */}
        <group rotation={[0, -Math.PI / 4, 0]}>
          <RotatingTreeAssembly
            mode={mode}
            appearance={appearance}
            config={config}
            photos={photos}
            audioMetricsRef={audioMetricsRef}
            handDataRef={handDataRef}
            bloomActiveRef={bloomActiveRef}
            focusedPhotoId={focusedPhotoId}
            onSelectPhoto={onSelectPhoto}
            isLite={isLite}
          />
        </group>

        {/* Layers 3 & 4: Dual-depth parallax snow/bokeh + feathered elliptical ground halo & embers */}
        <SnowAndGround
          space={space}
          groundCoreColor={config.ringColor}
          isLite={isLite}
        />

        {/* Restrained filmic bloom & subtle vignette (skipped gracefully in lite mode) */}
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
