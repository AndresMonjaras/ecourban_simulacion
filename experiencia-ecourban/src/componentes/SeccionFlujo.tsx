import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HITOS, HITOS_NUMERADOS, MARCA_PROCESO, hitoParaProgreso } from "../datos/proceso";
import { crearLineaProceso, PROGRESO_ASENTADO, type LineaProceso } from "../escena/lineaProceso";
import { useProgresoScroll } from "../useProgresoScroll";
import { IlustracionPaso } from "./Iconos";

const EscenaProceso = lazy(() => import("../escena/EscenaProceso"));

class LimiteError extends Component<{ fallback: ReactNode; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    return this.state.fallo ? this.props.fallback : this.props.children;
  }
}

function AlFallar({ onFallo }: { onFallo: () => void }) {
  useEffect(onFallo, [onFallo]);
  return null;
}

interface Props {
  webgl: boolean;
  reducido: boolean;
  lite: boolean;
}

/**
 * Continuacion "Proceso propuesto". Un solo progreso normalizado del scroll nativo
 * gobierna la timeline (seek) y el hito activo; no hay controles ni scroll propio.
 */
export function SeccionFlujo({ webgl, reducido, lite }: Props) {
  const seccion = useRef<HTMLElement>(null);
  const linea = useRef<LineaProceso | null>(null);
  const ultimo = useRef(0);
  const activoRef = useRef(0);
  const [activo, setActivo] = useState(0);
  const [sinEscena, setSinEscena] = useState(false);
  const conEscena = webgl && !sinEscena;

  const aplicar = useCallback(
    (p: number, forzar = false) => {
      const i = hitoParaProgreso(p);
      const cambio = i !== activoRef.current;
      if (cambio) {
        activoRef.current = i;
        setActivo(i);
      }
      // Con movimiento reducido la escena salta a la pose asentada de cada hito.
      if (reducido) {
        if (cambio || forzar) linea.current?.buscar(PROGRESO_ASENTADO[i]);
      } else {
        linea.current?.buscar(p);
      }
    },
    [reducido],
  );

  useEffect(() => {
    if (!conEscena) return;
    const l = crearLineaProceso();
    linea.current = l;
    aplicar(ultimo.current, true);
    return () => {
      l.detener();
      linea.current = null;
    };
  }, [conEscena, aplicar]);

  const avanzar = useCallback(
    (p: number) => {
      ultimo.current = p;
      aplicar(p);
    },
    [aplicar],
  );
  useProgresoScroll(seccion, avanzar, conEscena);

  const hito = HITOS[activo];

  if (!conEscena) {
    return (
      <section className="flujo flujo-lista" aria-labelledby="flujo-titulo">
        <div className="flujo-lista-marco">
          <p className="flujo-sello">
            <span className="acento" aria-hidden="true" /> {MARCA_PROCESO}
          </p>
          <h2 id="flujo-titulo">Del material al mobiliario</h2>
          <p className="flujo-nota">
            Vista 2D de la secuencia propuesta: la escena 3D no se está ejecutando. EcoUrban compraría pellets ya
            reciclados; la banca es un modelo conceptual de referencia compuesto y las piezas de manufactura son ilustraciones propuestas.
          </p>
          <ol className="flujo-pasos">
            {HITOS_NUMERADOS.map((h) => (
              <li key={h.id}>
                <IlustracionPaso id={h.icono} />
                <span className="flujo-pasos-num">{h.num}</span>
                <h3>{h.etiqueta}</h3>
                <p>{h.linea}</p>
                <p className="flujo-estatus">
                  <span className="punto" aria-hidden="true" /> {h.estatus}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={seccion}
      className={reducido ? "flujo alto reducido" : "flujo alto"}
      aria-label={`${MARCA_PROCESO}: del material al mobiliario`}
      data-hito={hito.id}
    >
      <div className="flujo-escenario">
        <div className="fondo" aria-hidden="true" />
        <div className="lienzo">
          <LimiteError fallback={<AlFallar onFallo={() => setSinEscena(true)} />}>
            <Suspense fallback={null}>
              <EscenaProceso lite={lite} reducido={reducido} />
            </Suspense>
          </LimiteError>
        </div>
        <ol className="solo-lectores">
          {HITOS_NUMERADOS.map((h) => (
            <li key={h.id} aria-current={h.id === hito.id ? "step" : undefined}>
              {h.num} {h.etiqueta}. {h.linea} {h.estatus}.
            </li>
          ))}
        </ol>
        <div className="flujo-ui" aria-hidden="true">
          <p className="flujo-sello">
            <span className="acento" /> {MARCA_PROCESO}
          </p>
          <div className="flujo-pie" key={hito.id}>
            <ol className="flujo-ticks">
              {HITOS_NUMERADOS.map((h) => (
                <li key={h.id} data-on={HITOS.indexOf(h) <= activo ? "si" : "no"} data-actual={h.id === hito.id ? "si" : "no"} />
              ))}
            </ol>
            {hito.num && <p className="flujo-num">{hito.num}</p>}
            <h2 className="flujo-titulo">{hito.etiqueta}</h2>
            <p className="flujo-linea">{hito.linea}</p>
            <p className="flujo-estatus">
              <span className="punto" /> {hito.estatus}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
