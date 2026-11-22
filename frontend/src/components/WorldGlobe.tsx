import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, Compass, Satellite } from 'lucide-react';

interface WorldGlobeProps {
  lat: number;
  lon: number;
  locationName: string;
  hasSelectedLand?: boolean;
  onSelectCoords?: (lat: number, lon: number, customName?: string) => void;
  onSwitchToSatellite?: () => void;
  treeCount?: number;
  diveTarget?: { lat: number; lon: number; id: number; name?: string } | null;
}

export function latLonToVector3(lat: number, lon: number, radius = 2.0): THREE.Vector3 {
  const phi = (lon + 180.0) * (Math.PI / 180.0);
  const theta = (90.0 - lat) * (Math.PI / 180.0);
  const x = -radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

export function vector3ToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const norm = v.length();
  if (norm === 0) return { lat: 0, lon: 0 };
  const yClamped = Math.max(-1.0, Math.min(1.0, v.y / norm));
  const theta = Math.acos(yClamped);
  const lat = 90.0 - theta * (180.0 / Math.PI);
  let phi = Math.atan2(v.z, -v.x);
  if (phi < 0) phi += 2.0 * Math.PI;
  const lon = phi * (180.0 / Math.PI) - 180.0;
  return {
    lat: parseFloat(lat.toFixed(4)),
    lon: parseFloat(lon.toFixed(4)),
  };
}

export function getOptimalGlobeDistance(h: number, w: number): number {
  const minDim = Math.min(h, w);
  if (minDim < 360) return 8.0;
  if (minDim < 460) return 7.5;
  if (minDim < 580) return 7.0;
  return 6.6;
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({
  lat,
  lon,
  locationName: _locationName,
  hasSelectedLand = true,
  onSelectCoords,
  onSwitchToSatellite,
  treeCount: _treeCount = 0,
  diveTarget,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [hoveredCoords, setHoveredCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isDiving, setIsDiving] = useState<boolean>(false);
  const isDivingRef = useRef<boolean>(false);

  // References to keep three.js objects accessible across callbacks
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const pulseRingRef = useRef<THREE.Mesh | null>(null);

  // Rotations for smooth interpolation
  const targetRotationRef = useRef<{ x: number; y: number }>({
    x: lat * (Math.PI / 180.0),
    y: -(lon + 90.0) * (Math.PI / 180.0),
  });
  const currentRotationRef = useRef<{ x: number; y: number }>({
    x: lat * (Math.PI / 180.0),
    y: -(lon + 90.0) * (Math.PI / 180.0),
  });
  const targetCameraDistanceRef = useRef<number>(7.0);
  const currentCameraDistanceRef = useRef<number>(7.0);

  // Mouse interaction state
  const isPointerDownRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  // Calculates shortest angular distance on Y to avoid multi-spin disorientation
  const setSmoothTargetOrientation = (targetLat: number, targetLon: number) => {
    const targetX = Math.max(-1.4, Math.min(1.4, targetLat * (Math.PI / 180.0)));
    const targetY = -(targetLon + 90.0) * (Math.PI / 180.0);

    let diffY = (targetY - currentRotationRef.current.y) % (2.0 * Math.PI);
    if (diffY > Math.PI) diffY -= 2.0 * Math.PI;
    if (diffY < -Math.PI) diffY += 2.0 * Math.PI;

    targetRotationRef.current = {
      x: targetX,
      y: currentRotationRef.current.y + diffY,
    };
  };

  // Keep target rotation aligned when lat/lon props change (if not diving)
  useEffect(() => {
    if (!isDivingRef.current && (lat !== 0 || lon !== 0)) {
      setSmoothTargetOrientation(lat, lon);
    }
  }, [lat, lon]);

  // Update pin position & visibility when lat/lon or hasSelectedLand changes
  useEffect(() => {
    if (!markerGroupRef.current) return;
    markerGroupRef.current.visible = Boolean(hasSelectedLand);
    const pos = latLonToVector3(lat, lon, 2.01);
    markerGroupRef.current.position.copy(pos);

    // Orient marker outward normal to globe
    const normal = pos.clone().normalize();
    markerGroupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [lat, lon, hasSelectedLand]);

  // Main Zoom & Convert to 2D Satellite Handler
  const handleSelectAndZoom = (targetLat: number, targetLon: number, customName?: string) => {
    isDivingRef.current = true;
    setIsDiving(true);

    // Smoothly orient camera directly facing target coordinates along shortest arc
    setSmoothTargetOrientation(targetLat, targetLon);

    // Dive camera in close to Earth's surface
    targetCameraDistanceRef.current = 2.08;

    // Immediately notify coordinate update to parent with exact coordinates & name
    if (onSelectCoords) {
      onSelectCoords(targetLat, targetLon, customName);
    }

    // After smooth fly-in animation (750ms), trigger conversion to 2D Satellite map view
    setTimeout(() => {
      if (onSwitchToSatellite) {
        onSwitchToSatellite();
      }
      isDivingRef.current = false;
      setIsDiving(false);
      const w = containerRef.current?.clientWidth || 800;
      const h = containerRef.current?.clientHeight || 500;
      targetCameraDistanceRef.current = getOptimalGlobeDistance(h, w);
    }, 750);
  };

  // Trigger dive whenever diveTarget prop changes (e.g. from pressing Find or picking search result)
  useEffect(() => {
    if (diveTarget) {
      handleSelectAndZoom(diveTarget.lat, diveTarget.lon, diveTarget.name);
    }
  }, [diveTarget?.id]);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, currentCameraDistanceRef.current);
    cameraRef.current = camera;

    // 3. Renderer with tone mapping and crisp resolution
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3.0));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x070d0a, 1); // Dark botanical cosmic background
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Background Starfield
    const starCount = 600;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 25 + Math.random() * 40;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = radius * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.6,
      transparent: true,
      opacity: 0.7,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // 5. Globe Group (holds earth mesh and markers so they rotate together)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 6. High-Definition Earth Sphere Mesh (Ultra-sharp 4K texture with anisotropic filtering & bump relief)
    const earthRadius = 2.0;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 160, 160);
    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const earthTexture = textureLoader.load('/textures/earth.jpg');
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = maxAnisotropy;
    earthTexture.minFilter = THREE.LinearMipmapNearestFilter;
    earthTexture.magFilter = THREE.LinearFilter;
    earthTexture.generateMipmaps = true;

    const bumpTexture = textureLoader.load('/textures/earth_bump.png');
    bumpTexture.anisotropy = maxAnisotropy;
    bumpTexture.minFilter = THREE.LinearMipmapNearestFilter;
    bumpTexture.magFilter = THREE.LinearFilter;
    bumpTexture.generateMipmaps = true;

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.012,
      roughness: 0.38,
      metalness: 0.0,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 7. Atmosphere Halo Glow (BackSide with AdditiveBlending: sharp surface with soft cosmic rim halo)
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.035, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphereMesh);

    // 9. Target Location Marker Pin (visible only when land is selected)
    const markerGroup = new THREE.Group();
    markerGroup.visible = Boolean(hasSelectedLand);
    const pos = latLonToVector3(lat, lon, earthRadius * 1.005);
    markerGroup.position.copy(pos);
    const normal = pos.clone().normalize();
    markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    // Pin stem
    const pinStemGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.22, 16);
    pinStemGeo.translate(0, 0.11, 0);
    const pinStemMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const pinStem = new THREE.Mesh(pinStemGeo, pinStemMat);
    markerGroup.add(pinStem);

    // Pin head sphere
    const pinHeadGeo = new THREE.SphereGeometry(0.065, 16, 16);
    pinHeadGeo.translate(0, 0.22, 0);
    const pinHeadMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const pinHead = new THREE.Mesh(pinHeadGeo, pinHeadMat);
    markerGroup.add(pinHead);

    // Pulsing ground ring on Earth's surface
    const ringGeo = new THREE.RingGeometry(0.04, 0.09, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const pulseRing = new THREE.Mesh(ringGeo, ringMat);
    pulseRing.position.set(0, 0.01, 0);
    markerGroup.add(pulseRing);
    pulseRingRef.current = pulseRing;

    globeGroup.add(markerGroup);
    markerGroupRef.current = markerGroup;

    // 10. Lighting: crisp daylight illumination for vibrant continents & deep blue oceans
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(6, 4, 7);
    scene.add(sunLight);

    const backRimLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    backRimLight.position.set(-6, -2, -4);
    scene.add(backRimLight);

    // 11. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Auto-rotation when enabled and user not dragging and not diving
      if (autoRotate && !isPointerDownRef.current && !isDivingRef.current) {
        targetRotationRef.current.y -= 0.15 * delta;
      }

      // Smooth interpolation: speed up lerp when diving into plot
      const rotFactor = isDivingRef.current ? 0.22 : 0.1;
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * rotFactor;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * rotFactor;

      // Apply rotation: X then Y
      globeGroup.rotation.x = currentRotationRef.current.x;
      globeGroup.rotation.y = currentRotationRef.current.y;

      // Smooth camera distance (zoom)
      const zoomFactor = isDivingRef.current ? 0.24 : 0.12;
      currentCameraDistanceRef.current +=
        (targetCameraDistanceRef.current - currentCameraDistanceRef.current) * zoomFactor;
      camera.position.z = currentCameraDistanceRef.current;

      // Pulse beacon ring
      if (pulseRingRef.current) {
        const pulse = 1.0 + 0.5 * Math.sin(time * 4.0);
        pulseRingRef.current.scale.set(pulse, 1, pulse);
        (pulseRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9 - 0.4 * Math.sin(time * 4.0);
      }

      if (container.clientWidth > 0 && container.clientHeight > 0) {
        renderer.render(scene, camera);
      }
    };

    animate();

    // 12. Resize Observer (guarantees Earth sphere is always fully in view without cutting off poles)
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));

      // Automatically calculate optimal distance so North and South poles are never cut off
      if (!isDivingRef.current) {
        targetCameraDistanceRef.current = getOptimalGlobeDistance(h, w);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Pointer drag and click handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDiving) return;
    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    startRotationRef.current = {
      x: targetRotationRef.current.x,
      y: targetRotationRef.current.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDiving) return;
    if (isPointerDownRef.current) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      // Rotate with mouse drag: dx changes Y rotation, dy changes X tilt
      const rotSpeed = 0.005;
      targetRotationRef.current.y = startRotationRef.current.y + dx * rotSpeed;
      targetRotationRef.current.x = Math.max(
        -1.4,
        Math.min(1.4, startRotationRef.current.x + dy * rotSpeed)
      );
    } else {
      // Raycast to show coordinates on hover
      handleRaycastHover(e);
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || isDiving) return;
    isPointerDownRef.current = false;
  };

  const handleDoubleClick = (_e: React.MouseEvent<HTMLDivElement>) => {
    // Double-click does not convert to 2D (conversion occurs strictly when user presses Find)
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isDiving) return;
    e.preventDefault();
    const zoomStep = 0.35;
    if (e.deltaY > 0) {
      // Zoom out
      targetCameraDistanceRef.current = Math.min(8.5, targetCameraDistanceRef.current + zoomStep);
    } else {
      // Zoom in
      targetCameraDistanceRef.current = Math.max(2.5, targetCameraDistanceRef.current - zoomStep);
    }
  };

  // Convert mouse event coordinates to NDC (-1 to +1)
  const getPointerNDC = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  };

  const handleRaycastHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDiving || !cameraRef.current || !earthMeshRef.current || !globeGroupRef.current) return;
    const ndc = getPointerNDC(e);
    if (!ndc) return;

    cameraRef.current.updateMatrixWorld(true);
    earthMeshRef.current.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, cameraRef.current);
    const intersects = raycaster.intersectObject(earthMeshRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const localPoint = earthMeshRef.current.worldToLocal(hit.point.clone());
      const coords = vector3ToLatLon(localPoint);
      setHoveredCoords(coords);
    } else {
      setHoveredCoords(null);
    }
  };

  const handleCenterOnTarget = () => {
    setSmoothTargetOrientation(lat, lon);
    const w = containerRef.current?.clientWidth || 800;
    const h = containerRef.current?.clientHeight || 500;
    targetCameraDistanceRef.current = getOptimalGlobeDistance(h, w);
  };

  return (
    <div className="relative w-full h-full min-h-0 select-none overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0 touch-none"
      />

      {/* Floating Header Banner inside globe */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-white tracking-wide">Single 3D World Globe</span>
          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
            Spherical Earth
          </span>
        </div>
        <span className="text-[11px] text-slate-400 pl-1 drop-shadow">
          Drag to spin &bull; Search any street, landmark, or address to zoom into 2D Satellite
        </span>
      </div>

      {/* Floating Control Toolbar bottom-right */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800/90 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={handleCenterOnTarget}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
          title="Center Globe on Selected Region"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline text-[11px] font-medium">Center Plot</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={() => {
            targetCameraDistanceRef.current = Math.max(2.5, targetCameraDistanceRef.current - 0.6);
          }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            targetCameraDistanceRef.current = Math.min(8.0, targetCameraDistanceRef.current + 0.6);
          }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs ${
            autoRotate
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Toggle Auto-Rotation"
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-[11px] font-medium">Spin</span>
        </button>
      </div>

      {/* Live Hover Coordinates indicator */}
      {hoveredCoords && !isDiving && (
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-full text-[11px] font-mono text-slate-300 pointer-events-none shadow-lg">
          Lat: {hoveredCoords.lat}° | Lon: {hoveredCoords.lon}° (Click to zoom into satellite)
        </div>
      )}

      {/* Cinematic Diving HUD Overlay */}
      {isDiving && (
        <div className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-[1.5px] flex items-center justify-center animate-in fade-in duration-200 pointer-events-none">
          <div className="bg-slate-950/95 border border-emerald-500/60 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3.5 text-white">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 animate-pulse">
              <Satellite className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-300">Diving into Plot...</div>
              <div className="text-[11px] text-slate-300">Zooming in & converting to 2D Satellite View</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
