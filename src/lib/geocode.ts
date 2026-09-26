/**
 * Localização de moradas com o serviço aberto do OpenStreetMap (Nominatim).
 * Devolve null quando a morada não é reconhecida — a parada fica sem coordenadas
 * e o geofencing é ignorado para ela.
 */
export async function geocodificar(consulta: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pt&q=" +
      encodeURIComponent(consulta);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { lat: string; lon: string }[];
    const primeiro = json[0];
    if (!primeiro) return null;
    return { lat: Number(primeiro.lat), lng: Number(primeiro.lon) };
  } catch {
    return null;
  }
}
