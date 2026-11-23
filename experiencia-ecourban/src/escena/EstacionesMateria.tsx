import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, LatheGeometry, Object3D, Vector2, Vector3, type Group, type InstancedMesh } from "three";
import { aleatorio } from "./fabricasBanca";
import { caja } from "./geometriasProceso";
import { kitBanca } from "./kitBanca";
import { ep } from "./lineaProceso";
import { MATERIAL } from "./materialesProceso";
import { Mesa } from "./mobiliario";

/** Hitos 00-03: pellets recibidos, maquila externa propuesta, enfriamiento/desmolde/recepcion. */

export { aleatorio };
export const suave = (t: number) => t * t * (3 - 2 * t);
export const tramo = (t: number, a: number, b: number) => suave(Math.min(1, Math.max(0, (t - a) / (b - a))));

// Matices mate de lote: grafito dominante, algunos verdes apagados y pocos claros; sin brillo de confeti.
const TINTES = ["#1d2022", "#26292b", "#2f3335", "#1d2022", "#232628", "#34383a", "#26292b", "#2a2e30", "#1f4a33", "#3d5a4a"].map((c) => new Color(c));

/** Pellet: cilindro corto de cantos redondeados (perfil de revolucion), variado por instancia en escala. */
function usePellets(n: number, lite: boolean) {
  const geo = useMemo(() => {
    const r = 0.0095;
    const h = 0.0105;
    const e = 0.0035;
    const perfil = [new Vector2(0, -h), new Vector2(r - e, -h), new Vector2(r - e * 0.3, -h + e * 0.35), new Vector2(r, -h + e), new Vector2(r, h - e), new Vector2(r - e * 0.3, h - e * 0.35), new Vector2(r - e, h), new Vector2(0, h)];
    return new LatheGeometry(perfil, lite ? 7 : 11);
  }, [lite]);
  const semillas = useMemo(() => {
    const r = aleatorio(7);
    return Array.from({ length: n }, () => ({ a: r(), b: r(), c: r(), d: r(), e: r(), t: Math.floor(r() * TINTES.length) }));
  }, [n]);
  return { geo, semillas };
}

export function Pellets({
  n,
  lite,
  escribir,
  semilla,
  activo,
  clave,
}: {
  n: number;
  lite: boolean;
  semilla: number;
  escribir: (d: Object3D, i: number, s: ReturnType<typeof usePellets>["semillas"][number], i2: number) => boolean;
  activo?: () => boolean;
  clave?: () => number;
}) {
  const malla = useRef<InstancedMesh>(null);
  const { geo, semillas } = usePellets(n, lite);
  const dummy = useMemo(() => new Object3D(), []);
  const variacion = useMemo(() => new Vector3(), []);
  const ultimaClave = useRef<number | null>(null);
  void semilla;
  useEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => {
    const m = malla.current;
    if (!m) return;
    semillas.forEach((s, i) => m.setColorAt(i, TINTES[s.t]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [semillas]);
  useFrame(() => {
    const m = malla.current;
    if (!m) return;
    if (activo && !activo()) {
      if (m.visible) m.visible = false;
      return;
    }
    if (!m.visible) m.visible = true;
    const k = clave?.();
    if (k !== undefined && k === ultimaClave.current) return;
    if (k !== undefined) ultimaClave.current = k;
    semillas.forEach((s, i) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      const ok = escribir(dummy, i, s, i);
      if (!ok) dummy.scale.set(0, 0, 0);
      else dummy.scale.multiply(variacion.set(0.82 + s.c * 0.3, 0.7 + s.a * 0.45, 0.82 + s.b * 0.3));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={malla} args={[geo, MATERIAL.pellet, n]} frustumCulled={false} castShadow={!lite} />;
}

/* ---------- 01 Recepcion ---------- */

const X_BANDEJA = 3.5;
export const X_MAQ = 7.9;

export function Recepcion({ lite }: { lite: boolean }) {
  const cuchara = useRef<Group>(null);
  const nPila = lite ? 380 : 1500;
  const nFlujo = lite ? 50 : 110;
  const pila = useMemo(() => {
    const r = aleatorio(31);
    const pts = Array.from({ length: nPila }, () => {
      const x = (r() - 0.5) * 1.08;
      const z = (r() - 0.5) * 0.68;
      const mont = Math.exp(-(x * x) / 0.28 - (z * z) / 0.1);
      return { x, z, y: 0.575 + mont * 0.09 * (0.3 + r() * 0.9) + r() * 0.02, rx: r() * 6.28, ry: r() * 6.28, rz: r() * 6.28 };
    });
    pts.sort((a, b) => a.y - b.y);
    return pts;
  }, [nPila]);

  useFrame(() => {
    const g = cuchara.current;
    if (!g) return;
    const c = tramo(ep.cuchara, 0, 1);
    g.position.set(X_BANDEJA - 0.42, 1.18 + (1 - c) * 0.9, 0);
    g.rotation.z = -0.2 - 0.55 * tramo(ep.caida, 0, 0.12);
    g.visible = c > 0.001;
  });

  return (
    <group>
      <Mesa x={X_BANDEJA} ancho={1.5} fondo={0.9} alto={0.5} lite={lite} />
      {/* bandeja de recepcion generica: fondo, paredes con borde enrollado y forro oscuro */}
      <group position={[X_BANDEJA, 0.52, 0]}>
        <mesh geometry={caja(1.2, 0.02, 0.76, 0.008, lite)} material={MATERIAL.acero} position={[0, 0.01, 0]} receiveShadow />
        <mesh geometry={caja(1.12, 0.004, 0.68, 0.002, lite)} material={MATERIAL.moldeOscuro} position={[0, 0.022, 0]} receiveShadow />
        {[-1, 1].map((s) => (
          <group key={`z${s}`} position={[0, 0, s * 0.38]}>
            <mesh geometry={caja(1.2, 0.1, 0.02, 0.006, lite)} material={MATERIAL.acero} position={[0, 0.06, 0]} castShadow />
            <mesh material={MATERIAL.cromo} position={[0, 0.112, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.011, 0.011, 1.2, lite ? 8 : 12]} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((s) => (
          <group key={`x${s}`} position={[s * 0.6, 0, 0]}>
            <mesh geometry={caja(0.02, 0.1, 0.76, 0.006, lite)} material={MATERIAL.acero} position={[0, 0.06, 0]} castShadow />
            <mesh material={MATERIAL.cromo} position={[0, 0.112, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.76, lite ? 8 : 12]} />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[X_BANDEJA, 0, 0]}>
        <Pellets
          n={nPila}
          lite={lite}
          semilla={1}
          activo={() => ep.llenado > 0.005 && Math.abs(ep.tx - X_BANDEJA) < 6.5}
          clave={() => ep.llenado}
          escribir={(d, i) => {
            // Los pellets reservados para la animacion forman la capa superior
            // y se representan en el flujo, para que puedan salir de la pila.
            if (i >= nPila - nFlujo) return false;
            const p = pila[i];
            const rango = i / nPila;
            const s = tramo(ep.llenado * 1.12, rango * 0.85, rango * 0.85 + 0.12);
            if (s < 0.01) return false;
            d.position.set(p.x, p.y, p.z);
            d.rotation.set(p.rx, p.ry, p.rz);
            d.scale.setScalar(s);
            return true;
          }}
        />
        <Pellets
          n={nFlujo}
          lite={lite}
          semilla={2}
          activo={() => (ep.caida > 0.005 || ep.traslado > 0.005) && Math.abs(ep.tx - 5.2) < 7}
          clave={() => ep.caida + ep.traslado * 2}
          escribir={(d, i, s) => {
            // Cada pellet cae una sola vez, aterriza en su posicion de la pila,
            // permanece ahi y despues sale escalonadamente hacia la banda.
            const p = pila[nPila - nFlujo + i];
            const inicioCaida = 0.12 + s.a * 0.53;
            const caida = Math.max(0, Math.min(1, (ep.caida - inicioCaida) / 0.35));
            if (ep.caida < inicioCaida) return false;

            const espera = (i / nFlujo) * 0.34;
            const avance = Math.max(0, Math.min(1, (ep.traslado - espera) / 0.66));
            if (ep.traslado > espera && avance >= 1) return false;

            // Nacen en el labio de vertido de la cuchara, ya inclinada sobre la bandeja.
            const xInicio = -0.18 + s.b * 0.06;
            const yInicio = 0.9 + s.c * 0.03;
            const zInicio = (s.d - 0.5) * 0.12;
            const zBanda = (s.e - 0.5) * 0.2;
            const caidaSuave = suave(caida);
            let x = X_BANDEJA + xInicio + (p.x - xInicio) * caidaSuave;
            const nivelLlenado = Math.min(1, ep.llenado * 1.3);
            const yAterrizaje = 0.56 + (p.y - 0.56) * nivelLlenado;
            let y = yInicio + (yAterrizaje - yInicio) * caidaSuave;
            let z = zInicio + (p.z - zInicio) * caidaSuave;

            if (ep.traslado > espera) {
              const t = suave(avance);
              if (avance < 0.22) {
                const u = suave(avance / 0.22);
                x = 3.5 + p.x + (4.5 - (3.5 + p.x)) * u;
                y = p.y + (0.81 - p.y) * u + Math.sin(Math.PI * u) * 0.1;
                z = p.z + (zBanda - p.z) * u;
              } else if (avance < 0.92) {
                const u = (avance - 0.22) / 0.7;
                x = 4.5 + u * 2.35;
                y = 0.81 + u * 0.86 + Math.sin(Math.PI * u) * 0.012;
                z = zBanda;
              } else {
                const u = suave((avance - 0.92) / 0.08);
                x = 6.85 + u * 0.3;
                y = 1.67 - u * 0.33 - Math.sin(Math.PI * u) * 0.08;
                z = zBanda * (1 - u);
              }
              d.rotation.set(p.rx + t * 7, p.ry + t * 9, p.rz + t * 12);
            } else {
              d.rotation.set(p.rx + caidaSuave * 5, p.ry + caidaSuave * 6, p.rz + caidaSuave * 8);
            }

            d.position.set(x - X_BANDEJA, y, z);
            return true;
          }}
        />
      </group>
      {/* cuchara generica que vierte los pellets: caja redondeada, mango y borde */}
      <group ref={cuchara} visible={false} scale={0.8}>
        <mesh geometry={caja(0.62, 0.016, 0.4, 0.006, lite)} material={MATERIAL.acero} position={[0.18, -0.04, 0]} castShadow />
        <mesh geometry={caja(0.62, 0.11, 0.016, 0.006, lite)} material={MATERIAL.acero} position={[0.18, 0.02, 0.2]} />
        <mesh geometry={caja(0.62, 0.11, 0.016, 0.006, lite)} material={MATERIAL.acero} position={[0.18, 0.02, -0.2]} />
        <mesh geometry={caja(0.016, 0.11, 0.4, 0.006, lite)} material={MATERIAL.acero} position={[-0.12, 0.02, 0]} />
        <mesh material={MATERIAL.aceroOscuro} position={[-0.38, 0.08, 0]} rotation={[0, 0, 0.35]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, lite ? 8 : 14]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 03 Enfriamiento, desmolde y recepcion ---------- */

const X_RACK = 9.7;
const X_RECEPCION = 11.6;

/** Piezas conceptuales: tres listones cortos y un soporte verde (representativas, sin medidas). */
const PIEZAS: { w: number; h: number; z: number; verde?: boolean }[] = [
  { w: 0.8, h: 0.05, z: -0.22 },
  { w: 0.8, h: 0.05, z: -0.04 },
  { w: 0.8, h: 0.05, z: 0.14 },
  { w: 0.3, h: 0.2, z: 0.32, verde: true },
];

export function Desmolde({ lite }: { lite: boolean }) {
  const k = kitBanca(lite);
  const piezas = useRef<(Group | null)[]>([]);
  const aspas = useRef<Group>(null);

  useFrame(() => {
    piezas.current.forEach((g, i) => {
      if (!g) return;
      const s = tramo(ep.salida, i * 0.12, 0.5 + i * 0.12);
      const t2 = tramo(ep.traslado2, i * 0.08, 0.7 + i * 0.08);
      const alto = PIEZAS[i].h / 2;
      const yCaida = 0.9 - 0.9 * s * s;
      const yRack = 0.5 + alto + 0.1;
      const yMesa = 0.5 + alto + 0.045;
      const y = Math.max(yRack, yCaida + 0.1) * (1 - t2) + yMesa * t2;
      g.position.set(
        X_MAQ + 1.05 + (X_RACK - X_MAQ - 1.05) * s + (X_RECEPCION - X_RACK) * t2,
        s < 0.02 ? 0.7 : y,
        PIEZAS[i].z,
      );
      g.visible = s > 0.01;
    });
    if (aspas.current) aspas.current.rotation.z = ep.fan * 38;
  });

  return (
    <group>
      {/* rampa de salida generica con guias laterales */}
      <group position={[X_MAQ + 1.12, 0.62, 0]} rotation={[0, 0, -0.35]}>
        <mesh geometry={caja(0.5, 0.025, 0.8, 0.008, lite)} material={MATERIAL.acero} receiveShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={caja(0.5, 0.04, 0.016, 0.005, lite)} material={MATERIAL.maquinaClara} position={[0, 0.028, s * 0.392]} />
        ))}
      </group>
      <mesh material={MATERIAL.tapete} position={[X_RACK, 0.004, 0]} receiveShadow><boxGeometry args={[1.6, 0.008, 1.3]} /></mesh>
      <Mesa x={X_RACK} ancho={1.1} fondo={0.9} alto={0.5} lite={lite} />
      {/* ventilador generico de enfriamiento: poste, aro, buje y aspas */}
      <group position={[X_RACK, 0.95, -0.62]}>
        <mesh material={MATERIAL.aceroOscuro} position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, lite ? 8 : 12]} />
        </mesh>
        <mesh material={MATERIAL.maquina}>
          <torusGeometry args={[0.2, 0.018, 8, lite ? 20 : 32]} />
        </mesh>
        <mesh material={MATERIAL.aceroOscuro} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.04, lite ? 10 : 16]} />
        </mesh>
        <group ref={aspas}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={caja(0.07, 0.17, 0.008, 0.003, lite)} material={MATERIAL.maquinaClara} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[-Math.sin((i * Math.PI * 2) / 3) * 0.1, Math.cos((i * Math.PI * 2) / 3) * 0.1, 0]} />
          ))}
        </group>
      </group>
      <mesh material={MATERIAL.tapete} position={[X_RECEPCION, 0.004, 0]} receiveShadow><boxGeometry args={[2.1, 0.008, 1.4]} /></mesh>
      <Mesa x={X_RECEPCION} ancho={1.6} fondo={0.95} alto={0.5} lite={lite} />
      <mesh geometry={caja(1.5, 0.006, 0.85, 0.002, lite)} material={MATERIAL.tapete} position={[X_RECEPCION, 0.525, 0]} receiveShadow />
      {PIEZAS.map((p, i) => (
        <group key={i} ref={(g) => { piezas.current[i] = g; }} visible={false}>
          {p.verde ? (
            <mesh geometry={k.geoSoporte} material={k.mat.soportes[0]} scale={0.45} position={[0, -p.h / 2, 0]} castShadow receiveShadow />
          ) : (
            <mesh geometry={k.liston(p.w)} material={k.mat.asiento[i + 1]} castShadow receiveShadow />
          )}
        </group>
      ))}
    </group>
  );
}
