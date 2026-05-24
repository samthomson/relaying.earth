import { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';

interface WeatherGlobeProps {
  stations: WeatherStationMetadata[];
  onStationClick?: (station: WeatherStationMetadata) => void;
}

export function WeatherGlobe({ stations, onStationClick }: WeatherGlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredStation, setHoveredStation] = useState<WeatherStationMetadata | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(true);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight - 57; // Account for navbar
    const radius = Math.min(width, height) / 2.5;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // Create projection
    const projection = geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .clipAngle(90);

    const path = geoPath().projection(projection);
    const graticule = geoGraticule();

    // Create globe background (water)
    const globe = svg
      .append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', radius)
      .attr('fill', '#0a1929')
      .attr('stroke', '#1e3a5f')
      .attr('stroke-width', 2);

    // Add graticule (latitude/longitude lines)
    svg
      .append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#1e3a5f')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3);

    // Load and render world map
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((response) => response.json())
      .then((world) => {
        const countries = (window as any).topojson.feature(world, world.objects.countries);

        svg
          .selectAll('.country')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('class', 'country')
          .attr('d', path as any)
          .attr('fill', '#1a4d2e')
          .attr('stroke', '#0f2818')
          .attr('stroke-width', 0.5);

        // Add stations after map loads
        renderStations();
      })
      .catch(() => {
        // Fallback: render stations even if map fails
        renderStations();
      });

    function renderStations() {
      const stationGroup = svg.append('g').attr('class', 'stations');

      stations.forEach((station) => {
        if (station.lat === undefined || station.lng === undefined) return;

        const coords = projection([station.lng, station.lat]);
        if (!coords) return;

        // Check if station is visible (on front of globe)
        const distance = Math.acos(
          Math.sin(station.lat * (Math.PI / 180)) * Math.sin(projection.rotate()[1] * (Math.PI / 180)) +
            Math.cos(station.lat * (Math.PI / 180)) *
              Math.cos(projection.rotate()[1] * (Math.PI / 180)) *
              Math.cos((station.lng - projection.rotate()[0]) * (Math.PI / 180))
        );
        const isVisible = distance < Math.PI / 2;

        if (!isVisible) return;

        // Glow circle
        stationGroup
          .append('circle')
          .attr('cx', coords[0])
          .attr('cy', coords[1])
          .attr('r', 8)
          .attr('fill', '#ff3333')
          .attr('opacity', 0.2)
          .attr('class', 'station-glow');

        // Main marker
        stationGroup
          .append('circle')
          .attr('cx', coords[0])
          .attr('cy', coords[1])
          .attr('r', 4)
          .attr('fill', '#ff3333')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('opacity', 0.9)
          .attr('class', 'station-marker')
          .style('cursor', 'pointer')
          .on('mouseenter', (event) => {
            setHoveredStation(station);
            setTooltipPosition({ x: event.clientX, y: event.clientY });
          })
          .on('mouseleave', () => {
            setHoveredStation(null);
            setTooltipPosition(null);
          })
          .on('click', () => {
            onStationClick?.(station);
          });
      });
    }

    // Rotation function
    function rotate() {
      if (autoRotateRef.current) {
        rotationRef.current.x += 0.1;
      }

      projection.rotate([rotationRef.current.x, -rotationRef.current.y]);

      svg.selectAll('.graticule').attr('d', path as any);
      svg.selectAll('.country').attr('d', path as any);

      // Re-render stations
      svg.selectAll('.stations').remove();
      renderStations();

      animationFrameRef.current = requestAnimationFrame(rotate);
    }

    // Start auto-rotation
    rotate();

    // Drag behavior
    const dragBehavior = drag()
      .on('start', () => {
        autoRotateRef.current = false;
      })
      .on('drag', (event) => {
        rotationRef.current.x += event.dx * 0.5;
        rotationRef.current.y += event.dy * 0.5;
        rotationRef.current.y = Math.max(-90, Math.min(90, rotationRef.current.y));
      })
      .on('end', () => {
        setTimeout(() => {
          autoRotateRef.current = true;
        }, 2000);
      });

    svg.call(dragBehavior as any);

    // Handle window resize
    const handleResize = () => {
      // Re-render on resize
      window.location.reload();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [stations, onStationClick]);

  return (
    <div className="relative w-full h-full bg-[#000814]">
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      {hoveredStation && tooltipPosition && (
        <div
          className="absolute z-50 bg-black/95 text-white px-4 py-3 rounded-lg text-sm pointer-events-none border border-red-500/50 backdrop-blur-md shadow-xl shadow-red-500/20"
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y + 15,
          }}
        >
          <div className="font-bold text-red-400">{hoveredStation.name || 'Unnamed Station'}</div>
          {hoveredStation.description && (
            <div className="text-gray-300 text-xs mt-1">{hoveredStation.description}</div>
          )}
          {hoveredStation.geohash && (
            <div className="text-gray-400 text-xs mt-1.5 font-mono">📍 {hoveredStation.geohash}</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 text-white shadow-xl">
        <h3 className="text-sm font-semibold mb-2">Weather Stations</h3>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          <span>{stations.length} active stations</span>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          🖱️ Drag to rotate • Click markers for details
        </div>
      </div>
    </div>
  );
}
