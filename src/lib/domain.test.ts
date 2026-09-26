import { describe, expect, it } from "vitest";
import {
  distanciaM,
  euro,
  GEOFENCE_RAIO_M,
  minutosEntre,
  ROUTE_ESTADOS,
  STOP_ESTADOS,
} from "./domain";

describe("distanciaM (Haversine)", () => {
  it("devolve 0 para o mesmo ponto", () => {
    expect(distanciaM({ lat: 38.7223, lng: -9.1393 }, { lat: 38.7223, lng: -9.1393 })).toBe(0);
  });

  it("mede ~111 km por grau de latitude", () => {
    const d = distanciaM({ lat: 38, lng: -9 }, { lat: 39, lng: -9 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it("e simetrica", () => {
    const a = { lat: 38.7369, lng: -9.1427 };
    const b = { lat: 38.7078, lng: -9.1366 };
    expect(distanciaM(a, b)).toBe(distanciaM(b, a));
  });

  it("distingue dentro/fora do raio de geofencing", () => {
    const parada = { lat: 38.7223, lng: -9.1393 };
    const perto = { lat: 38.7223 + 0.0009, lng: -9.1393 }; // ~100 m
    const longe = { lat: 38.7223 + 0.0018, lng: -9.1393 }; // ~200 m
    expect(distanciaM(parada, perto)).toBeLessThanOrEqual(GEOFENCE_RAIO_M);
    expect(distanciaM(parada, longe)).toBeGreaterThan(GEOFENCE_RAIO_M);
  });
});

describe("minutosEntre", () => {
  it("devolve null sem inicio", () => {
    expect(minutosEntre(null, "2026-09-26T10:00:00Z")).toBeNull();
  });

  it("arredonda ao minuto", () => {
    expect(minutosEntre("2026-09-26T10:00:00Z", "2026-09-26T10:12:31Z")).toBe(13);
  });

  it("nunca devolve negativo quando o fim e anterior ao inicio", () => {
    expect(minutosEntre("2026-09-26T10:00:00Z", "2026-09-26T09:00:00Z")).toBe(0);
  });
});

describe("euro", () => {
  it("formata em EUR pt-PT", () => {
    expect(euro(0.7)).toMatch(/0,70\s?€/);
  });

  it("trata NaN como zero", () => {
    expect(euro(Number.NaN)).toMatch(/0,00\s?€/);
  });
});

describe("registos de estado", () => {
  it("todas as entradas tem label e tone", () => {
    for (const registo of [STOP_ESTADOS, ROUTE_ESTADOS]) {
      for (const valor of Object.values(registo)) {
        expect(valor.label.length).toBeGreaterThan(0);
        expect(valor.tone.length).toBeGreaterThan(0);
      }
    }
  });
});
