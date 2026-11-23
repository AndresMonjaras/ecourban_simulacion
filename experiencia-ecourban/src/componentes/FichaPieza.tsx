import { useState } from "react";
import type { Ficha } from "../datos/contenido";

interface Props {
  ficha: Ficha | null;
  reducido: boolean;
}

/**
 * Anotacion editorial solo de lectura: aparece al cambiar de capitulo por scroll.
 * Sin botones ni dialogo; la region viva permanece montada para anunciar cada cambio.
 */
export function FichaPieza({ ficha, reducido }: Props) {
  // Conserva la ultima ficha para que la salida se desvanezca junto al retorno de camara.
  const [previa, setPrevia] = useState<Ficha | null>(ficha);
  if (ficha && ficha !== previa) setPrevia(ficha);
  const visible = ficha ?? previa;

  return (
    <aside
      className="ficha"
      data-estado={ficha ? "activa" : "oculta"}
      data-reducido={reducido || undefined}
      aria-label="Anotación de la pieza"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="ficha-guia" aria-hidden="true" />
      {visible && (
        <div className="ficha-cuerpo" key={visible.id} aria-hidden={ficha ? undefined : true}>
          <p className="ficha-etiqueta">{visible.etiqueta}</p>
          <h2 className="ficha-titulo">{visible.titulo}</h2>
          <p className="ficha-funcion">
            <span className="ficha-clave">Función</span> {visible.funcion}
          </p>
          <p className="ficha-material">{visible.material}</p>
        </div>
      )}
    </aside>
  );
}
