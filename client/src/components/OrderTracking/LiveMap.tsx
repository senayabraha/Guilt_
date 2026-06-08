import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { MapPinIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { iconsForLeafpad } from "../../assets/assets";

// Status-specific placeholder copy shown when no live location is available.
const PLACEHOLDER_TEXT: Record<string, string> = {
  "Ready for Pickup": "Map will appear once a delivery partner picks up your order.",
  Assigned: "Your delivery partner has been assigned. Map will appear shortly.",
  Packed: "Map will appear once your order is picked up.",
};
const DEFAULT_PLACEHOLDER = "Waiting for delivery partner location…";

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LiveMap({
  order,
  liveLocation,
}: {
  order: any;
  liveLocation: { lat: number; lng: number } | null;
}) {
  const isTerminal = order.status === "Delivered" || order.status === "Cancelled";
  const isPreDelivery = ["Placed", "Confirmed", "Preparing"].includes(order.status);

  // Don't render a map for terminal or pre-delivery statuses.
  if (isTerminal || isPreDelivery) return null;

  const truckIcon = new L.Icon({
    iconUrl: iconsForLeafpad.truck,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

  const destinationIcon = new L.Icon({
    iconUrl: iconsForLeafpad.destination,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const hasLive = liveLocation && liveLocation.lat !== 0;
  const hasDestination = order.shippingAddress?.lat && order.shippingAddress?.lng;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-app-border"
      style={{ height: 280 }}
    >
      {hasLive ? (
        <MapContainer
          center={[liveLocation.lat, liveLocation.lng]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[liveLocation.lat, liveLocation.lng]} icon={truckIcon}>
            <Popup>Delivery Partner</Popup>
          </Marker>
          {hasDestination && (
            <Marker
              position={[order.shippingAddress.lat, order.shippingAddress.lng]}
              icon={destinationIcon}
            >
              <Popup>Your delivery address</Popup>
            </Marker>
          )}
          <MapUpdater center={[liveLocation.lat, liveLocation.lng]} />
        </MapContainer>
      ) : hasDestination ? (
        <MapContainer
          center={[order.shippingAddress.lat, order.shippingAddress.lng]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker
            position={[order.shippingAddress.lat, order.shippingAddress.lng]}
            icon={destinationIcon}
          >
            <Popup>Your delivery address</Popup>
          </Marker>
        </MapContainer>
      ) : (
        <div className="h-full bg-app-green/5 flex items-center justify-center">
          <div className="text-center px-6">
            <MapPinIcon className="size-8 text-app-green/40 mx-auto mb-2" />
            <p className="text-sm text-app-green/60 font-medium">
              {PLACEHOLDER_TEXT[order.status] ?? DEFAULT_PLACEHOLDER}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
