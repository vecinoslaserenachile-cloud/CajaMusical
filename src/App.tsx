import React, { useState, Suspense, useRef, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Environment, Float, Text, Sparkles, Cloud, Clouds, PerspectiveCamera, RoundedBox, MeshReflectorMaterial, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Wind, Loader2, Play, Square, Info, Lightbulb, LightbulbOff, Box, Settings2, Volume2, VolumeX, Music, Camera, ListMusic, AlertTriangle, Upload, X, CloudRain, Snowflake, Sparkles as SparklesIcon, EyeOff, AudioLines, Hand, Link2, Link2Off, RotateCcw, RotateCw, Disc, ChevronDown, ChevronUp, Moon } from 'lucide-react';
import { AmbientSoundEngine, type AtmosphereMode } from './ambientAudio';
import { CoastalBeachBase } from './CoastalBeachBase';

// --- ERROR BOUNDARY ---
class ModelErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode, fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ModelErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Html center>
          <div className="flex flex-col items-center justify-center bg-[#1a1a1a]/90 backdrop-blur-md p-6 rounded-2xl border border-[#d4af37]/30 shadow-2xl w-64 text-center">
            <AlertTriangle size={32} className="mb-2 opacity-80 text-red-400" />
            <h3 className="text-[#d4af37] font-serif text-sm font-bold mb-2">Modelo Corrupto</h3>
            <p className="text-[#d4af37]/70 text-xs mb-4">
              El archivo 3D subido está dañado.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 border border-[#d4af37]/50 rounded-full hover:bg-[#d4af37]/10 transition-colors text-xs text-[#d4af37]"
            >
              Recargar
            </button>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

// --- MECANISMO INTERNO ---
function MusicMechanism({ isPlaying, speed }: { isPlaying: boolean, speed: number }) {
  const cylinderRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (isPlaying && cylinderRef.current) {
      cylinderRef.current.rotation.x -= delta * 1.5 * speed;
    }
  });

  // Generar pines del cilindro de forma determinista
  const pins = useMemo(() => {
    return [...Array(80)].map((_, i) => {
      const angle = (i * Math.PI * 2) / 20 + (i * 0.1);
      const x = -1.1 + (i * 2.2) / 80;
      return { pos: [x, Math.cos(angle) * 0.26, Math.sin(angle) * 0.26] as [number, number, number] };
    });
  }, []);

  return (
    <group position={[0, -0.6, 1.2]}>
      {/* Base del Peine (Comb) */}
      <mesh position={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[2.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Dientes del Peine */}
      {[...Array(30)].map((_, i) => (
        <mesh key={i} position={[-1.3 + i * 0.09, 0.05, 0.15]} castShadow>
          <boxGeometry args={[0.05, 0.02, 0.4]} />
          <meshStandardMaterial color="#e0e0e0" metalness={1} roughness={0.1} />
        </mesh>
      ))}
      {/* Cilindro Musical */}
      <group ref={cylinderRef} position={[0, 0.05, -0.1]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 2.6, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Pines */}
        {pins.map((pin, i) => (
          <mesh key={i} position={pin.pos}>
            <cylinderGeometry args={[0.015, 0.015, 0.06]} />
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Gears({ isPlaying, speed }: { isPlaying: boolean, speed: number }) {
  const gear1 = useRef<THREE.Mesh>(null);
  const gear2 = useRef<THREE.Mesh>(null);
  const gear3 = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (isPlaying) {
      if (gear1.current) gear1.current.rotation.z += delta * speed;
      if (gear2.current) gear2.current.rotation.z -= delta * 1.5 * speed;
      if (gear3.current) gear3.current.rotation.z += delta * 2 * speed;
    }
  });
  
  return (
    <group position={[1.4, -0.4, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={gear1} position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
        <meshStandardMaterial color="#b5a642" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh ref={gear2} position={[0.65, 0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 12]} />
        <meshStandardMaterial color="#8c7853" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh ref={gear3} position={[0.2, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 10]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

// --- ELEMENTOS DE LA CAJA ---
function MusicBoxBase({ isPlaying, speed, isLidOpen }: { isPlaying: boolean, speed: number, isLidOpen: boolean }) {
  const crankRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (isPlaying && crankRef.current) {
      crankRef.current.rotation.x += delta * 3 * speed;
    }
    if (lidRef.current) {
      const targetRotation = isLidOpen ? -Math.PI / 1.6 : 0;
      lidRef.current.rotation.x = THREE.MathUtils.lerp(lidRef.current.rotation.x, targetRotation, delta * 5);
    }
  });

  return (
    <group>
      {/* Base inferior (patas/borde) */}
      <RoundedBox args={[4.2, 0.3, 4.2]} position={[0, -1.25, 0]} radius={0.05} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#1a0f07" roughness={0.6} />
      </RoundedBox>
      
      {/* Patas doradas */}
      {[[-1.9, 1.9], [1.9, 1.9], [-1.9, -1.9], [1.9, -1.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, -1.4, z]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Cuerpo principal */}
      <RoundedBox args={[3.8, 1.0, 3.8]} position={[0, -0.6, 0]} radius={0.1} smoothness={4} castShadow receiveShadow>
        <meshPhysicalMaterial 
          color="#3d2314" 
          roughness={0.4} 
          metalness={0.2} 
          clearcoat={0.5} 
          clearcoatRoughness={0.2}
        />
      </RoundedBox>

      {/* Tapa abierta con espejo */}
      <group position={[0, 0, -1.9]} rotation={[0, 0, 0]} ref={lidRef}>
        <RoundedBox args={[3.8, 0.2, 3.8]} position={[0, 0.1, 1.9]} radius={0.1} smoothness={4} castShadow>
          <meshPhysicalMaterial 
            color="#3d2314" 
            roughness={0.4} 
            metalness={0.2} 
            clearcoat={0.5} 
            clearcoatRoughness={0.2}
          />
        </RoundedBox>
        {/* Espejo interior */}
        <mesh position={[0, 0.21, 1.9]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[3.4, 3.4]} />
          <MeshReflectorMaterial 
            blur={[300, 100]}
            resolution={512}
            mixBlur={1}
            mixStrength={40}
            roughness={0.1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#151515"
            metalness={0.5}
            mirror={1}
          />
        </mesh>
      </group>

      {/* Bisagras doradas */}
      <mesh position={[-1.2, 0, -1.9]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[1.2, 0, -1.9]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Interior de la caja (Terciopelo) */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.1, 3.4]} />
        <meshStandardMaterial color="#4a0404" roughness={0.9} />
      </mesh>

      {/* Mecanismo Musical */}
      <MusicMechanism isPlaying={isPlaying} speed={speed} />
      <Gears isPlaying={isPlaying} speed={speed} />

      {/* Manivela (Crank) */}
      <group position={[2.0, -0.6, 1.2]} ref={crankRef}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.25, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.5]} />
          <meshStandardMaterial color="#2d1b0d" roughness={0.6} />
        </mesh>
        <mesh position={[0.2, 0.125, 0]}>
          <boxGeometry args={[0.06, 0.25, 0.06]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} />
        </mesh>
      </group>

      {/* Llave de cuerda (Winding Key) */}
      <group position={[-1.9, -0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        {/* Eje */}
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Cabeza de la llave */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <torusGeometry args={[0.15, 0.04, 16, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.15, 0.04, 16, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Placa Frontal de Oro */}
      <mesh position={[0, -0.6, 1.91]}>
        <planeGeometry args={[2.8, 0.5]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
      </mesh>
      
      <Text position={[0, -0.5, 1.92]} fontSize={0.18} color="#1a1a1a" letterSpacing={0.1}>
        VECINOS LA SERENA
      </Text>
      <Text position={[0, -0.7, 1.92]} fontSize={0.08} color="#4d3200" letterSpacing={0.2}>
        FANTASÍA MUSICAL
      </Text>
    </group>
  );
}

function RotatingPlatform({
  isPlaying,
  speed,
  manualSpinDir,
  pendingManualDelta,
  inertialVelocity,
  isDraggingTurntable,
  onTurntablePointerDown,
  isLidOpen,
  children,
}: {
  isPlaying: boolean;
  speed: number;
  manualSpinDir: React.MutableRefObject<number>;
  pendingManualDelta: React.MutableRefObject<number>;
  inertialVelocity: React.MutableRefObject<number>;
  isDraggingTurntable: React.MutableRefObject<boolean>;
  onTurntablePointerDown: (clientX: number, clientY: number) => void;
  isLidOpen: boolean;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const contentRef = useRef<THREE.Group>(null);
  const autoBlendRef = useRef<number>(1);
  
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (groupRef.current) {
      // 1. Arrastre 1:1 directo mientras el usuario desliza/hace swipe
      if (pendingManualDelta.current !== 0) {
        groupRef.current.rotation.y += pendingManualDelta.current;
        pendingManualDelta.current = 0;
        autoBlendRef.current = 0;
      }

      // 2. Botones de giro manual (aceleran la inercia suavemente)
      if (manualSpinDir.current !== 0) {
        const targetVel = 2.8 * manualSpinDir.current;
        inertialVelocity.current = THREE.MathUtils.damp(
          inertialVelocity.current,
          targetVel,
          10,
          dt
        );
        autoBlendRef.current = 0;
      }

      // 3. Inercia tras swipe rápido: continúa girando y frena suavemente por fricción exponencial
      if (!isDraggingTurntable.current && Math.abs(inertialVelocity.current) > 0.005) {
        groupRef.current.rotation.y += inertialVelocity.current * dt;
        inertialVelocity.current *= Math.exp(-2.3 * dt);
        if (Math.abs(inertialVelocity.current) <= 0.005) {
          inertialVelocity.current = 0;
        }
      } else if (
        !isDraggingTurntable.current &&
        manualSpinDir.current === 0 &&
        isPlaying
      ) {
        // 4. Reanudar suavemente el giro automático una vez disipada la inercia
        autoBlendRef.current = THREE.MathUtils.damp(autoBlendRef.current, 1, 3.5, dt);
        groupRef.current.rotation.y += dt * 0.5 * speed * autoBlendRef.current;
      }
    }
    if (contentRef.current) {
      const targetScale = isLidOpen ? 1 : 0;
      contentRef.current.scale.setScalar(
        THREE.MathUtils.lerp(contentRef.current.scale.x, targetScale, delta * 4)
      );
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTurntablePointerDown(e.clientX, e.clientY);
      }}
    >
      {/* El plato giratorio dorado */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.6, 1.7, 0.1, 64]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Terciopelo del plato */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[1.55, 1.55, 0.11, 64]} />
        <meshStandardMaterial color="#4a0404" roughness={0.9} />
      </mesh>
      <group ref={contentRef}>
        {children}
      </group>
    </group>
  );
}

// --- PERSISTENCIA LOCAL EN INDEXEDDB PARA .GLB GRANDES ---
const IDB_NAME = 'laserenacajamusica_db';
const IDB_STORE = 'models';
const IDB_KEY = 'custom_faro_glb';

function openModelDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveModelToIDB(fileName: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openModelDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ fileName, buffer }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('No se pudo guardar el modelo en IndexedDB:', e);
  }
}

async function loadModelFromIDB(): Promise<{ fileName: string; buffer: ArrayBuffer } | null> {
  try {
    const db = await openModelDB();
    const result = await new Promise<{ fileName: string; buffer: ArrayBuffer } | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

async function parseAndValidateGLBBuffer(buffer: ArrayBuffer): Promise<THREE.Group> {
  if (buffer.byteLength < 12) {
    throw new Error(`Archivo vacío o demasiado pequeño (${buffer.byteLength} bytes).`);
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  // 0x46546C67 === "glTF"
  if (magic === 0x46546c67) {
    const declaredLength = view.getUint32(8, true);
    if (declaredLength !== buffer.byteLength) {
      const actualKB = (buffer.byteLength / 1024).toFixed(1);
      const declaredMB = (declaredLength / (1024 * 1024)).toFixed(1);
      throw new Error(
        `El archivo faro.glb en el servidor está incompleto (${actualKB} KB de ${declaredMB} MB declarados).`
      );
    }
  }

  await MeshoptDecoder.ready;

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  return new Promise<THREE.Group>((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (gltf) => {
        dracoLoader.dispose();
        resolve(gltf.scene);
      },
      (error) => {
        dracoLoader.dispose();
        reject(error instanceof Error ? error : new Error('No se pudo interpretar el archivo 3D.'));
      }
    );
  });
}

// --- CARGADOR SEGURO DE MODELO GLB (CON SOPORTE DRACO + MESHOPT) ---
async function loadAndValidateGLB(url: string): Promise<{ scene: THREE.Group; buffer: ArrayBuffer }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el modelo (HTTP ${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  const scene = await parseAndValidateGLBBuffer(buffer);
  return { scene, buffer };
}

// --- MODELO TRIPO / PERSONALIZADO 3D ---
function TripoModel({
  scene,
  isPlaying,
  speed,
  isLightOn,
}: {
  scene: THREE.Group;
  isPlaying: boolean;
  speed: number;
  isLightOn: boolean;
}) {
  const beamRef = useRef<THREE.Group>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const bulbHaloRef = useRef<THREE.Mesh>(null);
  const bulbHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamMat1Ref = useRef<THREE.MeshBasicMaterial>(null);
  const beamMat2Ref = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    if (isPlaying && beamRef.current) {
      beamRef.current.rotation.y += delta * 2 * speed;
    }

    if (isLightOn) {
      const t = state.clock.elapsedTime;
      // Función sinusoidal compuesta basada en el tiempo para simular filamento antiguo
      const flicker =
        Math.sin(t * 2.6) * 0.48 +
        Math.sin(t * 7.4 + 1.2) * 0.24 +
        Math.sin(t * 18.5 + 0.5) * 0.12;
      const intensity = Math.max(1.3, 2.8 + flicker * 1.25);
      const norm = THREE.MathUtils.clamp((intensity - 1.3) / 2.6, 0, 1);

      if (pointLightRef.current) {
        pointLightRef.current.intensity = intensity;
      }
      if (bulbHaloRef.current) {
        bulbHaloRef.current.scale.setScalar(1 + norm * 0.45);
      }
      if (bulbHaloMatRef.current) {
        bulbHaloMatRef.current.opacity = 0.22 + norm * 0.28;
      }
      const beamOpacity = 0.1 + norm * 0.09;
      if (beamMat1Ref.current) beamMat1Ref.current.opacity = beamOpacity;
      if (beamMat2Ref.current) beamMat2Ref.current.opacity = beamOpacity;
    }
  });

  // Calcular centro, escala y altura normalizada sobre el plato
  const layout = useMemo(() => {
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 && Number.isFinite(maxDim) ? 3.2 / maxDim : 1;
    const height = size.y * scale;
    return {
      scale,
      offset: [-center.x * scale, -box.min.y * scale + 0.05, -center.z * scale] as [number, number, number],
      lightY: height * 0.88 + 0.05,
    };
  }, [scene]);

  return (
    <group>
      <group position={layout.offset} scale={layout.scale}>
        <primitive object={scene} />
      </group>
      {isLightOn && (
        <group position={[0, layout.lightY, 0]}>
          <pointLight ref={pointLightRef} intensity={2.8} color="#ffe7a3" distance={15} />
          {/* Núcleo de bombilla cálida */}
          <mesh>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color="#fff8dc" />
          </mesh>
          {/* Halo de glow parpadeante */}
          <mesh ref={bulbHaloRef}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial
              ref={bulbHaloMatRef}
              color="#ffd27d"
              transparent
              opacity={0.35}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <group ref={beamRef}>
            <mesh position={[0, 0, 5]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[3, 10, 32, 1, true]} />
              <meshBasicMaterial ref={beamMat1Ref} color="#ffe8ad" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0, 0, -5]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[3, 10, 32, 1, true]} />
              <meshBasicMaterial ref={beamMat2Ref} color="#ffe8ad" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}



// --- FARO MONUMENTAL DETALLADO ---
function FaroPlaceholder({ isPlaying, speed, isLightOn }: { isPlaying: boolean, speed: number, isLightOn: boolean }) {
  const beamRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (isPlaying && beamRef.current) {
      beamRef.current.rotation.y += delta * 2 * speed;
    }
  });

  return (
    <group position={[0, 0.05, 0]}>
      {/* Pedestal de piedra escalonado */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.3, 2.4]} />
        <meshStandardMaterial color="#8b8989" roughness={0.9} bumpScale={0.05} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.2, 2.0]} />
        <meshStandardMaterial color="#a09d9d" roughness={0.9} bumpScale={0.05} />
      </mesh>

      {/* Escaleras de la base */}
      <group position={[0, 0.25, 1.25]}>
        <mesh position={[0, -0.1, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.1, 0.2]} />
          <meshStandardMaterial color="#7a7a7a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.1, 0.2]} />
          <meshStandardMaterial color="#7a7a7a" roughness={0.9} />
        </mesh>
      </group>

      {/* Base del faro (Castillo cuadrado) */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.8, 1.8]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} bumpScale={0.02} />
      </mesh>
      
      {/* Detalles de la base (Almenas) */}
      {[-0.8, 0, 0.8].map((x) => 
        [-0.8, 0, 0.8].map((z) => {
          if (x === 0 && z === 0) return null;
          return (
            <mesh key={`${x}-${z}`} position={[x, 1.35, z]} castShadow>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
            </mesh>
          );
        })
      )}

      {/* Torre principal */}
      <mesh position={[0, 2.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.45, 1.6, 32]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.8} />
      </mesh>

      {/* Reloj de la torre */}
      <group position={[0, 2.15, 0.41]}>
        {/* Borde del reloj */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Esfera del reloj */}
        <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0.01]}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Centro del reloj */}
        <mesh position={[0, 0, 0.04]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Manecillas */}
        <mesh position={[0, 0.04, 0.04]}>
          <boxGeometry args={[0.015, 0.08, 0.01]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.03, 0, 0.04]} rotation={[0, 0, -Math.PI/4]}>
          <boxGeometry args={[0.01, 0.12, 0.01]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Marcas de las horas */}
        {[...Array(12)].map((_, i) => (
          <mesh key={`hour-${i}`} position={[
            Math.cos((i / 12) * Math.PI * 2) * 0.12,
            Math.sin((i / 12) * Math.PI * 2) * 0.12,
            0.035
          ]} rotation={[0, 0, (i / 12) * Math.PI * 2]}>
            <boxGeometry args={[0.02, 0.005, 0.01]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        ))}
      </group>

      {/* Ventanas arqueadas */}
      {[1.2, 1.6].map((y, i) => (
        <group key={i} position={[0, y, 0.46]}>
          {/* Marco de la ventana */}
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.18, 0.23, 0.02]} />
            <meshStandardMaterial color="#8b8989" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.115, 0.01]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
            <meshStandardMaterial color="#8b8989" roughness={0.9} />
          </mesh>
          {/* Vidrio */}
          <mesh>
            <boxGeometry args={[0.15, 0.2, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
      
      {/* Balcón del faro */}
      <mesh position={[0, 2.85, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.5, 0.1, 32]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>

      {/* Barandilla del balcón */}
      <mesh position={[0, 2.95, 0]} rotation={[Math.PI/2, 0, 0]} castShadow>
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.8} />
      </mesh>
      {[...Array(12)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 6) * 0.5, 2.9, Math.sin(i * Math.PI / 6) * 0.5]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.1]} />
          <meshStandardMaterial color="#333333" metalness={0.8} />
        </mesh>
      ))}

      {/* Sala de la linterna (vidrio) */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
        <meshStandardMaterial color="#88ccff" metalness={0.9} roughness={0.05} transparent opacity={0.4} />
      </mesh>

      {/* Pilares de la linterna */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 0.3, 3.1, Math.sin(i * Math.PI / 4) * 0.3]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4]} />
          <meshStandardMaterial color="#333333" metalness={0.8} />
        </mesh>
      ))}
      
      {/* Cúpula roja */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#b22222" roughness={0.4} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 3.65, 0]} castShadow>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.1} />
      </mesh>
      
      {/* Puerta principal */}
      <mesh position={[0, 0.75, 0.91]}>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>

      {isLightOn && (
        <>
          {/* Luz del faro */}
          <pointLight position={[0, 3.1, 0]} intensity={3} color="#fff2cc" distance={15} />
          <mesh position={[0, 3.1, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Haz de luz giratorio */}
          <group position={[0, 3.1, 0]} ref={beamRef}>
            <mesh position={[0, 0, 5]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[3, 10, 32, 1, true]} />
              <meshBasicMaterial color="#fff2cc" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0, 0, -5]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[3, 10, 32, 1, true]} />
              <meshBasicMaterial color="#fff2cc" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        </>
      )}

      <Sparkles count={60} scale={4} size={2} speed={0.5} color="#ffd700" />
    </group>
  );
}

const ATMOSPHERE_BG: Record<AtmosphereMode, string> = {
  magic: '#0f0d0b',
  rain: '#080c12',
  snow: '#0b1018',
  none: '#0f0d0b',
};

const ATMOSPHERE_NIGHT_BG: Record<AtmosphereMode, string> = {
  magic: '#050811',
  rain: '#04070e',
  snow: '#060b16',
  none: '#050811',
};

const _dayAmbientColor = new THREE.Color('#ffffff');
const _nightAmbientColor = new THREE.Color('#6b8cc7');
const _dayKeyColor = new THREE.Color('#ffffff');
const _nightKeyColor = new THREE.Color('#8cb4f5');
const _dayRimColor = new THREE.Color('#ffffff');
const _nightRimColor = new THREE.Color('#587fc7');

function SceneLighting({ isNightMode }: { isNightMode: boolean }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const nightUnderLightRef = useRef<THREE.PointLight>(null);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const lambda = 6;

    if (ambientRef.current) {
      const targetIntensity = isNightMode ? 0.22 : 2;
      ambientRef.current.intensity = THREE.MathUtils.damp(ambientRef.current.intensity, targetIntensity, lambda, dt);
      ambientRef.current.color.lerp(isNightMode ? _nightAmbientColor : _dayAmbientColor, 1 - Math.exp(-lambda * dt));
    }

    if (spotRef.current) {
      const targetSpot = isNightMode ? 0.75 : 3;
      spotRef.current.intensity = THREE.MathUtils.damp(spotRef.current.intensity, targetSpot, lambda, dt);
      spotRef.current.color.lerp(isNightMode ? _nightKeyColor : _dayKeyColor, 1 - Math.exp(-lambda * dt));
    }

    if (dirRef.current) {
      const targetDir = isNightMode ? 0.35 : 1.5;
      dirRef.current.intensity = THREE.MathUtils.damp(dirRef.current.intensity, targetDir, lambda, dt);
      dirRef.current.color.lerp(isNightMode ? _nightRimColor : _dayRimColor, 1 - Math.exp(-lambda * dt));
    }

    if (nightUnderLightRef.current) {
      const targetUnder = isNightMode ? 14 : 0;
      const next = THREE.MathUtils.damp(nightUnderLightRef.current.intensity, targetUnder, lambda, dt);
      nightUnderLightRef.current.intensity = next;
      nightUnderLightRef.current.visible = next > 0.02 || isNightMode;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={2} />
      <spotLight ref={spotRef} position={[10, 15, 10]} angle={Math.PI / 4} penumbra={0.5} intensity={3} castShadow />
      <directionalLight ref={dirRef} position={[-10, 10, -10]} intensity={1.5} />
      {/* Luz puntual azulada baja desde abajo para contraste nocturno dramático */}
      <pointLight
        ref={nightUnderLightRef}
        position={[0, -1.35, 3.5]}
        color="#3b9eff"
        intensity={0}
        distance={18}
        decay={1.4}
        visible={false}
      />
    </>
  );
}

function RainParticles({ speed }: { speed: number }) {
  const count = 420;
  const lineRef = useRef<THREE.LineSegments>(null);

  const { geometry, material, velocities } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 2 * 3);
    const vels = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 24;
      const y = Math.random() * 18 - 4;
      const z = (Math.random() - 0.5) * 24;
      const len = 0.45 + Math.random() * 0.45;
      vels[i] = 12 + Math.random() * 8;

      const idx = i * 6;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      positions[idx + 3] = x - 0.08;
      positions[idx + 4] = y + len;
      positions[idx + 5] = z;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#93c5fd',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    return { geometry: geo, material: mat, velocities: vels };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_state, delta) => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const dt = Math.min(delta, 0.05) * (0.7 + speed * 0.4);

    for (let i = 0; i < count; i++) {
      const idx = i * 6;
      const dy = velocities[i] * dt;
      const dx = -0.9 * dt;
      arr[idx] += dx;
      arr[idx + 1] -= dy;
      arr[idx + 3] += dx;
      arr[idx + 4] -= dy;

      if (arr[idx + 4] < -5) {
        const nx = (Math.random() - 0.5) * 24;
        const ny = 13 + Math.random() * 4;
        const nz = (Math.random() - 0.5) * 24;
        const len = 0.45 + Math.random() * 0.45;
        arr[idx] = nx;
        arr[idx + 1] = ny;
        arr[idx + 2] = nz;
        arr[idx + 3] = nx - 0.08;
        arr[idx + 4] = ny + len;
        arr[idx + 5] = nz;
      }
    }
    posAttr.needsUpdate = true;
  });

  return <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false} />;
}

function SnowParticles({ speed }: { speed: number }) {
  const count = 380;
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material, texture, speeds, phases } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.45, 'rgba(224, 242, 254, 0.85)');
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const fallSpeeds = new Float32Array(count);
    const driftPhases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * 18 - 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
      fallSpeeds[i] = 1.1 + Math.random() * 1.4;
      driftPhases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.22,
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: geo, material: mat, texture: tex, speeds: fallSpeeds, phases: driftPhases };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [geometry, material, texture]);

  useFrame((state, delta) => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const dt = Math.min(delta, 0.05) * (0.7 + speed * 0.3);
    const elapsed = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const phase = phases[i];
      arr[idx] += Math.sin(elapsed * 0.9 + phase) * 0.4 * dt;
      arr[idx + 1] -= speeds[i] * dt;
      arr[idx + 2] += Math.cos(elapsed * 0.7 + phase) * 0.3 * dt;

      if (arr[idx + 1] < -4.5) {
        arr[idx] = (Math.random() - 0.5) * 24;
        arr[idx + 1] = 13 + Math.random() * 3;
        arr[idx + 2] = (Math.random() - 0.5) * 24;
      }
    }
    posAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

type CloudBankConfig = {
  key: string;
  position: [number, number, number];
  bounds: [number, number, number];
  color: string;
  seed: number;
  scale?: number;
};

type CloudAtmospherePreset = {
  segments: number;
  volume: number;
  smallestVolume: number;
  opacity: number;
  growth: number;
  driftSpeed: number;
  banks: CloudBankConfig[];
};

const CLOUD_PRESETS: Record<Exclude<AtmosphereMode, 'none'>, CloudAtmospherePreset> = {
  // Densidad ligera y etérea para atmósfera mágica
  magic: {
    segments: 12,
    volume: 4.2,
    smallestVolume: 0.3,
    opacity: 0.22,
    growth: 2.5,
    driftSpeed: 0.12,
    banks: [
      { key: 'm-1', position: [-9, 5.4, -9], bounds: [6, 1.4, 2.2], color: '#bfa16a', seed: 11 },
      { key: 'm-2', position: [9, 5.8, -8], bounds: [5.5, 1.3, 2.0], color: '#d4af37', seed: 23 },
      { key: 'm-3', position: [0, 6.6, -12], bounds: [7, 1.5, 2.5], color: '#8f7854', seed: 37 },
      { key: 'm-4', position: [-10, -1.2, 6], bounds: [5, 1.0, 2.0], color: '#a88c5d', seed: 51 },
    ],
  },
  // Densidad media-alta invernal para nieve
  snow: {
    segments: 20,
    volume: 5.8,
    smallestVolume: 0.35,
    opacity: 0.42,
    growth: 3.4,
    driftSpeed: 0.18,
    banks: [
      { key: 's-1', position: [-9.5, 5.2, -8.5], bounds: [6.5, 1.8, 2.8], color: '#cfe0f5', seed: 101 },
      { key: 's-2', position: [8.5, 5.6, -9.0], bounds: [6.5, 1.8, 2.8], color: '#b7cde6', seed: 117 },
      { key: 's-3', position: [0, 6.4, -11.5], bounds: [8.0, 2.0, 3.0], color: '#dceaf7', seed: 131 },
      { key: 's-4', position: [-10.5, 1.2, 5.5], bounds: [5.5, 1.3, 2.4], color: '#afc4db', seed: 149 },
      { key: 's-5', position: [10.0, 1.6, 6.0], bounds: [5.5, 1.3, 2.4], color: '#c4d8ed', seed: 163 },
    ],
  },
  // Alta densidad y volumen tormentoso para lluvia
  rain: {
    segments: 24,
    volume: 7.2,
    smallestVolume: 0.4,
    opacity: 0.58,
    growth: 4.5,
    driftSpeed: 0.34,
    banks: [
      { key: 'r-1', position: [-8.5, 5.0, -8.0], bounds: [7.5, 2.2, 3.2], color: '#4d6075', seed: 203 },
      { key: 'r-2', position: [8.5, 5.3, -8.0], bounds: [7.5, 2.2, 3.2], color: '#3f5166', seed: 219 },
      { key: 'r-3', position: [0, 6.0, -10.5], bounds: [9.0, 2.4, 3.6], color: '#5b7088', seed: 233 },
      { key: 'r-4', position: [-10.0, 2.4, 5.0], bounds: [6.5, 1.8, 2.8], color: '#374759', seed: 247 },
      { key: 'r-5', position: [10.0, 2.8, 5.5], bounds: [6.5, 1.8, 2.8], color: '#44576d', seed: 261 },
      { key: 'r-6', position: [0, -1.6, -10.0], bounds: [8.5, 1.4, 3.0], color: '#2f3e4f', seed: 277 },
    ],
  },
};

function createProceduralCloudTextureUrl(): string {
  if (typeof document === 'undefined') return '';
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const lobes = [
    { x: 128, y: 128, r: 92, a: 0.36 },
    { x: 96, y: 118, r: 66, a: 0.30 },
    { x: 162, y: 122, r: 68, a: 0.30 },
    { x: 126, y: 94, r: 64, a: 0.28 },
    { x: 116, y: 156, r: 62, a: 0.25 },
    { x: 154, y: 152, r: 58, a: 0.24 },
    { x: 84, y: 146, r: 48, a: 0.20 },
  ];

  for (const lobe of lobes) {
    const grad = ctx.createRadialGradient(lobe.x, lobe.y, 0, lobe.x, lobe.y, lobe.r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`);
    grad.addColorStop(0.55, `rgba(245, 248, 255, ${lobe.a * 0.45})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

function VolumetricClouds({ mode, speed }: { mode: AtmosphereMode; speed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudTextureUrl = useMemo(() => createProceduralCloudTextureUrl(), []);

  useFrame((_state, delta) => {
    if (!groupRef.current || mode === 'none') return;
    const preset = CLOUD_PRESETS[mode];
    const dt = Math.min(delta, 0.05);
    groupRef.current.rotation.y += dt * 0.025 * (0.5 + preset.driftSpeed * 2.2) * (0.6 + speed * 0.4);
  });

  if (mode === 'none' || !cloudTextureUrl) return null;

  const preset = CLOUD_PRESETS[mode];

  return (
    <group ref={groupRef}>
      <Clouds texture={cloudTextureUrl} limit={160} frustumCulled={false}>
        {preset.banks.map((bank) => (
          <Cloud
            key={`${mode}-${bank.key}`}
            seed={bank.seed}
            segments={preset.segments}
            bounds={bank.bounds}
            volume={preset.volume}
            smallestVolume={preset.smallestVolume}
            opacity={preset.opacity}
            growth={preset.growth}
            speed={preset.driftSpeed * (0.7 + speed * 0.35)}
            fade={6}
            concentrate="inside"
            color={bank.color}
            position={bank.position}
          />
        ))}
      </Clouds>
    </group>
  );
}

function AtmosphereEffects({ mode, speed }: { mode: AtmosphereMode; speed: number }) {
  if (mode === 'none') return null;

  if (mode === 'magic') {
    return (
      <group>
        <Sparkles
          count={95}
          scale={[20, 12, 20]}
          position={[0, 2, 0]}
          size={3.2}
          speed={0.45 * speed}
          color="#ffd700"
          opacity={0.75}
        />
        <Sparkles
          count={50}
          scale={[16, 10, 16]}
          position={[0, 2.5, 0]}
          size={5}
          speed={0.25 * speed}
          color="#fff3cc"
          opacity={0.4}
        />
      </group>
    );
  }

  if (mode === 'rain') {
    return (
      <group>
        <RainParticles speed={speed} />
        <Sparkles
          count={35}
          scale={[18, 10, 18]}
          position={[0, 1, 0]}
          size={2.2}
          speed={0.8 * speed}
          color="#7dd3fc"
          opacity={0.28}
        />
      </group>
    );
  }

  return (
    <group>
      <SnowParticles speed={speed} />
      <Sparkles
        count={45}
        scale={[18, 12, 18]}
        position={[0, 2, 0]}
        size={2.5}
        speed={0.2 * speed}
        color="#e0f2fe"
        opacity={0.5}
      />
    </group>
  );
}

function CameraHandler({ preset, autoRotate, enabled }: { preset: string, autoRotate: boolean, enabled: boolean }) {
  const controlsRef = useRef<any>(null);
  const { size, camera } = useThree();
  const isPortrait = size.width < size.height;
  const aspect = size.width / Math.max(1, size.height);
  const distScale = isPortrait ? Math.min(1.65, Math.max(1.22, 0.88 / Math.max(aspect, 0.44))) : 1;

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = enabled;
    }
  }, [enabled]);

  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pCam = camera as THREE.PerspectiveCamera;
      const targetFov = isPortrait ? 48 : 40;
      if (pCam.fov !== targetFov) {
        pCam.fov = targetFov;
        pCam.updateProjectionMatrix();
      }
    }
  }, [camera, isPortrait]);

  useFrame((_state, delta) => {
    if (autoRotate && enabled && controlsRef.current) {
      controlsRef.current.rotate(0.5 * delta, 0, false);
    }
  });

  useEffect(() => {
    if (controlsRef.current) {
      const ty = isPortrait ? 0.35 : 0;
      switch (preset) {
        case 'top':
          controlsRef.current.setLookAt(0, 12 * distScale, 0, 0, ty, 0, true);
          break;
        case 'front':
          controlsRef.current.setLookAt(0, 2 * distScale, 12 * distScale, 0, ty, 0, true);
          break;
        case 'detail':
          controlsRef.current.setLookAt(0, 4 * distScale, 6 * distScale, 0, -0.5 + ty * 0.5, 1, true);
          break;
        case 'mechanism':
          controlsRef.current.setLookAt(2 * distScale, 2 * distScale, 4 * distScale, 0, -0.5, 1.2, true);
          break;
        case 'default':
        default:
          controlsRef.current.setLookAt(8 * distScale, 6 * distScale, 8 * distScale, 0, ty, 0, true);
          break;
      }
    }
  }, [preset, distScale, isPortrait]);

  return (
    <CameraControls 
      ref={controlsRef} 
      enabled={enabled}
      minDistance={2} 
      maxDistance={isPortrait ? 26 : 20}
      maxPolarAngle={Math.PI / 2 - 0.02}
      makeDefault
    />
  );
}

// --- APP PRINCIPAL ---
export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasModel, setHasModel] = useState(false);
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [isLidOpen, setIsLidOpen] = useState(true);
  const [isLightOn, setIsLightOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [songIndex, setSongIndex] = useState(0);
  const [cameraPreset, setCameraPreset] = useState('default');
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>('magic');
  const [isAmbientSoundOn, setIsAmbientSoundOn] = useState(true);
  const [isLighthouseDecoupled, setIsLighthouseDecoupled] = useState(false);
  const [lighthouseSpeed, setLighthouseSpeed] = useState(1);
  const [isCanvasHoldPaused, setIsCanvasHoldPaused] = useState(false);
  const [isButtonHoldPaused, setIsButtonHoldPaused] = useState(false);
  const [canvasDragMode, setCanvasDragMode] = useState<'camera' | 'turntable'>('camera');
  const [isDraggingTurntable, setIsDraggingTurntable] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'views' | 'lighthouse' | 'atmosphere'>('none');
  const [isDesktopDockOpen, setIsDesktopDockOpen] = useState(true);
  const [isNightMode, setIsNightMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const ambientEngineRef = useRef<AmbientSoundEngine | null>(null);
  const manualSpinDirRef = useRef<number>(0);
  const pendingManualDeltaRef = useRef<number>(0);
  const inertialVelocityRef = useRef<number>(0);
  const isDraggingTurntableRef = useRef<boolean>(false);
  const swipeSamplesRef = useRef<Array<{ x: number; t: number }>>([]);
  const lastDragXRef = useRef<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  if (!ambientEngineRef.current) {
    ambientEngineRef.current = new AmbientSoundEngine();
  }

  const songs = [
    { name: "Melodía Clásica", url: "https://cdn.freesound.org/previews/401/401146_5121236-lq.mp3" },
    { name: "Caja de Música Suave", url: "https://cdn.freesound.org/previews/328/328857_4899915-lq.mp3" },
    { name: "Canción de Cuna", url: "https://cdn.freesound.org/previews/251/251461_4486188-lq.mp3" },
    { name: "Vals Antiguo", url: "https://cdn.freesound.org/previews/160/160223_2578041-lq.mp3" }
  ];

  useEffect(() => {
    return () => {
      ambientEngineRef.current?.dispose();
      if (holdTimerRef.current !== null) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const isPlatformHeld = isCanvasHoldPaused || isButtonHoldPaused;
  const effectiveLighthousePlaying = isPlatformHeld
    ? false
    : isLighthouseDecoupled
      ? lighthouseSpeed !== 0
      : isPlaying;
  const effectiveLighthouseSpeed = isLighthouseDecoupled ? lighthouseSpeed : speed;

  const startTurntableSwipe = (clientX: number, clientY: number) => {
    isDraggingTurntableRef.current = true;
    setIsDraggingTurntable(true);
    inertialVelocityRef.current = 0;
    lastDragXRef.current = clientX;
    pointerDownPosRef.current = { x: clientX, y: clientY };
    swipeSamplesRef.current = [{ x: clientX, t: performance.now() }];

    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(() => {
      setIsCanvasHoldPaused(true);
      holdTimerRef.current = null;
    }, 200);
  };

  useEffect(() => {
    if (!isDraggingTurntable) return;

    const handleWindowMove = (e: PointerEvent) => {
      const now = performance.now();
      const dx = e.clientX - lastDragXRef.current;
      lastDragXRef.current = e.clientX;

      if (pointerDownPosRef.current && holdTimerRef.current !== null) {
        const totalDx = e.clientX - pointerDownPosRef.current.x;
        const totalDy = e.clientY - pointerDownPosRef.current.y;
        if (totalDx * totalDx + totalDy * totalDy > 25) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
          setIsCanvasHoldPaused(false);
        }
      }

      if (Math.abs(dx) > 0) {
        pendingManualDeltaRef.current += dx * 0.012;
        swipeSamplesRef.current.push({ x: e.clientX, t: now });
        const cutoff = now - 120;
        while (swipeSamplesRef.current.length > 2 && swipeSamplesRef.current[0].t < cutoff) {
          swipeSamplesRef.current.shift();
        }
      }
    };

    const handleWindowUp = (e: PointerEvent) => {
      const now = performance.now();
      const samples = swipeSamplesRef.current;
      const refSample = samples.find((s) => now - s.t <= 100) ?? samples[0];
      if (refSample) {
        const dtSec = (now - refSample.t) / 1000;
        const totalDx = e.clientX - refSample.x;
        if (dtSec > 0.008 && Math.abs(totalDx) > 4) {
          const vel = (totalDx * 0.012) / dtSec;
          inertialVelocityRef.current = Math.max(-22, Math.min(22, vel));
        }
      }

      isDraggingTurntableRef.current = false;
      setIsDraggingTurntable(false);
      pointerDownPosRef.current = null;
      swipeSamplesRef.current = [];
      if (holdTimerRef.current !== null) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setIsCanvasHoldPaused(false);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [isDraggingTurntable]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canvasDragMode === 'turntable' || e.shiftKey || e.button === 2) {
      startTurntableSwipe(e.clientX, e.clientY);
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(() => {
      setIsCanvasHoldPaused(true);
      holdTimerRef.current = null;
    }, 200);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTurntableRef.current) return;
    if (!pointerDownPosRef.current || holdTimerRef.current === null) return;
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    if (dx * dx + dy * dy > 36) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const clearCanvasHold = () => {
    if (isDraggingTurntableRef.current) return;
    pointerDownPosRef.current = null;
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsCanvasHoldPaused(false);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    ambientEngineRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
    ambientEngineRef.current?.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    ambientEngineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    ambientEngineRef.current?.setEnabled(isAmbientSoundOn);
  }, [isAmbientSoundOn]);

  useEffect(() => {
    ambientEngineRef.current?.syncIfUnlocked(atmosphere);
  }, [atmosphere]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
    }
  }, [songIndex]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(e => console.warn("Audio autoplay prevented:", e));
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, volume]);

  const playUISound = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext not supported or blocked");
    }
  };

  const toggleLid = () => {
    playUISound(300, 'triangle', 0.2);
    const willOpen = !isLidOpen;
    setIsLidOpen(willOpen);
    setIsPlaying(willOpen);
    if (willOpen) {
      ambientEngineRef.current?.setMode(atmosphere, true);
    }
  };

  const toggleLight = () => {
    playUISound(600, 'square', 0.05);
    setIsLightOn(!isLightOn);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const uploadGlbBufferToServer = async (buffer: ArrayBuffer) => {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB por fragmento (seguro para proxies)
    const totalChunks = Math.max(1, Math.ceil(buffer.byteLength / CHUNK_SIZE));
    try {
      setUploadStatus('Guardando modelo en el servidor (0%)...');
      const initRes = await fetch('/api/faro-upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: buffer.byteLength }),
      });
      if (!initRes.ok) throw new Error('No se pudo iniciar la subida.');
      const { uploadId } = await initRes.json();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(buffer.byteLength, start + CHUNK_SIZE);
        const chunk = buffer.slice(start, end);
        const chunkRes = await fetch('/api/faro-upload/chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-upload-id': uploadId,
          },
          body: chunk,
        });
        if (!chunkRes.ok) {
          throw new Error(`Error al subir parte ${i + 1}/${totalChunks}.`);
        }
        const pct = Math.round(((i + 1) / totalChunks) * 100);
        setUploadStatus(`Guardando en el servidor (${pct}%)...`);
      }

      const finishRes = await fetch('/api/faro-upload/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      });
      if (!finishRes.ok) {
        const errData = await finishRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al verificar el archivo en el servidor.');
      }

      const sizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(1);
      setUploadStatus(`Guardado permanentemente (${sizeMB} MB)`);
      setTimeout(() => setUploadStatus(null), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar en el servidor.';
      console.warn('Server upload failed:', msg);
      setUploadStatus(`Solo guardado en este navegador (${msg})`);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function autoLoadInitialModel() {
      try {
        const statusRes = await fetch('/api/faro-status');
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.valid && !cancelled) {
            setIsGenerating(true);
            const { scene } = await loadAndValidateGLB(`/faro.glb?v=${Date.now()}`);
            if (!cancelled) {
              setLoadedScene(scene);
              setCustomFileName('faro.glb');
              setHasModel(true);
              setIsGenerating(false);
            }
            return;
          }
        }
      } catch {
        // continuar al fallback de IndexedDB
      }

      const cached = await loadModelFromIDB();
      if (cached && !cancelled) {
        try {
          setIsGenerating(true);
          const scene = await parseAndValidateGLBBuffer(cached.buffer);
          if (!cancelled) {
            setLoadedScene(scene);
            setCustomFileName(cached.fileName);
            setHasModel(true);
            setIsGenerating(false);
            // Sincronizar automáticamente hacia public/faro.glb si el servidor no lo tenía válido
            uploadGlbBufferToServer(cached.buffer);
          }
        } catch {
          if (!cancelled) setIsGenerating(false);
        }
      }
    }
    autoLoadInitialModel();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  const loadModelFromUrl = async (url: string, fileName?: string, persistEverywhere = false) => {
    setIsGenerating(true);
    setModelError(null);
    try {
      const { scene, buffer } = await loadAndValidateGLB(url);
      if (persistEverywhere && fileName) {
        saveModelToIDB(fileName, buffer);
        uploadGlbBufferToServer(buffer);
      }
      setLoadedScene(scene);
      if (fileName) setCustomFileName(fileName);
      setHasModel(true);
      setIsLidOpen(true);
      setIsPlaying(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el modelo 3D.';
      console.warn('No se pudo cargar el GLB:', msg);
      setLoadedScene(null);
      setModelError(msg);
      setHasModel(true);
      setIsLidOpen(true);
      setIsPlaying(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
    }
    const blobUrl = URL.createObjectURL(file);
    activeBlobUrlRef.current = blobUrl;

    if (audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.volume = volume;
      }).catch(() => {});
    }
    playUISound(500, 'triangle', 0.25);
    ambientEngineRef.current?.setMode(atmosphere, true);
    loadModelFromUrl(blobUrl, file.name, true);
    e.target.value = '';
  };

  const simulateGeneration = async () => {
    // Desbloquear audio con la interacción directa del usuario
    if (audioRef.current) {
      audioRef.current.volume = 0; // Mute temporal para el desbloqueo
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.volume = volume;
      }).catch(() => {});
    }
    
    playUISound(400, 'sawtooth', 0.3);
    ambientEngineRef.current?.setMode(atmosphere, true);

    if (loadedScene) {
      setIsGenerating(true);
      setTimeout(() => {
        setIsGenerating(false);
        setHasModel(true);
        setIsLidOpen(true);
        setIsPlaying(true);
      }, 600);
      return;
    }

    // Revisar primero si hay un .glb guardado localmente en IndexedDB
    const cached = await loadModelFromIDB();
    if (cached) {
      setIsGenerating(true);
      setModelError(null);
      try {
        const scene = await parseAndValidateGLBBuffer(cached.buffer);
        setLoadedScene(scene);
        setCustomFileName(cached.fileName);
        setHasModel(true);
        setIsLidOpen(true);
        setIsPlaying(true);
        setIsGenerating(false);
        return;
      } catch {
        setIsGenerating(false);
      }
    }

    loadModelFromUrl(`/faro.glb?v=${Date.now()}`);
  };

  return (
    <div className="w-full h-[100dvh] bg-[#121212] flex flex-col font-serif select-none overflow-hidden overscroll-none">
      {/* Elemento de audio oculto */}
      <audio 
        ref={audioRef} 
        src={songs[songIndex].url} 
        loop 
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        onChange={handleLocalFileUpload}
        className="hidden"
      />
      
      {/* Título Estilo Vintage */}
      <div className="pt-3 sm:pt-7 pb-1 text-center z-10 px-3 shrink-0">
        <h1 className="text-2xl sm:text-4xl text-[#d4af37] tracking-[0.22em] sm:tracking-[0.3em] uppercase opacity-90 drop-shadow-md">
          La Serena
        </h1>
        <p className="text-amber-100/40 italic text-xs sm:text-sm mt-1 sm:mt-2 truncate max-w-xs sm:max-w-none mx-auto">
          {customFileName ? `Caja de Música Virtual • ${customFileName}` : 'Caja de Música Virtual v1.0'}
        </p>
        {uploadStatus && (
          <p className="text-[#d4af37] text-[11px] sm:text-xs mt-1 tracking-wide">{uploadStatus}</p>
        )}
      </div>

      {/* Aviso no bloqueante si public/faro.glb está corrupto/truncado */}
      {modelError && (
        <div className="mx-auto mt-2 max-w-xl px-3 sm:px-4 z-20 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-[#1e1812]/95 border border-[#d4af37]/40 rounded-xl px-3 sm:px-4 py-2 text-[11px] sm:text-xs text-amber-100/90 shadow-lg">
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <AlertTriangle size={15} className="text-amber-400 shrink-0" />
              <span>
                {modelError} Se muestra el faro clásico. Carga tu <strong className="text-[#d4af37]">.glb</strong> directo:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d4af37] text-black font-bold hover:brightness-110 transition cursor-pointer"
              >
                <Upload size={13} />
                Cargar .GLB
              </button>
              <button
                onClick={() => setModelError(null)}
                className="p-1 text-amber-100/50 hover:text-amber-100 cursor-pointer"
                title="Cerrar aviso"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor 3D */}
      <div
        className={`flex-1 min-h-0 w-full relative touch-none ${
          isDraggingTurntable
            ? 'cursor-grabbing'
            : canvasDragMode === 'turntable'
              ? 'cursor-grab'
              : ''
        }`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={clearCanvasHold}
        onPointerLeave={clearCanvasHold}
        onPointerCancel={clearCanvasHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Canvas shadows className="canvas">
          <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={40} />
          <color attach="background" args={[isNightMode ? ATMOSPHERE_NIGHT_BG[atmosphere] : ATMOSPHERE_BG[atmosphere]]} />
          <fog attach="fog" args={[isNightMode ? ATMOSPHERE_NIGHT_BG[atmosphere] : ATMOSPHERE_BG[atmosphere], 7, 29]} />
          
          <SceneLighting isNightMode={isNightMode} />

          <AtmosphereEffects mode={atmosphere} speed={speed} />
          <Suspense fallback={null}>
            <VolumetricClouds mode={atmosphere} speed={speed} />
          </Suspense>

          <Suspense fallback={null}>
            <Environment preset="city" environmentIntensity={isNightMode ? 0.25 : 1} />
            <group>
              <CoastalBeachBase isNightMode={isNightMode} />
              <MusicBoxBase isPlaying={isPlaying} speed={speed} isLidOpen={isLidOpen} />
              
              <RotatingPlatform
                isPlaying={effectiveLighthousePlaying}
                speed={effectiveLighthouseSpeed}
                manualSpinDir={manualSpinDirRef}
                pendingManualDelta={pendingManualDeltaRef}
                inertialVelocity={inertialVelocityRef}
                isDraggingTurntable={isDraggingTurntableRef}
                onTurntablePointerDown={startTurntableSwipe}
                isLidOpen={isLidOpen}
              >
                <ModelErrorBoundary>
                  {hasModel && loadedScene ? (
                    <TripoModel
                      scene={loadedScene}
                      isPlaying={effectiveLighthousePlaying}
                      speed={effectiveLighthouseSpeed}
                      isLightOn={isLightOn}
                    />
                  ) : (
                    <FaroPlaceholder
                      isPlaying={effectiveLighthousePlaying}
                      speed={effectiveLighthouseSpeed}
                      isLightOn={isLightOn}
                    />
                  )}
                </ModelErrorBoundary>
              </RotatingPlatform>

              {/* Notas musicales flotantes */}
              {isPlaying && (
                <group>
                  <Float speed={2} rotationIntensity={2} floatIntensity={2}>
                    <Text position={[2.5, 3, 0]} fontSize={0.5} color="#d4af37" fillOpacity={0.8}>♪</Text>
                  </Float>
                  <Float speed={2.5} rotationIntensity={2} floatIntensity={2}>
                    <Text position={[-2.5, 3.5, -1]} fontSize={0.4} color="#d4af37" fillOpacity={0.8}>♫</Text>
                  </Float>
                  <Float speed={1.5} rotationIntensity={3} floatIntensity={2}>
                    <Text position={[0, 4, 2]} fontSize={0.3} color="#d4af37" fillOpacity={0.8}>♩</Text>
                  </Float>
                </group>
              )}
            </group>
          </Suspense>

          <CameraHandler
            preset={cameraPreset}
            autoRotate={!isPlaying && !isGenerating && !isPlatformHeld && !isLighthouseDecoupled && !isDraggingTurntable}
            enabled={!isDraggingTurntable && canvasDragMode === 'camera'}
          />
        </Canvas>

        {/* Indicador visual al pausar rotación con clic sostenido */}
        {isPlatformHeld && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 w-max max-w-[90vw] flex items-center justify-center gap-2 rounded-full bg-black/80 border border-[#d4af37]/50 px-3.5 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-[#d4af37] shadow-lg text-center">
            <Hand size={13} className="shrink-0" />
            <span>Rotación pausada • Suelta para reanudar</span>
          </div>
        )}

        {/* Overlay de Carga */}
        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <Loader2 className="w-12 h-12 text-[#d4af37] animate-spin mb-4" />
            <p className="text-[#d4af37] tracking-[0.2em] animate-pulse uppercase text-xs">
              Cargando modelo 3D del Faro...
            </p>
          </div>
        )}
      </div>

      {/* Controles Adaptativos (Móvil Vertical + Escritorio) */}
      <div className="shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-5 flex flex-col items-center gap-2.5 md:gap-3.5 bg-gradient-to-t from-black via-black/95 to-transparent z-10">

        {/* Panel Desplegable Exclusivo Móvil Vertical */}
        {mobilePanel !== 'none' && (
          <div className="md:hidden w-full max-w-md rounded-2xl bg-[#14110e]/95 border border-[#d4af37]/30 p-3 shadow-2xl flex flex-col gap-2.5">
            {mobilePanel === 'views' && (
              <>
                <div className="flex items-center justify-between gap-2 bg-black/50 px-3 py-2 rounded-xl border border-[#d4af37]/20">
                  <div className="flex items-center gap-2 shrink-0">
                    <ListMusic size={14} className="text-[#d4af37]/70" />
                    <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/70">Melodía</span>
                  </div>
                  <select
                    value={songIndex}
                    onChange={(e) => setSongIndex(parseInt(e.target.value))}
                    className="bg-transparent text-[#d4af37] text-xs uppercase tracking-wider outline-none cursor-pointer text-right flex-1 min-w-0"
                  >
                    {songs.map((song, idx) => (
                      <option key={idx} value={idx} className="bg-[#121212]">{song.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl border border-[#d4af37]/20">
                  {volume === 0 ? <VolumeX size={14} className="text-[#d4af37]/70 shrink-0" /> : <Volume2 size={14} className="text-[#d4af37]/70 shrink-0" />}
                  <span className="text-[#d4af37]/70 text-[10px] uppercase tracking-wider shrink-0">Volumen</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-[#d4af37] cursor-pointer"
                  />
                  <span className="text-[#d4af37] text-xs font-mono w-9 text-right">{Math.round(volume * 100)}%</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {['default', 'front', 'top', 'detail', 'mechanism'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCameraPreset(preset)}
                      className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                        cameraPreset === preset
                          ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                          : 'border-[#d4af37]/25 text-[#d4af37]/80'
                      }`}
                    >
                      {preset === 'default' ? 'General' : preset === 'front' ? 'Frente' : preset === 'top' ? 'Arriba' : preset === 'detail' ? 'Detalle' : 'Mecanismo'}
                    </button>
                  ))}
                </div>
              </>
            )}

            {mobilePanel === 'lighthouse' && (
              <>
                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl border border-[#d4af37]/20">
                  <Settings2 size={14} className="text-[#d4af37]/70 shrink-0" />
                  <span className="text-[#d4af37]/70 text-[10px] uppercase tracking-wider shrink-0">Mecanismo</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="flex-1 accent-[#d4af37] cursor-pointer"
                  />
                  <span className="text-[#d4af37] text-xs font-mono w-8 text-right">{speed.toFixed(1)}x</span>
                </div>

                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl border border-[#d4af37]/20">
                  <button
                    onClick={() => {
                      playUISound(isLighthouseDecoupled ? 360 : 540, 'sine', 0.08);
                      setIsLighthouseDecoupled(!isLighthouseDecoupled);
                    }}
                    className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 cursor-pointer ${
                      isLighthouseDecoupled ? 'bg-[#d4af37] text-black font-bold' : 'border border-[#d4af37]/30 text-[#d4af37]/80'
                    }`}
                  >
                    {isLighthouseDecoupled ? <Link2Off size={11} /> : <Link2 size={11} />}
                    <span>{isLighthouseDecoupled ? 'Libre' : 'Faro'}</span>
                  </button>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={isLighthouseDecoupled ? lighthouseSpeed : speed}
                    onChange={(e) => {
                      if (!isLighthouseDecoupled) setIsLighthouseDecoupled(true);
                      setLighthouseSpeed(parseFloat(e.target.value));
                    }}
                    className="flex-1 accent-[#d4af37] cursor-pointer"
                  />
                  <span className="text-[#d4af37] text-xs font-mono w-9 text-right">
                    {(isLighthouseDecoupled ? lighthouseSpeed : speed).toFixed(1)}x
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const next = canvasDragMode === 'camera' ? 'turntable' : 'camera';
                      playUISound(next === 'turntable' ? 620 : 440, 'sine', 0.08);
                      setCanvasDragMode(next);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-2 rounded-full border cursor-pointer ${
                      canvasDragMode === 'turntable'
                        ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                        : 'border-[#d4af37]/30 text-[#d4af37]/80'
                    }`}
                  >
                    <Disc size={12} />
                    <span>{canvasDragMode === 'turntable' ? 'Swipe Plato' : 'Swipe Cámara'}</span>
                  </button>

                  <button
                    onPointerDown={() => setIsButtonHoldPaused(true)}
                    onPointerUp={() => setIsButtonHoldPaused(false)}
                    onPointerLeave={() => setIsButtonHoldPaused(false)}
                    onPointerCancel={() => setIsButtonHoldPaused(false)}
                    className={`flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider px-3 py-2 rounded-full border cursor-pointer ${
                      isButtonHoldPaused
                        ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                        : 'border-[#d4af37]/30 text-[#d4af37]/80'
                    }`}
                  >
                    <Hand size={12} />
                    <span>Sostener</span>
                  </button>

                  <button
                    onPointerDown={() => { manualSpinDirRef.current = -1; }}
                    onPointerUp={() => { manualSpinDirRef.current = 0; }}
                    onPointerLeave={() => { manualSpinDirRef.current = 0; }}
                    onPointerCancel={() => { manualSpinDirRef.current = 0; }}
                    className="p-2 rounded-full border border-[#d4af37]/30 text-[#d4af37] active:bg-[#d4af37] active:text-black cursor-pointer"
                    aria-label="Girar izquierda"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onPointerDown={() => { manualSpinDirRef.current = 1; }}
                    onPointerUp={() => { manualSpinDirRef.current = 0; }}
                    onPointerLeave={() => { manualSpinDirRef.current = 0; }}
                    onPointerCancel={() => { manualSpinDirRef.current = 0; }}
                    className="p-2 rounded-full border border-[#d4af37]/30 text-[#d4af37] active:bg-[#d4af37] active:text-black cursor-pointer"
                    aria-label="Girar derecha"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </>
            )}

            {mobilePanel === 'atmosphere' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {([
                  { id: 'magic', label: 'Mágicas', Icon: SparklesIcon },
                  { id: 'rain', label: 'Lluvia', Icon: CloudRain },
                  { id: 'snow', label: 'Nieve', Icon: Snowflake },
                  { id: 'none', label: 'Ninguno', Icon: EyeOff },
                ] as const).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      playUISound(id === 'magic' ? 720 : id === 'rain' ? 380 : id === 'snow' ? 560 : 280, 'sine', 0.08);
                      setAtmosphere(id);
                      ambientEngineRef.current?.setMode(id, true);
                    }}
                    className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
                      atmosphere === id
                        ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                        : 'border-[#d4af37]/25 text-[#d4af37]/80'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{label}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const next = !isAmbientSoundOn;
                    setIsAmbientSoundOn(next);
                    ambientEngineRef.current?.setEnabled(next);
                    if (next) ambientEngineRef.current?.setMode(atmosphere, true);
                  }}
                  className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
                    isAmbientSoundOn && atmosphere !== 'none'
                      ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-[#d4af37]'
                      : 'border-gray-700 text-gray-500'
                  }`}
                >
                  <AudioLines size={12} />
                  <span>{isAmbientSoundOn ? 'Audio ON' : 'Audio OFF'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pestañas Compactas Exclusivas Móvil Vertical */}
        <div className="md:hidden flex items-center justify-center gap-2 w-full max-w-md">
          {([
            { id: 'views', label: 'Vistas & Audio', Icon: Camera, hasIndicator: false },
            { id: 'lighthouse', label: 'Faro & Giro', Icon: Disc, hasIndicator: isLighthouseDecoupled || canvasDragMode === 'turntable' },
            { id: 'atmosphere', label: 'Ambiente', Icon: SparklesIcon, hasIndicator: atmosphere !== 'none' && isAmbientSoundOn },
          ] as const).map(({ id, label, Icon, hasIndicator }) => {
            const active = mobilePanel === id;
            return (
              <button
                key={id}
                onClick={() => setMobilePanel(active ? 'none' : id)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-full border text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                    : 'bg-black/60 border-[#d4af37]/25 text-[#d4af37]/80'
                }`}
              >
                <Icon size={12} className="shrink-0" />
                <span className="truncate">{label}</span>
                {hasIndicator && !active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Barra Principal de Acción (Móvil + Escritorio) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={simulateGeneration}
            disabled={isGenerating}
            className="group relative flex items-center gap-1.5 sm:gap-2 bg-transparent border-2 border-[#d4af37]/50 text-[#d4af37] px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:border-[#d4af37] hover:bg-[#d4af37]/10 transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
          >
            <Wind className="group-hover:rotate-180 transition-transform duration-1000" size={16} />
            <span className="font-bold tracking-widest uppercase text-[11px] sm:text-xs">
              {hasModel ? "Reiniciar" : "Dar Cuerda"}
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 sm:gap-2 bg-transparent border-2 border-[#d4af37]/40 text-[#d4af37] px-3.5 py-2 sm:px-4 sm:py-3 rounded-full hover:border-[#d4af37] hover:bg-[#d4af37]/10 transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
            title="Cargar archivo .GLB desde tu computadora"
          >
            <Upload size={15} />
            <span className="font-bold tracking-widest uppercase text-[11px] sm:text-xs">Subir .GLB</span>
          </button>

          {hasModel && (
            <button
              onClick={() => {
                playUISound(isPlaying ? 200 : 800, 'sine', 0.1);
                if (!isPlaying && !isLidOpen) {
                  setIsLidOpen(true);
                }
                if (!isPlaying) {
                  ambientEngineRef.current?.setMode(atmosphere, true);
                }
                setIsPlaying(!isPlaying);
              }}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[#d4af37] text-black rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-110 transition-transform cursor-pointer"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Square fill="black" size={15} /> : <Play fill="black" size={15} />}
            </button>
          )}

          <button
            onClick={toggleLid}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 transition-all cursor-pointer ${isLidOpen ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37]' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
            title={isLidOpen ? "Cerrar Tapa" : "Abrir Tapa"}
          >
            <Box size={16} />
          </button>

          <button
            onClick={toggleLight}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 transition-all cursor-pointer ${isLightOn ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
            title={isLightOn ? "Apagar Faro" : "Encender Faro"}
          >
            {isLightOn ? <Lightbulb size={16} /> : <LightbulbOff size={16} />}
          </button>

          <button
            onClick={() => {
              playUISound(isNightMode ? 520 : 320, 'sine', 0.12);
              setIsNightMode(!isNightMode);
            }}
            className={`h-10 sm:h-12 px-3 sm:px-4 flex items-center justify-center gap-1.5 rounded-full border-2 transition-all cursor-pointer ${
              isNightMode
                ? 'border-sky-400 bg-sky-950/75 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.35)]'
                : 'border-[#d4af37]/40 bg-transparent text-[#d4af37]/80 hover:border-[#d4af37] hover:bg-[#d4af37]/10'
            }`}
            title={isNightMode ? 'Desactivar Modo Nocturno' : 'Activar Modo Nocturno'}
            aria-pressed={isNightMode}
            aria-label={isNightMode ? 'Desactivar Modo Nocturno' : 'Activar Modo Nocturno'}
          >
            <Moon size={15} />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Noche</span>
          </button>

          <button
            onClick={toggleMute}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 transition-all cursor-pointer ${!isMuted ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37]' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
            title={isMuted ? "Activar Música" : "Silenciar Música"}
          >
            {isMuted ? <Music size={16} className="opacity-50" /> : <Music size={16} />}
          </button>

          <button
            onClick={() => setIsDesktopDockOpen(!isDesktopDockOpen)}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#d4af37]/30 text-[#d4af37]/75 hover:border-[#d4af37] hover:text-[#d4af37] text-[10px] uppercase tracking-wider cursor-pointer"
            title={isDesktopDockOpen ? 'Ocultar controles secundarios' : 'Mostrar controles'}
          >
            {isDesktopDockOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span>{isDesktopDockOpen ? 'Ocultar' : 'Controles'}</span>
          </button>
        </div>

        {/* Controles Completos Escritorio (Colapsables) */}
        {isDesktopDockOpen && (
          <div className="hidden md:flex flex-col items-center gap-3 w-full">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-3 bg-black/40 px-5 py-2 rounded-full border border-[#d4af37]/20">
                <Settings2 size={14} className="text-[#d4af37]/70" />
                <span className="text-[#d4af37]/70 text-xs uppercase tracking-wider">Mecanismo</span>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1" 
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-20 accent-[#d4af37] cursor-pointer"
                />
                <span className="text-[#d4af37] text-xs font-mono w-8 text-right">{speed.toFixed(1)}x</span>
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-2 bg-black/40 px-4 py-2 rounded-full border transition-colors ${isLighthouseDecoupled ? 'border-[#d4af37]/60 bg-[#d4af37]/10' : 'border-[#d4af37]/20'}`}>
                <button
                  onClick={() => {
                    playUISound(isLighthouseDecoupled ? 360 : 540, 'sine', 0.08);
                    setIsLighthouseDecoupled(!isLighthouseDecoupled);
                  }}
                  className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                    isLighthouseDecoupled ? 'bg-[#d4af37] text-black font-bold' : 'text-[#d4af37]/80 hover:bg-[#d4af37]/20'
                  }`}
                  title={isLighthouseDecoupled ? 'Volver a acoplar faro al mecanismo musical' : 'Desacoplar faro del mecanismo musical'}
                >
                  {isLighthouseDecoupled ? <Link2Off size={12} /> : <Link2 size={12} />}
                  <span>{isLighthouseDecoupled ? 'Faro Libre' : 'Desacoplar Faro'}</span>
                </button>

                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={isLighthouseDecoupled ? lighthouseSpeed : speed}
                  onChange={(e) => {
                    if (!isLighthouseDecoupled) setIsLighthouseDecoupled(true);
                    setLighthouseSpeed(parseFloat(e.target.value));
                  }}
                  className="w-20 accent-[#d4af37] cursor-pointer"
                  title="Velocidad y dirección independiente del faro"
                />
                <span className="text-[#d4af37] text-xs font-mono w-10 text-right">
                  {(isLighthouseDecoupled ? lighthouseSpeed : speed).toFixed(1)}x
                </span>

                <button
                  onClick={() => {
                    const next = canvasDragMode === 'camera' ? 'turntable' : 'camera';
                    playUISound(next === 'turntable' ? 620 : 440, 'sine', 0.08);
                    setCanvasDragMode(next);
                  }}
                  className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    canvasDragMode === 'turntable'
                      ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                      : 'border-[#d4af37]/40 text-[#d4af37]/80 hover:bg-[#d4af37]/20'
                  }`}
                  title={
                    canvasDragMode === 'turntable'
                      ? 'Swipe en cualquier parte del visor gira el plato con inercia (clic para volver a cámara)'
                      : 'Cambiar arrastre del visor para girar el plato con swipe inercial'
                  }
                >
                  <Disc size={11} />
                  <span>{canvasDragMode === 'turntable' ? 'Swipe Plato' : 'Swipe Cámara'}</span>
                </button>

                <button
                  onPointerDown={() => setIsButtonHoldPaused(true)}
                  onPointerUp={() => setIsButtonHoldPaused(false)}
                  onPointerLeave={() => setIsButtonHoldPaused(false)}
                  onPointerCancel={() => setIsButtonHoldPaused(false)}
                  className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    isButtonHoldPaused
                      ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold'
                      : 'border-[#d4af37]/40 text-[#d4af37]/80 hover:bg-[#d4af37]/20'
                  }`}
                  title="Mantén presionado para pausar el giro de la plataforma sin detener la música"
                >
                  <Hand size={11} />
                  <span>Sostener</span>
                </button>

                <button
                  onPointerDown={() => {
                    manualSpinDirRef.current = -1;
                  }}
                  onPointerUp={() => {
                    manualSpinDirRef.current = 0;
                  }}
                  onPointerLeave={() => {
                    manualSpinDirRef.current = 0;
                  }}
                  onPointerCancel={() => {
                    manualSpinDirRef.current = 0;
                  }}
                  className="p-1.5 rounded-full border border-[#d4af37]/30 text-[#d4af37]/80 hover:bg-[#d4af37]/20 active:bg-[#d4af37] active:text-black cursor-pointer"
                  title="Mantener para girar manualmente a la izquierda"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onPointerDown={() => {
                    manualSpinDirRef.current = 1;
                  }}
                  onPointerUp={() => {
                    manualSpinDirRef.current = 0;
                  }}
                  onPointerLeave={() => {
                    manualSpinDirRef.current = 0;
                  }}
                  onPointerCancel={() => {
                    manualSpinDirRef.current = 0;
                  }}
                  className="p-1.5 rounded-full border border-[#d4af37]/30 text-[#d4af37]/80 hover:bg-[#d4af37]/20 active:bg-[#d4af37] active:text-black cursor-pointer"
                  title="Mantener para girar manualmente a la derecha"
                >
                  <RotateCw size={12} />
                </button>
              </div>

              <div className="flex items-center gap-3 bg-black/40 px-5 py-2 rounded-full border border-[#d4af37]/20">
                {volume === 0 ? <VolumeX size={14} className="text-[#d4af37]/70" /> : <Volume2 size={14} className="text-[#d4af37]/70" />}
                <span className="text-[#d4af37]/70 text-xs uppercase tracking-wider">Volumen</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 accent-[#d4af37] cursor-pointer"
                />
                <span className="text-[#d4af37] text-xs font-mono w-8 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-[#d4af37]/20">
                <ListMusic size={14} className="text-[#d4af37]/70" />
                <select 
                  value={songIndex}
                  onChange={(e) => setSongIndex(parseInt(e.target.value))}
                  className="bg-transparent text-[#d4af37] text-xs uppercase tracking-wider outline-none cursor-pointer"
                >
                  {songs.map((song, idx) => (
                    <option key={idx} value={idx} className="bg-[#121212]">{song.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-[#d4af37]/20">
                <Camera size={14} className="text-[#d4af37]/70 mr-1" />
                {['default', 'front', 'top', 'detail', 'mechanism'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCameraPreset(preset)}
                    className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full transition-colors cursor-pointer ${cameraPreset === preset ? 'bg-[#d4af37] text-black font-bold' : 'text-[#d4af37]/70 hover:bg-[#d4af37]/20'}`}
                  >
                    {preset === 'default' ? 'General' : preset === 'front' ? 'Frente' : preset === 'top' ? 'Arriba' : preset === 'detail' ? 'Detalle' : 'Mecanismo'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 bg-black/40 px-4 py-2 rounded-full border border-[#d4af37]/20">
                <span className="text-[#d4af37]/70 text-[10px] uppercase tracking-wider mr-1">Ambiente</span>
                {([
                  { id: 'magic', label: 'Mágicas', Icon: SparklesIcon },
                  { id: 'rain', label: 'Lluvia', Icon: CloudRain },
                  { id: 'snow', label: 'Nieve', Icon: Snowflake },
                  { id: 'none', label: 'Ninguno', Icon: EyeOff },
                ] as const).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      playUISound(id === 'magic' ? 720 : id === 'rain' ? 380 : id === 'snow' ? 560 : 280, 'sine', 0.08);
                      setAtmosphere(id);
                      ambientEngineRef.current?.setMode(id, true);
                    }}
                    className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-3 py-1 rounded-full transition-colors cursor-pointer ${
                      atmosphere === id ? 'bg-[#d4af37] text-black font-bold' : 'text-[#d4af37]/70 hover:bg-[#d4af37]/20'
                    }`}
                    title={`Ambiente: ${label}`}
                  >
                    <Icon size={12} />
                    <span>{label}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const next = !isAmbientSoundOn;
                    setIsAmbientSoundOn(next);
                    ambientEngineRef.current?.setEnabled(next);
                    if (next) {
                      ambientEngineRef.current?.setMode(atmosphere, true);
                    }
                  }}
                  className={`ml-1 flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    isAmbientSoundOn && atmosphere !== 'none'
                      ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-[#d4af37]'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}
                  title={isAmbientSoundOn ? 'Silenciar sonido ambiental' : 'Activar sonido ambiental'}
                >
                  <AudioLines size={12} />
                  <span>{isAmbientSoundOn ? 'Audio ON' : 'Audio OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="hidden sm:flex gap-2 text-amber-100/30 items-center mt-1">
          <Info size={12} />
          <p className="text-[10px] uppercase tracking-tighter">
            Swipe sobre el faro/plato (o Shift+Arrastrar) para giro inercial • Clic sostenido para pausar • Scroll para zoom
          </p>
        </div>
      </div>
    </div>
  );
}
