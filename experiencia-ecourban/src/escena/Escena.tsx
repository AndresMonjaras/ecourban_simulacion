import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  PMREMGenerator,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type MeshBasicMaterial,
  type PerspectiveCamera,
  type ShadowMaterial,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { almacen } from "./almacen";
import { Banca } from "./Banca";
import { vistaEfectiva } from "./enfoque";
import { useMediaQuery } from "../useProgresoScroll";

const FOV_BASE = Math.tan((35 * Math.PI) / 360);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const COLOR_RIM_BASE = new Color("#3fcf93");
const COLOR_RIM_RESPALDO = new Color("#7fd1ad");
const COLOR_RIM_ASIENTO = new Color("#7fd1ad");
const COLOR_RIM_SOPORTES = new Color("#bfe6d3");

const DELTA_RIM_RESP = {
  r: COLOR_RIM_RESPALDO.r - COLOR_RIM_BASE.r,
  g: COLOR_RIM_RESPALDO.g - COLOR_RIM_BASE.g,
  b: COLOR_RIM_RESPALDO.b - COLOR_RIM_BASE.b,
};
const DELTA_RIM_ASIENTO = {
  r: COLOR_RIM_ASIENTO.r - COLOR_RIM_BASE.r,
  g: COLOR_RIM_ASIENTO.g - COLOR_RIM_BASE.g,
  b: COLOR_RIM_ASIENTO.b - COLOR_RIM_BASE.b,
};
const DELTA_RIM_SOP = {
  r: COLOR_RIM_SOPORTES.r - COLOR_RIM_BASE.r,
  g: COLOR_RIM_SOPORTES.g - COLOR_RIM_BASE.g,
  b: COLOR_RIM_SOPORTES.b - COLOR_RIM_BASE.b,
};

/** Textura radial suave para sombra de contacto bajo la banca (funciona en escritorio y movil). */
function crearSombraPiso() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 12, 128, 128, 122);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.56)");
  grad.addColorStop(0.55, "rgba(0, 0, 0, 0.26)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

/** Reflejos de estudio: entorno de sala tenue y tone mapping calibrado para PET reciclado. */
function EntornoEstudio({ lite }: { lite: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    const pm = new PMREMGenerator(gl);
    const sala = new RoomEnvironment();
    const env = pm.fromScene(sala, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = lite ? 0.3 : 0.36;
    sala.dispose();
    pm.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, lite]);
  return null;
}

function Encuadre({ lite }: { lite: boolean }) {
  const { size, invalidate } = useThree();
  useEffect(() => {
    // Ancho visible necesario (m) en el plano de la banca; fov vertical 35 => ancho = 0.63 * z * aspecto.
    const aspecto = size.width / Math.max(1, size.height);
    almacen.distancia = Math.max(3.4, (lite ? 2.52 : 2.6) / (0.63 * aspecto));
    almacen.invalidar = invalidate;
    almacen.alMontar?.();
    invalidate();
    return () => {
      almacen.invalidar = null;
    };
  }, [size, invalidate, lite]);
  return null;
}

function Contenido({ lite }: { lite: boolean }) {
  const reducido = useMediaQuery("(prefers-reduced-motion: reduce)");
  const raiz = useRef<Group>(null);
  const { camera, size } = useThree();
  const llave = useRef<DirectionalLight>(null);
  const borde = useRef<DirectionalLight>(null);
  const frio = useRef<DirectionalLight>(null);
  const rebote = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const sombraMat = useRef<MeshBasicMaterial>(null);
  const shadowMat = useRef<ShadowMaterial>(null);
  const texSombra = useMemo(crearSombraPiso, []);

  useEffect(() => () => texSombra.dispose(), [texSombra]);

  useFrame(() => {
    const { mirada, giro, alto, orb, fov, tx, tz, ox, oy, zoom, gx, gz } = vistaEfectiva();
    if (raiz.current) {
      raiz.current.rotation.y = giro;
      raiz.current.position.set(gx, 0, gz);
    }
    const cam = camera as PerspectiveCamera;
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // El cambio de fov se compensa en distancia para mantener un encuadre estable.
    const d = almacen.distancia * zoom * (Math.tan((fov * Math.PI) / 360) / FOV_BASE) ** -1;
    // Desplazamiento determinista del encuadre para evitar solapes con la ficha en escritorio y movil.
    const px = Math.round(ox * size.width);
    const py = Math.round(oy * size.height);
    if (px || py) cam.setViewOffset(size.width, size.height, px, py, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();

    camera.position.set(tx + Math.sin(orb) * d, mirada + 0.4 + alto, tz + Math.cos(orb) * d);
    camera.lookAt(tx, mirada, tz);
    camera.updateMatrixWorld();

    // Rig de estudio reactivo al capitulo activo mediante deltas ponderadas sobre la iluminacion base.
    // Con pesos cero el resultado es identico a las tomas base aprobadas (continuidad exacta).
    const wr = smoothstep(0.25, 1, almacen.enfasis.respaldo);
    const wa = smoothstep(0.25, 1, almacen.enfasis.asiento);
    const ws = smoothstep(0.25, 1, almacen.enfasis.soportes);

    // Amplitud segun dispositivo y accesibilidad: lite al 60%, reduced-motion al 40% (o 24% en lite)
    const factor = reducido ? (lite ? 0.24 : 0.4) : (lite ? 0.6 : 1.0);

    // Rig de estudio: las luces acompanan el acimut de la camara para modelar relieve sin destellos.
    const seguir = orb * 0.55;
    const c = Math.cos(seguir);
    const sn = Math.sin(seguir);
    const pone = (l: DirectionalLight | null, x: number, y: number, z: number) => {
      if (!l) return;
      l.position.set(x * c + z * sn, y, -x * sn + z * c);
    };

    // 1. Llave (luz principal rasante en respaldo, alta/suave en asiento, equilibrada en soportes):
    const kx = 2.2 + factor * (wr * 0.9 - wa * 1.0 + ws * 0.4);
    const ky = 3.6 + factor * (wr * -1.3 + wa * 0.7 - ws * 1.0);
    const kz = 3.2 + factor * (wr * -0.9 - wa * 1.1 - ws * 0.2);
    pone(llave.current, kx, ky, kz);
    if (llave.current) {
      llave.current.intensity = 2.05 + factor * (wa * -0.123 + ws * -0.041);
    }

    // 2. Relleno frio lateral (se intensifica en soportes para abrir sombras del arco):
    pone(frio.current, -3, 0.9, 2);
    if (frio.current) {
      frio.current.intensity = 0.58 + factor * (wr * -0.087 + ws * 0.203);
    }

    // 3. Rim: base #3fcf93, se neutraliza a #7fd1ad en respaldo/asiento y a #bfe6d3 en soportes:
    pone(borde.current, -2.6, 1.8, -3.2);
    if (borde.current) {
      borde.current.intensity = 1.75 + factor * (wr * -0.2625 + wa * -0.525 + ws * -0.7);
      const cr = COLOR_RIM_BASE.r + factor * (wr * DELTA_RIM_RESP.r + wa * DELTA_RIM_ASIENTO.r + ws * DELTA_RIM_SOP.r);
      const cg = COLOR_RIM_BASE.g + factor * (wr * DELTA_RIM_RESP.g + wa * DELTA_RIM_ASIENTO.g + ws * DELTA_RIM_SOP.g);
      const cb = COLOR_RIM_BASE.b + factor * (wr * DELTA_RIM_RESP.b + wa * DELTA_RIM_ASIENTO.b + ws * DELTA_RIM_SOP.b);
      borde.current.color.setRGB(cr, cg, cb);
    }

    // 4. Rebote inferior tenue (se refuerza en soportes para revelar cara interna del arco):
    pone(rebote.current, 0, -2.2, 1.2);
    if (rebote.current) {
      rebote.current.intensity = 0.28 + factor * (wa * 0.028 + ws * 0.126);
    }

    // 5. Hemisferio difuso (ligero soporte ambiental para la lectura superior del asiento):
    if (hemi.current) {
      hemi.current.intensity = 0.22 + factor * (wa * 0.04);
    }

    if (sombraMat.current) {
      sombraMat.current.opacity = 0.55 * almacen.sombraContacto;
    }
    if (shadowMat.current) {
      shadowMat.current.opacity = 0.34 * almacen.sombraContacto;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#b4c2d0", "#09120d", 0.22]} />
      {/* Luz principal suave de estudio con sombras proyectadas */}
      <directionalLight
        ref={llave}
        position={[2.2, 3.6, 3.2]}
        intensity={2.05}
        color="#fff3e2"
        castShadow={!lite}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.8}
        shadow-camera-bottom={-1.4}
        shadow-bias={-0.0004}
        shadow-radius={6}
        shadow-normalBias={0.012}
      />
      {/* Relleno frio lateral */}
      <directionalLight ref={frio} position={[-3, 0.9, 2]} intensity={0.58} color="#9fb6d8" />
      {/* Rim para recortar silueta y biseles (base #3fcf93, neutralizado al animar foco) */}
      <directionalLight ref={borde} position={[-2.6, 1.8, -3.2]} intensity={1.75} color="#3fcf93" />
      {/* Rebote inferior para revelar la cara interna del arco y tablones en el despiece */}
      <directionalLight ref={rebote} position={[0, -2.2, 1.2]} intensity={0.28} color="#2d5440" />
      <group ref={raiz}>
        <Banca lite={lite} />
        {/* Sombra de contacto suave en el piso del estudio */}
        <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.3, 0.95, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={sombraMat}
            map={texSombra}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
        {!lite && (
          <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.6, 2.2]} />
            <shadowMaterial ref={shadowMat} transparent opacity={0.34} />
          </mesh>
        )}
      </group>
      <EntornoEstudio lite={lite} />
      <Encuadre lite={lite} />
    </>
  );
}

export default function Escena({ lite }: { lite: boolean }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={lite ? [1, 1.25] : [1, 2]}
      shadows="percentage"
      camera={{ fov: 35, near: 0.05, far: 50, position: [0, 1, 3.6] }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Contenido lite={lite} />
    </Canvas>
  );
}
