"""Exportación GLB sencilla desde las formas CAD de FreeCAD."""
import json
import math
import os
import struct

ESCALA = 0.001


def _normalizar(v):
    largo = math.sqrt(sum(valor * valor for valor in v))
    if largo < 1e-12:
        raise ValueError("Triángulo degenerado en la malla CAD.")
    return tuple(valor / largo for valor in v)


def _restar(a, b):
    return tuple(a[i] - b[i] for i in range(3))


def _cruz(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def _rellenar(datos, caracter=b"\x00"):
    return datos + caracter * ((-len(datos)) % 4)


def exportar_componentes(objetos, ruta_glb, ruta_json, zona_asiento_mm):
    """Escribe un nodo y una malla separados por cada pieza CAD."""
    binario = bytearray()
    vistas, accesores, mallas, nodos, componentes = [], [], [], [], []

    for indice, objeto in enumerate(objetos):
        forma = objeto.Shape
        vertices, caras = forma.tessellate(0.5)
        puntos, normales, indices = [], [], []
        for cara in caras:
            a, b, c = [vertices[int(i)] for i in cara]
            pa, pb, pc = [(p.x * ESCALA, p.y * ESCALA, p.z * ESCALA) for p in (a, b, c)]
            n = _normalizar(_cruz(_restar(pb, pa), _restar(pc, pa)))
            for p in (pa, pb, pc):
                puntos.extend(p)
                normales.extend(n)
                indices.append(len(indices))

        datos_pos = b"".join(struct.pack("<3f", *puntos[i:i+3]) for i in range(0, len(puntos), 3))
        datos_norm = b"".join(struct.pack("<3f", *normales[i:i+3]) for i in range(0, len(normales), 3))
        datos_idx = b"".join(struct.pack("<I", i) for i in indices)
        offsets = []
        for datos in (datos_pos, datos_norm, datos_idx):
            while len(binario) % 4:
                binario.append(0)
            offsets.append(len(binario))
            binario.extend(datos)
        base_vista = len(vistas)
        vistas.extend([
            {"buffer": 0, "byteOffset": offsets[0], "byteLength": len(datos_pos), "target": 34962},
            {"buffer": 0, "byteOffset": offsets[1], "byteLength": len(datos_norm), "target": 34962},
            {"buffer": 0, "byteOffset": offsets[2], "byteLength": len(datos_idx), "target": 34963},
        ])
        base_acc = len(accesores)
        minimos = [min(puntos[i::3]) for i in range(3)]
        maximos = [max(puntos[i::3]) for i in range(3)]
        accesores.extend([
            {"bufferView": base_vista, "componentType": 5126, "count": len(indices), "type": "VEC3", "min": minimos, "max": maximos},
            {"bufferView": base_vista+1, "componentType": 5126, "count": len(indices), "type": "VEC3"},
            {"bufferView": base_vista+2, "componentType": 5125, "count": len(indices), "type": "SCALAR", "min": [0], "max": [len(indices)-1]},
        ])
        mallas.append({"name": objeto.ComponenteID, "primitives": [{"attributes": {"POSITION": base_acc, "NORMAL": base_acc+1}, "indices": base_acc+2, "material": 0}]})
        nodos.append({"name": objeto.ComponenteID, "mesh": indice, "extras": {"label": objeto.Label}})
        bb = forma.BoundBox
        componentes.append({
            "id": objeto.ComponenteID, "nombre": objeto.Label, "tipo": objeto.TipoComponente,
            "dimensiones_mm": [round(bb.XLength, 2), round(bb.YLength, 2), round(bb.ZLength, 2)],
            "centro_mm": [round((bb.XMin+bb.XMax)/2, 2), round((bb.YMin+bb.YMax)/2, 2), round((bb.ZMin+bb.ZMax)/2, 2)],
            "caja_mm": {"min": [bb.XMin, bb.YMin, bb.ZMin], "max": [bb.XMax, bb.YMax, bb.ZMax]},
        })

    limites_min = [min(c["caja_mm"]["min"][eje] for c in componentes) for eje in range(3)]
    limites_max = [max(c["caja_mm"]["max"][eje] for c in componentes) for eje in range(3)]
    dimensiones_totales = [limites_max[i] - limites_min[i] for i in range(3)]
    gltf = {"asset": {"version": "2.0", "generator": "BancaPET FreeCAD 1.1.4"}, "scene": 0,
            "scenes": [{"nodes": list(range(len(nodos)))}], "nodes": nodos, "meshes": mallas,
            "materials": [{"name": "PET azul", "pbrMetallicRoughness": {"baseColorFactor": [0.12, 0.43, 0.62, 1], "metallicFactor": 0.05, "roughnessFactor": 0.7}}],
            "accessors": accesores, "bufferViews": vistas, "buffers": [{"byteLength": len(binario)}]}
    json_chunk = _rellenar(json.dumps(gltf, separators=(",", ":")).encode(), b" ")
    bin_chunk = _rellenar(bytes(binario))
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    os.makedirs(os.path.dirname(ruta_glb), exist_ok=True)
    with open(ruta_glb, "wb") as salida:
        salida.write(struct.pack("<4sII", b"glTF", 2, total))
        salida.write(struct.pack("<I4s", len(json_chunk), b"JSON")); salida.write(json_chunk)
        salida.write(struct.pack("<I4s", len(bin_chunk), b"BIN\x00")); salida.write(bin_chunk)
    with open(ruta_json, "w", encoding="utf-8") as salida:
        json.dump({"unidades": "mm", "escala_glb": "m",
                   "caja_general_mm": {"min": limites_min, "max": limites_max, "dimensiones": dimensiones_totales},
                   "zona_asiento_mm": list(zona_asiento_mm), "componentes": componentes},
                  salida, ensure_ascii=False, indent=2)
