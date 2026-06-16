import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDistrictStatsQuery, useGetAdminConfigQuery } from "../store/jobsApi.js";

// Approximate bounding box for Haryana (SVG fallback)
const LNG_RANGE = [75.5, 77.6];
const LAT_RANGE = [28.2, 30.9];
const WIDTH = 400;
const HEIGHT = 300;
const PADDING = 30;

function project([lng, lat]) {
  const x = PADDING + ((lng - LNG_RANGE[0]) / (LNG_RANGE[1] - LNG_RANGE[0])) * (WIDTH - PADDING * 2);
  const y = PADDING + (1 - (lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * (HEIGHT - PADDING * 2);
  return [x, y];
}

let mapsScriptLoading = false;
let mapsScriptCallbacks = [];

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return; }
    if (mapsScriptLoading) { mapsScriptCallbacks.push({ resolve, reject }); return; }
    mapsScriptLoading = true;
    window.__gmCallback = () => {
      mapsScriptCallbacks.forEach((cb) => cb.resolve(window.google.maps));
      mapsScriptCallbacks = [];
      resolve(window.google.maps);
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__gmCallback&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      mapsScriptCallbacks.forEach((cb) => cb.reject(e));
      mapsScriptCallbacks = [];
      mapsScriptLoading = false;
      reject(e);
    };
    document.head.appendChild(script);
  });
}

function GoogleDistrictMap({ items, apiKey }) {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !items.length) return;
    let cancelled = false;

    loadGoogleMapsScript(apiKey).then((maps) => {
      if (cancelled || !mapRef.current) return;

      const map = new maps.Map(mapRef.current, {
        center: { lat: 29.05, lng: 76.35 },
        zoom: 8,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;

      const maxCount = Math.max(...items.map((i) => i.count), 1);

      items.forEach((item) => {
        if (!item.coordinates?.length) return;
        const [lng, lat] = item.coordinates;
        const size = 18 + Math.round((item.count / maxCount) * 20);

        const marker = new maps.Marker({
          position: { lat, lng },
          map,
          label: { text: String(item.count), color: "#fff", fontWeight: "bold", fontSize: "11px" },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: size,
            fillColor: "#1d4ed8",
            fillOpacity: 0.85,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          title: `${item.district}: ${item.count} open jobs`,
        });

        const infoWindow = new maps.InfoWindow({
          content: `<div style="font-size:13px;font-weight:600">${item.district}</div><div style="font-size:12px;color:#555">${item.count} open job${item.count !== 1 ? "s" : ""}</div>`,
        });

        marker.addListener("click", () => {
          navigate(`/jobs?district=${encodeURIComponent(item.district)}`);
        });
        marker.addListener("mouseover", () => infoWindow.open(map, marker));
        marker.addListener("mouseout", () => infoWindow.close());
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [items, apiKey, navigate]);

  useEffect(() => {
    if (!userPos || !mapInstanceRef.current || !window.google?.maps) return;
    const maps = window.google.maps;
    mapInstanceRef.current.panTo({ lat: userPos.lat, lng: userPos.lng });
    mapInstanceRef.current.setZoom(11);
    new maps.Marker({
      position: userPos,
      map: mapInstanceRef.current,
      title: "Your location",
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
    });
  }, [userPos]);

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full rounded-lg" style={{ height: 360 }} />
      <button
        onClick={handleNearMe}
        disabled={locating}
        className="absolute bottom-3 right-3 bg-white border border-gray-300 shadow-sm rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-60"
      >
        <span>📍</span> {locating ? "Locating…" : "Near me"}
      </button>
    </div>
  );
}

function SvgDistrictMap({ items }) {
  const navigate = useNavigate();
  const maxCount = Math.max(...items.map((i) => i.count), 1);
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto max-h-80">
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#eff6ff" rx="12" />
      {items.map((item) => {
        const [x, y] = project(item.coordinates);
        const r = 8 + (item.count / maxCount) * 22;
        return (
          <g
            key={item.district}
            className="cursor-pointer"
            onClick={() => navigate(`/jobs?district=${encodeURIComponent(item.district)}`)}
          >
            <circle cx={x} cy={y} r={r} fill="#1d4ed8" opacity="0.35" />
            <circle cx={x} cy={y} r={Math.max(r * 0.45, 6)} fill="#1d4ed8" />
            <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
              {item.count}
            </text>
            <text x={x} y={y + r + 14} textAnchor="middle" fill="#1e3a8a" fontSize="11">
              {item.district}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DistrictMap() {
  const { data, isLoading } = useDistrictStatsQuery();
  const { data: configData } = useGetAdminConfigQuery();
  const apiKey = configData?.config?.googleMapsApiKey;
  const items = (data?.items || []).filter((i) => i.district && i.coordinates?.length === 2);

  if (isLoading || items.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Jobs by district</h2>
      <div className="bg-white border rounded-lg p-4">
        {apiKey ? (
          <GoogleDistrictMap items={items} apiKey={apiKey} />
        ) : (
          <SvgDistrictMap items={items} />
        )}
        <p className="text-xs text-gray-500 mt-2">
          {apiKey ? "Click a marker to browse jobs in that district. Use \"Near me\" to centre the map on your location." : "Pin size reflects open job count. Click a district to view its jobs."}
        </p>
      </div>
    </section>
  );
}
