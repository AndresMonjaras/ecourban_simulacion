import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import SceneCanvas from "./components/scene/SceneCanvas.tsx";
import type { WalkCommand } from "./types/humanMotion.ts";
import { planWalkToBench } from "./utils/humanMotion.ts";
import PersonActions from "./components/scene/PersonActions.tsx";
import { createInitialSceneState, sceneReducer } from "./stores/sceneReducer.ts";
import { crearIdEscena, crearObjetoEscena } from "./utils/sceneFactory.ts";
import { parseSceneDocument, serializeSceneDocument } from "./utils/sceneDocument.ts";
import { gradosARadianes, radianesAGrados } from "./utils/units.ts";
import { findLandingPosition } from "./utils/placement.ts";
import { POSTURA_PERSONA_DEFAULT, POSTURA_PERSONA_PARADA_DEFAULT, normalizarPersonaSentadaAntigua } from "./utils/humanPose.ts";
import type { PosturaPersona, SceneAction, SceneObject, TipoObjeto, Vector3 } from "./types/scene.ts";
import { createSceneHistory } from "./utils/sceneHistory.ts";
import { getBenchDependents } from "./utils/placement.ts";

const STORAGE_KEY = "bancapet-prueba005-escenario";
const labels: Record<TipoObjeto, string> = { bench: "Banca PET", person: "Maniquí humano articulado", weight: "Bloque de 20 kg" };
type CameraView = "iso" | "front" | "side" | "top";
const controlesArticulacion: { key: keyof PosturaPersona; label: string; min: number; max: number }[] = [
  { key: "hipFlexionDeg", label: "Flexión de cadera", min: 0, max: 130 },
  { key: "kneeFlexionDeg", label: "Flexión de rodilla", min: 0, max: 130 },
  { key: "torsoLeanDeg", label: "Inclinación del torso", min: -15, max: 30 },
  { key: "shoulderFlexionDeg", label: "Flexión de hombros", min: 0, max: 80 },
  { key: "elbowFlexionDeg", label: "Flexión de codos", min: 0, max: 100 },
];

function cargarEstadoInicial() {
  const inicial = createInitialSceneState();
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (!guardado) return inicial;
  try { return { ...inicial, objects: parseSceneDocument(guardado).objects.map(normalizarPersonaSentadaAntigua) }; }
  catch { localStorage.removeItem(STORAGE_KEY); return inicial; }
}

function App() {
  const [state, dispatchBase] = useReducer(sceneReducer, undefined, cargarEstadoInicial);
  const [aviso, setAviso] = useState("");
  const [preview, setPreview] = useState<Vector3 | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>("iso");
  const [focusRequest, setFocusRequest] = useState<{ kind: "bench" | "object"; objectId?: string; nonce: number } | null>(null);
  const [walkCommand, setWalkCommand] = useState<WalkCommand | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const historia = useRef(createSceneHistory());
  const transformacionActiva = useRef<string | null>(null);
  const objetosActuales = useRef(state.objects);
  objetosActuales.current = state.objects;
  const dispatch = useCallback((action: SceneAction) => {
    const cambiaEscena = ["add", "updateTransform", "setVisibility", "toggleVisibility", "updateObject", "duplicate", "remove", "import", "reset"].includes(action.type);
    if (cambiaEscena && !transformacionActiva.current) historia.current.save(objetosActuales.current);
    dispatchBase(action);
  }, []);
  const seleccion = useMemo(() => state.objects.find((item) => item.id === state.selectedId) ?? null, [state.objects, state.selectedId]);
  const numero = (tipo: TipoObjeto) => state.objects.filter((objeto) => objeto.type === tipo).length + 1;
  const solicitarEnfoque = (kind: "bench" | "object", objectId?: string) => {
    setFocusRequest((previous) => ({ kind, objectId, nonce: (previous?.nonce ?? 0) + 1 }));
  };

  const iniciarTransformacion = (id: string) => {
    const objeto = state.objects.find((item) => item.id === id);
    if (!objeto) return false;
    if (objeto.type === "bench" && getBenchDependents(objeto, state.objects).length > 0) {
      setAviso("No puedes mover la banca mientras tenga objetos encima.");
      return false;
    }
    if (transformacionActiva.current !== id) historia.current.save(state.objects);
    transformacionActiva.current = id;
    return true;
  };

  useEffect(() => {
    // El borrador queda en este navegador; el JSON permite moverlo manualmente.
    localStorage.setItem(STORAGE_KEY, serializeSceneDocument(state.objects));
  }, [state.objects]);

  const iniciarCaminata = useCallback((personaId: string | null) => {
    const persona = state.objects.find((object) => object.id === personaId);
    if (!persona || persona.type !== "person") { setAviso("Selecciona a la persona para iniciar la caminata."); return; }
    if (walkCommand) return;
    if (persona.transform.position[2] > 0.3) { setAviso("La persona ya está sentada. Bájala al suelo para volver a caminar."); return; }
    const bancasVisibles = state.objects.filter((object) => object.visible && object.type === "bench");
    const bancos = bancasVisibles.filter((object) => !getBenchDependents(object, state.objects).some((dependent) => dependent.type === "person"));
    if (bancos.length === 0) { setAviso(bancasVisibles.length > 0 ? "Todas las bancas visibles ya están ocupadas." : "Agrega una banca antes de iniciar la caminata."); return; }
    const banca = bancos.reduce((closest, candidate) => {
      const distance = Math.hypot(candidate.transform.position[0] - persona.transform.position[0], candidate.transform.position[1] - persona.transform.position[1]);
      const bestDistance = Math.hypot(closest.transform.position[0] - persona.transform.position[0], closest.transform.position[1] - persona.transform.position[1]);
      return distance < bestDistance ? candidate : closest;
    });
    const command = planWalkToBench(persona, banca);
    transformacionActiva.current = null;
    setWalkCommand(command);
    setAviso(`Caminando hacia ${banca.name}…`);
  }, [state.objects, walkCommand]);

  useEffect(() => {
    const tecla = (event: KeyboardEvent) => {
      const esCampoTexto = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
      if (event.key === "Escape" && walkCommand) {
        setWalkCommand(null);
        setAviso("Caminata cancelada.");
        return;
      }
      if (event.key === "Escape") { dispatch({ type: "setPlacement", objectType: null }); setPreview(null); }
      if (event.code === "KeyS" && event.shiftKey && !event.ctrlKey && !event.metaKey && !esCampoTexto && !event.repeat) {
        iniciarCaminata(state.selectedId);
        event.preventDefault();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !esCampoTexto) {
        event.preventDefault();
        const anterior = historia.current.undo();
        if (anterior) {
          transformacionActiva.current = null;
          dispatchBase({ type: "import", objects: anterior });
          setAviso("Acción deshecha.");
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && state.selectedId && !(event.target instanceof HTMLInputElement)) {
        dispatch({ type: "remove", id: state.selectedId });
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [state.selectedId, dispatch, walkCommand, iniciarCaminata]);

  const completarCaminata = (command: WalkCommand) => {
    if (!walkCommand || command.startedAt !== walkCommand.startedAt) return;
    const persona = objetosActuales.current.find((object) => object.id === command.id);
    if (persona) {
      historia.current.save(objetosActuales.current);
      dispatchBase({ type: "updateTransform", id: persona.id, transform: { ...persona.transform, position: command.seat, rotation: [persona.transform.rotation[0], persona.transform.rotation[1], command.seatYaw] } });
      dispatchBase({ type: "updateObject", id: persona.id, changes: { properties: { ...persona.properties, posture: { ...POSTURA_PERSONA_DEFAULT } } } });
    }
    setWalkCommand(null);
    setAviso("La persona llegó y se sentó en la banca.");
  };

  const crear = (tipo: TipoObjeto, position: Vector3 = [0, 0, 0]) => {
    const objeto = crearObjetoEscena(tipo, crearIdEscena(), numero(tipo), position, tipo === "bench" ? ["asiento_01", "asiento_02", "asiento_03", "soporte_01", "soporte_02"] : []);
    if (tipo === "person") objeto.properties.posture = { ...(position[2] > 0.3 ? POSTURA_PERSONA_DEFAULT : POSTURA_PERSONA_PARADA_DEFAULT) };
    dispatch({ type: "add", object: objeto });
  };

  const iniciarColocacion = (tipo: TipoObjeto) => {
    dispatch({ type: "setPlacement", objectType: tipo });
    setPreview(null);
    setAviso(`Colocación de ${labels[tipo].toLowerCase()}: mueve el cursor y haz clic. Escape cancela.`);
  };

  const exportar = () => {
    const archivo = new Blob([serializeSceneDocument(state.objects)], { type: "application/json" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = "bancapet-escenario.json";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    setAviso("Escenario JSON exportado.");
  };

  const importar = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    try {
      const documento = parseSceneDocument(await archivo.text());
      dispatch({ type: "import", objects: documento.objects.map(normalizarPersonaSentadaAntigua) });
      setAviso(`${documento.objects.length} objetos importados correctamente.`);
    } catch (error) { setAviso(error instanceof Error ? error.message : "No se pudo leer el escenario."); }
    event.target.value = "";
  };

  const cambiarVector = (objeto: SceneObject, campo: "position" | "rotation", indice: number, valor: number) => {
    if (objeto.type === "bench" && getBenchDependents(objeto, state.objects).length > 0) {
      setAviso("No puedes mover la banca mientras tenga objetos encima.");
      return;
    }
    const actual = [...objeto.transform[campo]] as Vector3;
    actual[indice] = campo === "rotation" ? gradosARadianes(valor) : valor / 1000;
    const transform = { ...objeto.transform, [campo]: actual };
    if (transform.position[2] < 0) transform.position[2] = 0;
    dispatch({ type: "updateTransform", id: objeto.id, transform });
    if (objeto.type === "person" && campo === "position" && (objeto.transform.position[2] > 0.3) !== (transform.position[2] > 0.3)) {
      const posture = transform.position[2] > 0.3 ? POSTURA_PERSONA_DEFAULT : POSTURA_PERSONA_PARADA_DEFAULT;
      dispatch({ type: "updateObject", id: objeto.id, changes: { properties: { ...objeto.properties, posture: { ...posture } } } });
    }
  };

  const actualizarNombre = (objeto: SceneObject, name: string) => dispatch({ type: "updateObject", id: objeto.id, changes: { name } });
  const actualizarMasa = (objeto: SceneObject, massKg: number) => dispatch({ type: "updateObject", id: objeto.id, changes: { properties: { ...objeto.properties, massKg } } });
  const actualizarArticulacion = (objeto: SceneObject, articulacion: keyof PosturaPersona, grados: number) => {
    const posture = { ...POSTURA_PERSONA_DEFAULT, ...objeto.properties.posture, [articulacion]: grados };
    dispatch({ type: "updateObject", id: objeto.id, changes: { properties: { ...objeto.properties, posture } } });
  };
  const actualizarDimension = (objeto: SceneObject, indice: number, valor: number) => {
    const dimensionsMm = [...objeto.dimensionsMm] as Vector3;
    dimensionsMm[indice] = Math.max(1, valor);
    dispatch({ type: "updateObject", id: objeto.id, changes: { dimensionsMm } });
  };
  const resolverPreview = (position: Vector3 | null) => {
    if (!position || !state.placementType) { setPreview(null); return; }
    const objeto = crearObjetoEscena(state.placementType, "preview", 1);
    setPreview(findLandingPosition(objeto, position[0], position[1], state.objects, position[2]));
  };
  const ponerEnEscena = (position: Vector3) => {
    if (!state.placementType) return;
    const objeto = crearObjetoEscena(state.placementType, "preview", 1);
    const aterrizaje = findLandingPosition(objeto, position[0], position[1], state.objects, position[2]);
    if (!aterrizaje) {
      setAviso(position[2] > 0.05 ? `Superficie detectada a Z=${position[2].toFixed(2)} m, pero no admite apoyo aquí.` : "Lugar ocupado o sin apoyo. Haz clic en suelo, asiento o bloque.");
    } else {
      crear(state.placementType, aterrizaje);
      setAviso(aterrizaje[2] > 0 ? "Objeto apoyado sobre una superficie." : "Objeto apoyado en el suelo.");
    }
    dispatch({ type: "setPlacement", objectType: null }); setPreview(null);
  };
  const guardarTransformacion = (id: string, position: Vector3, rotation: Vector3, aterrizar: boolean, fallbackPosition?: Vector3) => {
    const objeto = state.objects.find((item) => item.id === id);
    if (!objeto) { transformacionActiva.current = null; return; }
    if (!aterrizar) {
      dispatch({ type: "updateTransform", id, transform: { ...objeto.transform, position, rotation } });
      return;
    }
    const candidato = { ...objeto, transform: { ...objeto.transform, position, rotation } };
    const ubicacion = findLandingPosition(candidato, position[0], position[1], state.objects);
    if (!ubicacion) {
      if (fallbackPosition) dispatch({ type: "updateTransform", id, transform: { ...objeto.transform, position: fallbackPosition, rotation: objeto.transform.rotation } });
      setAviso("Ese lugar está ocupado. El objeto volvió a su posición anterior.");
      transformacionActiva.current = null;
      return;
    }
    const guardarFinal = () => {
      dispatch({ type: "updateTransform", id, transform: { ...objeto.transform, position: ubicacion, rotation } });
      if (objeto.type === "person" && (objeto.transform.position[2] > 0.3) !== (ubicacion[2] > 0.3)) {
        const posture = ubicacion[2] > 0.3 ? POSTURA_PERSONA_DEFAULT : POSTURA_PERSONA_PARADA_DEFAULT;
        dispatch({ type: "updateObject", id, changes: { properties: { ...objeto.properties, posture: { ...posture } } } });
      }
      setAviso(ubicacion[2] > 0 ? "Objeto aterrizó sobre una superficie." : "Objeto aterrizó en el suelo.");
      transformacionActiva.current = null;
    };
    if (position[2] > ubicacion[2] + 0.02) {
      const inicio = performance.now();
      const duracion = Math.min(650, Math.max(200, (position[2] - ubicacion[2]) * 300));
      const caer = (ahora: number) => {
        const progreso = Math.min(1, (ahora - inicio) / duracion);
        const avance = progreso * (2 - progreso);
        const z = position[2] + (ubicacion[2] - position[2]) * avance;
        dispatch({ type: "updateTransform", id, transform: { ...objeto.transform, position: [ubicacion[0], ubicacion[1], z], rotation } });
        if (progreso < 1) requestAnimationFrame(caer);
        else guardarFinal();
      };
      requestAnimationFrame(caer);
    } else guardarFinal();
  };

  return <main className="app-shell">
      <header className="topbar"><div><span className="brand-mark">BP</span><div><strong>BancaPET</strong><small>Simulación de escenarios · Prueba 005</small></div></div>
      <div className="file-actions"><button onClick={exportar}>Exportar JSON</button><button onClick={() => importInput.current?.click()}>Importar JSON</button><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importar} /></div>
    </header>
    <section className="workspace">
      <aside className="sidebar library"><h2>Biblioteca</h2><p className="muted">Agregar objeto</p>
        {(Object.keys(labels) as TipoObjeto[]).map((tipo) => <article className="library-card" key={tipo}><div className={`object-icon ${tipo}`}>{tipo === "bench" ? "▰" : tipo === "person" ? "♙" : "◼"}</div><div><strong>{labels[tipo]}</strong><small>{tipo === "bench" ? "Modelo CAD · GLB" : tipo === "person" ? "75 kg · articulaciones editables" : "200 × 200 × 200 mm · 20 kg"}</small></div><button aria-label={`Agregar ${labels[tipo]}`} onClick={() => iniciarColocacion(tipo)}>+</button></article>)}
        <div className="placement-help">{state.placementType ? <><b>Modo colocar</b><span>Haz clic en suelo o superficie para apoyar el objeto.</span><button onClick={() => { dispatch({ type: "setPlacement", objectType: null }); setPreview(null); }}>Cancelar · Esc</button></> : <span>Haz clic para tomar o soltar objetos. W/A/S/D recorre la vista. Selecciona a la persona y pulsa <b>Mayús + S</b> para caminar a la banca y sentarse; <b>Esc</b> cancela.</span>}</div>
      </aside>
      <section className="viewport" aria-label="Vista 3D del escenario">
        <div className="viewport-toolbar"><span>ESCENARIO 3D</span><div className="camera-controls">
          <div className="camera-presets">
            {(["iso", "front", "side", "top"] as CameraView[]).map((view) => <button key={view} className={cameraView === view ? "active" : ""} onClick={() => setCameraView(view)}>{({ iso: "Isométrica", front: "Frontal", side: "Lateral", top: "Superior" })[view]}</button>)}
            <button className={state.transformMode === "translate" ? "active" : ""} onClick={() => dispatch({ type: "setTransformMode", mode: "translate" })}>Mover</button><button className={state.transformMode === "rotate" ? "active" : ""} onClick={() => dispatch({ type: "setTransformMode", mode: "rotate" })}>Rotar</button>
          </div>
          <div className="camera-focus"><button onClick={() => solicitarEnfoque("bench")} disabled={!state.objects.some((object) => object.type === "bench")}>Centrar en banca</button><button onClick={() => seleccion && solicitarEnfoque("object", seleccion.id)} disabled={!seleccion}>Enfocar objeto seleccionado</button></div>
        </div></div>
        <SceneCanvas state={state} cameraView={cameraView} preview={preview} focusRequest={focusRequest} walkCommand={walkCommand} onWalkComplete={completarCaminata} onSelect={(id) => dispatch({ type: "select", id })} onPlace={ponerEnEscena} onPreview={resolverPreview} onTransformStart={iniciarTransformacion} onTransform={(id, position, rotation) => guardarTransformacion(id, position, rotation, false)} onRelease={(id, position, rotation, fallbackPosition) => guardarTransformacion(id, position, rotation, true, fallbackPosition)} onCancelHold={() => setAviso("Movimiento cancelado; objeto restaurado.")} onContext={(id, x, y) => dispatch({ type: "setContextMenu", menu: { objectId: id, x: Math.min(x, window.innerWidth - 190), y: Math.min(y, window.innerHeight - 160) } })} />
        {state.placementType && <div className="placement-banner">Colocando: {labels[state.placementType]} · WASD mueve la vista · Escape cancela{preview ? ` · X ${(preview[0] * 1000).toFixed(0)} mm / Y ${(preview[1] * 1000).toFixed(0)} mm / Z ${(preview[2] * 1000).toFixed(0)} mm` : ""}</div>}
        {state.contextMenu && <div className="context-backdrop" onClick={() => dispatch({ type: "setContextMenu", menu: null })}><div className="context-menu" style={{ left: state.contextMenu.x, top: state.contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button onClick={() => dispatch({ type: "select", id: state.contextMenu!.objectId })}>Seleccionar · Propiedades</button>
          <button onClick={() => { dispatch({ type: "select", id: state.contextMenu!.objectId }); dispatch({ type: "setTransformMode", mode: "translate" }); }}>Mover</button>
          <button onClick={() => { dispatch({ type: "select", id: state.contextMenu!.objectId }); dispatch({ type: "setTransformMode", mode: "rotate" }); }}>Rotar</button>
          <button onClick={() => dispatch({ type: "duplicate", id: state.contextMenu!.objectId, newId: crearIdEscena() })}>Duplicar</button><button onClick={() => dispatch({ type: "toggleVisibility", id: state.contextMenu!.objectId })}>Mostrar / ocultar</button><button className="danger" onClick={() => dispatch({ type: "remove", id: state.contextMenu!.objectId })}>Eliminar</button>
        </div></div>}
      </section>
      <aside className="sidebar properties"><h2>Escena</h2>
        <PersonActions objects={state.objects} selectedId={seleccion?.type === "person" ? seleccion.id : null} walking={Boolean(walkCommand)} onSelect={(id) => dispatch({ type: "select", id })} onWalk={iniciarCaminata} />
        <div className="scene-list">
        {state.objects.length === 0 ? <p className="empty-state">Aún no hay objetos.<br />Agrégalos desde la biblioteca.</p> : state.objects.map((objeto) => <div className={`scene-row ${seleccion?.id === objeto.id ? "selected" : ""}`} key={objeto.id}><button className="select-object" onClick={() => dispatch({ type: "select", id: objeto.id })}><span className="row-dot" />{objeto.name}</button><button className="visibility" aria-label={`${objeto.visible ? "Ocultar" : "Mostrar"} ${objeto.name}`} onClick={() => dispatch({ type: "toggleVisibility", id: objeto.id })}>{objeto.visible ? "◉" : "○"}</button></div>)}
      </div>
      <div className="property-editor"><h2>Propiedades</h2>{seleccion ? <>
        <label>Nombre<input value={seleccion.name} onChange={(event) => actualizarNombre(seleccion, event.target.value)} /></label>
        <div className="property-group"><span>Posición (mm)</span>{(["X", "Y", "Z"] as const).map((axis, i) => <label key={axis}>{axis}<input aria-label={`Posición ${axis} mm`} type="number" step="10" value={(seleccion.transform.position[i] * 1000).toFixed(0)} onChange={(event) => cambiarVector(seleccion, "position", i, Number(event.target.value))} /></label>)}</div>
        <div className="property-group"><span>Rotación (°)</span>{(["X", "Y", "Z"] as const).map((axis, i) => <label key={axis}>{axis}<input aria-label={`Rotación ${axis} grados`} type="number" step="5" value={radianesAGrados(seleccion.transform.rotation[i]).toFixed(1)} onChange={(event) => cambiarVector(seleccion, "rotation", i, Number(event.target.value))} /></label>)}</div>
        <div className="property-group"><span>Escala</span>{(["X", "Y", "Z"] as const).map((axis, i) => <label key={axis}>{axis}<input aria-label={`Escala ${axis}`} type="number" min="0.01" step="0.1" value={seleccion.transform.scale[i]} onChange={(event) => { const scale = [...seleccion.transform.scale] as Vector3; scale[i] = Math.max(0.01, Number(event.target.value)); dispatch({ type: "updateTransform", id: seleccion.id, transform: { ...seleccion.transform, scale } }); }} /></label>)}</div>
        <div className="property-group"><span>Dimensiones (mm)</span>{(["X", "Y", "Z"] as const).map((axis, i) => <label key={axis}>{axis}<input aria-label={`Dimensión ${axis} mm`} type="number" min="1" step="10" value={seleccion.dimensionsMm[i]} onChange={(event) => actualizarDimension(seleccion, i, Number(event.target.value))} /></label>)}</div>
        <div className="object-meta"><span>ID</span><code>{seleccion.id}</code><span>Tipo</span><b>{labels[seleccion.type]}</b><span>Dimensiones</span><b>{seleccion.dimensionsMm.map((value) => `${value} mm`).join(" × ")}</b><span>Visibilidad</span><button onClick={() => dispatch({ type: "toggleVisibility", id: seleccion.id })}>{seleccion.visible ? "Visible" : "Oculto"}</button></div>
        {seleccion.properties.massKg !== undefined && <label>Masa visual (kg)<input aria-label="Masa visual kg" type="number" min="0.1" step="0.1" value={seleccion.properties.massKg} onChange={(event) => actualizarMasa(seleccion, Math.max(0.1, Number(event.target.value)))} /></label>}
        {seleccion.type === "person" && <div className="posture-editor"><h3>Articulaciones</h3>{controlesArticulacion.map(({ key, label, min, max }) => {
          const defaultPosture = seleccion.transform.position[2] > 0.3 ? POSTURA_PERSONA_DEFAULT : POSTURA_PERSONA_PARADA_DEFAULT;
          const posture = { ...defaultPosture, ...seleccion.properties.posture };
          return <label key={key}>{label}<span>{posture[key]}°</span><input aria-label={label} type="range" min={min} max={max} step="1" value={posture[key]} onChange={(event) => actualizarArticulacion(seleccion, key, Number(event.target.value))} /></label>;
        })}</div>}
        <p className="visual-note">Apoyos y caída geométricos aproximados; no representa una simulación dinámica ni análisis FEM.</p>
        <button className="delete-button" onClick={() => dispatch({ type: "remove", id: seleccion.id })}>Eliminar objeto</button>
      </> : <p className="muted">Selecciona un objeto para editar sus propiedades.</p>}</div>
      <div className="sidebar-footer"><button onClick={() => { dispatch({ type: "reset" }); setAviso("Escenario reiniciado."); }}>Reiniciar escenario</button></div></aside>
    </section>
    <footer className="statusbar"><span>{aviso || (state.placementType ? "Colocación activa" : "Listo")}</span><span>{state.objects.length} objetos · Escenario local</span></footer>
  </main>;
}

export default App;
