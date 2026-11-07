import * as React from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import type { Vector3 } from "three";
import type { Mesh, Material } from "three";

type Vista = "frontal" | "lateral" | "superior" | "isometrica";
type Componente = { id: string; nombre: string; tipo: string; dimensiones_mm: number[]; centro_mm: number[] };
type Datos = { caja_general_mm: { dimensiones: number[] }; zona_asiento_mm: number[]; componentes: Componente[] };
type ControlCamara = { target: Vector3; update: () => void };
const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: "frontal", etiqueta: "Frontal" }, { id: "lateral", etiqueta: "Lateral" },
  { id: "superior", etiqueta: "Superior" }, { id: "isometrica", etiqueta: "Isométrica" },
];

function Camara({ vista, reinicio }: { vista: Vista; reinicio: number }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    const posiciones: Record<Vista, [number, number, number]> = {
      frontal: [0, 3.8, 1.1], lateral: [3.8, 0, 1.1], superior: [0, -0.01, 4.5], isometrica: [2.2, 2.8, 2.1],
    };
    camera.up.set(0, 0, 1);
    camera.position.set(...posiciones[vista]);
    camera.lookAt(0, 0, 0.42);
    const orbit = controls as unknown as ControlCamara | null;
    if (orbit) { orbit.target.set(0, 0, 0.42); orbit.update(); }
  }, [camera, controls, reinicio, vista]);
  return null;
}

function Modelo({ cubo, seleccionado, alSeleccionar }: { cubo: boolean; seleccionado: string | null; alSeleccionar: (id: string | null) => void }) {
  const url = cubo ? "/models/cubo.glb" : "/models/prueba002/banca.glb";
  const { scene } = useGLTF(url);
  const modelo = useMemo(() => {
    const copia = scene.clone(true);
    copia.traverse((objeto) => {
      const malla = objeto as Mesh;
      if (!malla.isMesh) return;
      malla.userData.materialOriginal = malla.material;
    });
    return copia;
  }, [scene]);

  useEffect(() => {
    modelo.traverse((objeto) => {
      const malla = objeto as Mesh;
      if (!malla.isMesh) return;
      const id = malla.parent?.name || malla.name;
      const original = malla.userData.materialOriginal as Material | undefined;
      if (original) malla.material = id === seleccionado ? original.clone() : original;
      const material = malla.material as Material & { color?: { set: (color: string) => void }; emissive?: { set: (color: string) => void } };
      if (id === seleccionado && material.color) material.color.set("#ffd166");
    });
  }, [modelo, seleccionado]);

  return <primitive object={modelo} onClick={(evento: { object: { parent?: { name?: string }; name?: string }; stopPropagation: () => void }) => {
    evento.stopPropagation();
    alSeleccionar(cubo ? null : evento.object.parent?.name || evento.object.name || null);
  }} />;
}

function Escena({ vista, reinicio, cubo, seleccionado, alSeleccionar }: { vista: Vista; reinicio: number; cubo: boolean; seleccionado: string | null; alSeleccionar: (id: string | null) => void }) {
  return <Canvas camera={{ position: [2.2, 2.8, 2.1], up: [0, 0, 1], fov: 42, near: 0.01, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
    <color attach="background" args={["#101923"]} />
    <ambientLight intensity={1.6} /><directionalLight position={[2, -3, 4]} intensity={2.4} />
    <Grid position={[0, 0, -0.01]} rotation={[Math.PI/2, 0, 0]} infiniteGrid cellSize={0.1} sectionSize={0.5} fadeDistance={5} cellColor="#334655" sectionColor="#61798b" />
    <axesHelper args={[0.35]} />
    <Suspense fallback={null}><Modelo cubo={cubo} seleccionado={seleccionado} alSeleccionar={alSeleccionar} /></Suspense>
    <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={0.4} maxDistance={10} enablePan enableZoom enableRotate />
    <GizmoHelper alignment="bottom-right" margin={[68, 68]}><GizmoViewport axisColors={["#ef7373", "#72c58a", "#79aef5"]} labelColor="#e9f0f5" /></GizmoHelper>
    <Camara vista={vista} reinicio={reinicio} />
  </Canvas>;
}

function App() {
  const [vista, setVista] = useState<Vista>("isometrica");
  const [reinicio, setReinicio] = useState(0);
  const [cubo, setCubo] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  useEffect(() => { fetch("/models/prueba002/componentes.json").then((r) => r.json()).then(setDatos).catch(() => setDatos(null)); }, []);
  const pieza = datos?.componentes.find((item) => item.id === seleccionado);
  const medidasGenerales = cubo ? [100, 100, 100] : datos?.caja_general_mm.dimensiones;
  const zonaAsiento = datos?.zona_asiento_mm;
  const cambiarVista = (nueva: Vista) => { setVista(nueva); setReinicio((n) => n + 1); };
  return <main className="visor">
    <Escena vista={vista} reinicio={reinicio} cubo={cubo} seleccionado={seleccionado} alSeleccionar={setSeleccionado} />
    <header className="encabezado panel"><div><p className="sobrelinea">BANCA PET · LABORATORIO CAD</p><h1>Prueba 002 <span>·</span> Banca paramétrica</h1></div><div className="estado-modelo"><span className="estado-punto" />GLB local · Z arriba</div></header>
    <section className="herramientas panel"><p className="etiqueta-panel">VISTA</p><div className="botones-vista">{VISTAS.map((item) => <button key={item.id} className={vista === item.id ? "boton-vista activo" : "boton-vista"} aria-pressed={vista === item.id} onClick={() => cambiarVista(item.id)}>{item.etiqueta}</button>)}</div>
      <button className="boton-reset" onClick={() => { setSeleccionado(null); cambiarVista("isometrica"); }}>Restablecer cámara y selección</button>
      <button className="boton-reset" onClick={() => { setCubo(!cubo); setSeleccionado(null); }}>{cubo ? "Ver banca" : "Ver cubo Prueba 001"}</button>
      <p className="ayuda-controles">Arrastra para orbitar · rueda para zoom · botón derecho para paneo</p></section>
    <aside className="datos panel"><p className="etiqueta-panel">{pieza ? "PIEZA SELECCIONADA" : "DIMENSIONES"}</p>
      {pieza ? <><h2>{pieza.nombre}</h2><p className="dimension-principal">{pieza.dimensiones_mm.map((n) => Math.round(n)).join(" × ")} <small>mm</small></p><p className="origen">ID <strong>{pieza.id}</strong></p><button className="boton-reset" onClick={() => setSeleccionado(null)}>Limpiar selección</button></>
        : <><p className="dimension-principal">{medidasGenerales ? medidasGenerales.map((n) => Math.round(n)).join(" × ") : "Cargando"} <small>mm</small></p><div className="lista-dimensiones"><div><span className="eje eje-x">X</span><span>Largo</span><strong>{medidasGenerales ? Math.round(medidasGenerales[0]) : "—"} mm</strong></div><div><span className="eje eje-y">Y</span><span>Profundidad total</span><strong>{medidasGenerales ? Math.round(medidasGenerales[1]) : "—"} mm</strong></div><div><span className="eje eje-z">Z</span><span>Altura</span><strong>{medidasGenerales ? Math.round(medidasGenerales[2]) : "—"} mm</strong></div></div><p className="origen">{cubo ? "Modelo de referencia" : "Zona del asiento"}<strong>{cubo ? "100 × 100 × 100 mm" : zonaAsiento ? `${zonaAsiento[0]} × ${zonaAsiento[1]} mm` : "Cargando datos…"}</strong></p></>}
    </aside>
    <footer className="pie">Unidades CAD: mm <span>·</span> GLB: metros <span>·</span> Selecciona una pieza para ver sus datos</footer>
  </main>;
}
useGLTF.preload("/models/prueba002/banca.glb");
useGLTF.preload("/models/cubo.glb");
export default App;
