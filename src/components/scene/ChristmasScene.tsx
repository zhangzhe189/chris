import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type {
  AppearanceConfig,
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
        count={isLite ? 150 : 300}
      />
      <PhotoGallery3D
        photos={photos}
        handDataRef={handDataRef}
        focusedPhotoId={focusedPhotoId}
        onSelectPhoto={onSelectPhoto}
        accentColor={config.accentColor}
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
  const { lighting, space } = appearance;

  return (
    <div className="w-full h-screen relative" style={{ background: config.bgColor }}>
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
        <color attach="background" args={[config.bgColor]} />
        <fog attach="fog" args={[lighting.fogColor, lighting.fogNear, lighting.fogFar]} />

        {/* Cinematic layered lighting */}
        <ambientLight intensity={lighting.ambientIntensity} />
        <directionalLight
          position={[-12, 15, -9]}
          intensity={lighting.rimIntensity}
          color={lighting.rimColor}
        />
        <pointLight
          position={[11, 5, 11]}
          intensity={lighting.keyIntensity}
          distance={44}
          decay={2}
          color={lighting.keyColor}
        />

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
