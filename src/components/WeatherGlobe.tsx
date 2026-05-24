import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';

interface WeatherGlobeProps {
  stations: WeatherStationMetadata[];
  onStationClick?: (station: WeatherStationMetadata) => void;
}

export function WeatherGlobe({ stations, onStationClick }: WeatherGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const stationMarkersRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number | null>(null);
  
  const mouseRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  const [hoveredStation, setHoveredStation] = useState<WeatherStationMetadata | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 4;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create Earth
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2a4a7f,
      emissive: 0x112244,
      shininess: 10,
      transparent: true,
      opacity: 0.95,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    earthRef.current = earth;

    // Add grid lines for better visual
    const gridHelper = new THREE.PolarGridHelper(2, 16, 8, 64, 0x4a6fa5, 0x2a4a7f);
    gridHelper.position.y = 0;
    earth.add(gridHelper);

    // Create station markers group
    const stationGroup = new THREE.Group();
    scene.add(stationGroup);
    stationMarkersRef.current = stationGroup;

    // Stars background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
    });

    const starsVertices = [];
    for (let i = 0; i < 3000; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Auto-rotate when not interacting
      if (autoRotate.current && earthRef.current) {
        earthRef.current.rotation.y += 0.001;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse interaction handlers
    const handleMouseDown = (event: MouseEvent) => {
      isDragging.current = true;
      previousMouse.current = { x: event.clientX, y: event.clientY };
      autoRotate.current = false;

      // Clear inactivity timer
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };

      if (isDragging.current && earthRef.current) {
        const deltaX = event.clientX - previousMouse.current.x;
        const deltaY = event.clientY - previousMouse.current.y;

        earthRef.current.rotation.y += deltaX * 0.005;
        earthRef.current.rotation.x += deltaY * 0.005;

        // Clamp X rotation to prevent flipping
        earthRef.current.rotation.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, earthRef.current.rotation.x)
        );

        previousMouse.current = { x: event.clientX, y: event.clientY };
      }

      // Check for station hover
      if (cameraRef.current && stationMarkersRef.current) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, cameraRef.current);

        const intersects = raycaster.intersectObjects(stationMarkersRef.current.children);
        if (intersects.length > 0) {
          const marker = intersects[0].object;
          const station = (marker as THREE.Mesh & { userData: { station: WeatherStationMetadata } }).userData
            .station;
          setHoveredStation(station);
          setTooltipPosition({ x: event.clientX, y: event.clientY });
        } else {
          setHoveredStation(null);
          setTooltipPosition(null);
        }
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;

      // Start inactivity timer to resume auto-rotation
      inactivityTimer.current = setTimeout(() => {
        autoRotate.current = true;
      }, 3000);
    };

    const handleClick = (event: MouseEvent) => {
      if (!cameraRef.current || !stationMarkersRef.current) return;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(stationMarkersRef.current.children);
      if (intersects.length > 0) {
        const marker = intersects[0].object;
        const station = (marker as THREE.Mesh & { userData: { station: WeatherStationMetadata } }).userData
          .station;
        onStationClick?.(station);
      }
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);

    // Wheel zoom
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!cameraRef.current) return;

      const zoomSpeed = 0.1;
      const delta = event.deltaY > 0 ? 1 : -1;
      cameraRef.current.position.z += delta * zoomSpeed;

      // Clamp zoom
      cameraRef.current.position.z = Math.max(2.5, Math.min(10, cameraRef.current.position.z));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [onStationClick]);

  // Update station markers when stations change
  useEffect(() => {
    if (!stationMarkersRef.current) return;

    // Clear existing markers
    while (stationMarkersRef.current.children.length > 0) {
      const child = stationMarkersRef.current.children[0];
      stationMarkersRef.current.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }

    // Add new markers
    stations.forEach((station) => {
      if (station.lat === undefined || station.lng === undefined) return;

      const latRad = station.lat * (Math.PI / 180);
      const lngRad = -station.lng * (Math.PI / 180);

      const radius = 2.05; // Slightly above earth surface
      const x = radius * Math.cos(latRad) * Math.cos(lngRad);
      const y = radius * Math.sin(latRad);
      const z = radius * Math.cos(latRad) * Math.sin(lngRad);

      // Create marker
      const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.5,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, y, z);
      marker.userData = { station };

      stationMarkersRef.current?.add(marker);

      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(0.03, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(x, y, z);
      stationMarkersRef.current?.add(glow);
    });
  }, [stations]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Tooltip */}
      {hoveredStation && tooltipPosition && (
        <div
          className="absolute z-50 bg-black/90 text-white px-3 py-2 rounded-lg text-sm pointer-events-none border border-green-500/30 backdrop-blur-sm"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
          }}
        >
          <div className="font-semibold">{hoveredStation.name || 'Unnamed Station'}</div>
          {hoveredStation.description && (
            <div className="text-gray-400 text-xs mt-0.5">{hoveredStation.description}</div>
          )}
          {hoveredStation.geohash && (
            <div className="text-gray-500 text-xs mt-1">📍 {hoveredStation.geohash}</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-green-500/30 rounded-lg p-4 text-white">
        <h3 className="text-sm font-semibold mb-2">Weather Stations</h3>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>{stations.length} active stations</span>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          🖱️ Drag to rotate • 🔍 Scroll to zoom
        </div>
      </div>
    </div>
  );
}
