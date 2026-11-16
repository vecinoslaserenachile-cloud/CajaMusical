import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const BOX_FOOT_Y = -1.55;
const SEA_SIZE = 36;

// Curva orgánica de la línea de costa frente y al costado derecho de la caja
export function getShoreZ(x: number): number {
  return 2.55 - 0.28 * x + Math.sin(x * 0.32 + 0.4) * 0.55;
}

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Elevación exacta del lecho marino y pendiente de playa (sincronizada con GLSL)
export function getBeachBedY(x: number, z: number): number {
  const distFromShore = z - getShoreZ(x);
  const slope = smoothstepJS(-0.2, 5.4, distFromShore) * 0.72;

  // Suaves dunas/ondulaciones naturales solo en la arena seca fuera de la huella de la caja
  const boxClearance = smoothstepJS(2.25, 4.2, Math.max(Math.abs(x), Math.abs(z)));
  const dryMask = 1 - smoothstepJS(-0.7, 0.1, distFromShore);
  const dune =
    (Math.sin(x * 0.52 + 0.3) * Math.cos(z * 0.46 - 0.2) * 0.045 +
      Math.sin(x * 0.23 - z * 0.19) * 0.03) *
    boxClearance *
    dryMask;

  return BOX_FOOT_Y - slope + dune;
}

const SHARED_SHORE_GLSL = /* glsl */ `
  float getShoreZ(float x) {
    return 2.55 - 0.28 * x + sin(x * 0.32 + 0.4) * 0.55;
  }

  float getBedY(vec2 xz) {
    float distFromShore = xz.y - getShoreZ(xz.x);
    float slope = smoothstep(-0.2, 5.4, distFromShore) * 0.72;
    return -1.55 - slope;
  }

  float getSwashElevation(vec2 xz, float time) {
    float distFromShore = xz.y - getShoreZ(xz.x);
    float phase = time * 1.15 - distFromShore * 0.55 + sin(xz.x * 0.42) * 0.55;
    float s = 0.5 + 0.5 * sin(phase);
    // Perfil suave de ola rompiendo y retrocediendo
    float surge = pow(s, 1.35) * 0.095;
    return -1.665 + surge;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
`;

function createSandTextures() {
  const size = 512;

  // 1. Albedo / Color de arena realista de playa chilena (cuarzo, ocre, concha y magnetita)
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');

  // Altura para generar normal map y roughness map coherentes
  const heightField = new Float32Array(size * size);

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const pixels = imgData.data;

    for (let y = 0; y < size; y++) {
      const ny = (y / size) * Math.PI * 2;
      for (let x = 0; x < size; x++) {
        const nx = (x / size) * Math.PI * 2;
        const idx = y * size + x;

        // Ondulación sutil de viento en la arena (periódica para tiling sin costuras)
        const ripple =
          Math.sin(ny * 8 + Math.sin(nx * 2) * 1.1) * 0.5 +
          Math.sin(ny * 16 + nx * 2) * 0.25;

        const grain = rand();
        const fineGrain = rand();

        // Altura combinada
        const h = ripple * 0.35 + (grain - 0.5) * 0.55 + (fineGrain - 0.5) * 0.3;
        heightField[idx] = h;

        // Paleta base arena cálida de La Serena
        let r = 212 + ripple * 7 + (grain - 0.5) * 26;
        let g = 189 + ripple * 6 + (grain - 0.5) * 24;
        let b = 148 + ripple * 5 + (grain - 0.5) * 22;

        // Granos oscuros de magnetita / basalto (~6%)
        if (fineGrain > 0.94) {
          r *= 0.42;
          g *= 0.42;
          b *= 0.44;
        } else if (fineGrain < 0.05) {
          // Destellos claros de cuarzo / fragmentos de concha (~5%)
          r = Math.min(255, r + 32);
          g = Math.min(255, g + 30);
          b = Math.min(255, b + 28);
        }

        const pIdx = idx * 4;
        pixels[pIdx] = Math.max(0, Math.min(255, Math.round(r)));
        pixels[pIdx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        pixels[pIdx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        pixels[pIdx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(7, 7);
  colorMap.anisotropy = 8;

  // 2. Normal Map tangencial desde heightField (diferencias centrales con wrap)
  const normalData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const strength = 2.2;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const hL = heightField[y * size + xm];
      const hR = heightField[y * size + xp];
      const hD = heightField[ym * size + x];
      const hU = heightField[yp * size + x];

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * size + x) * 4;
      normalData[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;

      // Roughness map (canales G usados por Three.js): entre 0.72 y 0.96
      const hNorm = Math.max(0, Math.min(1, heightField[y * size + x] * 0.4 + 0.5));
      const roughByte = Math.round((0.72 + hNorm * 0.24) * 255);
      roughnessData[idx] = roughByte;
      roughnessData[idx + 1] = roughByte;
      roughnessData[idx + 2] = roughByte;
      roughnessData[idx + 3] = 255;
    }
  }

  const normalMap = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(7, 7);
  normalMap.anisotropy = 8;
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.DataTexture(roughnessData, size, size, THREE.RGBAFormat);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(7, 7);
  roughnessMap.anisotropy = 8;
  roughnessMap.needsUpdate = true;

  return { colorMap, normalMap, roughnessMap };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
    grad.addColorStop(0, 'rgba(15, 10, 5, 0.65)');
    grad.addColorStop(0.55, 'rgba(15, 10, 5, 0.35)');
    grad.addColorStop(1, 'rgba(15, 10, 5, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const COASTAL_PEBBLES: Array<{ x: number; z: number; sx: number; sy: number; sz: number; rot: number; color: string }> = [
  { x: -2.45, z: 2.35, sx: 0.22, sy: 0.11, sz: 0.17, rot: 0.4, color: '#6e6a64' },
  { x: -2.7, z: 2.08, sx: 0.14, sy: 0.08, sz: 0.12, rot: 1.1, color: '#877f75' },
  { x: 2.48, z: 1.55, sx: 0.2, sy: 0.1, sz: 0.16, rot: 2.1, color: '#5c5853' },
  { x: 2.75, z: 1.25, sx: 0.13, sy: 0.07, sz: 0.11, rot: 0.8, color: '#9c9284' },
  { x: -1.35, z: 2.55, sx: 0.11, sy: 0.055, sz: 0.09, rot: 1.7, color: '#b5a898' },
  { x: 1.15, z: 2.35, sx: 0.1, sy: 0.05, sz: 0.085, rot: 2.8, color: '#787169' },
  { x: -2.85, z: -1.4, sx: 0.24, sy: 0.12, sz: 0.19, rot: 0.6, color: '#6a635b' },
];

export function CoastalBeachBase({ isNightMode }: { isNightMode: boolean }) {
  const sandUniformsRef = useRef<{ uTime: { value: number }; uNightMix: { value: number } }>({
    uTime: { value: 0 },
    uNightMix: { value: 0 },
  });
  const waterUniformsRef = useRef<{ uTime: { value: number }; uNightMix: { value: number } }>({
    uTime: { value: 0 },
    uNightMix: { value: 0 },
  });
  const nightMixRef = useRef(0);

  const { sandGeo, waterGeo, shadowGeo, pebbleGeo, textures, shadowTex, sandMaterial, waterMaterial } = useMemo(() => {
    const txs = createSandTextures();
    const cShadowTex = createContactShadowTexture();

    // Geometría esculpida de la playa
    const sGeo = new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE, 128, 128);
    sGeo.rotateX(-Math.PI / 2);
    const pos = sGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getBeachBedY(x, z));
    }
    sGeo.computeVertexNormals();

    // Geometría de olas del mar
    const wGeo = new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE, 120, 120);
    wGeo.rotateX(-Math.PI / 2);

    // Sombra de contacto bajo la caja
    const shGeo = new THREE.PlaneGeometry(5.6, 5.6);
    shGeo.rotateX(-Math.PI / 2);

    // Piedras costeras suaves
    const pGeo = new THREE.DodecahedronGeometry(1, 1);

    // Material de arena con oscurecimiento y brillo dinámico por humedad de la ola
    const sMat = new THREE.MeshStandardMaterial({
      map: txs.colorMap,
      normalMap: txs.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: txs.roughnessMap,
      roughness: 0.94,
      metalness: 0.02,
      transparent: true,
    });

    sMat.customProgramCacheKey = () => 'coastal-sand-v1';
    sMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sandUniformsRef.current.uTime;
      shader.uniforms.uNightMix = sandUniformsRef.current.uNightMix;

      shader.vertexShader =
        `varying vec3 vSandWorldPos;\n` +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
           vSandWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader =
        `uniform float uTime;\nuniform float uNightMix;\nvarying vec3 vSandWorldPos;\n` +
        SHARED_SHORE_GLSL +
        shader.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             float bedY = vSandWorldPos.y;
             float swashY = getSwashElevation(vSandWorldPos.xz, uTime);
             // Zona húmeda hasta la línea máxima de pleamar (-1.565)
             float dampMask = smoothstep(-1.555, -1.615, bedY);
             float activeWet = smoothstep(swashY + 0.03, swashY - 0.015, bedY);
             float wetness = max(dampMask * 0.78, activeWet);
             // La arena mojada se oscurece con tono cálido-profundo y refleja la luz
             diffuseColor.rgb *= mix(vec3(1.0), vec3(0.50, 0.48, 0.46), wetness);
             // Desvanecimiento suave hacia los bordes del horizonte
             float edgeFade = 1.0 - smoothstep(13.5, 17.8, length(vSandWorldPos.xz));
             diffuseColor.a *= edgeFade;`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
             float bedYR = vSandWorldPos.y;
             float swashYR = getSwashElevation(vSandWorldPos.xz, uTime);
             float dampR = smoothstep(-1.555, -1.615, bedYR);
             float activeWetR = smoothstep(swashYR + 0.03, swashYR - 0.015, bedYR);
             float wetnessR = max(dampR * 0.78, activeWetR);
             roughnessFactor = mix(roughnessFactor, 0.12, wetnessR);`
          );
    };

    // Material del mar con olas pequeñas animadas, normales dinámicas y espuma en la orilla
    const wMat = new THREE.MeshStandardMaterial({
      color: '#1b6d85',
      roughness: 0.09,
      metalness: 0.16,
      envMapIntensity: 1.35,
      transparent: true,
      depthWrite: false,
    });

    wMat.customProgramCacheKey = () => 'coastal-water-v1';
    wMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waterUniformsRef.current.uTime;
      shader.uniforms.uNightMix = waterUniformsRef.current.uNightMix;

      const waveHeightFn = /* glsl */ `
        float getWaveSurfaceY(vec2 xz, float time) {
          float swash = getSwashElevation(xz, time);
          float distFromShore = xz.y - getShoreZ(xz.x);
          float deepFactor = smoothstep(-0.3, 3.2, distFromShore);

          // Olas pequeñas dirigiéndose hacia la orilla (-Z / -X)
          float k1 = dot(xz, vec2(-0.28, -0.96));
          float w1 = sin(k1 * 2.2 - time * 1.85) * 0.032;

          float k2 = dot(xz, vec2(0.32, -0.94));
          float w2 = sin(k2 * 3.8 - time * 2.4 + 1.1) * 0.016;

          float k3 = dot(xz, vec2(-0.62, -0.78));
          float w3 = sin(k3 * 6.5 - time * 3.1) * 0.007;

          return swash + (w1 + w2 + w3) * (0.35 + 0.65 * deepFactor);
        }
      `;

      shader.vertexShader =
        `uniform float uTime;\nvarying vec3 vWaterWorldPos;\nvarying float vWaveHeight;\n` +
        SHARED_SHORE_GLSL +
        waveHeightFn +
        shader.vertexShader
          .replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
             vec2 wXZ = (modelMatrix * vec4(position, 1.0)).xz;
             float hC = getWaveSurfaceY(wXZ, uTime);
             float eps = 0.14;
             float hX = getWaveSurfaceY(wXZ + vec2(eps, 0.0), uTime);
             float hZ = getWaveSurfaceY(wXZ + vec2(0.0, eps), uTime);
             objectNormal = normalize(vec3(hC - hX, eps, hC - hZ));`
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             vec2 wXZPos = (modelMatrix * vec4(transformed, 1.0)).xz;
             float waveY = getWaveSurfaceY(wXZPos, uTime);
             transformed.y = waveY;
             vWaveHeight = waveY;`
          )
          .replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
             vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
          );

      shader.fragmentShader =
        `uniform float uTime;\nuniform float uNightMix;\nvarying vec3 vWaterWorldPos;\nvarying float vWaveHeight;\n` +
        SHARED_SHORE_GLSL +
        shader.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             float bedY = getBedY(vWaterWorldPos.xz);
             float waterDepth = vWaveHeight - bedY;

             if (waterDepth <= 0.0015) {
               discard;
             }

             // Color del agua según profundidad y modo día/noche
             float depthT = smoothstep(0.01, 0.55, waterDepth);
             vec3 dayShallow = vec3(0.32, 0.72, 0.76);
             vec3 dayDeep = vec3(0.05, 0.23, 0.37);
             vec3 nightShallow = vec3(0.09, 0.29, 0.42);
             vec3 nightDeep = vec3(0.02, 0.08, 0.17);

             vec3 shallowCol = mix(dayShallow, nightShallow, uNightMix);
             vec3 deepCol = mix(dayDeep, nightDeep, uNightMix);
             vec3 waterCol = mix(shallowCol, deepCol, depthT);

             // Espuma orgánica de encaje en el borde de la ola que llega a la orilla
             float n1 = valueNoise(vWaterWorldPos.xz * 4.2 + vec2(uTime * 0.15, -uTime * 0.45));
             float n2 = valueNoise(vWaterWorldPos.xz * 10.5 - vec2(uTime * 0.25, uTime * 0.65));
             float foamNoise = n1 * 0.62 + n2 * 0.38;

             float shoreRim = 1.0 - smoothstep(0.004, 0.068, waterDepth);
             float crestFoam = smoothstep(-1.605, -1.565, vWaveHeight) * smoothstep(0.04, 0.28, waterDepth) * 0.5;
             float lacyFoam = smoothstep(0.36, 0.72, foamNoise + shoreRim * 0.55) * (shoreRim * 0.95 + crestFoam);
             lacyFoam = clamp(lacyFoam, 0.0, 1.0);

             vec3 foamCol = mix(vec3(0.95, 0.98, 1.0), vec3(0.68, 0.84, 0.96), uNightMix * 0.65);
             diffuseColor.rgb = mix(waterCol, foamCol, lacyFoam);

             float edgeFade = 1.0 - smoothstep(13.5, 17.8, length(vWaterWorldPos.xz));
             float alphaDepth = mix(0.42, 0.93, smoothstep(0.004, 0.28, waterDepth));
             diffuseColor.a = max(alphaDepth, lacyFoam * 0.95) * smoothstep(0.0015, 0.015, waterDepth) * edgeFade;`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
             float bedYR = getBedY(vWaterWorldPos.xz);
             float depthR = vWaveHeight - bedYR;
             float shoreRimR = 1.0 - smoothstep(0.004, 0.068, depthR);
             float nFoam = valueNoise(vWaterWorldPos.xz * 4.2 + vec2(uTime * 0.15, -uTime * 0.45));
             float foamMask = smoothstep(0.4, 0.72, nFoam + shoreRimR * 0.55) * shoreRimR;
             roughnessFactor = mix(0.08, 0.76, clamp(foamMask, 0.0, 1.0));`
          );
    };

    return {
      sandGeo: sGeo,
      waterGeo: wGeo,
      shadowGeo: shGeo,
      pebbleGeo: pGeo,
      textures: txs,
      shadowTex: cShadowTex,
      sandMaterial: sMat,
      waterMaterial: wMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      sandGeo.dispose();
      waterGeo.dispose();
      shadowGeo.dispose();
      pebbleGeo.dispose();
      textures.colorMap.dispose();
      textures.normalMap.dispose();
      textures.roughnessMap.dispose();
      shadowTex.dispose();
      sandMaterial.dispose();
      waterMaterial.dispose();
    };
  }, [sandGeo, waterGeo, shadowGeo, pebbleGeo, textures, shadowTex, sandMaterial, waterMaterial]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    nightMixRef.current = THREE.MathUtils.damp(nightMixRef.current, isNightMode ? 1 : 0, 5, dt);

    sandUniformsRef.current.uTime.value = t;
    sandUniformsRef.current.uNightMix.value = nightMixRef.current;

    waterUniformsRef.current.uTime.value = t;
    waterUniformsRef.current.uNightMix.value = nightMixRef.current;
  });

  return (
    <group>
      {/* Terreno de playa con textura realista de arena seca y húmeda */}
      <mesh geometry={sandGeo} material={sandMaterial} receiveShadow />

      {/* Mar con olas pequeñas llegando a la orilla y espuma */}
      <mesh geometry={waterGeo} material={waterMaterial} renderOrder={2} />

      {/* Sombra suave de contacto debajo de la caja sobre la arena */}
      <mesh geometry={shadowGeo} position={[0, BOX_FOOT_Y + 0.008, 0]} renderOrder={1}>
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.55} />
      </mesh>

      {/* Piedras costeras suaves asentadas sobre la playa */}
      {COASTAL_PEBBLES.map((p, i) => {
        const y = getBeachBedY(p.x, p.z) + p.sy * 0.42;
        return (
          <mesh
            key={i}
            geometry={pebbleGeo}
            position={[p.x, y, p.z]}
            scale={[p.sx, p.sy, p.sz]}
            rotation={[0.1, p.rot, 0.05]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={p.color} roughness={0.84} metalness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
}
