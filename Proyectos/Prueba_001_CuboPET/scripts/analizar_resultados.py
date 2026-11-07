#!/usr/bin/env python3
"""Crea tablas y figuras SVG a partir de resultados FEM guardados."""

import csv
import html
import json
import math
import os

RAIZ = "/mnt/BancaPET/Proyectos/Prueba_001_CuboPET"
RUTA_RESUMEN = os.path.join(RAIZ, "resultados", "resumen_validacion.json")
DIR_GRAFICAS = os.path.join(RAIZ, "graficas")
DIR_RESULTADOS = os.path.join(RAIZ, "resultados")


def leer_json(ruta):
    with open(ruta, "r", encoding="utf-8") as archivo:
        return json.load(archivo)


def leer_campos(nivel):
    ruta = os.path.join(DIR_RESULTADOS, "campos_%s.csv" % nivel)
    with open(ruta, "r", newline="", encoding="utf-8") as archivo:
        return list(csv.DictReader(archivo))


def proyectar(x, y, z):
    """Proyección isométrica sencilla para mostrar la forma 3D."""
    return 430 + (x - y) * 2.4, 390 - (x + y) * 1.2 + z * 2.4


def escribir_svg(ruta, elementos, ancho=860, alto=620):
    contenido = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (ancho, alto, ancho, alto),
        '<rect width="100%%" height="100%%" fill="#ffffff"/>' % (),
        '<style>text{font-family:Arial,sans-serif;fill:#263238}.titulo{font-size:22px;font-weight:bold}.etiqueta{font-size:14px}.nota{font-size:12px;fill:#455a64}</style>',
    ]
    contenido.extend(elementos)
    contenido.append("</svg>")
    with open(ruta, "w", encoding="utf-8") as archivo:
        archivo.write("\n".join(contenido))


def texto(x, y, valor, clase="etiqueta", ancla="start"):
    return '<text x="%.1f" y="%.1f" class="%s" text-anchor="%s">%s</text>' % (
        x, y, clase, ancla, html.escape(str(valor)))


def puntos_svg(filas, campo, titulo, ruta, unidad, nota):
    valores = [float(fila[campo]) for fila in filas]
    minimo = min(valores)
    maximo = max(valores)
    limite = max(abs(minimo), abs(maximo)) if campo == "uz_mm" else maximo
    limite = limite or 1.0
    elementos = [texto(30, 38, titulo, "titulo")]

    for fila, valor in zip(filas, valores):
        x, y = proyectar(float(fila["x_mm"]), float(fila["y_mm"]), float(fila["z_mm"]))
        if campo == "uz_mm":
            porcentaje = (valor / limite + 1.0) / 2.0
        else:
            porcentaje = valor / limite
        porcentaje = max(0.0, min(1.0, porcentaje))
        rojo = int(40 + 205 * porcentaje)
        azul = int(215 - 180 * porcentaje)
        verde = int(95 + 75 * (1.0 - abs(0.5 - porcentaje) * 2.0))
        color = "#%02x%02x%02x" % (rojo, verde, azul)
        elementos.append('<circle cx="%.2f" cy="%.2f" r="3.2" fill="%s"/>' % (x, y, color))

    elementos.extend([
        texto(30, 555, "Campo: %s %s" % (campo, unidad)),
        texto(30, 580, "Rango real: %.6g a %.6g %s" % (minimo, maximo, unidad)),
        texto(30, 602, nota, "nota"),
    ])
    escribir_svg(ruta, elementos)


def figura_cubo(config):
    lado = float(config["geometria"]["lado_mm"])
    vertices = {
        "A": proyectar(0, 0, 0), "B": proyectar(lado, 0, 0),
        "C": proyectar(lado, lado, 0), "D": proyectar(0, lado, 0),
        "E": proyectar(0, 0, lado), "F": proyectar(lado, 0, lado),
        "G": proyectar(lado, lado, lado), "H": proyectar(0, lado, lado),
    }
    aristas = [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A"),
               ("E", "F"), ("F", "G"), ("G", "H"), ("H", "E"),
               ("A", "E"), ("B", "F"), ("C", "G"), ("D", "H")]
    elementos = [texto(30, 38, "CAD paramétrico: cubo sólido", "titulo")]
    for inicio, fin in aristas:
        x1, y1 = vertices[inicio]
        x2, y2 = vertices[fin]
        elementos.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1565c0" stroke-width="3"/>' % (x1, y1, x2, y2))
    elementos.extend([texto(440, 510, "100 mm × 100 mm × 100 mm"),
                      texto(30, 580, "Dibujo de las cotas verificadas del archivo FCStd.", "nota")])
    escribir_svg(os.path.join(DIR_GRAFICAS, "cubo_CAD.svg"), elementos)


def figura_malla(filas):
    elementos = [texto(30, 38, "Malla FEM M3: nodos reales del resultado", "titulo")]
    for fila in filas:
        x, y = proyectar(float(fila["x_mm"]), float(fila["y_mm"]), float(fila["z_mm"]))
        elementos.append('<circle cx="%.2f" cy="%.2f" r="2.4" fill="#455a64"/>' % (x, y))
    elementos.extend([texto(30, 580, "%d nodos de resultado; tetraedros cuadráticos generados por Gmsh." % len(filas), "nota")])
    escribir_svg(os.path.join(DIR_GRAFICAS, "malla_FEM_M3.svg"), elementos)


def figura_lineas(niveles, nombre_campo, titulo, ruta, referencia=None):
    ancho, alto = 860, 620
    x0, y0, grafica_ancho, grafica_alto = 100, 100, 690, 390
    valores = [abs(float(item[nombre_campo])) for item in niveles]
    if referencia is not None:
        valores.append(abs(float(referencia)))
    minimo = min(0.0, min(valores) * 0.9)
    maximo = max(valores) * 1.1 or 1.0
    elementos = [texto(30, 38, titulo, "titulo")]
    elementos.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#263238"/>' % (x0, y0, x0, y0 + grafica_alto))
    elementos.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#263238"/>' % (x0, y0 + grafica_alto, x0 + grafica_ancho, y0 + grafica_alto))

    puntos = []
    for indice, item in enumerate(niveles):
        x = x0 + 80 + indice * 250
        valor = abs(float(item[nombre_campo]))
        y = y0 + grafica_alto - (valor - minimo) / (maximo - minimo) * grafica_alto
        puntos.append((x, y))
        elementos.append('<circle cx="%.1f" cy="%.1f" r="7" fill="#1565c0"/>' % (x, y))
        elementos.append(texto(x, y0 + grafica_alto + 28, item["nivel"], ancla="middle"))
        elementos.append(texto(x, y - 14, "%.5g" % valor, ancla="middle"))
    for inicio, fin in zip(puntos, puntos[1:]):
        elementos.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1565c0" stroke-width="3"/>' % (inicio[0], inicio[1], fin[0], fin[1]))

    if referencia is not None:
        y = y0 + grafica_alto - (abs(float(referencia)) - minimo) / (maximo - minimo) * grafica_alto
        elementos.append('<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#d32f2f" stroke-width="2" stroke-dasharray="8,6"/>' % (x0, y, x0 + grafica_ancho, y))
        elementos.append(texto(x0 + grafica_ancho, y - 8, "Analítica", ancla="end"))
    elementos.append(texto(30, 570, "Valor absoluto; los archivos de resultados conservan el signo original.", "nota"))
    escribir_svg(ruta, elementos, ancho, alto)


def figura_comparacion(nivel, config):
    delta_analitico = float(config["referencia_analitica"]["delta_mm"]["resultado"])
    sigma_analitica = float(config["referencia_analitica"]["sigma_MPa"]["resultado"])
    delta_fem = abs(float(nivel["desplazamiento_medio_nodal_cara_superior_mm"]))
    sigma_fem = float(nivel["von_mises_nodo_mas_cercano_centro_superior_MPa"])
    elementos = [texto(30, 38, "Comparación analítica y FEM en M3", "titulo")]
    grupos = [(170, "Desplazamiento (mm)", delta_analitico, delta_fem),
              (550, "von Mises centro superior (MPa)", sigma_analitica, sigma_fem)]
    for x, etiqueta, analitico, fem in grupos:
        escala = 200.0 / max(abs(analitico), abs(fem), 1e-30)
        elementos.append(texto(x + 30, 120, etiqueta, ancla="middle"))
        elementos.append('<rect x="%d" y="180" width="60" height="%.1f" fill="#ef6c00"/>' % (x, abs(analitico) * escala))
        elementos.append('<rect x="%d" y="390" width="60" height="%.1f" fill="#1565c0"/>' % (x, abs(fem) * escala))
        elementos.append(texto(x + 30, 165, "Analítica %.5g" % analitico, ancla="middle"))
        elementos.append(texto(x + 30, 375, "FEM %.5g" % fem, ancla="middle"))
    elementos.append(texto(30, 580, "Comparación orientativa: el modelo 3D fijo puede diferir de la barra uniaxial.", "nota"))
    escribir_svg(os.path.join(DIR_GRAFICAS, "comparacion_analitica_M3.svg"), elementos)


def main():
    os.makedirs(DIR_GRAFICAS, exist_ok=True)
    config = leer_json(os.path.join(RAIZ, "config", "caso.json"))
    resumen = leer_json(RUTA_RESUMEN)
    niveles = resumen["niveles"]
    campos_m3 = leer_campos("M3")

    figura_cubo(config)
    figura_malla(campos_m3)
    puntos_svg(campos_m3, "uz_mm", "Desplazamiento vertical real M3", os.path.join(DIR_GRAFICAS, "desplazamiento_M3.svg"), "mm", "Nodos coloreados por UZ; valor negativo indica compresión.")
    puntos_svg(campos_m3, "von_mises_MPa", "Tensión de von Mises real M3", os.path.join(DIR_GRAFICAS, "von_mises_M3.svg"), "MPa", "Los máximos cercanos al apoyo fijo pueden ser sensibles a la malla.")
    delta = float(config["referencia_analitica"]["delta_mm"]["resultado"])
    figura_lineas(niveles, "desplazamiento_medio_nodal_cara_superior_mm", "Convergencia: desplazamiento medio de cara superior", os.path.join(DIR_GRAFICAS, "convergencia_desplazamiento.svg"), delta)
    figura_lineas(niveles, "von_mises_nodo_mas_cercano_centro_superior_MPa", "Convergencia: von Mises en centro superior", os.path.join(DIR_GRAFICAS, "convergencia_tension_centro.svg"), float(config["referencia_analitica"]["sigma_MPa"]["resultado"]))
    figura_comparacion(niveles[-1], config)

    ruta_csv = os.path.join(DIR_RESULTADOS, "metricas_malla.csv")
    with open(ruta_csv, "w", newline="", encoding="utf-8") as archivo:
        campos = list(niveles[0].keys())
        escritor = csv.DictWriter(archivo, fieldnames=campos, extrasaction="ignore")
        escritor.writeheader()
        escritor.writerows(niveles)

    print("Figuras SVG guardadas en:", DIR_GRAFICAS)
    print("Métricas CSV guardadas en:", ruta_csv)


if __name__ == "__main__":
    main()
