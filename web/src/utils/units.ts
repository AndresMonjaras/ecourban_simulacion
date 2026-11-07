export function milimetrosAMetros(valor: number): number {
  return valor / 1000;
}

export function metrosAMilimetros(valor: number): number {
  return valor * 1000;
}

// Three guarda ángulos en radianes; el panel muestra grados.
export function gradosARadianes(valor: number): number {
  return (valor * Math.PI) / 180;
}

export function radianesAGrados(valor: number): number {
  return (valor * 180) / Math.PI;
}
