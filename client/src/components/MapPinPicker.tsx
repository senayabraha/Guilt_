import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CrosshairIcon, MapPinIcon } from "lucide-react";
import toast from "react-hot-toast";

import { ADDIS_CENTER } from "../lib/areas";

interface Props {
  lat?: number;
  lng?: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: string;
  label?: string;
  helperText?: string;
}

// Orange teardrop pin (divIcon avoids Leaflet's broken default marker images
// under bundlers).
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%)">
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 26 16 26s16-15 16-26C32 7.16 24.84 0 16 0z" fill="#F97316"/>
      <circle cx="16" cy="16" r="6" fill="#FAF7F2"/>
    </svg>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [0, 0],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], Math.max(map.getZoom(), 15));
  }, [target, map]);
  return null;
}

const MapPinPicker = ({
  lat,
  lng,
  onChange,
  height = "260px",
  label,
  helperText,
}: Props) => {
  const hasInitial = typeof lat === "number" && typeof lng === "number" && !(lat === 0 && lng === 0);
  const initial = hasInitial ? { lat: lat!, lng: lng! } : ADDIS_CENTER;

  const [pos, setPos] = useState(initial);
  const [hasPin, setHasPin] = useState(hasInitial);
  const [recenter, setRecenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Keep marker in sync if the parent provides coords later.
  useEffect(() => {
    if (hasInitial) {
      setPos({ lat: lat!, lng: lng! });
      setHasPin(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  const update = (la: number, ln: number) => {
    setPos({ lat: la, lng: ln });
    setHasPin(true);
    onChange({ lat: la, lng: ln });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        update(p.coords.latitude, p.coords.longitude);
        setRecenter({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error("Location permission denied. You can drop the pin manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-app-green mb-1.5">
          {label}
        </label>
      )}

      <div
        className="rounded-xl overflow-hidden border border-app-border relative"
        style={{ height }}
      >
        <MapContainer
          center={[initial.lat, initial.lng]}
          zoom={hasInitial ? 15 : 13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <ClickHandler onPick={update} />
          {hasPin && (
            <Marker
              position={[pos.lat, pos.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  update(ll.lat, ll.lng);
                },
              }}
            />
          )}
          <Recenter target={recenter} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-green text-white text-xs font-medium hover:bg-app-green-light transition-colors disabled:opacity-60"
        >
          <CrosshairIcon className="size-3.5" />
          {locating ? "Locating…" : "Use my current location"}
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-app-text-light">
          <MapPinIcon className="size-3.5" /> Tap the map to drop pin manually
        </span>
      </div>

      {hasPin ? (
        <p className="text-xs text-app-success mt-1.5">
          Pinned location saved ({pos.lat.toFixed(5)}, {pos.lng.toFixed(5)})
        </p>
      ) : (
        <p className="text-xs text-app-text-light mt-1.5">
          {helperText || "Your pin helps delivery partners find you faster."}
        </p>
      )}
    </div>
  );
};

export default MapPinPicker;
