import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function Fit({ points }) {
  const map = useMap()
  const key = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|')
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 18 })
    else map.setView(points[0], 17)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// Screen 16 map — shown ONLY once real map tiles have loaded (offline → the parent shows no map at all).
// The line is a straight line for orientation, not a walking route (honest label is shown by the parent).
// onStatus('ok' | 'failed')
export default function RouteMap({ me, target, labels, onStatus }) {
  const [loaded, setLoaded] = useState(false)
  const done = useRef(false)
  useEffect(() => {
    const timer = setTimeout(() => { if (!done.current) { done.current = true; onStatus('failed') } }, 7000)
    return () => clearTimeout(timer)
  }, [onStatus])
  const ok = () => { if (!done.current) { done.current = true; setLoaded(true); onStatus('ok') } }
  const points = [me && [me.lat, me.lng], [target.lat, target.lng]].filter(Boolean)

  return (
    <div className={`h-60 overflow-hidden rounded-[var(--radius-card)] border border-line transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      <MapContainer center={[target.lat, target.lng]} zoom={17} zoomControl={false} attributionControl={false}
        className="h-full w-full" dragging touchZoom scrollWheelZoom={false}>
        {/* crossOrigin: CORS tiles → the service worker caches real 200 responses (opaque ones eat quota) */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" eventHandlers={{ tileload: ok }} />
        <Fit points={points} />
        {me && <Polyline positions={points} pathOptions={{ color: '#175b4d', weight: 4, dashArray: '2 10', lineCap: 'round' }} />}
        <CircleMarker center={[target.lat, target.lng]} radius={10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#175b4d', fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>{labels.target}</Tooltip>
        </CircleMarker>
        {me && (
          <CircleMarker center={[me.lat, me.lng]} radius={9} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0e4237', fillOpacity: 1 }}>
            <Tooltip permanent direction="bottom" offset={[0, 10]}>{labels.me}</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  )
}
