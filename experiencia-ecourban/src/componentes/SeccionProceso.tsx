import { createTimeline } from "animejs";
import { useCallback, useEffect, useRef } from "react";
import { PASOS } from "../datos/contenido";
import { useProgresoScroll } from "../useProgresoScroll";
import { IlustracionPaso } from "./Iconos";

export function SeccionProceso({ reducido }: { reducido: boolean }) {
  const seccion = useRef<HTMLElement>(null);
  const lista = useRef<HTMLOListElement>(null);
  const linea = useRef<{ buscar: (p: number) => void } | null>(null);

  useEffect(() => {
    const ol = lista.current;
    if (!ol) return;
    const items = Array.from(ol.children) as HTMLElement[];
    if (reducido) {
      items.forEach((li) => li.style.setProperty("--on", "1"));
      ol.style.setProperty("--avance", "1");
      return;
    }
    const estado = PASOS.map(() => ({ on: 0 }));
    const total = { avance: 0 };
    const aplicar = () => {
      estado.forEach((e, i) => items[i]?.style.setProperty("--on", e.on.toFixed(3)));
      ol.style.setProperty("--avance", total.avance.toFixed(3));
    };
    const D = 1000;
    const tl = createTimeline({ autoplay: false, defaults: { ease: "outQuad" } });
    tl.add(total, { avance: 1, duration: D, ease: "linear" }, 0);
    estado.forEach((e, i) => tl.add(e, { on: 1, duration: 120 }, 40 + i * 170));
    linea.current = {
      buscar(p) {
        tl.seek(p * D);
        aplicar();
      },
    };
    aplicar();
    return () => {
      tl.pause();
      linea.current = null;
    };
  }, [reducido]);

  const avanzar = useCallback((p: number) => linea.current?.buscar(p), []);
  useProgresoScroll(seccion, avanzar, !reducido);

  return (
    <section ref={seccion} className={reducido ? "proceso" : "proceso alto"} aria-labelledby="proceso-titulo">
      <div className="proceso-marco">
        <header>
          <h2 id="proceso-titulo">Proceso propuesto</h2>
          <span className="acento" aria-hidden="true" />
          <p className="nota">
            <span className="acento" aria-hidden="true" /> Parámetros por confirmar
          </p>
        </header>
        <ol ref={lista} className="pasos">
          {PASOS.map((p, i) => (
            <li key={p.id} className="paso">
              <span className="paso-num" aria-hidden="true">
                {i + 1}
              </span>
              <IlustracionPaso id={p.id} />
              <span className="paso-etiqueta">
                <span className="acento" aria-hidden="true" />
                {p.etiqueta}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
