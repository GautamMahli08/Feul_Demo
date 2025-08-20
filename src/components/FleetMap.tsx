// FleetMap.tsx
import React, { useEffect, useRef } from 'react';
import { Truck, UserRole } from '@/types/truck';
import { GEOFENCE_ZONES, GeoZone } from '@/data/geofences';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FleetMapProps {
  trucks: Truck[];
  userRole: UserRole;
  clientName?: string;
}

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MUSCAT_CENTER: [number, number] = [23.5859, 58.4059]; // Muscat
const MUSCAT_ZOOM = 12;

const FleetMap = ({ trucks }: FleetMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const trailsRef = useRef<{ [key: string]: L.Polyline }>({});
  const routeLinesRef = useRef<{ [key: string]: L.Polyline }>({});
  const corridorLinesRef = useRef<{ [key: string]: L.Polyline }>({});
  const startMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const endMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const geofenceLayersRef = useRef<{ [key: string]: L.Layer }>({});

  // ---------- helpers ----------
  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'delivering': return 'green';
      case 'assigned': return 'orange';
      case 'idle': return 'blue';
      case 'completed': return 'gray';
      case 'uplifting': return 'purple';
      default: return 'red';
    }
  };

  const fitToZones = (zones: GeoZone[]) => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([]);

    zones.forEach(z => {
      if (z.shape === 'circle' && z.center && typeof z.radius === 'number') {
        // approximate: pad by radius in degrees (small distances)
        bounds.extend([z.center.lat, z.center.lng]);
      } else if (z.shape === 'polygon' && z.polygon?.length) {
        z.polygon.forEach(p => bounds.extend([p.lat, p.lng]));
      }
    });

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds.pad(0.2));
    } else {
      mapInstanceRef.current.setView(MUSCAT_CENTER, MUSCAT_ZOOM);
    }
  };

  const drawZones = (zones: GeoZone[]) => {
    if (!mapInstanceRef.current) return;

    // Clear existing
    Object.values(geofenceLayersRef.current).forEach(layer => layer.remove());
    geofenceLayersRef.current = {};

    zones.forEach(z => {
      const color =
        z.type === 'depot' ? '#16a34a' : z.type === 'delivery' ? '#2563eb' : '#ef4444';

      let layer: L.Layer | null = null;

      if (z.shape === 'circle' && z.center && typeof z.radius === 'number') {
        layer = L.circle([z.center.lat, z.center.lng], {
          radius: z.radius,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.1,
        }).bindPopup(
          `<strong>${z.name}</strong><br/>Type: ${z.type}${z.clientName ? `<br/>Client: ${z.clientName}` : ''}`
        );
      } else if (z.shape === 'polygon' && z.polygon?.length) {
        const coords = z.polygon.map(p => [p.lat, p.lng]) as [number, number][];
        layer = L.polygon(coords, {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.1,
        }).bindPopup(
          `<strong>${z.name}</strong><br/>Type: ${z.type}${z.clientName ? `<br/>Client: ${z.clientName}` : ''}`
        );
      }

      if (layer) {
        layer.addTo(mapInstanceRef.current!);
        geofenceLayersRef.current[z.id] = layer;
      }
    });
  };

  // ---------- init map ----------
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(MUSCAT_CENTER, MUSCAT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // if the map is initially hidden, make sure it sizes correctly
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 0);

    // Draw zones and fit to them on first mount
    drawZones(GEOFENCE_ZONES);
    fitToZones(GEOFENCE_ZONES);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- update trucks ----------
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove old layers
    Object.values(markersRef.current).forEach(m => m.remove());
    Object.values(trailsRef.current).forEach(t => t.remove());
    Object.values(routeLinesRef.current).forEach(l => l.remove());
    Object.values(startMarkersRef.current).forEach(m => m.remove());
    Object.values(endMarkersRef.current).forEach(m => m.remove());
    Object.values(corridorLinesRef.current).forEach(m => m.remove());
    markersRef.current = {};
    trailsRef.current = {};
    routeLinesRef.current = {};
    corridorLinesRef.current = {};
    startMarkersRef.current = {};
    endMarkersRef.current = {};

    // Add trucks
    trucks.forEach(truck => {
      const markerIcon = L.divIcon({
        html: `<div style="
          background-color:${getMarkerColor(truck.status)};
          width:20px;height:20px;border-radius:50%;
          border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;color:white;font-weight:bold;
        ">${truck.id.slice(-1)}</div>`,
        className: 'custom-div-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const statusColor = truck.telemetry.online ? getMarkerColor(truck.status) : '#ef4444';
      const statusText = truck.telemetry.online ? truck.status : 'offline';

      const marker = L.marker([truck.position.lat, truck.position.lng], { icon: markerIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="min-width:250px;">
            <h3 style="margin:0 0 8px 0;font-weight:bold;color:#333;">${truck.name}</h3>
            <p style="margin:0 0 4px 0;color:#666;"><strong>Driver:</strong> ${truck.driver}</p>
            <div style="margin:4px 0;display:flex;align-items:center;gap:8px;">
              <strong>Status:</strong>
              <span style="background:${statusColor};color:white;padding:2px 8px;border-radius:12px;font-size:12px;">
                ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
              </span>
            </div>
            <div style="margin:4px 0;display:flex;align-items:center;gap:8px;">
              <strong>Speed:</strong>
              <span style="font-weight:bold;color:${truck.telemetry.speed > 80 ? '#ef4444' : truck.telemetry.speed > 50 ? '#f59e0b' : '#10b981'};">
                ${truck.telemetry.speed.toFixed(1)} km/h
              </span>
            </div>
            <p style="margin:0 0 4px 0;color:#666;"><strong>Location:</strong> ${truck.position.lat.toFixed(4)}, ${truck.position.lng.toFixed(4)}</p>
            <p style="margin:0 0 8px 0;color:#666;"><strong>Client:</strong> ${truck.client}</p>
            ${truck.destination && truck.startPoint ? 
              `<p style="margin:0;color:#666;"><strong>Route:</strong> ${truck.startPoint.lat.toFixed(4)}, ${truck.startPoint.lng.toFixed(4)} → ${truck.destination.name}</p>` : 
              truck.destination ? `<p style="margin:0;color:#666;"><strong>Destination:</strong> ${truck.destination.name}</p>` : ''
            }
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
              <strong>Compartments:</strong><br>
              ${truck.compartments.map(comp => 
                `${comp.id}: ${comp.currentLevel.toFixed(0)}L ${comp.fuelType} ${comp.isOffloading ? '(Offloading)' : ''}`
              ).join('<br>')}
            </div>
          </div>
        `);

      markersRef.current[truck.id] = marker;

      // Trail
      if (truck.trail && truck.trail.length > 1) {
        const trail = L.polyline(
          truck.trail.map(p => [p.lat, p.lng] as [number, number]),
          {
            color: getMarkerColor(truck.status),
            weight: 3,
            opacity: 0.6,
            dashArray: truck.status === 'delivering' ? '5, 5' : undefined,
          }
        ).addTo(mapInstanceRef.current!);
        trailsRef.current[truck.id] = trail;
      }

      // Destination & Start markers + route
      if (truck.destination) {
        const endIcon = L.divIcon({
          html: `<div style="
            background-color:#ef4444;width:18px;height:18px;border-radius:50%;
            border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;
          ">E</div>`,
          className: 'destination-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const endMarker = L.marker([truck.destination.lat, truck.destination.lng], { icon: endIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div>
              <h3 style="margin:0 0 4px 0;font-weight:bold;color:#333;">Destination</h3>
              <p style="margin:0;color:#666;">${truck.destination.name}</p>
              <p style="margin:4px 0 0 0;color:#666;font-size:12px;">
                ${truck.destination.lat.toFixed(4)}, ${truck.destination.lng.toFixed(4)}
              </p>
            </div>
          `);
        endMarkersRef.current[truck.id] = endMarker;

        if (truck.startPoint) {
          const startIcon = L.divIcon({
            html: `<div style="
              background-color:#22c55e;width:18px;height:18px;border-radius:50%;
              border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;
            ">S</div>`,
            className: 'start-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const startMarker = L.marker([truck.startPoint.lat, truck.startPoint.lng], { icon: startIcon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div>
                <h3 style="margin:0 0 4px 0;font-weight:bold;color:#333;">Start Point</h3>
                <p style="margin:0;color:#666;">${truck.name}</p>
                <p style="margin:4px 0 0 0;color:#666;font-size:12px;">
                  ${truck.startPoint.lat.toFixed(4)}, ${truck.startPoint.lng.toFixed(4)}
                </p>
              </div>
            `);
          startMarkersRef.current[truck.id] = startMarker;

          const routeLine = L.polyline(
            [[truck.startPoint.lat, truck.startPoint.lng], [truck.destination.lat, truck.destination.lng]],
            { color: '#6b7280', weight: 2, opacity: 0.7, dashArray: '10, 5' }
          ).addTo(mapInstanceRef.current!);
          routeLinesRef.current[truck.id] = routeLine;
        }
      }
    });

    // View logic: fit to trucks if present; else keep zones view
    if (trucks.length > 0) {
      const group = L.featureGroup(Object.values(markersRef.current));
      if (trucks.length === 1) {
        mapInstanceRef.current.setView(
          [trucks[0].position.lat, trucks[0].position.lng],
          14,
          { animate: true }
        );
      } else {
        const b = group.getBounds();
        if (b.isValid()) mapInstanceRef.current.fitBounds(b.pad(0.1));
      }
    } else {
      // No trucks? make sure zones are visible
      fitToZones(GEOFENCE_ZONES);
    }

    // If container size changed (tabs/modals), fix rendering
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 0);
  }, [trucks]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg border border-border"
      style={{ minHeight: '300px' }}
    />
  );
};

export default FleetMap;
