import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";

export type MapPonto = {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  subtitulo?: string;
  cor: string;
};

export function FleetMap({
  pontos,
  ligar = false,
  altura = 360,
}: {
  pontos: MapPonto[];
  ligar?: boolean;
  altura?: number;
}) {
  const centro: [number, number] = pontos.length
    ? [pontos[0]!.lat, pontos[0]!.lng]
    : [38.7223, -9.1393];

  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      style={{ height: altura, width: "100%" }}
    >
      <MapContainer
        center={centro}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ligar && pontos.length > 1 ? (
          <Polyline
            positions={pontos.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#1f3f66", weight: 3, opacity: 0.6 }}
          />
        ) : null}
        {pontos.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
            pathOptions={{ color: p.cor, fillColor: p.cor, fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <strong>{p.titulo}</strong>
              {p.subtitulo ? (
                <>
                  <br />
                  {p.subtitulo}
                </>
              ) : null}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
