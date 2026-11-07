import { useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import SceneCanvas from "./components/scene/SceneCanvas.tsx";
import { createInitialSceneState, sceneReducer } from "./stores/sceneReducer.ts";
import { crearIdEscena, crearObjetoEscena } from "./utils/sceneFactory.ts";
import { parseSceneDocument, serializeSceneDocument } from "./utils/sceneDocument.ts";
import { gradosARadianes, radianesAGrados } from "./utils/units.ts";
import type { SceneObject, TipoObjeto, Vector3 } from "./types/scene.ts";

const STORAGE_KEY = "bancapet-prueba004-escenario";
const labels: Record<TipoObjeto, string> = { bench: "Banca PET", person: "Maniquí provisional", weight: "Bloque de 20 kg" };
type CameraView = "iso" | "front" | "side" | "top";

function cargarEstadoInicial() {
  const inicial = createInitialSceneState();
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (!guardado) return inicial;
  try { return { ...inicial, objects: parseSceneDocument(guardado).objects }; }
  catch { localStorage.removeItem(STORAGE_KEY); return inicial; }
}

function App() {
  const [state, dispatch] = useReducer(sceneReducer, undefined, cargarEstadoInicial);
  const [aviso, setAviso] = useState("");
  const [preview, setPreview] = useState<Vector3 | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>("iso");
  const importInput = useRef<HTMLInputElement>(null);
  const seleccion = useMemo(() => state.objects.find((item) => item.id === state.selectedId) ?? null, [state.objects, state.selectedId]);
  const numero = (tipo: TipoObjeto) => state.objects.filter((objeto) => objeto.type === tipo).length + 1;

  useEffect(() => {
    // El borrador queda en este navegador; el JSON permite moverlo manualmente.
    localStorage.setItem(STORAGE_KEY, serializeSceneDocument(state.objects));
  }, [state.objects]);

  useEffect(() => {
    const tecla = (event: KeyboardEvent) => {
      if (event.key === "Escape") { dispatch({ type: "setPlacement", objectType: null }); setPreview(null); }
      if ((event.key === "Delete" || event.key === "Backspace") && state.selectedId && !(event.target instanceof HTMLInputElement)) {
        dispatch({ type: "remove", id: state.selectedId });
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [state.selectedId]);

  const crear = (tipo: TipoObjeto, position: Vector3 = [0, 0, 0]) => {
    const objeto = crearObjetoEscena(tipo, crearIdEscena(), numero(tipo), position, tipo === "bench" ? ["asiento_01", "asiento_02", "asiento_03", "soporte_01", "soporte_02"] : []);
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
      dispatch({ type: "import", objects: documento.objects });
      setAviso(`${documento.objects.length} objetos importados correctamente.`);
    } catch (error) { setAviso(error instanceof Error ? error.message : "No se pudo leer el escenario."); }
    event.target.value = "";
  };

  const cambiarVector = (objeto: SceneObject, campo: "position" | "rotation", indice: number, valor: number) => {
    const actual = [...objeto.transform[campo]] as Vector3;
    actual[indice] = campo === "rotation" ? gradosARadianes(valor) : valor / 1000;
    const transform = { ...objeto.transform, [campo]: actual };
    if (transform.position[2] < 0) transform.position[2] = 0;
    dispatch({ type: "updateTransform", id: objeto.id, transform });
  };

  const actualizarNombre = (objeto: SceneObject, name: string) => dispatch({ type: "updateObject", id: objeto.id, changes: { name } });
  const actualizarMasa = (objeto: SceneObject, massKg: number) => dispatch({ type: "updateObject", id: objeto.id, changes: { properties: { ...objeto.properties, massKg } } });
  const actualizarDimension = (objeto: SceneObject, indice: number, valor: number) => {
    const dimensionsMm = [...objeto.dimensionsMm] as Vector3;
    dimensionsMm[indice] = Math.max(1, valor);
    dispatch({ type: "updateObject", id: objeto.id, changes: { dimensionsMm } });
  };
  const ponerEnEscena = (position: Vector3) => {
    if (state.placementType) crear(state.placementType, [position[0], position[1], Math.max(0, position[2])]);
    dispatch({ type: "setPlacement", objectType: null }); setPreview(null); setAviso("Objeto colocado en el plano visual del suelo (Z = 0).");
  };

  return <main className="app-shell">
    <header className="topbar"><div><span className="brand-mark">BP</span><div><strong>BancaPET</strong><small>Editor de escenarios · Prueba 004</small></div></div>
      <div className="file-actions"><button onClick={exportar}>Exportar JSON</button><button onClick={() => importInput.current?.click()}>Importar JSON</button><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importar} /></div>
    </header>
    <section className="workspace">
      <aside className="sidebar library"><h2>Biblioteca</h2><p className="muted">Agregar objeto</p>
        {(Object.keys(labels) as TipoObjeto[]).map((tipo) => <article className="library-card" key={tipo}><div className={`object-icon ${tipo}`}>{tipo === "bench" ? "▰" : tipo === "person" ? "♙" : "◼"}</div><div><strong>{labels[tipo]}</strong><small>{tipo === "bench" ? "Modelo CAD · GLB" : tipo === "person" ? "Figura provisional · 75 kg" : "200 × 200 × 200 mm · 20 kg"}</small></div><button aria-label={`Agregar ${labels[tipo]}`} onClick={() => iniciarColocacion(tipo)}>+</button></article>)}
        <div className="placement-help">{state.placementType ? <><b>Modo colocar</b><span>Haz clic en el plano para fijar el objeto.</span><button onClick={() => { dispatch({ type: "setPlacement", objectType: null }); setPreview(null); }}>Cancelar · Esc</button></> : <span>Selecciona un objeto y usa los controles para moverlo o rotarlo.</span>}</div>
      </aside>
      <section className="viewport" aria-label="Vista 3D del escenario">
        <div className="viewport-toolbar"><span>ESCENARIO 3D</span><div>
          {(["iso", "front", "side", "top"] as CameraView[]).map((view) => <button key={view} className={cameraView === view ? "active" : ""} onClick={() => setCameraView(view)}>{({ iso: "Isométrica", front: "Frontal", side: "Lateral", top: "Superior" })[view]}</button>)}
          <button className={state.transformMode === "translate" ? "active" : ""} onClick={() => dispatch({ type: "setTransformMode", mode: "translate" })}>Mover</button><button className={state.transformMode === "rotate" ? "active" : ""} onClick={() => dispatch({ type: "setTransformMode", mode: "rotate" })}>Rotar</button>
        </div></div>
        <SceneCanvas state={state} cameraView={cameraView} onSelect={(id) => dispatch({ type: "select", id })} onPlace={ponerEnEscena} onPreview={setPreview} onTransform={(id, position, rotation) => dispatch({ type: "updateTransform", id, transform: { ...(state.objects.find((obj) => obj.id === id)?.transform ?? { scale: [1, 1, 1] }), position: [position[0], position[1], Math.max(0, position[2])], rotation } })} onContext={(id, x, y) => dispatch({ type: "setContextMenu", menu: { objectId: id, x: Math.min(x, window.innerWidth - 190), y: Math.min(y, window.innerHeight - 160) } })} />
        {state.placementType && <div className="placement-banner">Colocando: {labels[state.placementType]} · Z = 0{preview ? ` · X ${(preview[0] * 1000).toFixed(0)} mm / Y ${(preview[1] * 1000).toFixed(0)} mm` : ""}</div>}
        {state.contextMenu && <div className="context-backdrop" onClick={() => dispatch({ type: "setContextMenu", menu: null })}><div className="context-menu" style={{ left: state.contextMenu.x, top: state.contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button onClick={() => dispatch({ type: "select", id: state.contextMenu!.objectId })}>Seleccionar · Propiedades</button>
          <button onClick={() => { dispatch({ type: "select", id: state.contextMenu!.objectId }); dispatch({ type: "setTransformMode", mode: "translate" }); }}>Mover</button>
          <button onClick={() => { dispatch({ type: "select", id: state.contextMenu!.objectId }); dispatch({ type: "setTransformMode", mode: "rotate" }); }}>Rotar</button>
          <button onClick={() => dispatch({ type: "duplicate", id: state.contextMenu!.objectId, newId: crearIdEscena() })}>Duplicar</button><button onClick={() => dispatch({ type: "toggleVisibility", id: state.contextMenu!.objectId })}>Mostrar / ocultar</button><button className="danger" onClick={() => dispatch({ type: "remove", id: state.contextMenu!.objectId })}>Eliminar</button>
        </div></div>}
        {state.placementType && <div className="canvas-pointer" onMouseMove={(event) => { const bounds = event.currentTarget.parentElement?.getBoundingClientRect(); if (bounds) setPreview([(event.clientX - bounds.left) / 1000, (event.clientY - bounds.top) / 1000, 0]); }} />}
      </section>
      <aside className="sidebar properties"><h2>Escena</h2><div className="scene-list">
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
        <p className="visual-note">Vista de colocación visual. No representa contacto físico ni análisis estructural.</p>
        <button className="delete-button" onClick={() => dispatch({ type: "remove", id: seleccion.id })}>Eliminar objeto</button>
      </> : <p className="muted">Selecciona un objeto para editar sus propiedades.</p>}</div>
      <div className="sidebar-footer"><button onClick={() => { dispatch({ type: "reset" }); setAviso("Escenario reiniciado."); }}>Reiniciar escenario</button></div></aside>
    </section>
    <footer className="statusbar"><span>{aviso || (state.placementType ? "Colocación activa" : "Listo")}</span><span>{state.objects.length} objetos · Escenario local</span></footer>
  </main>;
}

export default App;
