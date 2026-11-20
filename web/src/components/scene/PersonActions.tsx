import type { SceneObject } from "../../types/scene.ts";
import "./PersonActions.css";

type Props = {
  objects: SceneObject[];
  selectedId: string | null;
  walking: boolean;
  onSelect: (id: string | null) => void;
  onWalk: (id: string | null) => void;
};

export default function PersonActions({ objects, selectedId, walking, onSelect, onWalk }: Props) {
  return <div className="person-actions">
    <label htmlFor="walking-person">Persona para la demostración</label>
    <select id="walking-person" value={selectedId ?? ""} disabled={walking} onChange={(event) => onSelect(event.target.value || null)}>
      <option value="">Seleccionar maniquí…</option>
      {objects.filter((object) => object.type === "person" && object.visible).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
    <button disabled={walking || !selectedId} onClick={() => onWalk(selectedId)}>{walking ? "Caminando…" : "Caminar a la banca y sentarse"}</button>
  </div>;
}
