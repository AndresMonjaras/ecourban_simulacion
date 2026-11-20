import { useMemo } from "react";
import { kitBanca } from "./kitBanca";
import { caja } from "./geometriasProceso";
import { MATERIAL } from "./materialesProceso";

/** Mobiliario generico de las estaciones: mesa de trabajo con estante y bandeja de tornilleria. */

export function Mesa({ x, ancho, fondo, alto, lite = false }: { x: number; ancho: number; fondo: number; alto: number; lite?: boolean }) {
  const pata = 0.05;
  const px = ancho / 2 - 0.05;
  const pz = fondo / 2 - 0.05;
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={caja(ancho, 0.04, fondo, 0.012, lite)} material={MATERIAL.mesa} position={[0, alto - 0.02, 0]} castShadow receiveShadow />
      {/* faldon perimetral y estante inferior */}
      {[-1, 1].map((s) => (
        <mesh key={`f${s}`} geometry={caja(ancho - 0.1, 0.06, 0.02, 0.005, lite)} material={MATERIAL.aceroOscuro} position={[0, alto - 0.07, s * pz]} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} geometry={caja(0.02, 0.06, fondo - 0.1, 0.005, lite)} material={MATERIAL.aceroOscuro} position={[s * px, alto - 0.07, 0]} />
      ))}
      <mesh geometry={caja(ancho - 0.12, 0.02, fondo - 0.12, 0.006, lite)} material={MATERIAL.mesa} position={[0, 0.16, 0]} receiveShadow />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * px, 0, sz * pz]}>
            <mesh geometry={caja(pata, alto - 0.05, pata, 0.006, lite)} material={MATERIAL.aceroOscuro} position={[0, (alto - 0.04) / 2 + 0.01, 0]} castShadow />
            <mesh material={MATERIAL.maquinaClara} position={[0, 0.006, 0]}>
              <cylinderGeometry args={[0.03, 0.034, 0.012, lite ? 8 : 14]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

/** Bandeja de acero con tornilleria conceptual (cabezas del mismo tornillo de la banca). */
export function BandejaTornillos({ x, z, y = 0.5, lite }: { x: number; z: number; y?: number; lite: boolean }) {
  const k = kitBanca(lite);
  const tornillos = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: ((i % 3) - 1) * 0.085 + (i % 2) * 0.01, z: (Math.floor(i / 3) - 1) * 0.055, r: i * 0.9 })),
    [],
  );
  return (
    <group position={[x, y, z]}>
      <mesh geometry={caja(0.36, 0.012, 0.24, 0.005, lite)} material={MATERIAL.acero} position={[0, 0.006, 0]} receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={`a${s}`} geometry={caja(0.36, 0.034, 0.012, 0.004, lite)} material={MATERIAL.acero} position={[0, 0.017, s * 0.114]} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} geometry={caja(0.012, 0.034, 0.24, 0.004, lite)} material={MATERIAL.acero} position={[s * 0.174, 0.017, 0]} />
      ))}
      {tornillos.map((t, i) => (
        <group key={i} position={[t.x, 0.0125, t.z]} rotation={[Math.PI / 2, 0, t.r]} scale={1.5}>
          <mesh geometry={k.tornillo.acero} material={k.tornillo.material} />
          <mesh material={MATERIAL.cromo} position={[0, -0.012, 0]}>
            <cylinderGeometry args={[0.0034, 0.0034, 0.024, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
