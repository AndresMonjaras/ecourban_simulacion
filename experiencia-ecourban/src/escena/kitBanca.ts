import type { BufferGeometry } from "three";
import {
  ANCHO,
  crearMaterialesBanca,
  crearTornillo,
  geometriaListon,
  geometriaPletina,
  geometriaSoporte,
} from "./fabricasBanca";

/**
 * Banca de la escena de proceso: reutiliza las mismas fabricas que Banca.tsx
 * (perfil de soporte, listones, pletina, tornillo, texturas PET). Un unico juego
 * por perfil de calidad, compartido por las dos instancias y las piezas sueltas.
 */
const kits = new Map<boolean, ReturnType<typeof crear>>();

function crear(lite: boolean) {
  const sueltos = new Map<string, BufferGeometry>();
  const mat = crearMaterialesBanca(lite);
  // Misma textura PET; solo se contiene el tono del verde bajo la luz de estudio del proceso.
  mat.soportes.forEach((m) => m.color.multiplyScalar(0.7));
  return {
    mat,
    tornillo: crearTornillo(lite),
    geoSoporte: geometriaSoporte(lite),
    geoRespaldo: geometriaListon(ANCHO, 0.1, 0.04, lite),
    geoAsiento: geometriaListon(ANCHO, 0.05, 0.088, lite),
    geoPletina: geometriaPletina(lite),
    /** Listones cortos (piezas recibidas, perfil en el taller) con el mismo perfil de asiento. */
    liston(largo: number) {
      const k = largo.toFixed(3);
      let g = sueltos.get(k);
      if (!g) {
        g = geometriaListon(largo, 0.05, 0.088, lite);
        sueltos.set(k, g);
      }
      return g;
    },
  };
}

export function kitBanca(lite: boolean) {
  let k = kits.get(lite);
  if (!k) {
    k = crear(lite);
    kits.set(lite, k);
  }
  return k;
}
