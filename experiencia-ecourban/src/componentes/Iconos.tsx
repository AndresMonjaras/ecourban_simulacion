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
