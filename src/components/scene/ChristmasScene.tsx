import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { AudioMetrics, GalleryPhoto, HandData, SceneConfig, TreeMode } from '../../types';
import { StarlightTree } from './StarlightTree';
import { Ornaments } from './Ornaments';
import { LightGarland } from './LightGarland';
import { SnowAndGround } from './SnowAndGround';
import { PhotoGallery3D } from './PhotoGallery3D';

interface ChristmasSceneProps {
  mode: TreeMode;
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
      groupRef.current.rotation.y += delta * 0.13;
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
      />
      <LightGarland
        mode={mode}
        audioMetricsRef={audioMetricsRef}
        handDataRef={handDataRef}
        bloomActiveRef={bloomActiveRef}
        colors={config.garlandColors}
        count={isLite ? 120 : 240}
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
  config,
  photos,
  audioMetricsRef,
  handDataRef,
  bloomActiveRef,
  focusedPhotoId,
  onSelectPhoto,
  isLite,
}: ChristmasSceneProps) {
  return (
    <div className="w-full h-screen relative" style={{ background: config.bgColor }}>
      <Canvas
        camera={{ position: [0, 1.4, 22], fov: 45 }}
        gl={{
          antialias: isLite,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
          powerPreference: 'high-performance',
        }}
        dpr={isLite ? [1, 1.5] : [1, 2]}
        onPointerMissed={() => {
          if (focusedPhotoId) onSelectPhoto(null);
        }}
      >
        <color attach="background" args={[config.bgColor]} />
        <fog attach="fog" args={[config.bgColor, 16, 56]} />

        <ambientLight intensity={0.42} />
        <directionalLight position={[-12, 14, -8]} intensity={0.55} color="#9fb8ff" />
        <pointLight
          position={[10, 4, 10]}
          intensity={14}
          distance={42}
          decay={2}
          color="#ffb17a"
        />

        <Environment resolution={256}>
          <group>
            <Lightformer
              intensity={3}
              position={[0, 5, 9]}
              scale={[10, 6, 1]}
              color="#ffd9a0"
            />
            <Lightformer
              intensity={1.3}
              position={[-8, 3, -6]}
              rotation-y={Math.PI / 3}
              scale={[6, 4, 1]}
              color="#8fb4ff"
            />
            <Lightformer
              intensity={0.9}
              position={[0, 9, 0]}
              rotation-x={Math.PI / 2}
              scale={[8, 8, 1]}
              color="#fff4e0"
            />
            <Lightformer
              intensity={0.5}
              position={[0, -6, 0]}
              rotation-x={-Math.PI / 2}
              scale={[10, 10, 1]}
              color="#38507a"
            />
          </group>
        </Environment>

        <group rotation={[0, -Math.PI / 4, 0]}>
          <RotatingTreeAssembly
            mode={mode}
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

        <SnowAndGround
          snowCount={isLite ? 420 : 1400}
          groundColor={config.snowGroundColor}
          ringColor={config.ringColor}
        />

        <Stars
          radius={110}
          depth={50}
          count={isLite ? 1400 : 3800}
          factor={3.6}
          saturation={0.15}
          fade
          speed={0.6}
        />

        {!isLite && (
          <EffectComposer enableNormalPass={false}>
            <Bloom
              luminanceThreshold={0.34}
              mipmapBlur
              intensity={0.82}
              radius={0.64}
            />
            <Vignette eskil={false} offset={0.18} darkness={0.78} />
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
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
