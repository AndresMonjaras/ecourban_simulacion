export function getWASDAxes(teclas: ReadonlySet<string>): [number, number] {
  if ((teclas.has("w") && teclas.has("s")) || (teclas.has("a") && teclas.has("d"))) return [0, 0];
  const adelante = Number(teclas.has("w")) - Number(teclas.has("s"));
  const lateral = Number(teclas.has("d")) - Number(teclas.has("a"));
  const longitud = Math.hypot(adelante, lateral);
  return longitud > 1 ? [adelante / longitud, lateral / longitud] : [adelante, lateral];
}
