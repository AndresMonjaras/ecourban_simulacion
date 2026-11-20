import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, DoubleSide, MeshBasicMaterial, Object3D, type Group, type InstancedMesh, type Mesh } from "three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BancaProceso } from "./BancaProceso";
import { aleatorio, tramo } from "./EstacionesMateria";
import { caja, discoDentado, llaveGeo } from "./geometriasProceso";
import { kitBanca } from "./kitBanca";
import { ep } from "./lineaProceso";
import { MATERIAL } from "./materialesProceso";
import { BandejaTornillos, Mesa } from "./mobiliario";

/** Hitos 04-06: corte/perforado/acabado, ensamble, inspeccion final, empaque y salida (todo propuesto, generico). */

const X_TALLER = 14.6;
const Y_MESA = 0.55;
const Y_LISTON = Y_MESA + 0.025;
const X_BANCA = 19;
const XT_CORTE = 0.5; // posicion relativa del corte
const HUECOS = [-0.5, 0.05];

const tri = (t: number, a: number, b: number, c: number) => tramo(t, a, b) - tramo(t, b, c);

/** Virutas y polvo discretos: posiciones fijas por semilla; solo su escala depende del progreso. */
function Virutas({ lite }: { lite: boolean }) {
  const malla = useRef<InstancedMesh>(null);
  const n = lite ? 16 : 40;
  const dummy = useMemo(() => new Object3D(), []);
  const datos = useMemo(() => {
    const r = aleatorio(211);
    return Array.from({ length: n }, (_, i) => {
      const corte = i % 2 === 0;
      return {
        x: corte ? XT_CORTE + (r() - 0.35) * 0.34 : HUECOS[(i >> 1) % 2] + (r() - 0.5) * 0.12,
        z: corte ? (r() - 0.5) * 0.5 : (r() - 0.5) * 0.18,
        ry: r() * 6.28,
        k: 0.5 + r() * 0.9,
        corte,
        hueco: (i >> 1) % 2,
        t0: r() * 0.4,
      };
    });
  }, [n]);
  useLayoutEffect(() => {
    const m = malla.current;
    if (m) m.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    const m = malla.current;
    if (!m) return;
    datos.forEach((d, i) => {
      const f = d.corte ? tramo(ep.sierra, 0.45 + d.t0 * 0.3, 0.7 + d.t0 * 0.3) : tramo(ep.taladro, d.hueco === 0 ? 0.15 + d.t0 * 0.1 : 0.7 + d.t0 * 0.1, d.hueco === 0 ? 0.3 : 0.85);
      dummy.position.set(d.x, Y_MESA + 0.004, d.z);
      dummy.rotation.set(0, d.ry, 0);
      dummy.scale.setScalar(Math.max(0.0001, f * d.k));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={malla} args={[caja(0.014, 0.004, 0.007, 0.0015, lite), MATERIAL.viruta, n]} frustumCulled={false} />;
}

/* ---------- 04 Corte, perforado y acabado ---------- */

function Preparacion({ lite }: { lite: boolean }) {
  const k = kitBanca(lite);
  // En vertical el perfil (protagonista) se engrosa y se omite el tablero de herramientas para ganar legibilidad.
  const vert = useThree((st) => st.size.width < st.size.height);
  const sy = vert ? 2.2 : 1;
  const sz = vert ? 1.9 : 1;
  const YL = Y_MESA + 0.025 * sy;
  const cb = (w: number, h: number, d: number, r = 0.008) => caja(w, h, d, r, lite);
  const seg = lite ? 10 : 18;
  const sierra = useRef<Group>(null);
  const disco = useRef<Group>(null);
  const resto = useRef<Group>(null);
  const carro = useRef<Group>(null);
  const broca = useRef<Group>(null);
  const hoyo = useRef<(Group | null)[]>([]);
  const bloque = useRef<Group>(null);
  const filo = useRef<Mesh>(null);

  useFrame(() => {
    // corte
    const pc = tramo(ep.sierra, 0, 0.4) - tramo(ep.sierra, 0.7, 1);
    if (sierra.current) sierra.current.position.y = 1.1 - pc * 0.46;
    if (disco.current) disco.current.rotation.z = ep.sierra * 60;
    if (resto.current) {
      const m = tramo(ep.sierra, 0.55, 0.95);
      resto.current.position.x = XT_CORTE + 0.14 + m * 0.2;
      resto.current.position.z = m * 0.12;
      resto.current.rotation.y = m * 0.25;
    }
    // perforado guiado
    const pl = Math.max(tri(ep.taladro, 0.05, 0.2, 0.35), tri(ep.taladro, 0.6, 0.75, 0.9));
    const hx = HUECOS[0] + (HUECOS[1] - HUECOS[0]) * tramo(ep.taladro, 0.4, 0.55);
    if (carro.current) carro.current.position.x = hx;
    if (broca.current) broca.current.position.y = 0.98 - pl * 0.32;
    hoyo.current.forEach((h, i) => {
      if (h) h.visible = ep.taladro > (i === 0 ? 0.2 : 0.75);
    });
    // acabado de borde
    if (bloque.current) {
      const l = ep.lija;
      bloque.current.position.x = -0.7 + 1.15 * l;
      bloque.current.position.y = YL + 0.052 * sy + 0.004 * Math.sin(l * 70);
      bloque.current.visible = l > 0.001 && l < 0.999;
    }
    if (filo.current) {
      filo.current.scale.x = Math.max(0.001, ep.lija);
      filo.current.position.x = -0.78 + (1.28 * ep.lija) / 2 + 0.0;
    }
  });

  const guardaSierra = useMemo(() => ({ rot: [0, 0, Math.PI / 2] as [number, number, number] }), []);
  return (
    <group position={[X_TALLER, 0, 0]}>
      <mesh material={MATERIAL.tapete} position={[0, 0.004, 0]} receiveShadow><boxGeometry args={[3.2, 0.008, 1.7]} /></mesh>
      <Mesa x={0} ancho={2.2} fondo={0.9} alto={Y_MESA} lite={lite} />
      <mesh geometry={cb(2.1, 0.012, 0.8, 0.004)} material={MATERIAL.superficie} position={[0, Y_MESA + 0.006 - 0.0005, 0]} receiveShadow />
      {/* perfil conceptual: mismo perfil redondeado y textura del asiento; parte principal + sobrante tras el corte */}
      <mesh geometry={k.liston(XT_CORTE + 0.78)} material={k.mat.asiento[1]} position={[(-0.78 + XT_CORTE) / 2, YL, 0]} scale={[1, sy, sz]} castShadow receiveShadow />
      <mesh geometry={cb(0.004, 0.044, 0.082, 0.0015)} material={MATERIAL.corte} position={[XT_CORTE + 0.002, YL, 0]} scale={[1, sy, sz]} />
      <mesh ref={filo} material={MATERIAL.borde} position={[-0.78, YL, 0.0455 * sz]} scale={[0.001, sy, 1]}>
        <boxGeometry args={[1.28, 0.03, 0.003]} />
      </mesh>
      {HUECOS.map((hx, i) => (
        <group key={i} ref={(m) => { hoyo.current[i] = m; }} position={[hx, YL + 0.0252 * sy, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <mesh material={MATERIAL.corte}>
            <ringGeometry args={[0.013, 0.019, 18]} />
          </mesh>
          <mesh material={MATERIAL.hueco} position={[0, 0, 0.0004]}>
            <circleGeometry args={[0.0135, 16]} />
          </mesh>
        </group>
      ))}
      <group ref={resto} position={[XT_CORTE + 0.14, YL, 0]} scale={[1, sy, sz]}>
        <mesh geometry={k.liston(0.28)} material={k.mat.asiento[2]} castShadow receiveShadow />
        <mesh geometry={cb(0.004, 0.044, 0.082, 0.0015)} material={MATERIAL.corte} position={[-0.142, 0, 0]} />
      </group>
      {vert && (
        <mesh geometry={cb(0.006, 0.004, 0.16, 0.001)} material={MATERIAL.guia} position={[XT_CORTE - 0.01, YL + 0.025 * sy + 0.004, 0]} />
      )}
      <Virutas lite={lite} />
      {/* tope guia: riel de aluminio con ranura y topes ajustables */}
      <group position={[0, Y_MESA + 0.045, vert ? -0.11 : -0.078]}>
        <mesh geometry={cb(1.7, 0.05, 0.03, 0.006)} material={MATERIAL.maquinaClara} castShadow />
        <mesh geometry={cb(1.62, 0.012, 0.004, 0.0015)} material={MATERIAL.hueco} position={[0, 0.005, 0.0155]} />
        {[-0.62, 0.12].map((x) => (
          <group key={x} position={[x, 0.005, 0.03]}>
            <mesh geometry={cb(0.06, 0.07, 0.04, 0.007)} material={MATERIAL.aceroOscuro} castShadow />
            <mesh material={MATERIAL.maquina} position={[0, 0.058, 0]}>
              <cylinderGeometry args={[0.017, 0.017, 0.03, 10]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* sierra generica de inglete: base, plato, columna, brazo con motor, asa, hoja dentada y guarda */}
      <group position={[XT_CORTE, 0, 0]}>
        <mesh geometry={cb(0.46, 0.06, 0.46, 0.014)} material={MATERIAL.maquina} position={[0, Y_MESA + 0.03, -0.35]} castShadow receiveShadow />
        <mesh material={MATERIAL.maquinaClara} position={[0, Y_MESA + 0.07, -0.34]} castShadow>
          <cylinderGeometry args={[0.18, 0.19, 0.025, seg + 8]} />
        </mesh>
        <mesh geometry={cb(0.1, 0.66, 0.08, 0.012)} material={MATERIAL.maquina} position={[0, 0.93, -0.52]} castShadow />
        <mesh geometry={cb(0.14, 0.1, 0.12, 0.014)} material={MATERIAL.aceroOscuro} position={[0, 1.27, -0.5]} castShadow />
        <group ref={sierra} position={[0, 1.1, 0]}>
          <mesh geometry={cb(0.12, 0.1, 0.44, 0.014)} material={MATERIAL.maquina} position={[0, 0.1, -0.27]} castShadow />
          <mesh material={MATERIAL.maquinaPanel} position={[0.0, 0.16, -0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.18, seg]} />
          </mesh>
          <mesh geometry={cb(0.14, 0.2, 0.13, 0.016)} material={MATERIAL.maquinaPanel} position={[0, 0.02, -0.03]} castShadow />
          <mesh geometry={cb(0.025, 0.05, 0.16, 0.008)} material={MATERIAL.maquina} position={[0, 0.2, -0.28]} castShadow />
          <mesh material={MATERIAL.maquina} position={[0, 0.2, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.16, 10]} />
          </mesh>
          <group position={[0, -0.04, 0.03]}>
            <mesh material={MATERIAL.acrilico} rotation={guardaSierra.rot}>
              <cylinderGeometry args={[0.14, 0.14, 0.05, seg + 10, 1, true, 0, Math.PI]} />
            </mesh>
            <group ref={disco} rotation={[0, Math.PI / 2, 0]}>
              <mesh geometry={discoDentado(0.12, lite ? 26 : 48, lite)} material={MATERIAL.acero} castShadow />
              <mesh material={MATERIAL.aceroOscuro} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.012, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {/* portico de perforado guiado: columnas sobre la mesa, viga de aluminio y carro */}
      <mesh geometry={cb(2.0, 0.07, 0.06, 0.01)} material={MATERIAL.maquinaClara} position={[0, 1.28, -0.3]} castShadow />
      <mesh geometry={cb(1.94, 0.012, 0.004, 0.002)} material={MATERIAL.hueco} position={[0, 1.28, -0.268]} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.0, 0, -0.3]}>
          <mesh geometry={cb(0.07, 0.75, 0.07, 0.01)} material={MATERIAL.maquina} position={[0, (Y_MESA + 1.3) / 2, 0]} castShadow />
          <mesh geometry={cb(0.18, 0.02, 0.2, 0.006)} material={MATERIAL.aceroOscuro} position={[0, Y_MESA + 0.01, 0]} />
        </group>
      ))}
      <group ref={carro} position={[HUECOS[0], 0, -0.3]}>
        <mesh geometry={cb(0.18, 0.15, 0.1, 0.014)} material={MATERIAL.aceroOscuro} position={[0, 1.24, 0]} castShadow />
        <mesh geometry={cb(0.1, 0.06, 0.3, 0.01)} material={MATERIAL.maquinaClara} position={[0, 1.2, 0.15]} castShadow />
        <mesh geometry={cb(0.1, 0.12, 0.1, 0.014)} material={MATERIAL.maquinaPanel} position={[0, 1.15, 0.3]} castShadow />
        <group ref={broca} position={[0, 0.98, 0.3]}>
          <mesh material={MATERIAL.maquina} position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.12, seg]} />
          </mesh>
          <mesh material={MATERIAL.cromo} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.022, 0.026, 0.04, seg]} />
          </mesh>
          <mesh material={MATERIAL.acero} position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.14, 8]} />
          </mesh>
          <mesh material={MATERIAL.acrilico} position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.1, seg, 1, true]} />
          </mesh>
        </group>
      </group>
      {/* taco de lija: bloque redondeado */}
      <group ref={bloque} position={[-0.7, YL + 0.052 * sy, 0.07]} visible={false}>
        <mesh geometry={cb(0.12, 0.045, 0.07, 0.012)} material={MATERIAL.maquina} position={[0, 0.0, 0]} castShadow />
        <mesh geometry={cb(0.12, 0.008, 0.07, 0.002)} material={MATERIAL.lija} position={[0, -0.024, 0]} />
      </group>
      <BandejaTornillos x={0.85} z={0.3} y={Y_MESA - 0.02} lite={lite} />
      {!vert && (
        <>
      {/* panel de herramientas genericas: tablero, rieles y llaves */}
      <mesh geometry={cb(1.5, 0.7, 0.04, 0.008)} material={MATERIAL.mesa} position={[-0.6, 0.95, -0.75]} receiveShadow />
      <mesh geometry={cb(1.42, 0.02, 0.025, 0.005)} material={MATERIAL.maquinaClara} position={[-0.6, 1.2, -0.72]} />
      {[-1.05, -0.85, -0.65, -0.45, -0.25].map((x, i) => (
        <mesh key={x} geometry={llaveGeo(0.26 + i * 0.02)} material={MATERIAL.acero} position={[x, 1.19, -0.71]} rotation={[0, 0, Math.PI + 0.03 * i]} castShadow />
      ))}
        </>
      )}
    </group>
  );
}

/* ---------- 05-06 Ensamble, inspeccion, empaque y salida ---------- */

function crearBarrido() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 4;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, "rgba(143,230,182,0)");
  gr.addColorStop(0.5, "rgba(143,230,182,0.9)");
  gr.addColorStop(1, "rgba(143,230,182,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 4);
  return new CanvasTexture(c);
}

/** Cota/guia visual: barra fina con marcas en los extremos (sin cifras). */
function Guia({ largo, vertical = false, y = 0, x = 0, z = 0, marcas = 0.1 }: { largo: number; vertical?: boolean; x?: number; y?: number; z?: number; marcas?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, 0, vertical ? Math.PI / 2 : 0]}>
      <mesh material={MATERIAL.guia} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0035, 0.0035, largo, 6]} />
      </mesh>
      {marcas > 0 &&
        [-1, 1].map((s) => (
          <mesh key={s} material={MATERIAL.guia} position={[s * largo / 2, 0, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, marcas, 6]} />
          </mesh>
        ))}
    </group>
  );
}

function Armado({ lite }: { lite: boolean }) {
  // En vertical la caja se acerca a la banca para que ambas quepan completas.
  const xCaja = useThree((st) => (st.size.width < st.size.height ? 1.62 : 2.1));
  const cb = (w: number, h: number, d: number, r = 0.008) => caja(w, h, d, r, lite);
  const dim = useRef<Group>(null);
  const ali = useRef<Group>(null);
  const barrido = useRef<Mesh>(null);
  const pelicula = useRef<Group>(null);
  const caja_ = useRef<Group>(null);
  const texBarrido = useMemo(crearBarrido, []);
  const matBarrido = useMemo(
    () => new MeshBasicMaterial({ map: texBarrido, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
    [texBarrido],
  );
  useEffect(() => () => { texBarrido.dispose(); matBarrido.dispose(); }, [texBarrido, matBarrido]);

  useFrame(() => {
    if (dim.current) {
      dim.current.scale.set(Math.max(0.001, ep.revDim), 1, 1);
      dim.current.visible = ep.revDim > 0.002;
    }
    if (ali.current) {
      ali.current.scale.set(1, Math.max(0.001, ep.revAli), 1);
      ali.current.visible = ep.revAli > 0.002;
    }
    if (barrido.current) {
      const a = ep.revAca;
      barrido.current.position.x = -1.1 + 2.2 * a;
      barrido.current.visible = a > 0.002 && a < 0.998;
      matBarrido.opacity = 0.45 * Math.sin(Math.PI * a);
    }
    const e = ep.empaque;
    if (pelicula.current) {
      pelicula.current.scale.set(1, Math.max(0.001, e), 1);
      pelicula.current.position.y = 0.0;
      pelicula.current.visible = e > 0.002;
    }
    if (caja_.current) {
      const c = ep.caja;
      caja_.current.position.x = xCaja - (1 - c) * 0.9;
      caja_.current.scale.set(Math.max(0.001, c), Math.max(0.001, c), Math.max(0.001, c));
      caja_.current.visible = c > 0.002;
    }
  });

  return (
    <group position={[X_BANCA, 0, 0]}>
      <mesh geometry={cb(4.8, 0.008, 2.0, 0.003)} material={MATERIAL.tapete} position={[0.8, 0.004, 0]} receiveShadow />
      {/* guias de inspeccion: dimension, alineacion y acabado (sin cifras) */}
      <group ref={dim} position={[0, 1.06, 0.12]} visible={false}>
        <Guia largo={1.86} marcas={0.1} />
        {[-1, 1].map((s) => (
          <mesh key={s} material={MATERIAL.guia} position={[s * 0.93 + -s * 0.0, 0, 0]}>
            <sphereGeometry args={[0.012, 8, 6]} />
          </mesh>
        ))}
      </group>
      <group ref={ali} position={[0, 0, 0.42]} visible={false}>
        {[-1, 1].flatMap((sx) =>
          [0.0, 0.94].map((y) => (
            <group key={`${sx}${y}`} position={[sx * 0.96, y, 0]}>
              <Guia largo={0.14} x={-sx * 0.07} marcas={0} />
              <Guia largo={0.14} y={y === 0 ? 0.07 : -0.07} vertical marcas={0} />
            </group>
          )),
        )}
      </group>
      <mesh ref={barrido} material={matBarrido} position={[-1.1, 0.5, 0.33]} visible={false}>
        <planeGeometry args={[0.55, 1.0]} />
      </mesh>
      {/* proteccion de empaque: pelicula translucida con esquineros */}
      <group ref={pelicula} visible={false}>
        <mesh geometry={cb(2.0, 1.0, 0.78, 0.05)} material={MATERIAL.pelicula} position={[0, 0.5, 0.02]} />
      </group>
      {/* zona de salida generica: tarima y caja con cinta, sin etiquetas */}
      <group ref={caja_} position={[xCaja, 0, 0]} visible={false}>
        {[-0.3, -0.15, 0, 0.15, 0.3].map((z) => (
          <mesh key={z} geometry={cb(1.1, 0.022, 0.11, 0.005)} material={MATERIAL.madera} position={[0, 0.115, z]} castShadow receiveShadow />
        ))}
        {[-0.45, 0, 0.45].map((x) => (
          <mesh key={x} geometry={cb(0.1, 0.1, 0.8, 0.008)} material={MATERIAL.madera} position={[x, 0.05, 0]} castShadow />
        ))}
        <mesh geometry={cb(1.0, 0.6, 0.7, 0.02)} material={MATERIAL.carton} position={[0, 0.42, 0]} castShadow receiveShadow />
        <mesh geometry={cb(0.07, 0.004, 0.702, 0.0015)} material={MATERIAL.cinta} position={[0, 0.722, 0]} />
        <mesh geometry={cb(0.07, 0.3, 0.004, 0.0015)} material={MATERIAL.cinta} position={[0, 0.58, 0.352]} />
      </group>
    </group>
  );
}

export function EstacionesTaller({ lite }: { lite: boolean }) {
  return (
    <>
      <Preparacion lite={lite} />
      <BancaProceso x={X_BANCA} lite={lite} />
      <Armado lite={lite} />
    </>
  );
}
