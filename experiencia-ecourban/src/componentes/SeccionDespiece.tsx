import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FICHAS, type GrupoId } from "../datos/contenido";
import { almacen } from "../escena/almacen";
import { aplicarPoseEstatica, crearLineaDespiece } from "../escena/despiece";
import { aplicarEnfasisCapitulo, capituloParaProgreso, indicadorParaProgreso } from "../escena/enfoque";
import { useProgresoScroll } from "../useProgresoScroll";
import { BancaEstatica, IconoGrupo } from "./Iconos";

const Escena = lazy(() => import("../escena/Escena"));

/** Mantiene el parque durante el despiece y lo funde al estudio al cerrar el recorrido. */
const P_INICIO_FUNDIDO_PARQUE = 0.9;
// El modelo ya regresó al encuadre base en 0.94; desde aquí la banca coincide con el puente de fabricación.
const P_INICIO_FUNDIDO_ESCENA = 0.945;

function calcularParque(p: number): number {
  const t = Math.min(1, Math.max(0, (p - P_INICIO_FUNDIDO_PARQUE) / (1 - P_INICIO_FUNDIDO_PARQUE)));
  return 1 - t * t * (3 - 2 * t);
}

/** Todo el movimiento ambiental es funcion pura del progreso (sin tiempo ni azar); con movimiento reducido queda estatico. */
function fijarAmbiente(el: HTMLElement | null, p: number, reducido: boolean) {
  if (!el) return;
  const q = reducido ? 0 : Math.min(p / P_INICIO_FUNDIDO_PARQUE, 1) * 0.24;
  const profundidad = q / 0.24;
  const f = (v: number) => v.toFixed(3);
  const parque = calcularParque(p);
  el.style.setProperty("--parque", f(parque));
  // Reserva el último tramo para fundir la banca con la escena de fabricación.
  const salida = 1 - Math.min(1, Math.max(0, (p - P_INICIO_FUNDIDO_ESCENA) / (1 - P_INICIO_FUNDIDO_ESCENA)));
  el.style.setProperty("--despiece-visible", f(salida * salida * (3 - 2 * salida)));
  document.documentElement.style.setProperty("--ambiente-taller", f(1 - parque));
  el.style.setProperty("--par-x", f(-q * 70));
  el.style.setProperty("--par-s", f(1 + q * 0.12));
  el.style.setProperty("--par-sway", f(Math.sin(q * 60) * 0.35));
  el.style.setProperty("--par-sx", f(Math.sin(q * 38 + 1) * 3.5));
  el.style.setProperty("--par-l", f(30 + q * 160));
  el.style.setProperty("--par-l2", f(Math.sin(q * 45) * 6));
  // Los planos reciben desplazamientos distintos, pero todos dependen del mismo scroll.
  el.style.setProperty("--par-fondo-x", f(-profundidad * 5));
  el.style.setProperty("--par-medio-x", f(-profundidad * 13));
  el.style.setProperty("--par-frente-x", f(-profundidad * 22));
  el.style.setProperty("--par-s-fondo", f(1 + profundidad * 0.04));
  el.style.setProperty("--par-s-medio", f(1 + profundidad * 0.08));
  el.style.setProperty("--par-s-frente", f(1 + profundidad * 0.13));
  el.style.setProperty("--par-bruma-x", f(Math.sin(profundidad * 9) * 14 - profundidad * 28));
  el.style.setProperty("--par-bruma-y", f(profundidad * 9));
  el.style.setProperty("--par-bruma-op", f(0.85 + Math.sin(profundidad * 7) * 0.15));
  el.style.setProperty("--par-luz-x", f(profundidad * 32));
  el.style.setProperty("--par-luz-rot", f(Math.sin(profundidad * 6) * 3));
}

const P_INICIO_CIERRE = 2960 / 3600; // ~0.822222: inicio del tramo de cierre

function calcularCierre(p: number): number {
  if (p <= P_INICIO_CIERRE) return 0;
  if (p >= 1) return 1;
  return (p - P_INICIO_CIERRE) / (1 - P_INICIO_CIERRE);
}

class LimiteError extends Component<{ fallback: ReactNode; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    return this.state.fallo ? this.props.fallback : this.props.children;
  }
}

interface Props {
  webgl: boolean;
  reducido: boolean;
  lite: boolean;
  capitulo: GrupoId | null;
  alCambiarCapitulo: (id: GrupoId | null) => void;
}

export function SeccionDespiece({ webgl, reducido, lite, capitulo, alCambiarCapitulo }: Props) {
  const seccion = useRef<HTMLElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const linea = useRef<ReturnType<typeof crearLineaDespiece> | null>(null);
  const ultimoProgreso = useRef(0);
  const capituloActual = useRef<GrupoId | null>(capitulo);
  const indicadorActual = useRef<string | null>(null);
  const [sinEscena, setSinEscena] = useState(false);
  const [personaPreparada, setPersonaPreparada] = useState(false);
  const personaPreparadaRef = useRef(false);
  const conEscena = webgl && !sinEscena;

  // La timeline Anime.js se crea una vez y se mueve exclusivamente con seek(progreso) del scroll.
  useEffect(() => {
    if (!conEscena) return;
    const el = escenario.current;
    if (reducido) {
      const estatica = () => {
        const p = ultimoProgreso.current;
        const c = calcularCierre(p);
        aplicarPoseEstatica(el, lite, capituloActual.current, c);
        const ind = indicadorParaProgreso(p);
        indicadorActual.current = ind;
        if (el) {
          el.dataset.indicador = ind;
          el.style.setProperty("--cierre", c.toFixed(3));
        fijarAmbiente(el, p, reducido);
          el.dataset.cierre = c > 0.001 ? "si" : "no";
        }
      };
      almacen.alMontar = estatica;
      estatica();
      return () => {
        almacen.alMontar = null;
      };
    }
    const l = crearLineaDespiece(el, lite);
    linea.current = l;
    const sincronizar = () => {
      const p = ultimoProgreso.current;
      const c = calcularCierre(p);
      l.buscar(p);
      const ind = indicadorParaProgreso(p);
      indicadorActual.current = ind;
      if (el) {
        el.dataset.indicador = ind;
        el.style.setProperty("--cierre", c.toFixed(3));
        fijarAmbiente(el, p, reducido);
        el.dataset.cierre = c > 0.001 ? "si" : "no";
      }
    };
    almacen.alMontar = sincronizar;
    sincronizar();
    return () => {
      l.detener();
      linea.current = null;
      almacen.alMontar = null;
    };
  }, [conEscena, reducido, lite]);

  useEffect(() => {
    if (conEscena) return;
    const el = escenario.current;
    const p = ultimoProgreso.current;
    const c = calcularCierre(p);
    const ind = indicadorParaProgreso(p);
    indicadorActual.current = ind;
    if (el) {
      el.dataset.indicador = ind;
      el.style.setProperty("--cierre", c.toFixed(3));
        fijarAmbiente(el, p, reducido);
      el.dataset.cierre = c > 0.001 ? "si" : "no";
    }
  }, [conEscena]);

  useEffect(() => {
    if (escenario.current) {
      escenario.current.dataset.indicador = indicadorActual.current ?? "intro";
    }
  });

  const avanzar = useCallback(
    (p: number) => {
      ultimoProgreso.current = p;
      if (!personaPreparadaRef.current && p >= 0.78) {
        personaPreparadaRef.current = true;
        setPersonaPreparada(true);
      }
      const cierre = calcularCierre(p);
      const ind = indicadorParaProgreso(p);

      if (escenario.current) {
        escenario.current.style.setProperty("--cierre", cierre.toFixed(3));
        fijarAmbiente(escenario.current, p, reducido);
        escenario.current.dataset.cierre = cierre > 0.001 ? "si" : "no";
        if (ind !== indicadorActual.current) {
          indicadorActual.current = ind;
          escenario.current.dataset.indicador = ind;
        }
      } else {
        indicadorActual.current = ind;
      }

      const nuevo = capituloParaProgreso(p, reducido || !conEscena);
      if (nuevo !== capituloActual.current) {
        capituloActual.current = nuevo;
        almacen.capitulo = nuevo;
        alCambiarCapitulo(nuevo);
        if (reducido || !conEscena) {
          aplicarEnfasisCapitulo(nuevo, escenario.current);
        }
      }
      if (conEscena && !reducido) {
        linea.current?.buscar(p);
      } else if (reducido) {
        aplicarPoseEstatica(escenario.current, lite, nuevo, cierre);
      }
    },
    [conEscena, reducido, lite, alCambiarCapitulo],
  );

  // El mismo scroll gobierna 3D, reduced-motion y fallback sin WebGL.
  useProgresoScroll(seccion, avanzar, true);

  const fichaActiva = FICHAS.find((f) => f.id === capitulo) ?? null;
  const cierreActivo = ultimoProgreso.current >= P_INICIO_CIERRE;

  const fallback = (
    <div className="fallback" data-capitulo={capitulo ?? "intro"}>
      <BancaEstatica />
      <p>
        {fichaActiva
          ? `Capítulo en vista: ${fichaActiva.etiqueta} — ${fichaActiva.titulo}`
          : cierreActivo
            ? "Modelo conceptual de la banca, completamente armado, en una visualización de referencia."
            : "Representación estática del concepto en visualización referencial (fallback 2D). Desliza para recorrer los capítulos de respaldo, asiento y soportes."}
      </p>
      <ul aria-label="Capítulos del despiece por scroll">
        {FICHAS.map((f) => (
          <li
            key={f.id}
            data-activo={capitulo === f.id ? "si" : undefined}
            aria-current={capitulo === f.id ? "step" : undefined}
          >
            <IconoGrupo id={f.id} />
            <span>{f.etiqueta}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section
      ref={seccion}
      className="despiece alto"
      aria-label="Modelo conceptual de la banca y recorrido por capítulos de despiece"
    >
      <div ref={escenario} className="escenario" data-capitulo={capitulo ?? "intro"}>
        <div className="fondo" aria-hidden="true">
          <div className="parque">
            <div className="parque-cielo" />
            <div className="parque-fondo" />
            <div className="parque-medio" />
            <div className="parque-frente" />
            <div className="parque-luz" />
            <div className="parque-bruma" />
          </div>
        </div>
        <div className="lienzo">
          {conEscena ? (
            <LimiteError fallback={<ErrorEscena onFallo={() => setSinEscena(true)} />}>
              <Suspense fallback={null}>
                <Escena lite={lite} personaPreparada={personaPreparada} />
              </Suspense>
            </LimiteError>
          ) : (
            fallback
          )}
        </div>
        <p className="solo-lectores">
          Modelo de referencia conceptual compuesto de la banca de PET reciclado. Al desplazarte, la cámara
          recorre por capítulos el respaldo, el asiento (con cuatro listones) y los soportes laterales mediante
          el despiece de sus componentes ensamblados, y concluye con la banca completamente armada. Es un
          modelo conceptual compuesto de referencia, no un CAD de fabricación verificada.
        </p>
        <span className="parque-nota">Fondo visual generado · ilustrativo, no es una locación real</span>
        <span className="sello-concepto">
          <span className="acento" aria-hidden="true" /> Concepto
        </span>
        <ol className="indicador-capitulo" aria-hidden="true">
          <li className="indicador-item" data-capitulo-item="respaldo">
            <span className="indicador-guia" aria-hidden="true" />
            <div className="indicador-contenido">
              <span className="indicador-num">01/03</span>
              <span className="indicador-sep" aria-hidden="true"> · </span>
              <span className="indicador-nombre">Respaldo</span>
            </div>
          </li>
          <li className="indicador-item" data-capitulo-item="asiento">
            <span className="indicador-guia" aria-hidden="true" />
            <div className="indicador-contenido">
              <span className="indicador-num">02/03</span>
              <span className="indicador-sep" aria-hidden="true"> · </span>
              <span className="indicador-nombre">Asiento</span>
            </div>
          </li>
          <li className="indicador-item" data-capitulo-item="soportes">
            <span className="indicador-guia" aria-hidden="true" />
            <div className="indicador-contenido">
              <span className="indicador-num">03/03</span>
              <span className="indicador-sep" aria-hidden="true"> · </span>
              <span className="indicador-nombre">Soportes</span>
            </div>
          </li>
        </ol>
        <p className="desliza" aria-hidden="true">
          Desliza
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 7l6 5 6-5M6 13l6 5 6-5" />
          </svg>
        </p>
      </div>
    </section>
  );
}

function ErrorEscena({ onFallo }: { onFallo: () => void }) {
  useEffect(onFallo, [onFallo]);
  return null;
}
