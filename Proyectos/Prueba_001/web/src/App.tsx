import * as React from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import type { Vector3 } from "three";

type Vista = "frontal" | "lateral" | "superior" | "isometrica";

type ControlesCamara = {
  target: Vector3;
  update: () => void;
};

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: "frontal", etiqueta: "Frontal" },
  { id: "lateral", etiqueta: "Lateral" },
  { id: "superior", etiqueta: "Superior" },
  { id: "isometrica", etiqueta: "Isométrica" },
];

function ControlarCamara({ vista, revision }: { vista: Vista; revision: number }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const distancia = 0.25;
    const posiciones: Record<Vista, [number, number, number]> = {
      frontal: [0, -distancia, 0],
      lateral: [distancia, 0, 0],
      // El pequeño desplazamiento evita alinear la cámara exactamente con Z.
      superior: [0, -0.001, distancia],
      isometrica: [distancia, -distancia, distancia * 0.85],
    };

    // Mantener Z arriba conserva la órbita alrededor del eje vertical CAD.
    camera.up.set(0, 0, 1);
    camera.position.set(...posiciones[vista]);
    camera.lookAt(0, 0, 0);

    const orbitas = controls as unknown as ControlesCamara | null;
    if (orbitas) {
      orbitas.target.set(0, 0, 0);
      orbitas.update();
    }
  }, [camera, controls, revision, vista]);

  return null;
}

function ModeloCubo() {
  const { scene } = useGLTF("/models/cubo.glb");

  // Se usa una copia para no cambiar el modelo que mantiene en caché el cargador.
  const modelo = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={modelo} />;
}

type LimiteErrorProps = { children: React.ReactNode };
type LimiteErrorState = { ocurrioError: boolean };

class LimiteErrorModelo extends React.Component<LimiteErrorProps, LimiteErrorState> {
  state: LimiteErrorState = { ocurrioError: false };

  static getDerivedStateFromError(): LimiteErrorState {
    return { ocurrioError: true };
  }

  render() {
    if (this.state.ocurrioError) {
      return (
        <div className="error-modelo" role="alert">
          No se pudo cargar el GLB local. Revisa el archivo y vuelve a cargar la página.
        </div>
      );
    }

    return this.props.children;
  }
}

function Escena({ vista, revision }: { vista: Vista; revision: number }) {
  return (
    <Canvas
      camera={{
        position: [0.25, -0.25, 0.21],
        up: [0, 0, 1],
        fov: 42,
        near: 0.001,
        far: 20,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#101923"]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[1, -1, 2]} intensity={2.2} />
      <directionalLight position={[-1, 1, 0.5]} intensity={0.8} />

      <Grid
        position={[0, 0, -0.051]}
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid
        cellSize={0.01}
        sectionSize={0.05}
        fadeDistance={1.4}
        cellColor="#334655"
        sectionColor="#61798b"
      />
      <axesHelper args={[0.09]} />

      <Suspense fallback={null}>
        <ModeloCubo />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.12}
        maxDistance={2.5}
        enablePan
        enableZoom
        enableRotate
      />
      <GizmoHelper alignment="bottom-right" margin={[68, 68]}>
        <GizmoViewport
          axisColors={["#ef7373", "#72c58a", "#79aef5"]}
          labelColor="#e9f0f5"
        />
      </GizmoHelper>
      <ControlarCamara vista={vista} revision={revision} />
    </Canvas>
  );
}

function App() {
  const [vista, setVista] = useState<Vista>("isometrica");
  const [revision, setRevision] = useState(0);

  function cambiarVista(nuevaVista: Vista) {
    setVista(nuevaVista);
    setRevision((actual) => actual + 1);
  }

  return (
    <main className="visor">
      <LimiteErrorModelo>
        <Escena vista={vista} revision={revision} />
      </LimiteErrorModelo>

      <header className="encabezado panel">
        <div className="marca">
          <span className="marca-punto" aria-hidden="true" />
          <div>
            <p className="sobrelinea">BANCA PET · LABORATORIO CAD</p>
            <h1>Prueba 001 <span>·</span> Cubo de referencia</h1>
          </div>
        </div>
        <div className="estado-modelo">
          <span className="estado-punto" aria-hidden="true" />
          GLB local · Z arriba
        </div>
      </header>

      <section className="herramientas panel" aria-label="Controles de cámara">
        <p className="etiqueta-panel">VISTA</p>
        <div className="botones-vista">
          {VISTAS.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className={vista === opcion.id ? "boton-vista activo" : "boton-vista"}
              aria-pressed={vista === opcion.id}
              onClick={() => cambiarVista(opcion.id)}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
        <button
          className="boton-reset"
          type="button"
          onClick={() => cambiarVista("isometrica")}
          aria-label="Restablecer cámara a la vista isométrica"
        >
          Restablecer vista
        </button>
        <p className="ayuda-controles">Arrastra para orbitar · rueda para zoom · botón derecho para paneo</p>
      </section>

      <aside className="datos panel" aria-label="Dimensiones del modelo">
        <p className="etiqueta-panel">DIMENSIONES</p>
        <p className="dimension-principal">100 <span>×</span> 100 <span>×</span> 100 <small>mm</small></p>
        <div className="lista-dimensiones">
          <div><span className="eje eje-x">X</span><span>Largo</span><strong>100 mm</strong></div>
          <div><span className="eje eje-y">Y</span><span>Ancho</span><strong>100 mm</strong></div>
          <div><span className="eje eje-z">Z</span><span>Alto</span><strong>100 mm</strong></div>
        </div>
        <p className="origen">Origen del modelo <strong>(0, 0, 0) mm</strong></p>
      </aside>

      <footer className="pie">
        <span>Unidades CAD: mm</span>
        <span className="separador" aria-hidden="true">·</span>
        <span>GLB: metros</span>
        <span className="separador" aria-hidden="true">·</span>
        <span>Arrastra el modelo para explorar</span>
      </footer>
    </main>
  );
}

useGLTF.preload("/models/cubo.glb");

export default App;
