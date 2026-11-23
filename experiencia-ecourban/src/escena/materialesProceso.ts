import {
  CanvasTexture,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  type Texture,
} from "three";
import { aleatorio } from "./fabricasBanca";

/**
 * Materiales compartidos de la escena de proceso: paleta de estudio de la banca
 * (grafito, verde reciclado oscuro, acero satinado). Cada superficie lleva una
 * microtextura procedural determinista (rugosidad + relieve) de baja amplitud.
 */

type Modo = "cepillado" | "pintura" | "tapete" | "madera";

/** Mapa de grises tileable; sirve de roughnessMap y bumpMap. Misma semilla = mismo resultado. */
function microtextura(modo: Modo, semilla: number, repeticion: number): Texture {
  const tam = 128;
  const rnd = aleatorio(semilla);
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c8c8c8";
  g.fillRect(0, 0, tam, tam);
  if (modo === "cepillado" || modo === "madera") {
    const n = modo === "madera" ? 60 : 260;
    for (let i = 0; i < n; i++) {
      const v = Math.round(150 + rnd() * 80);
      g.fillStyle = `rgba(${v},${v},${v},${modo === "madera" ? 0.45 : 0.3})`;
      g.fillRect(0, rnd() * tam, tam, modo === "madera" ? 1 + rnd() * 2.5 : 1);
    }
  } else {
    const img = g.getImageData(0, 0, tam, tam);
    const amp = modo === "tapete" ? 46 : 22;
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + (rnd() - 0.5) * amp;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
    g.putImageData(img, 0, 0);
    if (modo === "tapete") {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? 120 : 235},${rnd() < 0.5 ? 120 : 235},${rnd() < 0.5 ? 120 : 235},0.5)`;
        g.fillRect(rnd() * tam, rnd() * tam, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
      }
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeticion, repeticion);
  t.anisotropy = 4;
  return t;
}

const tCepillado = microtextura("cepillado", 101, 5);
const tPintura = microtextura("pintura", 103, 7);
const tTapete = microtextura("tapete", 107, 5);
const tMadera = microtextura("madera", 109, 3);

const con = (t: Texture, bump: number) => ({ roughnessMap: t, bumpMap: t, bumpScale: bump });

/** Malla metálica de resguardo: alfa en rejilla, tileable. */
function rejilla(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#fff";
  for (let i = 0; i < 64; i += 16) {
    g.fillRect(i, 0, 2, 64);
    g.fillRect(0, i, 64, 2);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

/** Moteado de polímero reciclado (motas claras sobre base media), tileable y determinista. */
function moteado(semilla: number): Texture {
  const tam = 128;
  const rnd = aleatorio(semilla);
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a9a9a";
  g.fillRect(0, 0, tam, tam);
  for (let i = 0; i < 420; i++) {
    const v = rnd() < 0.7 ? Math.round(170 + rnd() * 80) : Math.round(40 + rnd() * 40);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * tam, rnd() * tam, 1 + rnd() * 2, 1 + rnd() * 1.6);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

const tRejilla = rejilla();
const tMoteado = moteado(131);

export const MATERIAL = {
  acero: new MeshStandardMaterial({ color: "#a2a9b0", roughness: 0.55, metalness: 0.78, ...con(tCepillado, 0.6) }),
  aceroOscuro: new MeshStandardMaterial({ color: "#3c4147", roughness: 0.6, metalness: 0.75, ...con(tCepillado, 0.5) }),
  cromo: new MeshStandardMaterial({ color: "#c3c9cf", roughness: 0.36, metalness: 0.92 }),
  /** Bastidor pintado: verde grafito profundo, grano fino. */
  maquina: new MeshStandardMaterial({ color: "#2b3732", roughness: 0.72, metalness: 0.18, ...con(tPintura, 0.5) }),
  maquinaPanel: new MeshStandardMaterial({ color: "#35433d", roughness: 0.7, metalness: 0.2, ...con(tPintura, 0.5) }),
  /** Perfil de aluminio satinado (marcos, rieles, resguardos). */
  maquinaClara: new MeshStandardMaterial({ color: "#9aa1a6", roughness: 0.5, metalness: 0.7, ...con(tCepillado, 0.5) }),
  molde: new MeshStandardMaterial({ color: "#7c858c", roughness: 0.5, metalness: 0.7, ...con(tCepillado, 0.7) }),
  moldeOscuro: new MeshStandardMaterial({ color: "#2f353a", roughness: 0.62, metalness: 0.6, ...con(tCepillado, 0.5) }),
  borde: new MeshStandardMaterial({ color: "#69727a", roughness: 0.6, metalness: 0.05 }),
  corte: new MeshStandardMaterial({ color: "#4a5056", roughness: 0.9, metalness: 0 }),
  lija: new MeshStandardMaterial({ color: "#2a2d30", roughness: 1, metalness: 0, ...con(tTapete, 1) }),
  hueco: new MeshStandardMaterial({ color: "#050607", roughness: 1, metalness: 0 }),
  mesa: new MeshStandardMaterial({ color: "#252b2e", roughness: 0.7, metalness: 0.3, ...con(tPintura, 0.5) }),
  tapete: new MeshStandardMaterial({ color: "#121517", roughness: 0.95, metalness: 0, ...con(tTapete, 1.2) }),
  manguera: new MeshStandardMaterial({ color: "#16191b", roughness: 0.5, metalness: 0.15 }),
  madera: new MeshStandardMaterial({ color: "#8a6a45", roughness: 0.85, metalness: 0, ...con(tMadera, 1) }),
  carton: new MeshStandardMaterial({ color: "#a98254", roughness: 0.92, metalness: 0, side: DoubleSide, ...con(tMadera, 0.6) }),
  /** Superficie de trabajo clara y mate: separa el perfil oscuro del banco. */
  superficie: new MeshStandardMaterial({ color: "#7d7461", roughness: 0.82, metalness: 0, ...con(tMadera, 0.8) }),
  cinta: new MeshStandardMaterial({ color: "#c9b79a", roughness: 0.4, metalness: 0 }),
  /** Pellets: mate, de bajo brillo; el color por instancia aporta la variacion de lote. */
  pellet: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, metalness: 0, envMapIntensity: 0.55 }),
  /** Tono neutro para el compuesto previo al moldeo; no codifica el color real del lote. */
  compuesto: new MeshStandardMaterial({ color: "#89918d", roughness: 0.78, metalness: 0.01 }),
  /** Polimero reciclado en bruto, distinguible del acero del molde durante la compresion. */
  plasticoReciclado: new MeshStandardMaterial({ color: "#4f9a70", roughness: 0.82, metalness: 0.02 }),
  /** Señal visual cualitativa de zonas con calor; no codifica una temperatura. */
  calor: new MeshStandardMaterial({ color: "#b95d32", emissive: "#8d2e12", emissiveIntensity: 0.18, roughness: 0.48, metalness: 0.28 }),
  /** Acento frío para visualizar la estación de enfriamiento sin representar un valor de proceso. */
  frio: new MeshStandardMaterial({ color: "#76aeb4", emissive: "#255a67", emissiveIntensity: 0.12, roughness: 0.42, metalness: 0.35 }),
  viruta: new MeshStandardMaterial({ color: "#1b1e20", roughness: 0.85, metalness: 0 }),
  acrilico: new MeshPhysicalMaterial({ color: "#cfe3dd", transparent: true, opacity: 0.16, roughness: 0.12, side: DoubleSide, depthWrite: false }),
  pelicula: new MeshPhysicalMaterial({ color: "#e8f3ee", transparent: true, opacity: 0.12, roughness: 0.2, side: DoubleSide, depthWrite: false }),
  /** Gránulo de PET reciclado recibido: claro, translúcido en apariencia, facetado. */
  pelletPet: new MeshStandardMaterial({ color: "#bfdccd", roughness: 0.22, metalness: 0.05, emissive: "#18342a", emissiveIntensity: 0.25, envMapIntensity: 1.1 }),
  /** Compatibilizante polimérico: corriente separada, blanco opaco (color ilustrativo). */
  pelletCompat: new MeshStandardMaterial({ color: "#eceee8", roughness: 0.62, metalness: 0 }),
  /** Pellet del compuesto: tono neutro y opaco, distinto de la entrada; no codifica el color real del lote. */
  pelletCompuesto: new MeshStandardMaterial({ color: "#7d8a82", roughness: 0.7, metalness: 0.02, map: tMoteado }),
  /** Compuesto fundido dentro del cilindro y en el cordón: señal cualitativa de material caliente. */
  fundido: new MeshStandardMaterial({ color: "#d8c29a", emissive: "#a8521c", emissiveIntensity: 0.35, roughness: 0.28, metalness: 0, transparent: true, opacity: 0.88 }),
  cordon: new MeshStandardMaterial({ color: "#d9d1bb", emissive: "#5a3214", emissiveIntensity: 0.2, roughness: 0.32, metalness: 0 }),
  /** Piezas moldeadas: colores del modelo visual de la banca, con moteado de reciclado. */
  piezaSoporte: new MeshStandardMaterial({ color: "#3b7a52", roughness: 0.78, metalness: 0.02, map: tMoteado, ...con(tTapete, 0.6) }),
  piezaListon: new MeshStandardMaterial({ color: "#4a4e52", roughness: 0.8, metalness: 0.02, map: tMoteado, ...con(tTapete, 0.6) }),
  /** Saco de rafia para pellets del proveedor (sin marca). */
  rafia: new MeshStandardMaterial({ color: "#d9d5ca", roughness: 0.92, metalness: 0, ...con(tTapete, 1.4) }),
  /** Resguardo de seguridad de la prensa. */
  amarillo: new MeshStandardMaterial({ color: "#c79a1e", roughness: 0.55, metalness: 0.25, ...con(tPintura, 0.4) }),
  malla: new MeshStandardMaterial({ color: "#2a2e31", roughness: 0.5, metalness: 0.6, alphaMap: tRejilla, alphaTest: 0.5, side: DoubleSide }),
  espuma: new MeshStandardMaterial({ color: "#eef0ee", roughness: 0.95, metalness: 0 }),
  pantalla: new MeshStandardMaterial({ color: "#0d1412", roughness: 0.3, metalness: 0.2, emissive: "#1d3a2e", emissiveIntensity: 0.6 }),
  guia: new MeshStandardMaterial({ color: "#8fe6b6", emissive: "#8fe6b6", emissiveIntensity: 0.7, transparent: true, opacity: 0.85, toneMapped: false }),
};
