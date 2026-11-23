import { StrictMode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Persona } from "../../../../src/escena/Persona";
import { BancaOficial } from "../../../../src/escena/bancaOficial";
import { posePersonaParaProgreso } from "../../../../src/escena/animacionPersona";
import type { PerfilRigPersona } from "../../../../src/escena/perfilRigPersona";
import urlV3 from "../persona-articulada-integrante-v3.glb?url";
import urlV4 from "../../integrante_v4_generado/persona-articulada-integrante-v4.glb?url";

// Copia de PERFIL_ACTION_SUIT (mismo rig Mixamo) con la URL del candidato v3.
const PERFIL_V3: PerfilRigPersona = {
  id: "integrante-v3-visor",
  urlModelo: urlV3,
  rotacionBase: [0, 0, 0],
  escalaAltura: 0.94,
  alturaCaderaReposo: 1.0192,
  offsetY: 0,
  longitudTorsoSuperior: 0.13,
  huesos: {
    cadera: "Hips", columna: "Spine", columnaMedia: "Spine1", pecho: "Spine2", cuello: "Neck", cabeza: "Head",
    hombroIzq: "LeftShoulder", brazoIzq: "LeftArm", antebrazoIzq: "LeftForeArm", manoIzq: "LeftHand",
    hombroDer: "RightShoulder", brazoDer: "RightArm", antebrazoDer: "RightForeArm", manoDer: "RightHand",
    musloIzq: "LeftUpLeg", pantorrillaIzq: "LeftLeg", pieIzq: "LeftFoot",
    musloDer: "RightUpLeg", pantorrillaDer: "RightLeg", pieDer: "RightFoot",
  },
};
const PERFIL_ORIGINAL: PerfilRigPersona = { ...PERFIL_V3, id: "original-visor", urlModelo: "/models/persona-articulada.glb" };
// v4: modelo generado intacto con rig Mixamo ajustado a su pose T; la cadera de reposo es la del rig nuevo (rig_v4.json).
const PERFIL_V4: PerfilRigPersona = { ...PERFIL_V3, id: "integrante-v4-visor", urlModelo: urlV4, alturaCaderaReposo: 0.9795 };
type Modelo = "v4" | "v3" | "original";
const PERFILES: Record<Modelo, PerfilRigPersona> = { v4: PERFIL_V4, v3: PERFIL_V3, original: PERFIL_ORIGINAL };

const DURACION_S = 14;

function Orbita() {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(0, 0.75, 0.3); c.enableDamping = true; c.minDistance = 1.2; c.maxDistance = 9; c.update();
    const f = () => invalidate(); c.addEventListener("change", f);
    let id = 0; const loop = () => { c.update(); id = requestAnimationFrame(loop); }; loop();
    return () => { cancelAnimationFrame(id); c.removeEventListener("change", f); c.dispose(); };
  }, [camera, gl, invalidate]);
  return null;
}

function Reloj({ jugando, progresoRef, onProgreso }: { jugando: boolean; progresoRef: React.MutableRefObject<number>; onProgreso: (p: number) => void }) {
  const acum = useRef(0);
  useFrame((_, dt) => {
    if (!jugando) return;
    progresoRef.current = (progresoRef.current + dt / DURACION_S) % 1.08; // breve pausa sentado al final
    acum.current += dt;
    if (acum.current > 0.1) { acum.current = 0; onProgreso(progresoRef.current); }
  });
  return null;
}

function App() {
  // ?p=0..1 abre en un progreso fijo (pausado); ?modelo=v3|original cambia de modelo
  const qs = new URLSearchParams(location.search);
  const pInicial = qs.has("p") ? Math.min(1, Math.max(0, Number(qs.get("p")))) : 0;
  const [jugando, setJugando] = useState(!qs.has("p"));
  const [p, setP] = useState(pInicial);
  const [modelo, setModelo] = useState<Modelo>((["v3", "original"].includes(qs.get("modelo") ?? "") ? qs.get("modelo") : "v4") as Modelo);
  const progresoRef = useRef(pInicial);
  const obtenerPose = useMemo(() => () => posePersonaParaProgreso(Math.min(progresoRef.current, 1)), []);
  const perfil = PERFILES[modelo];
  const pv = Math.min(p, 1);
  const fase = pv < 0.52 ? "caminando" : pv < 0.72 ? "girando" : pv < 1 ? "sentándose" : "sentado";
  return (
    <main style={{ position: "relative", height: "100%" }}>
      <Canvas shadows camera={{ position: [2.4, 1.5, 3.6], fov: 35 }} dpr={[1, 1.5]} style={{ position: "absolute", inset: 0 }}>
        <color attach="background" args={["#171e1b"]} />
        <hemisphereLight intensity={1.0} color="#e9f6ee" groundColor="#1c211f" />
        <directionalLight position={[2.5, 4.2, 3]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-bias={-0.0004} />
        <directionalLight position={[-3, 0.9, 2]} intensity={0.6} color="#9fb6d8" />
        <directionalLight position={[-2.6, 1.8, -3.2]} intensity={1.2} color="#3fcf93" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial color="#2a332e" roughness={0.95} />
        </mesh>
        <gridHelper args={[14, 56, "#46564c", "#2c3832"]} position={[0, 0.002, 0]} />
        <Suspense fallback={null}>
          <BancaOficial sombras />
          <Persona key={perfil.id} perfil={perfil} obtenerPose={obtenerPose} sombras />
        </Suspense>
        <Reloj jugando={jugando} progresoRef={progresoRef} onProgreso={setP} />
        <Orbita />
      </Canvas>
      <header style={{ position: "absolute", top: 16, left: 20, pointerEvents: "none" }}>
        <strong style={{ fontSize: 18 }}>Integrante EcoUrban · {modelo === "v4" ? "v4 (modelo generado + rig)" : modelo === "v3" ? "v3 (modelo por código)" : "original (traje)"}</strong>
        <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>Visor aislado · animación procedural y banca de la app (solo lectura) · arrastra para orbitar</div>
      </header>
      <footer style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        padding: "10px 14px", border: "1px solid #566158", borderRadius: 10, background: "#111715e6" }}>
        <button onClick={() => setJugando((j) => !j)}>{jugando ? "Pausa" : "Reproducir"}</button>
        <span style={{ minWidth: 150 }}>Progreso {pv.toFixed(2)} · {fase}</span>
        <input aria-label="Progreso de la animación" type="range" min={0} max={1} step={0.005} value={pv} style={{ flex: 1, minWidth: 160 }}
          onChange={(e) => { setJugando(false); progresoRef.current = Number(e.target.value); setP(progresoRef.current); }} />
        <select aria-label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value as Modelo)}>
          <option value="v4">Integrante v4 (generado)</option>
          <option value="v3">Integrante v3</option>
          <option value="original">Original (traje)</option>
        </select>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
