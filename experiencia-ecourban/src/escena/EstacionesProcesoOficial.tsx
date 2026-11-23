import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import {
  bloqueMoldeGeo,
  caja,
  curva,
  granoCilindro,
  granoFacetado,
  heliceGeo,
  llaveGeo,
  moverShape,
  perfilSoporte,
  rectShape,
  soporteGeo,
  tuboGeo,
} from "./geometriasProceso";
import { MATERIAL } from "./materialesProceso";
import { CENTROS, INICIOS, ep, lineal, tramo } from "./lineaProceso";
import { BancaProceso } from "./BancaProceso";
import { aleatorio } from "./fabricasBanca";

/**
 * Diez estaciones conceptuales del proceso propuesto (guía técnica EcoUrban). Los equipos
 * son genéricos, sin marcas, cotas ni parámetros: todo movimiento sale de la fase de cada
 * estación (ep.fNN), que a su vez sale del seek de la timeline. Mismo progreso, misma escena.
 */

type V3 = [number, number, number];
/** Altura de la cubierta de cada plataforma. */
const Y0 = 0.19;
/** Altura de trabajo común de moldes, prensa y mesa de desmoldeo. */
const MY = 0.74;
/** Eje del cilindro de la extrusora y del cordón del compuesto. */
const BY = 0.96;
const EJE_X: V3 = [0, 0, Math.PI / 2];
const EJE_Z: V3 = [Math.PI / 2, 0, 0];
const D = new Object3D();
const V = new Vector3();
const frac = (x: number) => x - Math.floor(x);
const ENVOLVENTES = ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10"] as const;
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/* Materiales derivados (una sola instancia por módulo). */
const ACERO_DOBLE = MATERIAL.acero.clone();
ACERO_DOBLE.side = DoubleSide;
/** Pieza recién moldeada: un tinte cálido cualitativo que se apaga al enfriarse (sin temperatura). */
const PIEZA_CALIENTE = MATERIAL.piezaSoporte.clone();
PIEZA_CALIENTE.emissive = new Color("#c0561f");
PIEZA_CALIENTE.emissiveIntensity = 0;
/** Traza del suelo: tenue para no competir con la tarjeta del hito, que queda delante. */
const TRAZA = new MeshBasicMaterial({ color: "#8fe6b6", transparent: true, opacity: 0.38, toneMapped: false, depthWrite: false });
const LUZ_HAZ = new MeshBasicMaterial({ color: "#dff6ea", transparent: true, opacity: 0.07, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
/** Luz exterior del portón: degradado vertical (más intenso a ras de suelo). */
function degradadoPorton() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, "rgba(120, 96, 66, 0.35)");
  gr.addColorStop(0.6, "rgba(232, 186, 128, 0.8)");
  gr.addColorStop(1, "rgba(255, 220, 168, 0.95)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  return new CanvasTexture(c);
}
const RESPLANDOR = new MeshBasicMaterial({ map: degradadoPorton(), transparent: true, toneMapped: false, depthWrite: false });

/* ───────────────────────── Primitivas ───────────────────────── */

function Caja({ s, p, m = MATERIAL.maquina, r = 0.012, rot, sombra = true }: { s: V3; p: V3; m?: Material; r?: number; rot?: V3; sombra?: boolean }) {
  return <mesh geometry={caja(s[0], s[1], s[2], r)} position={p} rotation={rot} material={m} castShadow={sombra} receiveShadow />;
}

function Cil({ p, r, l, m = MATERIAL.maquinaClara, rot, seg = 24, r2, abierto = false }: { p: V3; r: number; l: number; m?: Material; rot?: V3; seg?: number; r2?: number; abierto?: boolean }) {
  return <mesh position={p} rotation={rot} material={m} castShadow receiveShadow><cylinderGeometry args={[r2 ?? r, r, l, seg, 1, abierto]} /></mesh>;
}

function Tubo({ id, pts, r, m = MATERIAL.acero, seg = 64 }: { id: string; pts: V3[]; r: number; m?: Material; seg?: number }) {
  return <mesh geometry={tuboGeo(id, pts, r, seg)} material={m} castShadow />;
}

/** Brida con pernos; eje y por defecto. */
function Brida({ p, r, rot, m = MATERIAL.acero, pernos = 8, grosor = 0.035 }: { p: V3; r: number; rot?: V3; m?: Material; pernos?: number; grosor?: number }) {
  return <group position={p} rotation={rot}>
    <Cil p={[0, 0, 0]} r={r} l={grosor} m={m} />
    {Array.from({ length: pernos }, (_, i) => {
      const a = (i / pernos) * Math.PI * 2;
      return <Cil key={i} p={[Math.cos(a) * r * 0.84, grosor * 0.62, Math.sin(a) * r * 0.84]} r={0.011} l={0.018} m={MATERIAL.cromo} seg={6} />;
    })}
  </group>;
}

/** Motor eléctrico genérico con aletas; eje x. */
function Motor({ p, rot, r = 0.11, l = 0.3 }: { p: V3; rot?: V3; r?: number; l?: number }) {
  return <group position={p} rotation={rot}>
    <Cil p={[0, 0, 0]} r={r} l={l} m={MATERIAL.aceroOscuro} rot={EJE_X} />
    {Array.from({ length: 6 }, (_, i) => <Cil key={i} p={[-l * 0.4 + (i * l * 0.8) / 5, 0, 0]} r={r * 1.1} l={0.012} m={MATERIAL.aceroOscuro} rot={EJE_X} seg={18} />)}
    <Cil p={[-l / 2 - 0.035, 0, 0]} r={r * 0.96} l={0.07} m={MATERIAL.maquina} rot={EJE_X} />
    <Cil p={[l / 2 + 0.02, 0, 0]} r={r * 0.6} l={0.04} m={MATERIAL.acero} rot={EJE_X} />
    <Caja s={[0.11, 0.07, 0.1]} p={[0.02, r + 0.035, 0]} m={MATERIAL.aceroOscuro} />
  </group>;
}

/** Patas niveladoras. */
function Patas({ pts, h, y0 = Y0 }: { pts: [number, number][]; h: number; y0?: number }) {
  return <>{pts.map(([x, z], i) => <group key={i}>
    <Caja s={[0.055, h, 0.055]} p={[x, y0 + h / 2, z]} m={MATERIAL.acero} r={0.006} />
    <Cil p={[x, y0 + 0.012, z]} r={0.045} l={0.024} m={MATERIAL.aceroOscuro} seg={12} />
  </group>)}</>;
}

function useLeds(colores: string[]) {
  const clave = colores.join("|");
  const mats = useMemo(
    () => clave.split("|").map((c) => new MeshStandardMaterial({ color: "#121614", emissive: c, emissiveIntensity: 0, roughness: 0.35, toneMapped: false })),
    [clave],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** Indicador luminoso redondo orientado a +z. */
function Led({ p, m, r = 0.02 }: { p: V3; m: Material; r?: number }) {
  return <group position={p}>
    <mesh rotation={EJE_Z} material={MATERIAL.aceroOscuro}><cylinderGeometry args={[r * 1.35, r * 1.35, 0.01, 14]} /></mesh>
    <mesh position={[0, 0, 0.006]} rotation={EJE_Z} material={m}><cylinderGeometry args={[r, r, 0.012, 14]} /></mesh>
  </group>;
}

/** Tablero de control: pantalla sin datos y una columna de indicadores (sin cifras). */
function Tablero({ p, leds, w = 0.42, h = 0.5, rotY = 0 }: { p: V3; leds: Material[]; w?: number; h?: number; rotY?: number }) {
  return <group position={p} rotation={[0, rotY, 0]}>
    <Caja s={[w, h, 0.14]} p={[0, 0, 0]} m={MATERIAL.maquinaPanel} />
    <Caja s={[w * 0.66, h * 0.36, 0.01]} p={[-w * 0.08, h * 0.17, 0.072]} m={MATERIAL.pantalla} r={0.004} sombra={false} />
    {leds.map((m, i) => <Led key={i} p={[w * 0.36, h * 0.3 - i * 0.07, 0.075]} m={m} r={0.016} />)}
  </group>;
}

/* ───────────────────────── Material en movimiento ───────────────────────── */

type Estado = () => readonly [fase: number, cabeza: number, cola: number];

/**
 * Corriente de gránulos a lo largo de una curva. Cada gránulo ocupa una posición s que
 * depende sólo de la fase; sólo se dibujan los que están entre cola y cabeza.
 */
function Corriente({ id, pts, n, geo, m, estado, jit = 0.025, escala = 1 }: { id: string; pts: V3[]; n: number; geo: BufferGeometry; m: Material; estado: Estado; jit?: number; escala?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const c = curva(id, pts);
  const datos = useMemo(() => {
    const r = aleatorio(hash(id));
    return Array.from({ length: n }, () => [r() - 0.5, r() - 0.5, r() - 0.5, r() * 6.28, 0.75 + r() * 0.5]);
  }, [id, n]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const [f, cab, cola] = estado();
    if (cab <= cola + 1e-4) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    for (let i = 0; i < n; i++) {
      const d = datos[i];
      const s = frac(i / n + f);
      if (s > cab || s < cola) D.scale.setScalar(0);
      else {
        c.getPointAt(s, V);
        D.position.set(V.x + d[0] * jit, V.y + d[1] * jit, V.z + d[2] * jit);
        D.rotation.set(d[3] + s * 5, d[3] * 0.7, s * 3);
        D.scale.setScalar(escala * d[4]);
      }
      D.updateMatrix();
      mesh.setMatrixAt(i, D.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, m, n]} frustumCulled={false} />;
}

type Generador = (r: () => number) => V3 | null;

/** Montón de gránulos en posiciones sembradas, ordenadas de abajo arriba: `nivel` revela el llenado. */
function Monton({ id, n, geo, m, generar, nivel, escala = 1 }: { id: string; n: number; geo: BufferGeometry; m: Material; generar: Generador; nivel?: () => number; escala?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const pos = useMemo(() => {
    const r = aleatorio(hash(id));
    const out: V3[] = [];
    for (let k = 0; k < n * 40 && out.length < n; k++) {
      const p = generar(r);
      if (p) out.push(p);
    }
    return out.sort((a, b) => a[1] - b[1]);
  }, [id, n]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = aleatorio(hash(id) ^ 0x9e37);
    pos.forEach((p, i) => {
      D.position.set(...p);
      D.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28);
      D.scale.setScalar(escala * (0.8 + r() * 0.4));
      D.updateMatrix();
      mesh.setMatrixAt(i, D.matrix);
    });
    mesh.count = pos.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [pos, id, escala]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || !nivel) return;
    const k = Math.round(Math.max(0, Math.min(1, nivel())) * pos.length);
    mesh.count = k;
    mesh.visible = k > 0;
  });
  return <instancedMesh ref={ref} args={[geo, m, Math.max(1, pos.length)]} castShadow={false} receiveShadow />;
}

/** Montículo rectangular (opcionalmente enmascarado). */
const monticulo = (w: number, d: number, h: number, y0: number, cx = 0, cz = 0, mascara?: (x: number, z: number) => boolean): Generador => (r) => {
  const x = (r() - 0.5) * w;
  const z = (r() - 0.5) * d;
  if (mascara && !mascara(x, z)) return null;
  const k = 1 - Math.min(1, ((2 * x) / w) ** 2 * 0.55 + ((2 * z) / d) ** 2 * 0.55);
  return [cx + x, y0 + r() * h * (0.3 + 0.7 * k), cz + z];
};

const dentroPoligono = (poly: { x: number; y: number }[], x: number, y: number) => {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
};
const POLIGONO_SOPORTE = perfilSoporte().getPoints(10);

/* Geometrías de gránulo compartidas. */
const G_PET = granoFacetado(0.017);
const G_PET_G = granoFacetado(0.024);
const G_COMPAT = granoCilindro(0.013);
const G_COMP = granoCilindro(0.016);

/* ───────────────────────── Estructura de cada estación ───────────────────────── */

function Plataforma({ w, d, led }: { w: number; d: number; led: Material }) {
  return <>
    <Caja s={[w, Y0 - 0.03, d]} p={[0, (Y0 - 0.03) / 2, 0]} m={MATERIAL.mesa} r={0.02} />
    <Caja s={[w - 0.1, 0.03, d - 0.1]} p={[0, Y0 - 0.015, 0]} m={MATERIAL.tapete} r={0.008} />
    <mesh position={[0, 0.075, d / 2 + 0.003]} material={led}><boxGeometry args={[w - 0.4, 0.014, 0.004]} /></mesh>
  </>;
}

/** Contenedor de estación: plataforma con franja de estado y visibilidad por cercanía a la cámara. */
function Estacion({ i, children, w = 4.4, d = 2.7, cubierta = true }: { i: number; children: ReactNode; w?: number; d?: number; cubierta?: boolean }) {
  const g = useRef<Group>(null);
  const [led] = useLeds(["#8fe6b6"]);
  useFrame(() => {
    if (g.current) g.current.visible = Math.abs(ep.tx - CENTROS[i]) < 8.6;
    led.emissiveIntensity = 0.1 + 0.9 * ep[ENVOLVENTES[i]];
  });
  return <group ref={g} position={[CENTROS[i], 0, 0]}>
    {cubierta && <Plataforma w={w} d={d} led={led} />}
    {children}
  </group>;
}

/* ───────────────────────── 01 Recepción ───────────────────────── */

function Palet({ p }: { p: V3 }) {
  return <group position={p}>
    {[-0.38, 0, 0.38].map((x) => <Caja key={x} s={[0.1, 0.085, 0.9]} p={[x, 0.0425, 0]} m={MATERIAL.madera} r={0.008} />)}
    {[-0.36, -0.18, 0, 0.18, 0.36].map((z) => <Caja key={z} s={[0.92, 0.024, 0.14]} p={[0, 0.097, z]} m={MATERIAL.madera} r={0.005} />)}
  </group>;
}

/** Saco a granel de rafia (genérico, sin marca) con pellets visibles en la boca. */
function SacoGranel({ id, p, lite }: { id: string; p: V3; lite: boolean }) {
  return <group position={p}>
    <Caja s={[0.74, 0.76, 0.74]} p={[0, 0.38, 0]} m={MATERIAL.rafia} r={0.075} />
    <Caja s={[0.7, 0.05, 0.7]} p={[0, 0.775, 0]} m={MATERIAL.rafia} r={0.02} />
    {/* Costuras de las caras y cinta inferior del saco */}
    {[-0.2, 0.2].flatMap((u) => [
      <Caja key={`f${u}`} s={[0.014, 0.7, 0.006]} p={[u, 0.39, 0.372]} m={MATERIAL.cinta} r={0.002} sombra={false} />,
      <Caja key={`l${u}`} s={[0.006, 0.7, 0.014]} p={[0.372, 0.39, u]} m={MATERIAL.cinta} r={0.002} sombra={false} />,
    ])}
    <mesh position={[0, 0.79, 0]} scale={[0.3, 0.05, 0.3]} material={MATERIAL.pelletPet}><sphereGeometry args={[1, 18, 10]} /></mesh>
    <Monton id={id} n={lite ? 26 : 52} geo={G_PET} m={MATERIAL.pelletPet} generar={monticulo(0.56, 0.56, 0.05, 0.8)} />
    {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], k) => (
      <mesh key={k} position={[sx * 0.31, 0.8, sz * 0.31]} rotation={[0, Math.atan2(sx, sz) + Math.PI / 4, 0]} material={MATERIAL.rafia} castShadow>
        <torusGeometry args={[0.075, 0.013, 6, 14, Math.PI]} />
      </mesh>
    ))}
  </group>;
}

function Recepcion({ lite }: { lite: boolean }) {
  const llegada = useRef<Group>(null);
  const colgado = useRef<Group>(null);
  const leds = useLeds(["#8fe6b6", "#ffb85c", "#8fe6b6"]);
  useFrame(() => {
    const f = ep.f01;
    const a = tramo(f, 0.05, 0.34);
    if (llegada.current) llegada.current.position.set(-1.28, Y0, -2.0 + a * 1.62);
    const desc = lineal(f, 0.36, 0.84);
    if (colgado.current) colgado.current.scale.set(1 - desc * 0.06, 1 - desc * 0.32, 1 - desc * 0.06);
    leds[0].emissiveIntensity = a > 0.98 ? 2.2 : 0.1;
    leds[1].emissiveIntensity = desc > 0 && desc < 1 ? 1.2 + 0.9 * (0.5 + 0.5 * Math.sin(f * 140)) : 0.1;
    leds[2].emissiveIntensity = f > 0.86 ? 2.2 : 0.1;
  });
  const nivelTina = () => 0.18 + 0.82 * lineal(ep.f01, 0.38, 0.86);
  return <>
    {/* Portón de recepción: luz exterior; el material llega del proveedor. */}
    <group position={[-1.25, 0, -1.28]}>
      {[-0.72, 0.72].map((x) => <Caja key={x} s={[0.12, 2.35, 0.14]} p={[x, Y0 + 1.175, 0]} m={MATERIAL.aceroOscuro} />)}
      <Caja s={[1.6, 0.16, 0.16]} p={[0, Y0 + 2.36, 0]} m={MATERIAL.aceroOscuro} />
      <Caja s={[1.32, 0.5, 0.06]} p={[0, Y0 + 2.04, 0.02]} m={MATERIAL.maquinaClara} />
      {Array.from({ length: 5 }, (_, k) => <Caja key={k} s={[1.32, 0.012, 0.07]} p={[0, Y0 + 1.82 + k * 0.1, 0.03]} m={MATERIAL.aceroOscuro} r={0.003} sombra={false} />)}
      <mesh position={[0, Y0 + 0.9, -0.62]} material={RESPLANDOR}><planeGeometry args={[1.36, 1.85]} /></mesh>
      {[-0.95, 0.95].map((x) => <group key={x}>
        <Cil p={[x, Y0 + 0.32, 0.25]} r={0.05} l={0.64} m={MATERIAL.amarillo} seg={14} />
        <Cil p={[x, Y0 + 0.66, 0.25]} r={0.052} l={0.04} m={MATERIAL.aceroOscuro} seg={14} />
      </group>)}
    </group>
    <group ref={llegada}>
      <Palet p={[0, 0, 0]} />
      <SacoGranel id="saco-llega" p={[0, 0.11, 0]} lite={lite} />
    </group>
    <Palet p={[-0.25, Y0, -0.62]} />
    <SacoGranel id="saco-fijo" p={[-0.25, Y0 + 0.11, -0.62]} lite={lite} />
    {/* Bastidor de descarga sobre la tina */}
    <group position={[0.92, 0, 0.05]}>
      {[[-0.56, -0.46], [0.56, -0.46], [-0.56, 0.46], [0.56, 0.46]].map(([x, z], k) => <Caja key={k} s={[0.06, 1.95, 0.06]} p={[x, Y0 + 0.975, z]} m={MATERIAL.acero} r={0.006} />)}
      {[-0.46, 0.46].map((z) => <Caja key={z} s={[1.18, 0.07, 0.07]} p={[0, Y0 + 1.95, z]} m={MATERIAL.acero} />)}
      {[-0.56, 0.56].map((x) => <Caja key={x} s={[0.07, 0.07, 0.98]} p={[x, Y0 + 1.95, 0]} m={MATERIAL.acero} />)}
      {[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([x, z], k) => <Caja key={k} s={[0.03, 0.34, 0.012]} p={[x, Y0 + 1.76, z]} m={MATERIAL.rafia} r={0.004} sombra={false} />)}
      <group ref={colgado} position={[0, Y0 + 1.6, 0]}>
        <Caja s={[0.7, 0.72, 0.7]} p={[0, -0.36, 0]} m={MATERIAL.rafia} r={0.08} />
        <Cil p={[0, -0.78, 0]} r={0.06} r2={0.14} l={0.14} m={MATERIAL.rafia} seg={14} />
      </group>
      <Corriente id="descarga-saco" pts={[[0, Y0 + 0.74, 0], [0.01, Y0 + 0.5, 0.01], [0, Y0 + 0.24, 0]]} n={lite ? 16 : 30} geo={G_PET_G} m={MATERIAL.pelletPet} jit={0.04}
        estado={() => [ep.f01 * 9, lineal(ep.f01, 0.36, 0.42), lineal(ep.f01, 0.8, 0.86)] as const} />
      {/* Tina de acero inoxidable */}
      <Caja s={[1.02, 0.03, 0.82]} p={[0, Y0 + 0.05, 0]} m={MATERIAL.acero} />
      {[[0, 0.41, 1.02, 0.03], [0, -0.41, 1.02, 0.03]].map(([x, z, w, d], k) => <Caja key={k} s={[w, 0.44, d]} p={[x, Y0 + 0.26, z]} m={MATERIAL.acero} r={0.01} />)}
      {[-0.5, 0.5].map((x) => <Caja key={x} s={[0.03, 0.44, 0.82]} p={[x, Y0 + 0.26, 0]} m={MATERIAL.acero} r={0.01} />)}
      <Monton id="tina-recepcion" n={lite ? 120 : 260} geo={G_PET_G} m={MATERIAL.pelletPet} generar={monticulo(0.94, 0.74, 0.3, Y0 + 0.07)} nivel={nivelTina} />
      {[[-0.45, -0.36], [0.45, -0.36], [-0.45, 0.36], [0.45, 0.36]].map(([x, z], k) => <Cil key={k} p={[x, Y0 + 0.02, z]} r={0.03} l={0.04} m={MATERIAL.aceroOscuro} seg={10} />)}
      {/* Lanza de aspiración hacia el secado */}
      <Cil p={[0.2, Y0 + 0.36, -0.22]} r={0.035} l={0.5} m={MATERIAL.cromo} rot={[0.25, 0, 0]} />
    </group>
    {/* Muestra de lote en frasco */}
    <group position={[-0.62, 0, 0.8]}>
      <Caja s={[0.4, 0.04, 0.32]} p={[0, Y0 + 0.42, 0]} m={MATERIAL.acero} />
      <Patas pts={[[-0.16, -0.12], [0.16, -0.12], [-0.16, 0.12], [0.16, 0.12]]} h={0.4} />
      <Cil p={[0, Y0 + 0.55, 0]} r={0.075} l={0.22} m={MATERIAL.acrilico} />
      <Cil p={[0, Y0 + 0.675, 0]} r={0.079} l={0.035} m={MATERIAL.cromo} />
      <Monton id="frasco-rpet" n={lite ? 30 : 60} geo={G_PET} m={MATERIAL.pelletPet} generar={(r) => {
        const a = r() * 6.28;
        const rr = Math.sqrt(r()) * 0.06;
        return [Math.cos(a) * rr, Y0 + 0.45 + r() * 0.15, Math.sin(a) * rr];
      }} />
    </group>
    <Tablero p={[1.75, Y0 + 1.0, -0.95]} leds={leds} w={0.36} h={0.46} rotY={-0.35} />
    <Caja s={[0.06, 0.78, 0.06]} p={[1.75, Y0 + 0.39, -1.0]} m={MATERIAL.acero} />
  </>;
}

/* ───────────────────────── 02 Secado ───────────────────────── */

function Secado({ lite }: { lite: boolean }) {
  const aspas = useRef<Group>(null);
  const leds = useLeds(["#8fe6b6", "#ffb85c", "#7cc4ff", "#8fe6b6"]);
  const rejillaRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = rejillaRef.current;
    if (!m) return;
    let k = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) {
      D.position.set(0, -0.2 + i * 0.075, -0.24 + j * 0.08);
      D.rotation.set(0, 0, Math.PI / 2);
      D.scale.setScalar(1);
      D.updateMatrix();
      m.setMatrixAt(k++, D.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  useFrame(() => {
    const f = ep.f02;
    const marcha = tramo(f, 0.12, 0.25);
    if (aspas.current) aspas.current.rotation.z = -f * 70 * marcha;
    // Las dos torres alternan su indicador: representación cualitativa, sin ciclo medido.
    const torre = Math.floor(f * 8) % 2;
    leds[0].emissiveIntensity = marcha > 0.5 ? 2 : 0.1;
    leds[1].emissiveIntensity = marcha > 0.5 && torre === 0 ? 1.8 : 0.15;
    leds[2].emissiveIntensity = marcha > 0.5 && torre === 1 ? 1.8 : 0.15;
    leds[3].emissiveIntensity = f > 0.55 ? 2 : 0.1;
  });
  const manguera: V3[] = [[-0.52, Y0 + 1.0, 0.05], [-0.25, Y0 + 1.15, 0.08], [-0.05, Y0 + 2.05, 0.08], [0.4, Y0 + 2.5, 0.04], [0.85, Y0 + 2.42, 0], [0.85, Y0 + 2.2, 0]];
  return <>
    {/* Secadora deshumidificadora (desecante) */}
    <group position={[-1.0, 0, 0]}>
      <Patas pts={[[-0.42, -0.32], [0.42, -0.32], [-0.42, 0.32], [0.42, 0.32]]} h={0.46} />
      <Caja s={[0.9, 0.04, 0.04]} p={[0, Y0 + 0.1, 0.32]} m={MATERIAL.acero} />
      <Caja s={[0.9, 0.04, 0.04]} p={[0, Y0 + 0.1, -0.32]} m={MATERIAL.acero} />
      <Cil p={[0, Y0 + 0.3, 0]} r={0.08} r2={0.3} l={0.3} m={MATERIAL.acero} />
      <Caja s={[0.95, 0.86, 0.75]} p={[0, Y0 + 0.89, 0]} m={MATERIAL.maquinaClara} r={0.03} />
      <Caja s={[0.46, 0.44, 0.012]} p={[0.06, Y0 + 0.86, 0.38]} m={MATERIAL.acero} />
      <Caja s={[0.4, 0.38, 0.01]} p={[0.06, Y0 + 0.86, 0.392]} m={MATERIAL.acrilico} sombra={false} />
      <Monton id="ventana-desecante" n={lite ? 40 : 90} geo={G_PET} m={MATERIAL.pelletPet} generar={monticulo(0.36, 0.06, 0.26, Y0 + 0.68, 0.06, 0.34)} nivel={() => 0.35 + 0.65 * tramo(ep.f02, 0.15, 0.4)} />
      <Corriente id="cascada-desecante" pts={[[-0.06, Y0 + 1.04, 0.34], [0.02, Y0 + 0.92, 0.35], [0.1, Y0 + 0.8, 0.34]]} n={lite ? 8 : 16} geo={G_PET} m={MATERIAL.pelletPet} jit={0.03}
        estado={() => [ep.f02 * 8, tramo(ep.f02, 0.1, 0.2), 0] as const} />
      <group position={[-0.482, Y0 + 0.9, 0.02]}>
        <Caja s={[0.012, 0.52, 0.6]} p={[0, 0, 0]} m={MATERIAL.maquinaPanel} />
        <instancedMesh ref={rejillaRef} args={[undefined, MATERIAL.hueco, 42]}><cylinderGeometry args={[0.022, 0.022, 0.016, 10]} /></instancedMesh>
      </group>
      {[-0.2, 0.2].map((x) => <group key={x}>
        <Cil p={[x, Y0 + 1.6, -0.08]} r={0.13} l={0.5} m={MATERIAL.acero} />
        <Brida p={[x, Y0 + 1.36, -0.08]} r={0.155} pernos={6} />
        <Brida p={[x, Y0 + 1.84, -0.08]} r={0.155} pernos={6} />
        <Cil p={[x, Y0 + 1.9, -0.08]} r={0.12} l={0.06} m={MATERIAL.cromo} />
      </group>)}
      <Tubo id="u-torres" pts={[[-0.2, Y0 + 1.92, -0.08], [-0.2, Y0 + 2.12, -0.08], [0.2, Y0 + 2.12, -0.08], [0.2, Y0 + 1.92, -0.08]]} r={0.034} m={MATERIAL.cromo} />
      <Tablero p={[0.31, Y0 + 1.15, 0.38]} leds={leds} w={0.24} h={0.32} />
    </group>
    {/* Manguera transparente hacia la secadora de tolva */}
    <Tubo id="manguera-secado" pts={manguera} r={0.048} m={MATERIAL.acrilico} />
    <Cil p={[-0.52, Y0 + 1.0, 0.05]} r={0.06} l={0.08} m={MATERIAL.cromo} rot={EJE_X} />
    <Corriente id="manguera-secado" pts={manguera} n={lite ? 26 : 52} geo={G_PET} m={MATERIAL.pelletPet} jit={0.045}
      estado={() => [ep.f02 * 4, lineal(ep.f02, 0.22, 0.42), lineal(ep.f02, 0.92, 1)] as const} />
    {/* Secadora de tolva */}
    <group position={[0.85, 0, 0]}>
      <Caja s={[0.62, 0.62, 0.56]} p={[0, Y0 + 0.31, 0]} m={MATERIAL.maquina} r={0.025} />
      <Brida p={[0, Y0 + 0.64, 0]} r={0.14} pernos={6} />
      <Cil p={[0, Y0 + 0.78, 0]} r={0.085} l={0.24} m={MATERIAL.acrilico} />
      <Corriente id="garganta-tolva" pts={[[0, Y0 + 0.92, 0], [0, Y0 + 0.66, 0]]} n={lite ? 8 : 14} geo={G_PET} m={MATERIAL.pelletPet} jit={0.06}
        estado={() => [ep.f02 * 6, tramo(ep.f02, 0.6, 0.7), 0] as const} />
      <Cil p={[0, Y0 + 1.12, 0]} r={0.09} r2={0.36} l={0.36} m={MATERIAL.acero} />
      <Cil p={[0, Y0 + 1.66, 0]} r={0.36} l={0.72} m={MATERIAL.acero} />
      <Cil p={[0, Y0 + 2.06, 0]} r={0.38} l={0.08} m={MATERIAL.cromo} />
      <Cil p={[0, Y0 + 2.14, 0]} r={0.24} r2={0.12} l={0.1} m={MATERIAL.acero} />
      {[0.5, 2.1, 3.7, 5.3].map((a) => <Caja key={a} s={[0.05, 0.1, 0.04]} p={[Math.sin(a) * 0.385, Y0 + 2.0, Math.cos(a) * 0.385]} rot={[0, a, 0]} m={MATERIAL.aceroOscuro} />)}
      <Caja s={[0.24, 0.52, 0.012]} p={[0, Y0 + 1.66, 0.36]} m={MATERIAL.aceroOscuro} />
      <Caja s={[0.19, 0.46, 0.01]} p={[0, Y0 + 1.66, 0.368]} m={MATERIAL.acrilico} sombra={false} />
      <Monton id="ventana-tolva" n={lite ? 50 : 110} geo={G_PET} m={MATERIAL.pelletPet} generar={monticulo(0.17, 0.05, 0.42, Y0 + 1.43, 0, 0.33)} nivel={() => lineal(ep.f02, 0.38, 0.86)} />
      {/* Soplador con rejilla */}
      <Caja s={[0.16, 0.14, 0.16]} p={[0.42, Y0 + 1.78, 0]} m={MATERIAL.maquinaClara} />
      <group position={[0.62, Y0 + 1.78, 0.02]}>
        <Cil p={[0, 0, 0]} r={0.2} l={0.22} m={MATERIAL.maquinaClara} rot={EJE_Z} />
        <Cil p={[0, 0, 0.115]} r={0.17} l={0.01} m={MATERIAL.hueco} rot={EJE_Z} />
        <group ref={aspas} position={[0, 0, 0.12]}>
          {[0, 1, 2, 3, 4].map((k) => <Caja key={k} s={[0.15, 0.04, 0.01]} p={[Math.cos((k * 2 * Math.PI) / 5) * 0.075, Math.sin((k * 2 * Math.PI) / 5) * 0.075, 0]} rot={[0.3, 0, (k * 2 * Math.PI) / 5]} m={MATERIAL.acero} r={0.004} sombra={false} />)}
        </group>
        {[-0.12, -0.06, 0, 0.06, 0.12].map((y) => <Caja key={y} s={[0.36, 0.008, 0.008]} p={[0, y, 0.13]} m={MATERIAL.cromo} r={0.002} sombra={false} />)}
        <mesh position={[0, 0, 0.128]} material={MATERIAL.cromo}><torusGeometry args={[0.19, 0.012, 6, 24]} /></mesh>
      </group>
      <Tubo id="retorno-aire" pts={[[0.62, Y0 + 1.56, -0.05], [0.7, Y0 + 0.95, -0.4], [0.1, Y0 + 0.75, -0.85], [-1.2, Y0 + 0.95, -0.6], [-1.6, Y0 + 1.05, -0.39]]} r={0.04} m={MATERIAL.manguera} />
    </group>
    <Cil p={[1.17, Y0 + 0.32, 0]} r={0.06} l={0.1} m={MATERIAL.cromo} rot={EJE_X} />
  </>;
}

/* ───────────────────────── 03 Dosificación ───────────────────────── */

/** Dosificador gravimétrico genérico: tolva, tornillo visible y motor. Ambos lados iguales: sin proporciones. */
function Dosificador({ id, lado, geo, m, inicio, lite }: { id: string; lado: 1 | -1; geo: BufferGeometry; m: Material; inicio: number; lite: boolean }) {
  const x = lado * 0.85;
  const tornillo = useRef<Group>(null);
  const [led] = useLeds(["#8fe6b6"]);
  useFrame(() => {
    const f = ep.f03;
    const marcha = Math.max(0, f - inicio);
    if (tornillo.current) tornillo.current.rotation.x = marcha * 60 * lado;
    led.emissiveIntensity = marcha > 0 ? 2.2 : 0.1;
  });
  const salida: V3[] = [[x - lado * 0.14, Y0 + 1.5, 0], [x - lado * 0.24, Y0 + 1.3, 0], [lado * 0.32, Y0 + 1.06, 0], [lado * 0.1, Y0 + 0.96, 0]];
  return <group>
    <Cil p={[x, Y0 + 2.38, 0]} r={0.3} l={0.42} m={MATERIAL.acero} />
    <Cil p={[x, Y0 + 2.6, 0]} r={0.315} l={0.03} m={MATERIAL.cromo} />
    <Cil p={[x, Y0 + 1.99, 0]} r={0.08} r2={0.3} l={0.36} m={MATERIAL.acero} />
    <Caja s={[0.14, 0.36, 0.012]} p={[x, Y0 + 2.32, 0.298]} m={MATERIAL.aceroOscuro} />
    <Caja s={[0.11, 0.32, 0.01]} p={[x, Y0 + 2.32, 0.306]} m={MATERIAL.acrilico} sombra={false} />
    <Monton id={`${id}-tolva`} n={lite ? 30 : 64} geo={geo} m={m} generar={monticulo(0.1, 0.04, 0.26, Y0 + 2.17, x, 0.27)} />
    <Brida p={[x, Y0 + 1.8, 0]} r={0.12} pernos={6} />
    <Caja s={[0.6, 0.28, 0.32]} p={[x - lado * 0.04, Y0 + 1.63, 0]} m={MATERIAL.maquinaClara} r={0.02} />
    <Caja s={[0.42, 0.17, 0.01]} p={[x - lado * 0.06, Y0 + 1.63, 0.165]} m={MATERIAL.acrilico} sombra={false} />
    <group ref={tornillo} position={[x - lado * 0.06, Y0 + 1.62, 0.06]}>
      <Cil p={[0, 0, 0]} r={0.018} l={0.46} m={MATERIAL.cromo} rot={EJE_X} />
      <mesh geometry={heliceGeo(0.42, 0.05, 5, 0.012)} material={MATERIAL.acero} />
    </group>
    <Monton id={`${id}-tornillo`} n={lite ? 10 : 22} geo={geo} m={m} generar={monticulo(0.38, 0.06, 0.05, Y0 + 1.55, x - lado * 0.06, 0.1)} />
    <Motor p={[x + lado * 0.42, Y0 + 1.63, 0]} r={0.1} l={0.24} rot={[0, lado > 0 ? 0 : Math.PI, 0]} />
    <Led p={[x - lado * 0.26, Y0 + 1.72, 0.17]} m={led} r={0.016} />
    <Tubo id={`${id}-salida`} pts={salida} r={0.055} m={MATERIAL.acrilico} />
    <Corriente id={`${id}-salida`} pts={salida} n={lite ? 14 : 26} geo={geo} m={m} jit={0.04}
      estado={() => [ep.f03 * 5, lineal(ep.f03, inicio, inicio + 0.12), 0] as const} />
  </group>;
}

function Dosificacion({ lite }: { lite: boolean }) {
  const [union] = useLeds(["#8fe6b6"]);
  useFrame(() => {
    const f = ep.f03;
    union.emissiveIntensity = f > 0.5 ? 1.6 + 0.6 * (0.5 + 0.5 * Math.sin(f * 90)) : 0.08;
  });
  const mezcla: V3[] = [[-0.22, Y0 + 0.47, 0.22], [0.05, Y0 + 0.42, 0.22], [0.3, Y0 + 0.38, 0.2]];
  return <>
    {[-1.6, 1.6].map((x) => <Caja key={x} s={[0.08, 2.75, 0.08]} p={[x, Y0 + 1.375, -0.48]} m={MATERIAL.acero} r={0.006} />)}
    {[1.42, 2.08].map((y) => <Caja key={y} s={[3.28, 0.08, 0.08]} p={[0, Y0 + y, -0.48]} m={MATERIAL.acero} r={0.006} />)}
    {[-0.85, 0.85].map((x) => <Caja key={x} s={[0.08, 0.08, 0.5]} p={[x, Y0 + 1.5, -0.24]} m={MATERIAL.acero} r={0.006} />)}
    <Dosificador id="dos-pet" lado={-1} geo={G_PET} m={MATERIAL.pelletPet} inicio={0.18} lite={lite} />
    <Dosificador id="dos-compat" lado={1} geo={G_COMPAT} m={MATERIAL.pelletCompat} inicio={0.3} lite={lite} />
    {/* Suministro del compatibilizante (origen no representado) */}
    <Tubo id="suministro-compat" pts={[[0.85, Y0 + 2.62, 0], [1.05, Y0 + 2.85, -0.15], [1.6, Y0 + 2.85, -0.7], [2.1, Y0 + 2.7, -1.1]]} r={0.04} m={MATERIAL.acero} />
    {/* Embudo de unión y colector hacia la extrusora */}
    <Cil p={[0, Y0 + 0.86, 0]} r={0.09} r2={0.23} l={0.26} m={MATERIAL.acero} />
    <mesh position={[0, Y0 + 0.99, 0]} rotation={[Math.PI / 2, 0, 0]} material={union}><torusGeometry args={[0.235, 0.012, 8, 30]} /></mesh>
    <Cil p={[0, Y0 + 0.66, 0]} r={0.09} l={0.16} m={MATERIAL.cromo} />
    <Caja s={[0.72, 0.36, 0.55]} p={[0, Y0 + 0.4, 0]} m={MATERIAL.maquinaClara} r={0.025} />
    <Caja s={[0.56, 0.2, 0.01]} p={[0, Y0 + 0.42, 0.28]} m={MATERIAL.acrilico} sombra={false} />
    <Corriente id="mezcla-pet" pts={mezcla} n={lite ? 8 : 16} geo={G_PET} m={MATERIAL.pelletPet} jit={0.08} estado={() => [ep.f03 * 3, lineal(ep.f03, 0.42, 0.55), 0] as const} />
    <Corriente id="mezcla-compat" pts={mezcla} n={lite ? 8 : 16} geo={G_COMPAT} m={MATERIAL.pelletCompat} jit={0.08} estado={() => [ep.f03 * 3 + 0.5, lineal(ep.f03, 0.5, 0.62), 0] as const} />
    <Patas pts={[[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]} h={0.22} />
    <Cil p={[0.42, Y0 + 0.4, 0]} r={0.065} l={0.12} m={MATERIAL.cromo} rot={EJE_X} />
  </>;
}

/* ───────────────────────── 04 Extrusión de doble husillo ───────────────────────── */

const ZONAS = [-0.68, -0.13, 0.42, 0.97] as const;

function Extrusora({ lite }: { lite: boolean }) {
  const husillos = useRef<Group>(null);
  const fundido = useRef<Group>(null);
  const cordon = useRef<Group>(null);
  const bandas = useLeds(["#ff7a2e", "#ff7a2e", "#ff7a2e", "#ff7a2e"]);
  const leds = useLeds(["#8fe6b6", "#ffb85c", "#8fe6b6"]);
  const fundidoMat = useMemo(() => MATERIAL.fundido.clone(), []);
  useEffect(() => () => fundidoMat.dispose(), [fundidoMat]);
  useFrame(() => {
    const f = ep.f04;
    const giro = tramo(f, 0.06, 0.2);
    if (husillos.current) husillos.current.rotation.x = -f * 48 * giro;
    // Las bandas de calor se encienden por zonas a lo largo del cilindro (señal cualitativa).
    bandas.forEach((m, k) => (m.emissiveIntensity = 0.06 + 2.4 * tramo(f, 0.14 + k * 0.07, 0.24 + k * 0.07)));
    const avance = tramo(f, 0.3, 0.72);
    if (fundido.current) {
      fundido.current.scale.x = Math.max(0.001, avance);
      fundido.current.visible = avance > 0.001;
    }
    fundidoMat.emissiveIntensity = 0.15 + 0.5 * tramo(f, 0.3, 0.6);
    const sale = tramo(f, 0.74, 0.86);
    if (cordon.current) {
      cordon.current.scale.x = Math.max(0.001, sale);
      cordon.current.visible = sale > 0.001;
    }
    leds[0].emissiveIntensity = giro > 0.5 ? 2 : 0.1;
    leds[1].emissiveIntensity = f > 0.2 ? 1.9 : 0.1;
    leds[2].emissiveIntensity = f > 0.74 ? 2 : 0.1;
  });
  const largo = 2.2;
  const x0 = -0.95;
  return <>
    {/* Bancada */}
    <Caja s={[3.9, 0.16, 0.95]} p={[0, Y0 + 0.33, 0]} m={MATERIAL.maquina} r={0.02} />
    {[-1.8, -0.6, 0.6, 1.8].flatMap((x) => [-0.4, 0.4].map((z) => <group key={`${x}${z}`}>
      <Caja s={[0.12, 0.25, 0.12]} p={[x, Y0 + 0.125, z]} m={MATERIAL.maquina} />
      <Cil p={[x, Y0 + 0.015, z]} r={0.075} l={0.03} m={MATERIAL.aceroOscuro} seg={12} />
    </group>))}
    {[-0.6, 0.55].map((x) => <Caja key={x} s={[0.3, 0.26, 0.42]} p={[x, Y0 + 0.54, -0.02]} m={MATERIAL.maquinaClara} />)}
    {/* Motor, acoplamiento y caja reductora */}
    <Motor p={[-1.62, BY - 0.04, 0]} r={0.22} l={0.46} />
    <Caja s={[0.2, 0.32, 0.36]} p={[-1.3, BY - 0.04, 0]} m={MATERIAL.amarillo} />
    <Caja s={[0.4, 0.58, 0.64]} p={[-1.1, BY, 0]} m={MATERIAL.maquinaClara} r={0.03} />
    {/* Cilindro en corte: casco posterior, segmentos y frente transparente */}
    <mesh position={[x0 + largo / 2, BY, 0]} rotation={EJE_X} material={ACERO_DOBLE} castShadow>
      <cylinderGeometry args={[0.27, 0.27, largo, 36, 1, true, Math.PI / 2, Math.PI]} />
    </mesh>
    <mesh position={[x0 + largo / 2, BY, 0]} rotation={EJE_X} material={MATERIAL.acrilico}>
      <cylinderGeometry args={[0.272, 0.272, largo, 36, 1, true, -Math.PI / 2, Math.PI]} />
    </mesh>
    {[x0, -0.4, 0.15, 0.7, x0 + largo].map((x) => <mesh key={x} position={[x, BY, 0]} rotation={EJE_X} material={ACERO_DOBLE} castShadow>
      <cylinderGeometry args={[0.33, 0.33, 0.07, 36, 1, true, Math.PI / 2 - 0.35, Math.PI + 0.7]} />
    </mesh>)}
    {ZONAS.map((x, k) => <group key={x}>
      <mesh position={[x, BY, 0]} rotation={EJE_X} material={bandas[k]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 36, 1, true, Math.PI / 2, Math.PI]} />
      </mesh>
      {[1, -1].map((s) => <mesh key={s} position={[x, BY + s * 0.262, 0.03]} material={bandas[k]}><boxGeometry args={[0.38, 0.012, 0.02]} /></mesh>)}
      {[-0.13, 0.13].map((dx) => <Cil key={dx} p={[x + dx, BY + 0.33, -0.02]} r={0.02} l={0.04} m={MATERIAL.cromo} seg={6} />)}
    </group>)}
    {/* Doble husillo */}
    <group ref={husillos} position={[x0 + largo / 2, BY, 0.035]}>
      {[1, -1].map((s) => <group key={s} position={[0, s * 0.085, 0]}>
        <Cil p={[0, 0, 0]} r={0.034} l={largo + 0.1} m={MATERIAL.aceroOscuro} rot={EJE_X} />
        <mesh geometry={heliceGeo(largo, 0.058, 13, 0.022, s > 0 ? 0 : Math.PI)} material={MATERIAL.cromo} />
      </group>)}
    </group>
    {/* Material: gránulos en la zona de alimentación y compuesto fundido aguas abajo */}
    <Corriente id="husillo-pet" pts={[[-0.86, BY + 0.06, 0.06], [-0.55, BY + 0.01, 0.06], [-0.2, BY, 0.06]]} n={lite ? 16 : 34} geo={G_PET} m={MATERIAL.pelletPet} jit={0.17}
      estado={() => [ep.f04 * 2.2, lineal(ep.f04, 0.06, 0.3), lineal(ep.f04, 0.95, 1)] as const} />
    <Corriente id="husillo-compat" pts={[[-0.86, BY + 0.04, 0.05], [-0.5, BY, 0.05], [-0.2, BY - 0.01, 0.05]]} n={lite ? 10 : 22} geo={G_COMPAT} m={MATERIAL.pelletCompat} jit={0.17}
      estado={() => [ep.f04 * 2.2 + 0.3, lineal(ep.f04, 0.1, 0.34), lineal(ep.f04, 0.95, 1)] as const} />
    <group ref={fundido} position={[-0.3, BY, 0.035]}>
      <mesh position={[0.78, 0, 0]} rotation={EJE_X} material={fundidoMat}><cylinderGeometry args={[0.19, 0.19, 1.56, 24, 1, true]} /></mesh>
    </group>
    {/* Tolva de alimentación (recibe la mezcla dosificada) */}
    <Cil p={[-0.72, BY + 0.36, 0]} r={0.07} l={0.22} m={MATERIAL.acero} />
    <Cil p={[-0.72, BY + 0.6, 0]} r={0.07} r2={0.24} l={0.28} m={MATERIAL.acero} />
    <Cil p={[-0.72, BY + 0.78, 0]} r={0.25} l={0.07} m={MATERIAL.cromo} />
    <Corriente id="tolva-extrusora" pts={[[-0.72, BY + 0.7, 0], [-0.72, BY + 0.25, 0]]} n={lite ? 8 : 14} geo={G_PET} m={MATERIAL.pelletPet} jit={0.06}
      estado={() => [ep.f04 * 6, lineal(ep.f04, 0.0, 0.1), lineal(ep.f04, 0.96, 1)] as const} />
    {/* Cabezal y boquilla */}
    <Brida p={[x0 + largo + 0.07, BY, 0]} r={0.31} rot={EJE_X} pernos={8} grosor={0.1} />
    <Caja s={[0.24, 0.44, 0.44]} p={[1.48, BY, 0]} m={MATERIAL.acero} r={0.05} />
    {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], k) => <Cil key={k} p={[1.61, BY + a * 0.15, b * 0.15]} r={0.02} l={0.03} m={MATERIAL.cromo} rot={EJE_X} seg={6} />)}
    <Cil p={[1.65, BY, 0]} r={0.065} l={0.12} m={MATERIAL.cromo} rot={EJE_X} />
    <group ref={cordon} position={[1.7, BY, 0]}>
      <mesh position={[0.25, 0, 0]} rotation={EJE_X} material={MATERIAL.cordon}><cylinderGeometry args={[0.03, 0.03, 0.5, 12]} /></mesh>
    </group>
    {/* Tablero de control */}
    <Caja s={[0.48, 1.45, 0.34]} p={[-1.6, Y0 + 0.725, -0.92]} m={MATERIAL.maquinaPanel} />
    <Tablero p={[-1.6, Y0 + 1.15, -0.72]} leds={leds} w={0.4} h={0.44} />
  </>;
}

/* ───────────────────────── 05 Peletización ───────────────────────── */

function Peletizadora({ lite }: { lite: boolean }) {
  const rotor = useRef<Group>(null);
  const cordon = useRef<Group>(null);
  const marcas = useRef<Group>(null);
  const rodillos = useRef<Group>(null);
  const [anillo] = useLeds(["#8fe6b6"]);
  const leds = useLeds(["#8fe6b6", "#ffb85c"]);
  useFrame(() => {
    const f = ep.f05;
    const llega = lineal(f, 0.11, 0.22);
    const corte = tramo(f, 0.2, 0.3);
    if (cordon.current) {
      cordon.current.scale.x = Math.max(0.001, llega);
      cordon.current.visible = llega > 0.001;
    }
    if (rotor.current) rotor.current.rotation.z = -f * 90 * corte;
    if (rodillos.current) rodillos.current.children.forEach((c, k) => (c.rotation.z = (k % 2 ? 1 : -1) * f * 30));
    if (marcas.current) {
      marcas.current.visible = llega > 0.999;
      marcas.current.children.forEach((c, k) => (c.position.x = -2.2 + frac(k / 7 + f * 3) * 2.28));
    }
    anillo.emissiveIntensity = corte > 0.5 ? 2.2 : 0.08;
    leds[0].emissiveIntensity = corte > 0.5 ? 2 : 0.1;
    leds[1].emissiveIntensity = llega > 0 && llega < 1 ? 1.8 : 0.1;
  });
  const caida: V3[] = [[0.5, BY - 0.16, 0.34], [0.52, BY - 0.36, 0.46], [0.55, Y0 + 0.26, 0.62]];
  return <>
    {/* Cordón del compuesto desde la extrusora */}
    <group ref={cordon} position={[-2.2, BY, 0]}>
      <mesh position={[1.14, 0, 0]} rotation={EJE_X} material={MATERIAL.cordon} castShadow><cylinderGeometry args={[0.03, 0.03, 2.28, 12]} /></mesh>
    </group>
    <group ref={marcas}>
      {Array.from({ length: 7 }, (_, k) => <mesh key={k} position={[0, BY, 0]} rotation={[0, Math.PI / 2, 0]} material={MATERIAL.corte}><torusGeometry args={[0.031, 0.005, 6, 14]} /></mesh>)}
    </group>
    <group ref={rodillos}>
      {[-1.4, -0.6].flatMap((x) => [1, -1].map((s) => <group key={`${x}${s}`} position={[x, BY + s * 0.07, 0]}>
        <Cil p={[0, 0, 0]} r={0.04} l={0.2} m={MATERIAL.cromo} rot={EJE_Z} seg={14} />
      </group>))}
    </group>
    {[-1.4, -0.6].map((x) => <group key={x}>
      <Caja s={[0.06, BY - Y0 + 0.12, 0.06]} p={[x, (BY + Y0 + 0.12) / 2, -0.14]} m={MATERIAL.acero} r={0.006} />
      <Caja s={[0.06, 0.24, 0.04]} p={[x, BY, -0.12]} m={MATERIAL.aceroOscuro} r={0.006} />
    </group>)}
    {/* Peletizadora: carcasa, rotor de cuchillas y conducto de caída */}
    <group position={[0.48, 0, 0]}>
      <Caja s={[0.7, 0.36, 0.6]} p={[0, Y0 + 0.18, -0.02]} m={MATERIAL.maquina} />
      <Caja s={[0.74, 0.74, 0.6]} p={[0, Y0 + 0.73, -0.02]} m={MATERIAL.maquinaClara} r={0.04} />
      <Cil p={[0, BY - 0.02, 0.285]} r={0.27} l={0.012} m={MATERIAL.hueco} rot={EJE_Z} />
      <mesh position={[0, BY - 0.02, 0.29]} material={MATERIAL.acero}><torusGeometry args={[0.275, 0.016, 8, 36]} /></mesh>
      <mesh position={[0, BY - 0.02, 0.295]} material={anillo}><torusGeometry args={[0.305, 0.006, 6, 40]} /></mesh>
      <group ref={rotor} position={[0.02, BY - 0.02, 0.3]}>
        <Cil p={[0, 0, 0]} r={0.06} l={0.05} m={MATERIAL.cromo} rot={EJE_Z} />
        {[0, 1, 2, 3].map((k) => <Caja key={k} s={[0.21, 0.035, 0.018]} p={[Math.cos((k * Math.PI) / 2) * 0.13, Math.sin((k * Math.PI) / 2) * 0.13, 0]} rot={[0, 0, (k * Math.PI) / 2 + 0.25]} m={MATERIAL.acero} r={0.004} />)}
      </group>
      {[1, -1].map((s) => <Cil key={s} p={[-0.43, BY + s * 0.055, 0]} r={0.035} l={0.16} m={MATERIAL.aceroOscuro} rot={EJE_Z} seg={12} />)}
      <Motor p={[0.02, Y0 + 1.2, -0.1]} r={0.12} l={0.32} />
      <Caja s={[0.32, 0.03, 0.42]} p={[0.04, Y0 + 0.48, 0.42]} rot={[0.55, 0, 0]} m={MATERIAL.acero} />
      <Tablero p={[0.52, Y0 + 0.9, 0.05]} leds={leds} w={0.24} h={0.32} rotY={-0.6} />
    </group>
    <Corriente id="caida-compuesto" pts={caida} n={lite ? 14 : 28} geo={G_COMP} m={MATERIAL.pelletCompuesto} jit={0.05}
      estado={() => [ep.f05 * 7, lineal(ep.f05, 0.24, 0.32), lineal(ep.f05, 0.86, 0.92)] as const} />
    {/* Comparación de muestras: PET recibido frente a compuesto peletizado */}
    <group position={[-1.55, 0, 0.82]}>
      <Caja s={[0.6, 0.04, 0.34]} p={[0, Y0 + 0.44, 0]} m={MATERIAL.acero} />
      <Patas pts={[[-0.26, -0.13], [0.26, -0.13], [-0.26, 0.13], [0.26, 0.13]]} h={0.42} />
      {[-0.15, 0.15].map((x, k) => <group key={x}>
        <Cil p={[x, Y0 + 0.56, 0]} r={0.075} l={0.2} m={MATERIAL.acrilico} />
        <Cil p={[x, Y0 + 0.675, 0]} r={0.079} l={0.035} m={MATERIAL.cromo} />
        <Monton id={`muestra-${k}`} n={lite ? 28 : 56} geo={k ? G_COMP : G_PET} m={k ? MATERIAL.pelletCompuesto : MATERIAL.pelletPet} generar={(r) => {
          const a = r() * 6.28;
          const rr = Math.sqrt(r()) * 0.058;
          return [x + Math.cos(a) * rr, Y0 + 0.48 + r() * 0.13, Math.sin(a) * rr];
        }} />
      </group>)}
    </group>
  </>;
}

/* ───────────────────────── 06 Alimentación de moldes ───────────────────────── */

const MOLDE_ASIENTO = { x: -0.15, z: 0.45, w: 1.55, d: 0.34 };
const MOLDE_RESPALDO = { x: -0.15, z: -0.4, w: 1.55, d: 0.62 };
const CAV_RESPALDO = [-0.17, 0, 0.17];
const BASE_MOLDE = 0.035;
const ALTO_MOLDE = 0.07;

function PernosMolde({ w, d }: { w: number; d: number }) {
  return <>{[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], k) => <group key={k}>
    <Cil p={[a * (w / 2 - 0.05), BASE_MOLDE + ALTO_MOLDE + 0.035, b * (d / 2 - 0.05)]} r={0.016} l={0.07} m={MATERIAL.cromo} seg={12} />
    <Cil p={[-a * (w / 2 - 0.05), BASE_MOLDE + ALTO_MOLDE + 0.004, b * (d / 2 - 0.05)]} r={0.014} l={0.004} m={MATERIAL.hueco} seg={12} />
  </group>)}</>;
}

/** Cuchara que vierte compuesto sobre un molde mientras recorre la cavidad. */
function Cuchara({ id, ruta, ventana, lite }: { id: string; ruta: (u: number) => [number, number]; ventana: [number, number]; lite: boolean }) {
  const grupo = useRef<Group>(null);
  const cuerpo = useRef<Group>(null);
  useFrame(() => {
    const f = ep.f06;
    const u = lineal(f, ventana[0], ventana[1]);
    const entra = tramo(f, ventana[0] - 0.08, ventana[0]);
    const sale = tramo(f, ventana[1], ventana[1] + 0.08);
    const g = grupo.current;
    if (!g) return;
    g.visible = entra > 0.001 && sale < 0.999;
    const [x, z] = ruta(u);
    g.position.set(x, MY + 0.36 + (1 - entra) * 0.5 + sale * 0.5, z);
    if (cuerpo.current) cuerpo.current.rotation.x = -0.95 * tramo(f, ventana[0] - 0.02, ventana[0] + 0.03) * (1 - tramo(f, ventana[1] - 0.02, ventana[1] + 0.03));
  });
  return <group ref={grupo}>
    <group ref={cuerpo}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={ACERO_DOBLE} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.26, 18, 1, true, Math.PI, Math.PI]} />
      </mesh>
      <mesh position={[-0.13, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={ACERO_DOBLE}><circleGeometry args={[0.085, 18, 0, Math.PI]} /></mesh>
      <Cil p={[-0.25, 0.02, 0]} r={0.014} l={0.24} m={MATERIAL.acero} rot={[0, 0, Math.PI / 2 - 0.25]} seg={8} />
      <Monton id={`${id}-carga`} n={lite ? 12 : 24} geo={G_COMP} m={MATERIAL.pelletCompuesto} generar={(r) => [(r() - 0.5) * 0.22, -0.055 + r() * 0.04, (r() - 0.5) * 0.1]} />
    </group>
    <Corriente id={`${id}-vertido`} pts={[[0, -0.03, 0.07], [0, -0.17, 0.07], [0, -0.3, 0.06]]} n={lite ? 8 : 16} geo={G_COMP} m={MATERIAL.pelletCompuesto} jit={0.04}
      estado={() => [ep.f06 * 10, lineal(ep.f06, ventana[0] + 0.02, ventana[0] + 0.04), lineal(ep.f06, ventana[1] - 0.02, ventana[1])] as const} />
  </group>;
}

function MoldesAcero({ lite }: { lite: boolean }) {
  const leds = useLeds(["#8fe6b6", "#8fe6b6"]);
  useFrame(() => {
    leds[0].emissiveIntensity = ep.f06 >= 0.42 ? 2 : 0.1;
    leds[1].emissiveIntensity = ep.f06 >= 0.65 ? 2 : 0.1;
  });
  const A = MOLDE_ASIENTO;
  const B = MOLDE_RESPALDO;
  return <>
    <Caja s={[3.2, 0.06, 1.7]} p={[0.25, MY - 0.03, -0.15]} m={MATERIAL.mesa} r={0.01} />
    <Patas pts={[[-1.25, -0.9], [1.75, -0.9], [-1.25, 0.6], [1.75, 0.6]]} h={MY - 0.06 - Y0} />
    {/* Molde de asiento */}
    <group position={[A.x, MY, A.z]}>
      <Caja s={[A.w, BASE_MOLDE, A.d]} p={[0, BASE_MOLDE / 2, 0]} m={MATERIAL.moldeOscuro} r={0.006} />
      <mesh geometry={bloqueMoldeGeo("asiento", A.w, A.d, ALTO_MOLDE, () => [rectShape(1.32, 0.11, 0.02)])} position={[0, BASE_MOLDE, 0]} material={MATERIAL.molde} castShadow receiveShadow />
      <PernosMolde w={A.w} d={A.d} />
      <Monton id="molde-asiento" n={lite ? 70 : 150} geo={G_COMP} m={MATERIAL.pelletCompuesto} generar={monticulo(1.28, 0.09, 0.05, BASE_MOLDE + 0.012)} nivel={() => lineal(ep.f06, 0.14, 0.42)} />
      <Led p={[A.w / 2 - 0.08, BASE_MOLDE + 0.04, A.d / 2 + 0.01]} m={leds[0]} r={0.014} />
    </group>
    {/* Molde de respaldo: tres listones */}
    <group position={[B.x, MY, B.z]}>
      <Caja s={[B.w, BASE_MOLDE, B.d]} p={[0, BASE_MOLDE / 2, 0]} m={MATERIAL.moldeOscuro} r={0.006} />
      <mesh geometry={bloqueMoldeGeo("respaldo", B.w, B.d, ALTO_MOLDE, () => CAV_RESPALDO.map((cz) => rectShape(1.32, 0.1, 0.02, 0, cz)))} position={[0, BASE_MOLDE, 0]} material={MATERIAL.molde} castShadow receiveShadow />
      <PernosMolde w={B.w} d={B.d} />
      {CAV_RESPALDO.map((cz, k) => <Monton key={cz} id={`molde-respaldo-${k}`} n={lite ? 50 : 110} geo={G_COMP} m={MATERIAL.pelletCompuesto} generar={monticulo(1.28, 0.08, 0.05, BASE_MOLDE + 0.012, 0, -cz)}
        nivel={() => lineal(ep.f06, 0.36 + k * 0.1, 0.46 + k * 0.1)} />)}
      <Led p={[B.w / 2 - 0.08, BASE_MOLDE + 0.04, B.d / 2 + 0.01]} m={leds[1]} r={0.014} />
    </group>
    <Cuchara id="cuchara-asiento" ventana={[0.14, 0.42]} lite={lite} ruta={(u) => [A.x - 0.6 + u * 1.2, A.z]} />
    <Cuchara id="cuchara-respaldo" ventana={[0.36, 0.66]} lite={lite} ruta={(u) => {
      const k = Math.min(2, Math.floor(u * 3));
      const v = u * 3 - k;
      const dir = k % 2 ? -1 : 1;
      return [B.x + dir * (-0.6 + v * 1.2), B.z - CAV_RESPALDO[k]];
    }} />
    <Cuchara id="cuchara-soporte" ventana={[0.6, 0.88]} lite={lite} ruta={(u) => {
      // Recorre el contorno del soporte (molde viajero en la mesa, a la derecha).
      const p = POLIGONO_SOPORTE[Math.min(POLIGONO_SOPORTE.length - 1, Math.floor(u * (POLIGONO_SOPORTE.length - 1)))];
      return [1.3 + p.x * 0.75, -0.1 + (0.415 - p.y) * 0.75];
    }} />
  </>;
}

/* ───────────────────────── 07 Prensa hidráulica ───────────────────────── */

const PRENSA_ABIERTA = 1.75;
const PRENSA_CERRADA = MY + BASE_MOLDE + ALTO_MOLDE + 0.006;

function Prensa() {
  const platina = useRef<Group>(null);
  const vastago = useRef<Mesh>(null);
  const calor = useLeds(["#ff7a2e", "#ff7a2e"]);
  const presion = useLeds(["#ffb85c", "#ffb85c", "#ffb85c", "#ffb85c", "#ffb85c"]);
  const leds = useLeds(["#8fe6b6", "#ffb85c"]);
  useFrame(() => {
    const f = ep.f07;
    const cierre = tramo(f, 0.22, 0.48) - tramo(f, 0.8, 0.92);
    const y = PRENSA_ABIERTA - cierre * (PRENSA_ABIERTA - PRENSA_CERRADA);
    if (platina.current) platina.current.position.y = y;
    if (vastago.current) {
      const largo = 2.55 - (y + 0.37);
      vastago.current.scale.y = largo;
      vastago.current.position.y = y + 0.37 + largo / 2;
    }
    // Calor y presión se muestran como estados cualitativos, sin valores.
    const brasa = tramo(f, 0.3, 0.55) * (1 - tramo(f, 0.78, 0.9));
    calor.forEach((m) => (m.emissiveIntensity = 0.05 + 2.6 * brasa));
    const p = tramo(f, 0.45, 0.62) * (1 - tramo(f, 0.78, 0.84));
    presion.forEach((m, k) => (m.emissiveIntensity = p > (k + 0.5) / 5 ? 2 : 0.08));
    leds[0].emissiveIntensity = f > 0.15 ? 2 : 0.1;
    leds[1].emissiveIntensity = brasa > 0.2 ? 1.9 : 0.1;
  });
  const columnas: [number, number][] = [[-0.92, -0.52], [0.92, -0.52], [-0.92, 0.52], [0.92, 0.52]];
  return <>
    <Caja s={[2.3, 0.42, 1.45]} p={[0, Y0 + 0.21, 0]} m={MATERIAL.maquina} r={0.03} />
    <mesh position={[0, MY - 0.14, 0]} material={calor[0]}><boxGeometry args={[1.62, 0.02, 1.12]} /></mesh>
    <Caja s={[1.6, 0.12, 1.1]} p={[0, MY - 0.06, 0]} m={MATERIAL.aceroOscuro} />
    {columnas.map(([x, z], k) => <group key={k}>
      <Cil p={[x, (Y0 + 0.42 + 2.55) / 2, z]} r={0.075} l={2.55 - Y0 - 0.42} m={MATERIAL.cromo} />
      <Cil p={[x, Y0 + 0.44, z]} r={0.11} l={0.05} m={MATERIAL.aceroOscuro} />
    </group>)}
    {/* Corona y cilindro principal */}
    <Caja s={[2.3, 0.36, 1.45]} p={[0, 2.73, 0]} m={MATERIAL.maquina} r={0.03} />
    {columnas.map(([x, z], k) => <Cil key={k} p={[x, 2.93, z]} r={0.1} l={0.06} m={MATERIAL.aceroOscuro} seg={6} />)}
    <Brida p={[0, 2.94, 0]} r={0.42} pernos={10} grosor={0.06} />
    <Cil p={[0, 3.18, 0]} r={0.33} l={0.44} m={MATERIAL.acero} />
    <Cil p={[0, 3.42, 0]} r={0.28} l={0.06} m={MATERIAL.cromo} />
    {[-0.1, 0, 0.1].map((dz, k) => <Tubo key={dz} id={`manguera-prensa-${k}`} pts={[[0.24, 3.2, dz - 0.22], [0.75, 3.3, dz - 0.4], [1.42, 2.7, dz - 0.45], [1.55, 1.4, dz - 0.4], [1.55, Y0 + 0.82, dz - 0.35]]} r={0.022} m={MATERIAL.manguera} />)}
    {/* Platina móvil con molde superior */}
    <group ref={platina} position={[0, PRENSA_ABIERTA, 0]}>
      <Caja s={[1.0, 0.12, 0.92]} p={[0, 0.06, 0]} m={MATERIAL.molde} />
      <mesh position={[0, 0.13, 0]} material={calor[1]}><boxGeometry args={[1.62, 0.02, 1.12]} /></mesh>
      <Caja s={[1.95, 0.22, 1.25]} p={[0, 0.26, 0]} m={MATERIAL.aceroOscuro} r={0.02} />
      {columnas.map(([x, z], k) => <Cil key={k} p={[x, 0.26, z]} r={0.12} l={0.26} m={MATERIAL.acero} />)}
    </group>
    <mesh ref={vastago} position={[0, 2.2, 0]} material={MATERIAL.cromo} castShadow><cylinderGeometry args={[0.17, 0.17, 1, 24]} /></mesh>
    {/* Resguardos laterales con malla (pasan por encima del transportador) */}
    {[-1.42, 1.42].map((x) => <group key={x} position={[x, 0, 0]} rotation={[0, x > 0 ? -0.22 : 0.22, 0]}>
      {[-0.64, 0.64].map((z) => <Caja key={z} s={[0.06, 2.25, 0.06]} p={[0, Y0 + 1.125, z]} m={MATERIAL.amarillo} r={0.006} />)}
      {[0.98, 2.3].map((y) => <Caja key={y} s={[0.06, 0.06, 1.34]} p={[0, y, 0]} m={MATERIAL.amarillo} r={0.006} />)}
      <mesh position={[0, 1.64, 0]} rotation={[0, Math.PI / 2, 0]} material={MATERIAL.malla}><planeGeometry args={[1.26, 1.28]} /></mesh>
    </group>)}
    {/* Unidad hidráulica con barra de estado de presión (sin escala) */}
    <group position={[1.62, 0, -0.38]}>
      <Caja s={[0.58, 0.72, 0.52]} p={[0, Y0 + 0.36, 0]} m={MATERIAL.maquinaPanel} r={0.025} />
      <Motor p={[0, Y0 + 0.86, -0.05]} r={0.1} l={0.26} />
      {presion.map((m, k) => <Led key={k} p={[-0.16, Y0 + 0.22 + k * 0.08, 0.265]} m={m} r={0.017} />)}
      {leds.map((m, k) => <Led key={k} p={[0.16, Y0 + 0.5 - k * 0.08, 0.265]} m={m} r={0.017} />)}
    </group>
  </>;
}

/* ───────────────────────── 08 Enfriamiento y desmoldeo ───────────────────────── */

const MOLDE_S8_X = -0.55;
const RACK_X = 1.0;

/** Coloca el grupo de la pieza: tumbada en el molde (r=0) o vertical colgando del gancho (r=1). */
function poseLevantada(g: Group, x: number, y: number, z: number, r: number) {
  g.position.set(x, y, z);
  g.rotation.set((-Math.PI / 2) * (1 - r), 0, 0);
}

function Enfriamiento({ lite }: { lite: boolean }) {
  const carro = useRef<Group>(null);
  const varilla = useRef<Mesh>(null);
  const travesano = useRef<Group>(null);
  const pieza = useRef<Group>(null);
  const aspas = useRef<Group>(null);
  const placa = useLeds(["#5fc6e0"]);
  const leds = useLeds(["#7cc4ff", "#8fe6b6"]);
  useFrame(() => {
    const f = ep.f08;
    const frio = tramo(f, 0.24, 0.32) * (1 - tramo(f, 0.5, 0.58));
    placa[0].emissiveIntensity = 0.05 + 1.4 * frio;
    if (aspas.current) aspas.current.children.forEach((c) => (c.rotation.z = -f * 60 * tramo(f, 0.22, 0.3)));
    // Gancho: baja, sujeta, eleva girando la pieza, traslada al bastidor y deposita.
    const baja = tramo(f, 0.5, 0.58);
    const sube = tramo(f, 0.58, 0.72);
    const mueve = tramo(f, 0.72, 0.86);
    const deposita = tramo(f, 0.86, 0.96);
    const x = MOLDE_S8_X + (RACK_X - MOLDE_S8_X) * mueve;
    const yMolde = MY + 0.073;
    const yAlto = 1.45;
    const yRack = MY + 0.05 + 0.37;
    const yPieza = sube < 1 ? yMolde + (yAlto - yMolde) * sube : yAlto + (yRack - yAlto) * deposita;
    const zPieza = 0.045 * (1 - sube);
    const yGancho = sube > 0 ? yPieza : 1.45 + (yMolde - 1.45) * baja;
    if (carro.current) carro.current.position.x = sube > 0 ? x : MOLDE_S8_X;
    if (varilla.current) {
      const largo = 2.3 - yGancho;
      varilla.current.scale.y = largo;
      varilla.current.position.y = yGancho + largo / 2;
    }
    if (travesano.current) travesano.current.position.y = yGancho;
    if (pieza.current) {
      pieza.current.visible = f >= 0.58 || (f >= 0.5 && sube > 0);
      poseLevantada(pieza.current, 0, yPieza, zPieza, sube);
    }
    leds[0].emissiveIntensity = frio > 0.3 ? 2 : 0.1;
    leds[1].emissiveIntensity = deposita > 0.99 ? 2 : 0.1;
  });
  const aire = (x: number): V3[] => [[x, MY + 0.32, -0.62], [x + 0.1, MY + 0.2, -0.3], [x + 0.2, MY + 0.12, 0.05]];
  return <>
    <Caja s={[3.9, 0.06, 1.9]} p={[0, MY - 0.05, 0]} m={MATERIAL.mesa} r={0.01} />
    <Patas pts={[[-1.85, -0.85], [1.85, -0.85], [-1.85, 0.85], [1.85, 0.85]]} h={MY - 0.08 - Y0} />
    <mesh position={[MOLDE_S8_X, MY - 0.012, 0]} material={placa[0]}><boxGeometry args={[1.2, 0.02, 1.15]} /></mesh>
    {/* Ventiladores de enfriamiento */}
    <group ref={aspas}>
      {[-0.95, -0.2].map((x) => <group key={x} position={[x, MY + 0.32, -0.7]}>
        {[0, 1, 2, 3, 4].map((k) => <Caja key={k} s={[0.16, 0.05, 0.01]} p={[Math.cos((k * 2 * Math.PI) / 5) * 0.08, Math.sin((k * 2 * Math.PI) / 5) * 0.08, 0]} rot={[0.35, 0, (k * 2 * Math.PI) / 5]} m={MATERIAL.acero} r={0.004} sombra={false} />)}
      </group>)}
    </group>
    {[-0.95, -0.2].map((x) => <group key={x} position={[x, MY + 0.32, -0.7]}>
      <mesh material={MATERIAL.maquinaClara}><torusGeometry args={[0.2, 0.025, 8, 28]} /></mesh>
      <Caja s={[0.46, 0.46, 0.05]} p={[0, 0, -0.04]} m={MATERIAL.maquinaPanel} />
      <Cil p={[0, 0, 0.01]} r={0.04} l={0.05} m={MATERIAL.cromo} rot={EJE_Z} />
      <Caja s={[0.05, 0.32, 0.05]} p={[0, -0.36, -0.04]} m={MATERIAL.acero} r={0.006} />
    </group>)}
    {[-0.95, -0.2].map((x, k) => <Corriente key={x} id={`aire-${k}`} pts={aire(x)} n={lite ? 8 : 16} geo={G_COMPAT} m={MATERIAL.frio} jit={0.22} escala={0.7}
      estado={() => [ep.f08 * 6 + k * 0.3, tramo(ep.f08, 0.24, 0.3), tramo(ep.f08, 0.5, 0.56)] as const} />)}
    {/* Pórtico de extracción */}
    {[-1.65, 1.65].flatMap((x) => [-0.6, 0.6].map((z) => <Caja key={`${x}${z}`} s={[0.07, 2.32 - MY + 0.05, 0.07]} p={[x, (2.32 + MY - 0.05) / 2, z]} m={MATERIAL.acero} r={0.006} />))}
    {[-0.6, 0.6].map((z) => <Caja key={z} s={[3.4, 0.08, 0.08]} p={[0, 2.35, z]} m={MATERIAL.acero} />)}
    <Caja s={[3.4, 0.1, 0.12]} p={[0, 2.35, 0]} m={MATERIAL.aceroOscuro} />
    <group ref={carro} position={[MOLDE_S8_X, 0, 0]}>
      <Caja s={[0.26, 0.14, 0.32]} p={[0, 2.25, 0]} m={MATERIAL.amarillo} />
      <mesh ref={varilla} position={[0, 1.8, 0]} material={MATERIAL.cromo}><cylinderGeometry args={[0.022, 0.022, 1, 12]} /></mesh>
      <group ref={travesano} position={[0, 1.45, 0]}>
        <Caja s={[0.08, 0.1, 0.06]} p={[0, 0.06, 0.05]} m={MATERIAL.acero} />
        <Caja s={[0.62, 0.045, 0.05]} p={[0.0, 0.0, 0.05]} m={MATERIAL.acero} />
        {[-0.27, 0.27].map((x) => <Caja key={x} s={[0.045, 0.14, 0.09]} p={[x, -0.05, 0.05]} m={MATERIAL.aceroOscuro} />)}
      </group>
      <group ref={pieza} visible={false}>
        <mesh geometry={soporteGeo(0.06)} position={[0, -0.37, 0]} material={PIEZA_CALIENTE} castShadow />
      </group>
    </group>
    {/* Bastidor de piezas separadas */}
    <group position={[RACK_X, MY, 0]}>
      <Caja s={[0.9, 0.05, 0.62]} p={[0, 0.025, 0]} m={MATERIAL.aceroOscuro} />
      {[-0.42, 0.42].map((x) => <group key={x}>
        <Caja s={[0.04, 0.42, 0.04]} p={[x, 0.26, -0.07]} m={MATERIAL.acero} r={0.005} />
        <Caja s={[0.04, 0.42, 0.04]} p={[x, 0.26, 0.07]} m={MATERIAL.acero} r={0.005} />
      </group>)}
      <Led p={[0.38, 0.04, 0.32]} m={leds[1]} r={0.014} />
    </group>
    <Caja s={[1.29, 0.07, 0.1]} p={[0.75, MY + 0.035, 0.68]} m={MATERIAL.piezaListon} r={0.012} />
    <Caja s={[1.29, 0.05, 0.095]} p={[0.75, MY + 0.025, 0.52]} m={MATERIAL.piezaListon} r={0.012} />
    <Led p={[MOLDE_S8_X + 0.55, MY + 0.03, 0.6]} m={leds[0]} r={0.016} />
  </>;
}

/* ───────────────────────── 09 Acabado y ensamblaje / 10 Inspección ───────────────────────── */

/** Uniones exteriores soporte–asiento/respaldo del modelo visual (no es una BOM). */
const UNIONES: V3[] = [
  [-0.765, 0.415, 0.24], [-0.765, 0.415, -0.12], [-0.765, 0.765, -0.228],
  [0.765, 0.415, 0.24], [0.765, 0.415, -0.12], [0.765, 0.765, -0.228],
];
const BANDEJA: V3 = [1.72, 0.9, 0.32];

function Ensamble({ lite }: { lite: boolean }) {
  const zona = useRef<Group>(null);
  const llave = useRef<Group>(null);
  const cabeza = useRef<Group>(null);
  const almohadilla = useRef<Group>(null);
  const barrido = useRef<Mesh>(null);
  const tornillos = useRef<Group>(null);
  useFrame(() => {
    const f = ep.f09;
    if (zona.current) zona.current.visible = ep.progreso < INICIOS[9] - 0.01;
    // Acabado general: pasada conceptual sobre los soportes antes de unirlos.
    const a = lineal(f, 0.2, 0.42);
    if (almohadilla.current) {
      almohadilla.current.visible = a > 0 && a < 1;
      const lado = a < 0.5 ? -1 : 1;
      const v = (a % 0.5) * 2;
      almohadilla.current.position.set(lado * 1.55, Y0 + 0.28 + 0.4 + Math.sin(v * Math.PI) * 0.25, -0.25 + v * 0.5);
      almohadilla.current.rotation.z = lado * 0.2;
    }
    if (barrido.current) {
      barrido.current.visible = a > 0 && a < 1;
      const lado = a < 0.5 ? -1 : 1;
      barrido.current.position.set(lado * 1.47, Y0 + 0.28 + ((a % 0.5) * 2) * 0.82, 0);
    }
    // Tornillería inoxidable: cada unión recibe su tornillo y la llave lo aprieta.
    const t = lineal(f, 0.62, 0.97);
    const k = Math.min(5, Math.floor(t * 6));
    const v = t * 6 - k;
    if (tornillos.current) tornillos.current.children.forEach((c, j) => {
      const u = j === k ? tramo(v, 0, 0.45) : j < k ? 1 : 0;
      c.visible = t > 0 && u > 0 && u < 1;
      const o = UNIONES[j];
      const s = Math.sign(o[0]);
      const dx = o[0] + s * 0.03;
      const dy = Y0 + o[1];
      c.position.set(BANDEJA[0] + (dx - BANDEJA[0]) * u, BANDEJA[1] + (dy - BANDEJA[1]) * u + Math.sin(u * Math.PI) * 0.35, BANDEJA[2] + (o[2] - BANDEJA[2]) * u);
      c.rotation.set(0, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    });
    if (llave.current) {
      llave.current.visible = t > 0 && t < 1;
      const o = UNIONES[k];
      const s = Math.sign(o[0]);
      const prev = UNIONES[Math.max(0, k - 1)];
      const m = tramo(v, 0, 0.4);
      const px = prev[0] + (o[0] - prev[0]) * m;
      llave.current.position.set(px + Math.sign(px || s) * 0.1, Y0 + prev[1] + (o[1] - prev[1]) * m, prev[2] + (o[2] - prev[2]) * m);
      llave.current.rotation.y = Math.sign(px || s) > 0 ? 0 : Math.PI;
      if (cabeza.current) cabeza.current.rotation.x = Math.sin(tramo(v, 0.45, 1) * Math.PI * 6) * 0.45;
    }
  });
  return <group ref={zona}>
    {/* Mesa de trabajo con bandeja de tornillería y herramientas */}
    <group position={[1.72, 0, 0.32]}>
      <Caja s={[0.95, 0.05, 0.6]} p={[0, 0.82, 0]} m={MATERIAL.aceroOscuro} />
      <Patas pts={[[-0.42, -0.25], [0.42, -0.25], [-0.42, 0.25], [0.42, 0.25]]} h={0.8} y0={0} />
      <Caja s={[0.34, 0.025, 0.22]} p={[0, 0.858, 0]} m={MATERIAL.acero} r={0.006} />
      {Array.from({ length: 10 }, (_, j) => <group key={j} position={[-0.12 + (j % 5) * 0.06, 0.88, -0.05 + Math.floor(j / 5) * 0.09]} rotation={[0, 0, Math.PI / 2]}>
        <Cil p={[0, 0, 0]} r={0.008} l={0.07} m={MATERIAL.cromo} seg={8} />
        <Cil p={[0, 0.038, 0]} r={0.015} l={0.008} m={MATERIAL.cromo} seg={6} />
      </group>)}
      <mesh geometry={llaveGeo(0.2)} position={[0.3, 0.85, 0.05]} rotation={[-Math.PI / 2, 0, 0.4]} material={MATERIAL.cromo} />
      <Cil p={[-0.3, 0.86, 0.18]} r={0.018} l={0.14} m={MATERIAL.manguera} rot={[0, 0, Math.PI / 2]} seg={10} />
      <Cil p={[-0.18, 0.86, 0.18]} r={0.005} l={0.12} m={MATERIAL.cromo} rot={[0, 0, Math.PI / 2]} seg={6} />
      <Caja s={[0.22, 0.03, 0.17]} p={[0.28, 0.86, -0.18]} m={MATERIAL.piezaSoporte} r={0.012} />
    </group>
    <group ref={almohadilla} visible={false}>
      <Caja s={[0.16, 0.05, 0.1]} p={[0, 0, 0]} m={MATERIAL.lija} r={0.012} />
      <Caja s={[0.12, 0.05, 0.05]} p={[0, 0.05, 0]} m={MATERIAL.manguera} r={0.015} />
    </group>
    <mesh ref={barrido} visible={false} material={LUZ_HAZ}><boxGeometry args={[0.18, 0.02, 0.66]} /></mesh>
    <group ref={tornillos}>
      {UNIONES.map((_, j) => <group key={j} visible={false}>
        <Cil p={[0, 0, 0]} r={0.008} l={0.07} m={MATERIAL.cromo} seg={8} />
        <Cil p={[0, 0.038, 0]} r={0.016} l={0.008} m={MATERIAL.cromo} seg={6} />
      </group>)}
    </group>
    {/* Llave de carraca genérica */}
    <group ref={llave} visible={false}>
      <group ref={cabeza}>
        <Cil p={[0.02, 0, 0]} r={0.02} l={0.06} m={MATERIAL.cromo} rot={EJE_X} seg={12} />
        <Cil p={[0.06, 0, 0]} r={0.03} l={0.035} m={MATERIAL.cromo} rot={EJE_X} seg={14} />
        <Cil p={[0.06, -0.16, 0]} r={0.014} l={0.28} m={MATERIAL.cromo} seg={10} />
        <Cil p={[0.06, -0.33, 0]} r={0.02} l={0.12} m={MATERIAL.manguera} seg={10} />
      </group>
    </group>
  </group>;
}

function Inspeccion() {
  const zona = useRef<Group>(null);
  const carro = useRef<Group>(null);
  const laser = useRef<Mesh>(null);
  const trapo = useRef<Group>(null);
  const esquinas = useRef<Group>(null);
  const empaque = useRef<Group>(null);
  const aros = useLeds(UNIONES.map(() => "#8fe6b6"));
  const [laserMat] = useLeds(["#ff5a4e"]);
  useFrame(() => {
    const f = ep.f10;
    if (zona.current) zona.current.visible = f > 0;
    if (carro.current) carro.current.position.x = -0.95 + 1.9 * tramo(f, 0.14, 0.46);
    // Revisión visual de alineación y uniones: indicación de lo revisado, no una certificación.
    const l = tramo(f, 0.26, 0.36) * (1 - tramo(f, 0.5, 0.56));
    if (laser.current) {
      laser.current.scale.x = Math.max(0.001, tramo(f, 0.26, 0.38));
      laser.current.visible = l > 0.01;
    }
    laserMat.emissiveIntensity = 2.4 * l;
    aros.forEach((m, k) => {
      const t0 = 0.3 + k * 0.035;
      const pico = tramo(f, t0, t0 + 0.02) * (1 - tramo(f, t0 + 0.03, t0 + 0.06));
      m.emissiveIntensity = (f > t0 + 0.02 ? 0.35 : 0) * (1 - tramo(f, 0.62, 0.7)) + 2.2 * pico;
    });
    const c = lineal(f, 0.5, 0.7);
    if (trapo.current) {
      trapo.current.visible = c > 0 && c < 1;
      const pasada = Math.min(3, Math.floor(c * 4));
      const u = c * 4 - pasada;
      const dir = pasada % 2 ? -1 : 1;
      trapo.current.position.set(dir * (-0.58 + u * 1.16), Y0 + 0.465, 0.24 - pasada * 0.12);
      trapo.current.rotation.y = Math.sin(c * Math.PI * 8) * 0.3;
    }
    if (empaque.current) empaque.current.position.x = 1.85 + 1.6 * (1 - tramo(f, 0.6, 0.74));
    if (esquinas.current) esquinas.current.children.forEach((g, k) => {
      const u = tramo(f, 0.72 + k * 0.04, 0.8 + k * 0.04);
      g.visible = u > 0;
      g.position.y = Y0 + 0.07 + (1 - u) * 0.5;
    });
  });
  return <group ref={zona} visible={false}>
    {/* Pórtico de inspección con barra de luz móvil */}
    {[-1.25, 1.25].map((x) => <Caja key={x} s={[0.06, 1.7, 0.06]} p={[x, Y0 + 0.85, -0.78]} m={MATERIAL.acero} r={0.006} />)}
    <Caja s={[2.6, 0.07, 0.07]} p={[0, Y0 + 1.72, -0.78]} m={MATERIAL.acero} />
    <group ref={carro} position={[-0.95, 0, 0]}>
      <Caja s={[0.12, 0.1, 0.12]} p={[0, Y0 + 1.72, -0.78]} m={MATERIAL.amarillo} />
      <Caja s={[0.05, 0.05, 1.2]} p={[0, Y0 + 1.68, -0.2]} m={MATERIAL.aceroOscuro} />
      <mesh position={[0, Y0 + 1.65, -0.15]} material={MATERIAL.guia}><boxGeometry args={[0.035, 0.012, 0.9]} /></mesh>
      <mesh position={[0, Y0 + 0.85, -0.12]} material={LUZ_HAZ}><cylinderGeometry args={[0.04, 0.32, 1.6, 4, 1, true]} /></mesh>
    </group>
    <mesh ref={laser} position={[0, Y0 + 0.457, 0.298]} material={laserMat}><boxGeometry args={[1.55, 0.004, 0.004]} /></mesh>
    {UNIONES.map((o, k) => <mesh key={k} position={[o[0] + Math.sign(o[0]) * 0.012, Y0 + o[1], o[2]]} rotation={[0, Math.PI / 2, 0]} material={aros[k]}>
      <torusGeometry args={[0.032, 0.004, 6, 20]} />
    </mesh>)}
    <group ref={trapo} visible={false}>
      <Caja s={[0.18, 0.022, 0.13]} p={[0, 0, 0]} m={MATERIAL.piezaSoporte} r={0.01} />
      <Caja s={[0.1, 0.03, 0.08]} p={[0.03, 0.018, 0.01]} rot={[0, 0.5, 0.1]} m={MATERIAL.piezaSoporte} r={0.012} />
    </group>
    {/* Protecciones de esquina y material de empaque */}
    <group ref={esquinas}>
      {[[-0.7, 0.24], [0.7, 0.24], [-0.7, -0.24], [0.7, -0.24]].map(([x, z], k) => <group key={k} position={[x, Y0 + 0.07, z]} visible={false}>
        <Caja s={[0.16, 0.15, 0.13]} p={[0, 0, 0]} m={MATERIAL.espuma} r={0.015} />
      </group>)}
    </group>
    <group ref={empaque} position={[1.85, 0, 0.05]} rotation={[0, -0.3, 0]}>
      <Palet p={[0, Y0, 0]} />
      <Caja s={[0.5, 0.4, 0.42]} p={[-0.18, Y0 + 0.31, -0.18]} m={MATERIAL.carton} />
      <Caja s={[0.38, 0.3, 0.36]} p={[0.2, Y0 + 0.26, 0.2]} m={MATERIAL.carton} />
      <Caja s={[0.52, 0.012, 0.02]} p={[-0.18, Y0 + 0.512, -0.18]} m={MATERIAL.cinta} r={0.002} sombra={false} />
      <Caja s={[0.36, 0.12, 0.3]} p={[-0.16, Y0 + 0.57, -0.18]} m={MATERIAL.espuma} r={0.008} />
      <Cil p={[0.32, Y0 + 0.65, -0.24]} r={0.1} l={0.5} m={MATERIAL.pelicula} rot={[0, 0, 0]} />
      <Cil p={[0.32, Y0 + 0.65, -0.24]} r={0.03} l={0.52} m={MATERIAL.carton} />
    </group>
  </group>;
}

function EstacionBanca({ lite }: { lite: boolean }) {
  return <>
    <group position={[0, Y0, 0]}>
      <BancaProceso x={0} giro={0} lite={lite} progresivo />
    </group>
    <Ensamble lite={lite} />
    <Inspeccion />
  </>;
}

/* ───────────────────────── Conexiones entre etapas ───────────────────────── */

const RUTA_1_2: V3[] = [[6.12, 0.78, -0.24], [6.2, 1.2, -0.45], [6.55, 2.3, -0.85], [7.6, 2.62, -1.0], [8.5, 2.1, -0.7], [8.95, 1.55, -0.35], [9.12, 1.45, -0.28]];
const RUTA_2_3: V3[] = [[11.8, Y0 + 0.32, 0], [12.15, 0.55, -0.5], [13.2, 0.6, -1.0], [14.3, 1.8, -1.0], [14.95, 2.98, -0.5], [15.35, 3.0, -0.12], [15.35, Y0 + 2.66, 0]];
const RUTA_3_4: V3[] = [[16.62, Y0 + 0.4, 0], [16.95, 0.6, -0.25], [18.0, 0.62, -0.9], [19.8, 0.72, -0.9], [20.6, 1.9, -0.5], [21.08, 2.08, -0.06], [21.08, BY + 0.84, 0]];

function Ruta({ id, pts, estado, lite, mezcla = false }: { id: string; pts: V3[]; estado: Estado; lite: boolean; mezcla?: boolean }) {
  const ultimo = pts[pts.length - 1];
  return <>
    <Tubo id={id} pts={pts} r={0.05} m={MATERIAL.acrilico} seg={96} />
    <Cil p={pts[0]} r={0.064} l={0.08} m={MATERIAL.cromo} />
    <Cil p={ultimo} r={0.064} l={0.08} m={MATERIAL.cromo} />
    <Corriente id={id} pts={pts} n={lite ? 30 : 64} geo={G_PET} m={MATERIAL.pelletPet} jit={0.05} estado={estado} />
    {mezcla && <Corriente id={`${id}-b`} pts={pts} n={lite ? 22 : 44} geo={G_COMPAT} m={MATERIAL.pelletCompat} jit={0.05}
      estado={() => { const [f, c, t] = estado(); return [f + 0.37, c, t] as const; }} />}
  </>;
}

/** Transportador de rodillos a la altura de trabajo de moldes y prensa. */
function Rodillos({ x0, x1, giro }: { x0: number; x1: number; giro: () => number }) {
  const g = useRef<Group>(null);
  const n = Math.max(2, Math.round((x1 - x0) / 0.16));
  useFrame(() => {
    if (g.current) g.current.children.forEach((c) => (c.rotation.y = -giro() * 40));
  });
  return <>
    {[-0.47, 0.47].map((z) => <Caja key={z} s={[x1 - x0, 0.07, 0.04]} p={[(x0 + x1) / 2, MY - 0.05, z]} m={MATERIAL.acero} r={0.006} />)}
    <Patas pts={[[x0 + 0.1, -0.45], [x1 - 0.1, -0.45], [x0 + 0.1, 0.45], [x1 - 0.1, 0.45]]} h={MY - 0.08} y0={0} />
    <group ref={g}>
      {Array.from({ length: n }, (_, k) => <group key={k} position={[x0 + 0.08 + (k * (x1 - x0 - 0.16)) / (n - 1), MY - 0.034, 0]} rotation={EJE_Z}>
        <mesh material={MATERIAL.cromo} receiveShadow><cylinderGeometry args={[0.03, 0.03, 0.9, 12]} /></mesh>
      </group>)}
    </group>
  </>;
}

/** Molde del soporte: se llena en 06, se prensa en 07 y se desmolda en 08. */
function MoldeViajero({ lite }: { lite: boolean }) {
  const g = useRef<Group>(null);
  const granos = useRef<Group>(null);
  const pieza = useRef<Group>(null);
  const [led] = useLeds(["#8fe6b6"]);
  const cavidad = useMemo(() => () => [moverShape(perfilSoporte(), 0, -0.415)], []);
  useFrame(() => {
    const t67 = tramo(ep.progreso, INICIOS[6] - 0.022, INICIOS[6] + 0.005);
    const t78 = tramo(ep.progreso, INICIOS[7] - 0.008, INICIOS[7] + 0.01);
    const x = t78 > 0 ? CENTROS[6] + (CENTROS[7] + MOLDE_S8_X - CENTROS[6]) * t78 : CENTROS[5] + 1.3 + (CENTROS[6] - CENTROS[5] - 1.3) * t67;
    if (g.current) {
      g.current.position.set(x, MY, -0.1 * (1 - t67));
      g.current.visible = Math.abs(ep.tx - x) < 8.6;
    }
    const moldeado = ep.f07 >= 0.6;
    if (granos.current) granos.current.visible = !moldeado;
    if (pieza.current) {
      pieza.current.visible = moldeado && ep.f08 < 0.58;
      poseLevantada(pieza.current, 0, 0.073, 0.045, 0);
    }
    // La pieza recién moldeada lleva un tinte cálido que se apaga durante el enfriamiento.
    PIEZA_CALIENTE.emissiveIntensity = 0.55 * tramo(ep.f07, 0.6, 0.8) * (1 - tramo(ep.f08, 0.26, 0.52));
    led.emissiveIntensity = ep.f06 >= 0.88 ? 2 : 0.1;
  });
  return <group ref={g}>
    <Caja s={[0.86, BASE_MOLDE, 1.0]} p={[0, BASE_MOLDE / 2, 0]} m={MATERIAL.moldeOscuro} r={0.006} />
    <mesh geometry={bloqueMoldeGeo("soporte", 0.86, 1.0, ALTO_MOLDE, cavidad)} position={[0, BASE_MOLDE, 0]} material={MATERIAL.molde} castShadow receiveShadow />
    <PernosMolde w={0.86} d={1.0} />
    <group ref={granos}>
      <Monton id="molde-soporte" n={lite ? 120 : 260} geo={G_COMP} m={MATERIAL.pelletCompuesto}
        generar={monticulo(0.62, 0.86, 0.05, BASE_MOLDE + 0.012, 0, 0, (x, z) => dentroPoligono(POLIGONO_SOPORTE, x, 0.415 - z))}
        nivel={() => lineal(ep.f06, 0.6, 0.88)} />
    </group>
    <group ref={pieza} visible={false}>
      <mesh geometry={soporteGeo(0.06)} position={[0, -0.37, 0]} material={PIEZA_CALIENTE} castShadow />
    </group>
    <Led p={[0.36, BASE_MOLDE + 0.04, 0.505]} m={led} r={0.014} />
  </group>;
}

/** Carro con la bandeja de compuesto peletizado: de la peletizadora (05) a los moldes (06). */
function CarroCompuesto({ lite }: { lite: boolean }) {
  const g = useRef<Group>(null);
  const ruedas = useRef<Group>(null);
  const x0 = CENTROS[4] + 0.55;
  const x1 = CENTROS[5] - 1.75;
  useFrame(() => {
    const t = tramo(ep.progreso, INICIOS[5] - 0.022, INICIOS[5] + 0.008);
    const x = x0 + (x1 - x0) * t;
    if (g.current) {
      g.current.position.x = x;
      g.current.visible = Math.abs(ep.tx - x) < 8.6;
    }
    if (ruedas.current) ruedas.current.children.forEach((c) => (c.rotation.z = -t * 40));
  });
  return <group ref={g} position={[x0, Y0, 0.62]}>
    <Caja s={[0.9, 0.04, 0.6]} p={[0, 0.12, 0]} m={MATERIAL.aceroOscuro} />
    <group ref={ruedas}>
      {[[-0.36, -0.24], [0.36, -0.24], [-0.36, 0.24], [0.36, 0.24]].map(([x, z], k) => <group key={k} position={[x, 0.05, z]}>
        <Cil p={[0, 0, 0]} r={0.05} l={0.04} m={MATERIAL.manguera} rot={EJE_Z} seg={12} />
      </group>)}
    </group>
    <Caja s={[0.82, 0.02, 0.54]} p={[0, 0.15, 0]} m={MATERIAL.acero} />
    {[-0.26, 0.26].map((z) => <Caja key={z} s={[0.82, 0.16, 0.02]} p={[0, 0.23, z]} m={MATERIAL.acero} r={0.005} />)}
    {[-0.4, 0.4].map((x) => <Caja key={x} s={[0.02, 0.16, 0.54]} p={[x, 0.23, 0]} m={MATERIAL.acero} r={0.005} />)}
    <Monton id="bandeja-compuesto" n={lite ? 110 : 240} geo={G_COMP} m={MATERIAL.pelletCompuesto} generar={monticulo(0.76, 0.48, 0.14, 0.17)}
      nivel={() => lineal(ep.f05, 0.26, 0.86) * (1 - 0.7 * lineal(ep.f06, 0.14, 0.88))} />
  </group>;
}

function Conexiones({ lite }: { lite: boolean }) {
  const traza = useRef<Mesh>(null);
  const hitos = useLeds(CENTROS.map(() => "#8fe6b6"));
  const cordon = useRef<Group>(null);
  const X0 = 2.6;
  useFrame(() => {
    // Traza luminosa en el suelo: avanza con la cámara y deja encendidas las etapas recorridas.
    if (traza.current) {
      const largo = Math.max(0.001, Math.min(CENTROS[9] + 1.5 - X0, ep.tx - X0 + 0.6));
      traza.current.scale.x = largo;
      traza.current.position.x = X0 + largo / 2;
      traza.current.visible = ep.progreso > 0.085;
    }
    hitos.forEach((m, i) => (m.emissiveIntensity = ep.progreso >= INICIOS[i] ? (ep[ENVOLVENTES[i]] > 0.5 ? 2.4 : 0.9) : 0.05));
    const puente = lineal(ep.f04, 0.86, 0.97);
    if (cordon.current) {
      cordon.current.scale.x = Math.max(0.001, puente);
      cordon.current.visible = puente > 0.001;
    }
  });
  const fase = () => ep.progreso * 70;
  return <>
    <Caja s={[CENTROS[9] + 1.5 - X0, 0.012, 0.09]} p={[(CENTROS[9] + 1.5 + X0) / 2, 0.006, 1.62]} m={MATERIAL.tapete} r={0.004} sombra={false} />
    <mesh ref={traza} position={[X0, 0.014, 1.62]} material={TRAZA}><boxGeometry args={[1, 0.004, 0.022]} /></mesh>
    {CENTROS.map((x, i) => <mesh key={i} position={[x + (i === 8 ? -0.3 : i === 9 ? 0.3 : 0), 0.016, 1.62]} material={hitos[i]}><boxGeometry args={[0.07, 0.008, 0.07]} /></mesh>)}
    {/* 01→02, 02→03, 03→04: transporte neumático en ductos transparentes */}
    <Ruta id="ruta-1-2" pts={RUTA_1_2} lite={lite} estado={() => [fase(), lineal(ep.f01, 0.84, 0.97), lineal(ep.f02, 0.3, 0.45)] as const} />
    <Ruta id="ruta-2-3" pts={RUTA_2_3} lite={lite} estado={() => [fase(), lineal(ep.f02, 0.84, 0.97), lineal(ep.f03, 0.3, 0.45)] as const} />
    <Ruta id="ruta-3-4" pts={RUTA_3_4} lite={lite} mezcla estado={() => [fase(), lineal(ep.f03, 0.84, 0.97), lineal(ep.f04, 0.3, 0.45)] as const} />
    {/* 04→05: el cordón cruza entre la boquilla y la peletizadora */}
    <group ref={cordon} position={[CENTROS[3] + 2.2, BY, 0]}>
      <mesh position={[(CENTROS[4] - 2.2 - CENTROS[3] - 2.2) / 2, 0, 0]} rotation={EJE_X} material={MATERIAL.cordon}>
        <cylinderGeometry args={[0.03, 0.03, CENTROS[4] - 2.2 - CENTROS[3] - 2.2, 12]} />
      </mesh>
    </group>
    <group position={[(CENTROS[3] + CENTROS[4]) / 2, 0, 0]}>
      <Caja s={[0.06, BY - 0.05, 0.06]} p={[0, (BY - 0.05) / 2, -0.1]} m={MATERIAL.acero} r={0.006} />
      <Cil p={[0, BY - 0.07, 0]} r={0.035} l={0.2} m={MATERIAL.cromo} rot={EJE_Z} seg={12} />
      <Cil p={[0, 0.012, -0.1]} r={0.06} l={0.024} m={MATERIAL.aceroOscuro} seg={12} />
    </group>
    {/* 05→06: pasarela y carro de compuesto */}
    <Caja s={[CENTROS[5] - CENTROS[4] - 4.4 + 0.02, Y0 - 0.03, 0.9]} p={[(CENTROS[4] + CENTROS[5]) / 2, (Y0 - 0.03) / 2, 0.62]} m={MATERIAL.mesa} r={0.01} />
    <CarroCompuesto lite={lite} />
    {/* 06→07→08: transportadores de rodillos y molde del soporte */}
    <Rodillos x0={CENTROS[5] + 1.85} x1={CENTROS[6] - 0.82} giro={() => tramo(ep.progreso, INICIOS[6] - 0.022, INICIOS[6] + 0.005)} />
    <Rodillos x0={CENTROS[6] + 0.82} x1={CENTROS[7] - 1.95} giro={() => tramo(ep.progreso, INICIOS[7] - 0.008, INICIOS[7] + 0.01)} />
    <MoldeViajero lite={lite} />
  </>;
}

/** Diez estaciones conceptuales basadas en los tipos de equipo del documento técnico. */
export function EstacionesProcesoOficial({ lite }: { lite: boolean }) {
  return <group>
    <Estacion i={0}><Recepcion lite={lite} /></Estacion>
    <Estacion i={1}><Secado lite={lite} /></Estacion>
    <Estacion i={2}><Dosificacion lite={lite} /></Estacion>
    <Estacion i={3}><Extrusora lite={lite} /></Estacion>
    <Estacion i={4}><Peletizadora lite={lite} /></Estacion>
    <Estacion i={5}><MoldesAcero lite={lite} /></Estacion>
    <Estacion i={6} w={3.9} d={2.0}><Prensa /></Estacion>
    <Estacion i={7}><Enfriamiento lite={lite} /></Estacion>
    <Estacion i={8} w={4.4} d={2.2}><EstacionBanca lite={lite} /></Estacion>
    <Conexiones lite={lite} />
  </group>;
}
