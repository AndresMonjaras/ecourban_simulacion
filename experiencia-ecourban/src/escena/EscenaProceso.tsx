import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  PMREMGenerator,
  type DirectionalLight,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { POSE_PERSONA_SENTADA_ESTABLE } from "./animacionPersona";
import { BancaProceso } from "./BancaProceso";
import { Desmolde, Recepcion } from "./EstacionesMateria";
import { Maquila } from "./MaquinaMoldeo";
import { EstacionesTaller } from "./EstacionesTaller";
import { ep } from "./lineaProceso";
import { PERFIL_ACTION_SUIT } from "./perfilRigPersona";
import { Persona } from "./Persona";

function crearPiso() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  // Luz verde templada y semitransparente para apoyar las estaciones sin tapar la reticula del taller.
  gr.addColorStop(0, "rgba(42, 74, 58, 0.32)");
  gr.addColorStop(0.55, "rgba(24, 44, 35, 0.16)");
  gr.addColorStop(1, "rgba(12, 22, 18, 0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

function crearSombraContacto() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 12, 128, 128, 122);
  gr.addColorStop(0, "rgba(4, 8, 6, 0.56)");
  gr.addColorStop(0.55, "rgba(4, 8, 6, 0.26)");
  gr.addColorStop(1, "rgba(4, 8, 6, 0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

function EntornoEstudio({ lite }: { lite: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    const pm = new PMREMGenerator(gl);
    const sala = new RoomEnvironment();
    const env = pm.fromScene(sala, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = lite ? 0.32 : 0.4;
    sala.dispose();
    pm.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, lite]);
  return null;
}

const FOV = 35;
const FOV_PUENTE = 34;
const TAN_FOV = Math.tan((FOV * Math.PI) / 360);
const TAN_FOV_PUENTE = Math.tan((FOV_PUENTE * Math.PI) / 360);
const ASPECTO_BASE = 1.6;

function Rig({ lite, reducido }: { lite: boolean; reducido: boolean }) {
  const { camera, size, invalidate } = useThree();
  const llave = useRef<DirectionalLight>(null);
  const borde = useRef<DirectionalLight>(null);
  const frio = useRef<DirectionalLight>(null);
  const piso = useRef<Mesh>(null);
  const sombra = useRef<Mesh>(null);
  const contacto = useRef<Group>(null);
  const texPiso = useMemo(crearPiso, []);
  const texContacto = useMemo(crearSombraContacto, []);
  useEffect(() => () => {
    texPiso.dispose();
    texContacto.dispose();
  }, [texPiso, texContacto]);

  const { scene } = useThree();
  useEffect(() => {
    const objetivos = [llave.current, frio.current, borde.current].map((l) => l?.target);
    objetivos.forEach((t) => t && scene.add(t));
    return () => objetivos.forEach((t) => t && scene.remove(t));
  }, [scene]);

  useEffect(() => {
    ep.invalidar = invalidate;
    invalidate();
    return () => {
      ep.invalidar = null;
    };
  }, [invalidate]);

  useFrame(() => {
    const cam = camera as PerspectiveCamera;
    const aspecto = size.width / Math.max(1, size.height);
    const w = ep.puente;
    const fov = FOV + (FOV_PUENTE - FOV) * w;
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // En pantallas estrechas se aleja la camara para que la banca no se recorte.
    // En escritorio hay sitio para la zona de salida a la derecha de la banca; en vertical se prioriza la banca.
    const lat = aspecto < 1 ? ep.lateral * 0.62 + ep.pdx : ep.lateral;
    const tx = ep.tx + lat;
    const px = ep.px + lat;
    let k = Math.min(2.1, Math.max(1, ASPECTO_BASE / aspecto)) * (lite ? 1.04 : 1);
    if (aspecto < 1) k *= ep.zoom;
    if (ep.ancho > 0) {
      // Aleja lo necesario para que el motivo principal quepa de lado a lado (con aire), sin recortarlo.
      const d0 = Math.hypot(ep.px - ep.tx, ep.pz - ep.tz, ep.py - ep.ty) || 1;
      k = Math.max(k, (ep.ancho * 1.12) / (2 * TAN_FOV * aspecto * d0));
    }
    const pxProc = tx + (px - tx) * k;
    const pyProc = ep.ty + (ep.py - ep.ty) * k * (aspecto < 1 ? 0.8 : 1) + (aspecto < 1 ? ep.elev : 0);
    const pzProc = (ep.pz - ep.tz) * k + ep.tz;
    if (w > 0) {
      // Iguala exactamente tomaBase(lite) de Escena.tsx durante [0..0.14] y transiciona suave al rig del proceso.
      const distBase = Math.max(3.4, (lite ? 2.52 : 2.6) / (0.63 * aspecto));
      const pzBase = distBase * (lite ? 0.94 : 0.96) * (TAN_FOV / TAN_FOV_PUENTE);
      cam.position.set(pxProc, pyProc + (0.9 - pyProc) * w, pzProc + (pzBase - pzProc) * w);
    } else {
      cam.position.set(pxProc, pyProc, pzProc);
    }
    cam.lookAt(tx, ep.ty, ep.tz);
    // Sube el encuadre cuando el pie de pagina ocupa la parte baja (movil), sin desplazar la toma puente.
    const py = Math.round((aspecto < 1 ? 0.1 : 0.05) * size.height * (1 - w));
    if (py > 0) cam.setViewOffset(size.width, size.height, 0, py, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
    cam.updateMatrixWorld();
    const poner = (l: DirectionalLight | null, x: number, y: number, z: number) => {
      if (!l) return;
      l.position.set(tx + x, y, z);
      l.target.position.set(tx, 0.4, 0);
      l.target.updateMatrixWorld();
    };
    poner(llave.current, 2.2, 3.6, 3.2);
    poner(frio.current, -3, 0.9, 2);
    poner(borde.current, -2.6, 1.8, -3.2);
    if (piso.current) piso.current.position.x = tx;
    if (sombra.current) sombra.current.position.x = tx;
    if (contacto.current) contacto.current.visible = reducido || ep.progreso >= 0.025;
  });

  return (
    <>
      <hemisphereLight args={["#b4c2d0", "#09120d", 0.24]} />
      <directionalLight
        ref={llave}
        intensity={2.05}
        color="#fff3e2"
        castShadow={!lite}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.2}
        shadow-camera-bottom={-1.6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.012}
        shadow-radius={5}
      />
      <directionalLight ref={frio} intensity={0.6} color="#9fb6d8" />
      <directionalLight ref={borde} intensity={reducido ? 1.2 : 1.7} color="#3fcf93" />
      <mesh ref={piso} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 7]} />
        <meshBasicMaterial map={texPiso} transparent depthWrite={false} />
      </mesh>
      <group ref={contacto} position={[0, 0.001, 0]} rotation={[0, lite ? -0.34 : -0.42, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2.3, 0.95, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texContacto} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
      {!lite && (
        <mesh ref={sombra} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
          <planeGeometry args={[10, 5]} />
          <shadowMaterial transparent opacity={0.34} />
        </mesh>
      )}
    </>
  );
}

function PuenteBanca({ lite, reducido }: { lite: boolean; reducido: boolean }) {
  const grupo = useRef<Group>(null);
  useFrame(() => {
    if (grupo.current) grupo.current.visible = reducido || ep.progreso >= 0.025;
  });
  return (
    <group ref={grupo}>
      <BancaProceso x={0} giro={lite ? -0.34 : -0.42} armada lite={lite} />
      <Suspense fallback={null}>
        <Persona
          perfil={PERFIL_ACTION_SUIT}
          pose={POSE_PERSONA_SENTADA_ESTABLE}
          posicion={[0, 0, 0]}
          rotacionY={lite ? -0.34 : -0.42}
          sombras={!lite}
        />
      </Suspense>
    </group>
  );
}

export default function EscenaProceso({ lite, reducido }: { lite: boolean; reducido: boolean }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={lite ? [1, 1.25] : [1, 2]}
      shadows="percentage"
      camera={{ fov: FOV_PUENTE, near: 0.05, far: 60, position: [0, 0.9, 3.367] }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Rig lite={lite} reducido={reducido} />
      <EntornoEstudio lite={lite} />
      <PuenteBanca lite={lite} reducido={reducido} />
      <Recepcion lite={lite} />
      <Maquila lite={lite} />
      <Desmolde lite={lite} />
      <EstacionesTaller lite={lite} />
    </Canvas>
  );
}
