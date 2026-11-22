import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, LatheGeometry, TubeGeometry, Vector2, Vector3, type Group } from "three";
import { X_MAQ, tramo } from "./EstacionesMateria";
import { caja } from "./geometriasProceso";
import { ep } from "./lineaProceso";
import { MATERIAL } from "./materialesProceso";

/**
 * Hito 02: maquina de moldeo generica propuesta (maquila externa). Se compone de
 * bastidor y gabinete con paneles, unidad de inyeccion con tolva, camara de
 * molde con tirantes y resguardo, mangueras y pies. Sin marca, medidas ni modelo.
 */

const ANG_CINTA = Math.atan2(0.88, 2.4);
const LARGO_CINTA = Math.hypot(0.88, 2.4);

// Camara de molde: centro y altura locales; las mitades se abren/cierran con ep.molde.
const CX = 0.2;
const CY = 0.8;

function Manguera({ puntos, lite }: { puntos: [number, number, number][]; lite: boolean }) {
  const geo = useMemo(() => new TubeGeometry(new CatmullRomCurve3(puntos.map((p) => new Vector3(...p))), lite ? 14 : 28, 0.014, lite ? 6 : 8), [puntos, lite]);
  useEffect(() => () => geo.dispose(), [geo]);
  const a = puntos[0];
  const b = puntos[puntos.length - 1];
  return (
    <group>
      <mesh geometry={geo} material={MATERIAL.manguera} castShadow />
      {[a, b].map((p, i) => (
        <mesh key={i} material={MATERIAL.cromo} position={p}>
          <sphereGeometry args={[0.02, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function Maquila({ lite }: { lite: boolean }) {
  const izq = useRef<Group>(null);
  const der = useRef<Group>(null);
  const relleno = useRef<Group>(null);
  const piezaMolde = useRef<Group>(null);
  const seg = lite ? 10 : 18;
  const tolva = useMemo(
    () =>
      new LatheGeometry(
        [new Vector2(0.065, 0), new Vector2(0.07, 0.04), new Vector2(0.07, 0.16), new Vector2(0.25, 0.4), new Vector2(0.272, 0.42), new Vector2(0.272, 0.448), new Vector2(0.262, 0.452)],
        lite ? 18 : 40,
      ),
    [lite],
  );
  useEffect(() => () => tolva.dispose(), [tolva]);
  const mangueras = useMemo<[number, number, number][][]>(
    () => [
      [[-0.78, 0.52, 0.3], [-0.9, 0.42, 0.5], [-0.62, 0.3, 0.5], [-0.5, 0.36, 0.4]],
      [[0.92, 0.55, 0.28], [1.1, 0.5, 0.46], [1.02, 0.28, 0.5], [0.8, 0.36, 0.4]],
    ],
    [],
  );

  useFrame(() => {
    const gap = 0.1 + (1 - ep.molde) * 0.2;
    if (izq.current) izq.current.position.x = -(gap / 2 + 0.18);
    if (der.current) der.current.position.x = gap / 2 + 0.18;
    if (relleno.current) {
      const f = tramo(ep.tolva, 0, 1);
      relleno.current.scale.set(1, Math.max(0.001, f), 1);
      relleno.current.visible = f > 0.01;
    }
    if (piezaMolde.current) {
      const compresion = tramo(ep.compresion, 0, 1);
      piezaMolde.current.scale.set(1 - compresion * 0.6, 1 + compresion * 0.12, 1);
      piezaMolde.current.position.set(CX + ep.salida * 0.6, CY, 0);
      piezaMolde.current.visible = ep.tolva > 0.62 && ep.salida < 0.995;
    }
  });

  const cb = (w: number, h: number, d: number, r = 0.008) => caja(w, h, d, r, lite);

  return (
    <group>
      {/* cinta transportadora generica: bandeja -> tolva */}
      <group position={[(4.5 + 6.9) / 2 + 0.05, (0.74 + 1.62) / 2, 0]} rotation={[0, 0, ANG_CINTA]}>
        <mesh geometry={cb(LARGO_CINTA, 0.03, 0.28, 0.008)} material={MATERIAL.manguera} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={cb(LARGO_CINTA + 0.04, 0.07, 0.018, 0.006)} material={MATERIAL.maquinaClara} position={[0, 0.04, s * 0.16]} castShadow />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`r${s}`} material={MATERIAL.cromo} position={[s * (LARGO_CINTA / 2), 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.3, seg]} />
          </mesh>
        ))}
      </group>
      {[5.2, 6.2].map((x) => {
        const alto = ((x - 4.5) * 0.88) / 2.4 + 0.72;
        return (
          <group key={x} position={[x, 0, 0]}>
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={cb(0.04, alto, 0.04, 0.005)} material={MATERIAL.aceroOscuro} position={[0, alto / 2 + 0.02, s * 0.18]} castShadow />
            ))}
            <mesh geometry={cb(0.03, 0.03, 0.4, 0.004)} material={MATERIAL.aceroOscuro} position={[0, alto * 0.45, 0]} />
            <mesh geometry={cb(0.1, 0.012, 0.46, 0.004)} material={MATERIAL.maquinaClara} position={[0, 0.006, 0]} />
          </group>
        );
      })}
      {/* maquina de moldeo generica, sin marca */}
      <group position={[X_MAQ, 0, 0]}>
        {/* gabinete: pies, cuerpo, paneles de acceso, asas y rejilla */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} material={MATERIAL.maquinaClara} position={[0.025 + sx * 0.9, 0.02, sz * 0.3]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 0.04, seg]} />
            </mesh>
          )),
        )}
        <mesh geometry={cb(2.05, 0.46, 0.76, 0.03)} material={MATERIAL.maquina} position={[0.025, 0.27, 0]} castShadow receiveShadow />
        {[-0.62, 0.0, 0.62].map((x, i) => (
          <group key={x} position={[0.0 + x + (i === 2 ? 0.08 : 0), 0.27, 0.385]}>
            <mesh geometry={cb(0.52, 0.33, 0.014, 0.005)} material={MATERIAL.maquinaPanel} receiveShadow />
            {i === 0 ? (
              [-0.1, -0.05, 0, 0.05, 0.1].map((y) => (
                <mesh key={y} geometry={cb(0.34, 0.012, 0.006, 0.002)} material={MATERIAL.hueco} position={[0, y, 0.008]} />
              ))
            ) : (
              <mesh geometry={cb(0.12, 0.018, 0.022, 0.006)} material={MATERIAL.cromo} position={[0.17, 0.0, 0.016]} />
            )}
          </group>
        ))}
        <mesh geometry={cb(2.0, 0.025, 0.7, 0.008)} material={MATERIAL.maquinaPanel} position={[0.025, 0.512, 0]} castShadow />

        {/* unidad de inyeccion: bloque motor, cilindro con resistencias y boquilla */}
        <mesh geometry={cb(0.5, 0.4, 0.52, 0.03)} material={MATERIAL.maquina} position={[-0.75, 0.72, 0]} castShadow receiveShadow />
        <mesh geometry={cb(0.38, 0.05, 0.4, 0.012)} material={MATERIAL.maquinaPanel} position={[-0.75, 0.94, 0]} />
        <mesh material={MATERIAL.aceroOscuro} position={[-0.32, CY - 0.08, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.22, seg + 4]} />
        </mesh>
        {[-0.4, -0.33, -0.26].map((x) => (
          <mesh key={x} material={MATERIAL.moldeOscuro} position={[x, CY - 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.079, 0.079, 0.05, seg + 4]} />
          </mesh>
        ))}
        <mesh material={MATERIAL.cromo} position={[-0.19, CY - 0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.03, 0.06, seg]} />
        </mesh>

        {/* camara de molde: extremos fijos, tirantes, mitades con placa, guias y resguardo */}
        {[-0.4, 0.8].map((x) => (
          <mesh key={x} geometry={cb(0.07, 0.52, 0.54, 0.012)} material={MATERIAL.maquinaPanel} position={[x, CY, 0]} castShadow receiveShadow />
        ))}
        {[-1, 1].flatMap((sy) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sy}${sz}`} material={MATERIAL.cromo} position={[CX, CY + sy * 0.19, sz * 0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.016, 0.016, 1.2, seg]} />
            </mesh>
          )),
        )}
        <group position={[CX, CY, 0]}>
          <group ref={izq}>
            <mesh geometry={cb(0.34, 0.34, 0.16, 0.012)} material={MATERIAL.molde} castShadow receiveShadow />
            <mesh geometry={cb(0.04, 0.43, 0.43, 0.008)} material={MATERIAL.moldeOscuro} position={[-0.19, 0, 0]} castShadow />
            <mesh geometry={cb(0.012, 0.18, 0.09, 0.003)} material={MATERIAL.moldeOscuro} position={[0.171, 0, 0]} />
            {[-1, 1].map((s) => (
              <mesh key={s} material={MATERIAL.cromo} position={[0.19, s * 0.11, 0.05]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, 0.04, 8]} />
              </mesh>
            ))}
          </group>
          <group ref={der}>
            <mesh geometry={cb(0.34, 0.34, 0.16, 0.012)} material={MATERIAL.molde} castShadow receiveShadow />
            <mesh geometry={cb(0.04, 0.43, 0.43, 0.008)} material={MATERIAL.moldeOscuro} position={[0.19, 0, 0]} castShadow />
            <mesh geometry={cb(0.012, 0.18, 0.09, 0.003)} material={MATERIAL.moldeOscuro} position={[-0.171, 0, 0]} />
            {[-1, 1].map((s) => (
              <mesh key={s} material={MATERIAL.moldeOscuro} position={[-0.19, s * 0.11, 0.05]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.013, 0.013, 0.03, 8]} />
              </mesh>
            ))}
          </group>
        </group>
        {/* Preforma visible en el molde: se comprime y permanece compacta hasta ser expulsada. */}
        <group ref={piezaMolde} position={[CX, CY, 0]} visible={false}>
          <mesh geometry={cb(0.24, 0.18, 0.24, 0.02)} material={MATERIAL.plasticoReciclado} castShadow />
        </group>
        {/* cilindro de cierre y vastago al extremo derecho */}
        <mesh geometry={cb(0.22, 0.34, 0.36, 0.03)} material={MATERIAL.maquina} position={[0.95, CY, 0]} castShadow receiveShadow />
        <mesh material={MATERIAL.cromo} position={[0.86, CY, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, seg]} />
        </mesh>
        {/* resguardo: marco de aluminio con panel transparente y tirador */}
        <group position={[CX, CY, 0.33]}>
          <mesh geometry={cb(1.26, 0.04, 0.04, 0.008)} material={MATERIAL.maquinaClara} position={[0, 0.28, 0]} castShadow />
          <mesh geometry={cb(1.26, 0.04, 0.04, 0.008)} material={MATERIAL.maquinaClara} position={[0, -0.28, 0]} castShadow />
          {[-0.62, 0.62].map((x) => (
            <mesh key={x} geometry={cb(0.04, 0.6, 0.04, 0.008)} material={MATERIAL.maquinaClara} position={[x, 0, 0]} castShadow />
          ))}
          <mesh geometry={cb(1.2, 0.52, 0.012, 0.002)} material={MATERIAL.acrilico} position={[0, 0, 0.004]} />
          <mesh geometry={cb(0.028, 0.2, 0.03, 0.008)} material={MATERIAL.cromo} position={[0.52, 0, 0.04]} />
          {[-0.08, 0.08].map((y) => (
            <mesh key={y} geometry={cb(0.016, 0.016, 0.032, 0.003)} material={MATERIAL.cromo} position={[0.52, y, 0.022]} />
          ))}
        </group>
        {[-0.4, 0.8].map((x) => (
          <mesh key={x} geometry={cb(0.05, 0.04, 0.6, 0.008)} material={MATERIAL.maquinaClara} position={[x, CY + 0.3, 0]} />
        ))}

        {/* mangueras y conectores */}
        {mangueras.map((pts, i) => (
          <Manguera key={i} puntos={pts} lite={lite} />
        ))}

        {/* tolva */}
        <group position={[-0.75, 0.96, 0]}>
          <mesh geometry={tolva} material={MATERIAL.acero} castShadow />
          <mesh material={MATERIAL.cromo} position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.082, 0.082, 0.025, seg + 6]} />
          </mesh>
          <mesh material={MATERIAL.moldeOscuro} position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.01, seg + 12]} />
          </mesh>
          <group ref={relleno} position={[0, 0.26, 0]} visible={false}>
            <mesh material={MATERIAL.viruta} position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.22, 0.14, 0.12, lite ? 14 : 24]} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh material={MATERIAL.tapete} position={[X_MAQ, 0.004, 0]} receiveShadow>
        <boxGeometry args={[2.6, 0.008, 1.5]} />
      </mesh>
    </group>
  );
}
