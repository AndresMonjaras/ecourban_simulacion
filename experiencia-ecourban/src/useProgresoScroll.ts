import { useEffect, useState, type RefObject } from "react";

/**
 * Convierte el scroll nativo en progreso 0..1 de una seccion alta con
 * contenido sticky. No intercepta ni modifica el scroll.
 */
export function useProgresoScroll(
  ref: RefObject<HTMLElement | null>,
  alAvanzar: (p: number) => void,
  activo: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !activo) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const recorrido = Math.max(1, r.height - window.innerHeight);
      alAvanzar(Math.min(1, Math.max(0, -r.top / recorrido)));
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, alAvanzar, activo]);
}

export function useMediaQuery(consulta: string): boolean {
  const leer = () => typeof window !== "undefined" && window.matchMedia(consulta).matches;
  const [valor, setValor] = useState(leer);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const f = () => setValor(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [consulta]);
  return valor;
}

export function webglDisponible(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
