import { BancaOficial } from "./bancaOficial";
import { ep } from "./lineaProceso";

/**
 * Banca del proceso (banca-claude-texturas-v2.glb). Modelo conceptual compuesto ensamblado.
 * Permite revelado de abajo a arriba con ep.ensamble sin registrar partes en la
 * experiencia de scroll principal para evitar contaminacion de estado.
 */
interface Props {
  x: number;
  giro?: number;
  /** Si es true la banca queda completa; si no, se revela segun la timeline (ep). */
  armada?: boolean;
  lite: boolean;
  progresivo?: boolean;
}

const revelar = () => ep.ensamble;

export function BancaProceso({ x, giro = 0, armada = false, lite, progresivo = false }: Props) {
  return (
    <group position={[x, 0, 0]} rotation={[0, giro, 0]}>
      <BancaOficial
        sombras={!lite}
        revelado={armada || progresivo ? null : revelar}
        registrarPartes={false}
        ensambleProgresivo={progresivo}
      />
    </group>
  );
}
