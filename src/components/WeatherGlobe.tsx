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

    // Lighting - sun from the right side
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 2, 3);
    scene.add(sunLight);

    // Create Earth with realistic textures
    const earthGeometry = new THREE.SphereGeometry(2, 128, 128);
    
    // Earth texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Create procedural Earth texture (blue oceans, green/brown land)
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 2048;
    textureCanvas.height = 1024;
    const ctx = textureCanvas.getContext('2d')!;
    
    // Base ocean color
    ctx.fillStyle = '#1a4d7a';
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
    
    // Add some continents (simplified procedural land masses)
    ctx.fillStyle = '#2d5016';
    
    // North America
    ctx.beginPath();
    ctx.ellipse(350, 300, 150, 180, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.ellipse(420, 580, 80, 140, 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Europe/Africa
    ctx.beginPath();
    ctx.ellipse(1000, 320, 120, 150, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1050, 550, 140, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia
    ctx.beginPath();
    ctx.ellipse(1400, 300, 280, 160, 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(1550, 680, 90, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some noise/detail
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * textureCanvas.width;
      const y = Math.random() * textureCanvas.height;
      const radius = Math.random() * 3 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? '#3a6b28' : '#1a3d5a';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const earthTexture = new THREE.CanvasTexture(textureCanvas);
    
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpScale: 0.05,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });
    
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    earthRef.current = earth;

    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Create station markers group
    const stationGroup = new THREE.Group();
    scene.add(stationGroup);
    stationMarkersRef.current = stationGroup;

    // Stars background with varied sizes
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starsSizes = [];
    
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      starsVertices.push(x, y, z);
      
      // Varied star sizes
      starsSizes.push(Math.random() * 2 + 0.5);
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    starsGeometry.setAttribute(
      'size',
      new THREE.Float32BufferAttribute(starsSizes, 1)
    );
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      vertexColors: false,
    });
    
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

      // Create marker - brighter and more visible
      const markerGeometry = new THREE.SphereGeometry(0.025, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00, // Orange/yellow color for better visibility
        transparent: false,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, y, z);
      marker.userData = { station };

      stationMarkersRef.current?.add(marker);

      // Add pulsing glow ring
      const glowGeometry = new THREE.SphereGeometry(0.04, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.4,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(x, y, z);
      stationMarkersRef.current?.add(glow);
      
      // Add vertical beam of light
      const beamGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 8);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.6,
      });
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      
      // Orient beam from surface outward
      const direction = new THREE.Vector3(x, y, z).normalize();
      beam.position.set(x, y, z);
      beam.position.addScaledVector(direction, 0.15);
      beam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      );
      stationMarkersRef.current?.add(beam);
    });
  }, [stations]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Tooltip */}
      {hoveredStation && tooltipPosition && (
        <div
          className="absolute z-50 bg-black/95 text-white px-4 py-3 rounded-lg text-sm pointer-events-none border border-orange-500/50 backdrop-blur-md shadow-xl shadow-orange-500/20"
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y + 15,
          }}
        >
          <div className="font-bold text-orange-400">{hoveredStation.name || 'Unnamed Station'}</div>
          {hoveredStation.description && (
            <div className="text-gray-300 text-xs mt-1">{hoveredStation.description}</div>
          )}
          {hoveredStation.geohash && (
            <div className="text-gray-400 text-xs mt-1.5 font-mono">📍 {hoveredStation.geohash}</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4 text-white shadow-xl">
        <h3 className="text-sm font-semibold mb-2">Weather Stations</h3>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
          <span>{stations.length} active stations</span>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          🖱️ Drag to rotate • 🔍 Scroll to zoom
        </div>
      </div>
    </div>
  );
}
