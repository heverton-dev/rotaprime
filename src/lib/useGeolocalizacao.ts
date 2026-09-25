import { useCallback, useEffect, useState } from "react";

export type Coordenada = { lat: number; lng: number; precisao: number };

/** Leitura da posição por satélite, com atualização contínua (telemetria). */
export function useGeolocalizacao(ativo = true) {
  const [posicao, setPosicao] = useState<Coordenada | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!ativo || typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setPosicao({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precisao: Math.round(p.coords.accuracy),
        }),
      () => setErro("Sem acesso à localização do dispositivo."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [ativo]);

  const pedir = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setPosicao({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precisao: Math.round(p.coords.accuracy),
        }),
      () => setErro("Sem acesso à localização do dispositivo."),
      { enableHighAccuracy: true },
    );
  }, []);

  return { posicao, erro, pedir };
}
