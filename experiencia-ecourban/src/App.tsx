import { useMemo, useState } from "react";
import { FichaPieza } from "./componentes/FichaPieza";
import { SeccionDespiece } from "./componentes/SeccionDespiece";
import { SeccionFlujo } from "./componentes/SeccionFlujo";
import { FICHAS, type GrupoId } from "./datos/contenido";
import { useMediaQuery, webglDisponible } from "./useProgresoScroll";

export default function App() {
  const reducido = useMediaQuery("(prefers-reduced-motion: reduce)");
  const lite = useMediaQuery("(max-width: 720px), (pointer: coarse)");
  const webgl = useMemo(webglDisponible, []);
  const [capitulo, setCapitulo] = useState<GrupoId | null>(null);
  const fichaActiva = useMemo(() => FICHAS.find((f) => f.id === capitulo) ?? null, [capitulo]);

  return (
    <>
      <header className="marca">
        <span>EcoUrban</span>
      </header>
      <main>
        <SeccionDespiece
          webgl={webgl}
          reducido={reducido}
          lite={lite}
          capitulo={capitulo}
          alCambiarCapitulo={setCapitulo}
        />
        <SeccionFlujo webgl={webgl} reducido={reducido} lite={lite} />
      </main>
      <FichaPieza ficha={fichaActiva} reducido={reducido} />
    </>
  );
}
