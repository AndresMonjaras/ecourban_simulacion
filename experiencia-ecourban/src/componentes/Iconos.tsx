const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconoGrupo({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...trazo}>
      {id === "respaldo" && (
        <>
          <rect x="4" y="3" width="12" height="5" rx="1.5" />
          <path d="M10 8v5M7 21h6M10 13v8M17 6h3v6" />
        </>
      )}
      {id === "asiento" && (
        <>
          <path d="M3 10h18M5 10l-1 6M19 10l1 6M8 10v6M12 10v6M16 10v6" />
          <path d="M4 16h16" />
        </>
      )}
      {id === "soportes" && (
        <>
          <path d="M12 3l9 4-9 4-9-4z" />
          <path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
        </>
      )}
    </svg>
  );
}

export function IlustracionPaso({ id }: { id: string }) {
  const g = "#1d5a33";
  const n = "#2b2d2c";
  const c = "#d9cdb8";
  return (
    <svg viewBox="0 0 200 90" className="paso-ilustracion" aria-hidden="true" focusable="false">
      {id === "pellets" && (
        <>
          <path d="M70 30h60l6 48H64z" fill={c} stroke="#a89a82" strokeWidth="2" />
          <path d="M82 30c0-14 4-18 8-18M118 30c0-14-4-18-8-18" fill="none" stroke={g} strokeWidth="4" strokeLinecap="round" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={20 + ((i * 37) % 160)} cy={64 + ((i * 13) % 20)} r="4" fill="#fbf7ef" stroke="#cfc6b3" />
          ))}
        </>
      )}
      {id === "secado" && (
        <>
          <path d="M52 20h56l-5 36H57zM59 57h42l-12 22H71z" fill="#c8d3cd" stroke="#718079" strokeWidth="2" />
          <rect x="65" y="13" width="30" height="8" rx="2" fill={n} />
          <path d="M122 22h31v48h-31zM127 17h21v7" fill="#d5ded9" stroke="#718079" strokeWidth="2" />
          <path d="M106 30h16M106 38h16" stroke={g} strokeWidth="4" />
          {[0,1,2,3,4].map(i => <circle key={i} cx={68 + i * 7} cy={65 + (i % 2) * 7} r="3" fill={c} />)}
        </>
      )}
      {id === "dosificacion" && (
        <>
          {[35,78,121].map((x,i) => <g key={x}><path d={`M${x} 16h30v28l-15 18-15-18z`} fill={i===1?"#94c8a8":"#c8d3cd"} stroke="#718079" strokeWidth="2" /><rect x={x+3} y="62" width="24" height="14" rx="3" fill={n} /></g>)}
          <path d="M49 78h88M64 77l12 8 12-8 12 8 12-8 12 8" fill="none" stroke={g} strokeWidth="4" />
        </>
      )}
      {id === "extrusion" && (
        <>
          <rect x="30" y="39" width="125" height="28" rx="8" fill="#aeb9b3" stroke="#64716a" strokeWidth="3" />
          <path d="M42 52h99M47 44l14 16 14-16 14 16 14-16 14 16 14-16" fill="none" stroke={n} strokeWidth="4" />
          <path d="M62 39V22h31v17M136 32h26" fill="none" stroke={g} strokeWidth="6" />
          <circle cx="43" cy="53" r="18" fill="none" stroke={n} strokeWidth="7" />
        </>
      )}
      {id === "peletizado" && (
        <>
          <rect x="25" y="42" width="96" height="34" rx="5" fill="#c8d3cd" stroke="#718079" strokeWidth="2" />
          <circle cx="132" cy="50" r="23" fill="#d7ded9" stroke={g} strokeWidth="5" />
          <path d="M132 27v46M109 50h46M116 34l32 32M148 34l-32 32" stroke={n} strokeWidth="3" />
          {[0,1,2,3,4,5,6].map(i => <circle key={i} cx={135+(i%3)*12} cy={77+Math.floor(i/3)*5} r="3.5" fill={c} stroke="#aa9e89" />)}
        </>
      )}
      {id === "moldes" && (
        <>
          {[28,78,128].map((x,i) => <g key={x}><rect x={x} y="26" width="42" height="47" rx="4" fill="#9ca6a1" stroke="#56625d" strokeWidth="3" /><rect x={x+7} y="34" width="28" height="7" rx="3" fill="#39443f"/><path d={`M${x+7} 55h28`} stroke={g} strokeWidth={5}/></g>)}
        </>
      )}
      {id === "compresion" && (
        <>
          <path d="M37 15h126v14H37zM42 72h116v10H42zM52 29v43M148 29v43" fill="#aeb9b3" stroke="#64716a" strokeWidth="2" />
          <rect x="88" y="28" width="24" height="30" rx="4" fill={n}/><path d="M100 58v12" stroke={n} strokeWidth="8"/>
          <rect x="74" y="68" width="52" height="7" fill={g}/>
        </>
      )}
      {id === "enfriamiento" && (
        <>
          <rect x="39" y="59" width="122" height="15" rx="4" fill="#7d8882"/>
          <rect x="76" y="48" width="49" height="9" rx="3" fill={g}/>
          {[60,139].map(x => <g key={x}><circle cx={x} cy="32" r="17" fill="#d1d9d4" stroke="#75827a" strokeWidth="2"/><path d={`M${x} 16v32M${x-16} 32h32`} stroke={n} strokeWidth="3"/></g>)}
        </>
      )}
      {id === "maquila" && (
        <>
          <path d="M20 40l80-22 80 22v40H20z" fill="#e7e2d6" stroke="#a89a82" strokeWidth="2" />
          <rect x="70" y="50" width="60" height="30" fill="#3b3b38" />
          <path d="M60 78l60-22M80 80l60-22M100 80l60-22" stroke={n} strokeWidth="9" />
        </>
      )}
      {id === "corte" && (
        <>
          <circle cx="62" cy="44" r="26" fill="#f3efe4" stroke={g} strokeWidth="8" />
          <rect x="20" y="68" width="100" height="10" fill={n} />
          <rect x="132" y="22" width="30" height="16" fill={g} />
          <path d="M147 38v34" stroke="#555" strokeWidth="5" />
          <rect x="128" y="72" width="40" height="8" fill={n} />
        </>
      )}
      {id === "ensamble" && (
        <>
          <rect x="50" y="8" width="100" height="7" fill={n} />
          <rect x="44" y="22" width="112" height="7" fill={n} />
          <rect x="38" y="36" width="124" height="7" fill={n} />
          <path d="M30 56h20v22H30zM150 56h20v22h-20z" fill={g} />
          <path d="M50 60h100" stroke="#999" strokeWidth="5" />
          <path d="M85 70v14M115 70v14" stroke="#888" strokeWidth="5" />
        </>
      )}
      {id === "entrega" && (
        <>
          <rect x="20" y="40" width="50" height="38" fill="#c79a5e" stroke="#9c7440" strokeWidth="2" />
          <rect x="84" y="28" width="62" height="46" fill="#efe9da" stroke="#a89a82" strokeWidth="2" />
          <path d="M146 40h22l10 18v16h-32z" fill="#f6f1e4" stroke="#a89a82" strokeWidth="2" />
          <circle cx="104" cy="78" r="8" fill="#333" />
          <circle cx="160" cy="78" r="8" fill="#333" />
        </>
      )}
      {id === "inspeccion" && (
        <>
          <path d="M50 60h100M58 60V34h84v26M67 34V20h66v14" fill="none" stroke={n} strokeWidth="8" strokeLinejoin="round" />
          <path d="M62 67h76" stroke={g} strokeWidth="7" />
          <circle cx="147" cy="25" r="17" fill="none" stroke="#aeb9b3" strokeWidth="6"/><path d="m159 38 17 17" stroke="#aeb9b3" strokeWidth="6" strokeLinecap="round"/>
          <path d="m79 47 10 9 18-20" fill="none" stroke="#78b78d" strokeWidth="4" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

/** Representacion estatica del concepto para el fallback sin WebGL (render estatico 2D referencial, no refleja el despiece 3D nuevo). */
export function BancaEstatica() {
  return (
    <img
      className="banca-svg"
      src={`${import.meta.env.BASE_URL}models/banca-oficial-estatica.webp`}
      width={1000}
      height={660}
      alt="Representación estática del concepto de la banca de PET reciclado en vista 2D referencial"
    />
  );
}
