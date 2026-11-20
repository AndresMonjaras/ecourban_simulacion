import { FICHAS } from "../datos/contenido";
import { BancaOficial } from "./bancaOficial";

interface Props {
  lite: boolean;
}

/**
 * Banca separable (banca-claude-texturas-v2.glb).
 * Modelo de referencia conceptual compuesto con piezas independientes parentadas
 * en 9 grupos registrados en almacen.partes para despiece y retorno determinista.
 */
export function Banca({ lite }: Props) {
  return <BancaOficial sombras={!lite} registrarPartes={true} />;
}

export const PARTES_POR_FICHA = Object.fromEntries(
  FICHAS.map((f) => [f.id, f.partes]),
);
