import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';

interface WeatherGlobeProps {
  stations: WeatherStationMetadata[];
  onStationClick?: (station: WeatherStationMetadata) => void;
}

// Major cities data
const CITIES = [
  { lat: 40.7128, lng: -74.006, name: 'New York' },
  { lat: 51.5074, lng: -0.1278, name: 'London' },
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  { lat: 48.8566, lng: 2.3522, name: 'Paris' },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
  { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
  { lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
  { lat: -23.5505, lng: -46.6333, name: 'São Paulo' },
  { lat: 28.6139, lng: 77.209, name: 'Delhi' },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
  { lat: 52.52, lng: 13.405, name: 'Berlin' },
  { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
  { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
  { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  { lat: 31.2304, lng: 121.4737, name: 'Shanghai' },
  { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  { lat: 6.5244, lng: 3.3792, name: 'Lagos' },
  { lat: 41.9028, lng: 12.4964, name: 'Rome' },
];

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Get sun position based on current time for day/night
function getSunDirection(): THREE.Vector3 {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  // Solar declination
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));
  
  // Hour angle - sun longitude
  const sunLng = (12 - hours) * 15;
  
  return latLngToVector3(declination, sunLng, 1).normalize();
}

export function WeatherGlobe({ stations, onStationClick }: WeatherGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number | null>(null);
  const stationMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; station: WeatherStationMetadata }>>(new Map());
  
  const [hoveredStation, setHoveredStation] = useState<WeatherStationMetadata | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const rotationVelocity = useRef({ x: 0.001, y: 0 });

  // Station data
  const stationPoints = useMemo(() => {
    return stations.filter((s) => s.lat !== undefined && s.lng !== undefined);
  }, [stations]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    const radius = 100;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020810);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.z = 300;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Earth group (for rotation)
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    earthGroupRef.current = earthGroup;

    // Texture loader
    const textureLoader = new THREE.TextureLoader();

    // Earth sphere with day texture
    const earthGeometry = new THREE.SphereGeometry(radius, 64, 64);
    
    // Load textures
    const dayTexture = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
    );
    const nightTexture = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-night.jpg'
    );
    const bumpTexture = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-topology.png'
    );
    
    // Custom shader material for day/night
    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: getSunDirection() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 normal = normalize(vNormal);
          float intensity = dot(normal, sunDirection);
          
          // Smooth transition between day and night
          float mixValue = smoothstep(-0.1, 0.2, intensity);
          
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          
          // Boost night lights
          nightColor.rgb *= 1.5;
          
          gl_FragColor = mix(nightColor, dayColor, mixValue);
        }
      `,
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);
    earthRef.current = earth;

    // Atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.02, 64, 64);
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
          gl_FragColor = vec4(0.3, 0.6, 1.0, 0.4) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    // Add city markers
    CITIES.forEach((city) => {
      const pos = latLngToVector3(city.lat, city.lng, radius * 1.005);
      
      const markerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffcc00,
        transparent: true,
        opacity: 0.8,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(pos);
      earthGroup.add(marker);
    });

    // Add weather station markers
    stationMeshesRef.current.clear();
    stationPoints.forEach((station) => {
      const pos = latLngToVector3(station.lat!, station.lng!, radius * 1.01);
      
      // Outer glow
      const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff3333,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(pos);
      earthGroup.add(glow);
      
      // Main marker
      const markerGeometry = new THREE.SphereGeometry(1.2, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff3333,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(pos);
      earthGroup.add(marker);
      
      stationMeshesRef.current.set(station.pubkey, { mesh: marker, station });
    });

    // Stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const y = (Math.random() - 0.5) * 1000;
      const z = (Math.random() - 0.5) * 1000;
      starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, transparent: true, opacity: 0.7 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Animation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (autoRotate.current) {
        earthGroup.rotation.y += rotationVelocity.current.x;
      }

      // Update sun direction every frame for real-time day/night
      (earthMaterial.uniforms.sunDirection.value as THREE.Vector3).copy(getSunDirection());

      renderer.render(scene, camera);
    };
    animate();

    // Mouse interaction
    const canvas = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - previousMouse.current.x;
        const deltaY = e.clientY - previousMouse.current.y;
        
        earthGroup.rotation.y += deltaX * 0.005;
        earthGroup.rotation.x += deltaY * 0.005;
        earthGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, earthGroup.rotation.x));
        
        previousMouse.current = { x: e.clientX, y: e.clientY };
      }

      // Raycast for hover
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      let found: WeatherStationMetadata | null = null;
      stationMeshesRef.current.forEach(({ mesh, station }) => {
        const intersects = raycaster.intersectObject(mesh);
        if (intersects.length > 0) {
          found = station;
        }
      });

      if (found) {
        setHoveredStation(found);
        setTooltipPosition({ x: e.clientX, y: e.clientY });
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredStation(null);
        setTooltipPosition(null);
        canvas.style.cursor = isDragging.current ? 'grabbing' : 'grab';
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
      setTimeout(() => { autoRotate.current = true; }, 2000);
    };

    const handleClick = () => {
      if (hoveredStation && onStationClick) {
        onStationClick(hoveredStation);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(150, Math.min(500, camera.position.z + e.deltaY * 0.3));
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [stationPoints, onStationClick]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Tooltip */}
      {hoveredStation && tooltipPosition && (
        <div
          className="absolute z-50 bg-gray-900/95 text-white px-4 py-3 rounded-lg text-sm pointer-events-none border border-red-500/50 shadow-xl"
          style={{
            left: Math.min(tooltipPosition.x + 15, window.innerWidth - 250),
            top: tooltipPosition.y - 80,
          }}
        >
          <div className="font-bold text-red-400">{hoveredStation.name || 'Unnamed Station'}</div>
          {hoveredStation.description && (
            <div className="text-gray-300 text-xs mt-1">{hoveredStation.description}</div>
          )}
          {hoveredStation.geohash && (
            <div className="text-gray-400 text-xs mt-1.5 font-mono">📍 {hoveredStation.geohash}</div>
          )}
          <div className="text-gray-500 text-xs mt-1">Click to view details</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-white shadow-xl">
        <h3 className="text-sm font-semibold mb-3">Nostr Weather</h3>
        <div className="flex items-center gap-2 text-xs mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>{stations.length} weather stations</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-gray-400">Major cities</span>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
          🖱️ Drag to rotate<br/>
          🔍 Scroll to zoom
        </div>
      </div>
    </div>
  );
}
