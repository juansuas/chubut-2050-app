"""Regenera los cuatro archivos productivos desde la hoja auditada del 09/11.
Uso: python importar_inventario_auditado.py ruta.xlsx (requiere openpyxl).
"""
import csv
import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from openpyxl import load_workbook
from aplicar_localizaciones_hidro import apply_locations, update_metadata, register_source
from aplicar_referencias_cartograficas import apply_cartographic_references, update_reference_metadata, register_reference_sources

AUDIT = "AUDITORIA_MANUAL_2026_11_09"
EXTRA = {
    "ALUAR_PARQUE": ("Aluar · Parque Eólico y sus etapas", "Aluar", "https://www.aluar.com.ar/energia/parque-eolico-aluar"),
    "CAMMESA_BASE_GENERADORES": ("Base estacional de unidades generadoras", "CAMMESA", "https://microfe.cammesa.com/static-content/CammesaWeb/download-manager-files/Revistas/Estacional/base_gen.html"),
    "SE_TORDILLO": ("Resolución 596/2009 · Vientos de la Patagonia / El Tordillo", "Secretaría de Energía", "https://www.argentina.gob.ar/normativa/nacional/norma-156787"),
    "PLAHE_FRONTERA": ("Plataforma Argentina de Hidroenergía · Frontera II", "Energía Argentina", "https://plahe.energia-argentina.com.ar/aprovechamientos.php?aid=107&p=4"),
}
LABELS = {"EOL": "Eólica", "HID": "Hidroeléctrica", "TER": "Térmica"}

def compile_inventory(path, data):
    sheet = load_workbook(path, read_only=True, data_only=True)["Capa construida"]
    features, exclusions = [], []
    headers = None
    departments = {str(f["properties"]["territorio_id"]) for f in json.loads((data/"departamentos_chubut.geojson").read_text(encoding="utf-8"))["features"]}
    for n, cells in enumerate(sheet.values, 1):
        if cells[0] == "instalacion_id":
            headers = cells
            continue
        if headers is None or not cells[1]:
            continue
        r = {k: v.strip() if isinstance(v, str) else v for k, v in zip(headers, cells) if k}
        name, tech, status = (r[k] for k in ("nombre_instalacion", "actividad_id", "estado_id"))
        if name in ("P.E Vientos de la Patagonia", "C.T. Manantiales Behr II"):
            exclusions.append({"fila": n, "nombre": name, "motivo": "Registro duplicado de " + ("El Tordillo (Resolución 596/2009)" if tech == "EOL" else "CT MANANTIALES BEHR II AG (mismo nombre, ubicación y 57,735 MW)")})
            continue
        dept = str(int(r["departamento_id"])).zfill(5)
        if dept not in departments or tech not in LABELS or status not in ("OPERATIVO", "SIN_INFO", "PROYECTADO"):
            raise ValueError(f"Clasificación inesperada en fila {n}")
        r["departamento_id"] = dept
        r["fila_auditoria"] = n
        subtype = r["actividad_nombre"]
        r["actividad_nombre"] = LABELS[tech]
        if not r["instalacion_id"]:
            slug = hashlib.sha256(f"{tech}|{dept}|{name.casefold()}".encode()).hexdigest()[:12].upper()
            r.update(instalacion_id=f"AUD-{tech}-{slug}", fuente_primaria_id=AUDIT, fuente_estado_id=AUDIT, calidad_registro="auditado_manualmente")
        installed, project = r["capacidad_instalada_mw"], r["potencia_declarada_proyecto_mw"]
        if status == "PROYECTADO":
            if project is not None and installed is not None and project != installed:
                raise ValueError(f"Dos potencias distintas en fila {n}")
            if project is None and installed is not None:
                project = installed
                r["fuente_potencia_proyecto_id"] = AUDIT
            installed = None
            r.update(fuente_capacidad_instalada_id=None, periodo_capacidad_instalada=None, referencia_capacidad_instalada=None)
        if name == "P.E El Tordillo":
            r["fuentes_secundarias_ids"] += "|SE_TORDILLO"
        if name in ("FUTALEUFU", "F. AMEGHINO"):
            status = "OPERATIVO"
            r.update(estado_id=status, estado_nombre="Operativo", fuente_estado_id="CAMMESA_BASE_GENERADORES", fuentes_secundarias_ids="CAMMESA_BASE_GENERADORES", calidad_registro="operacion_corroborada_capacidad_fuente_2023")
        if name == "Parque Eólico La Flecha (Aluar)":
            r.update(fuente_capacidad_instalada_id="ALUAR_PARQUE", fuentes_secundarias_ids="ALUAR_PARQUE", periodo_capacidad_instalada="2026", referencia_capacidad_instalada="Incremento de etapa V; la capacidad de etapas previas conserva el corte CAMMESA")
        if r["fuente_primaria_id"] == AUDIT and installed is not None and not r["fuente_capacidad_instalada_id"]:
            r["fuente_capacidad_instalada_id"] = AUDIT
        pending = None
        if name == "Frontera II":
            r["potencia_proyecto_original_auditoria_mw"] = project
            project = 80
            r["fuente_potencia_proyecto_id"] = "PLAHE_FRONTERA"
            r["decision_conciliacion"] = "2026-11-17: el equipo adopta los 80 MW de la ficha PLAHE."
            r["fuentes_secundarias_ids"] = "PLAHE_FRONTERA"
        if name == "Parque Eólico Aluar – Etapa II":
            r["decision_conciliacion"] = "2026-11-17: el equipo confirma 96 MW de ampliación futura independiente de lo instalado."
        impact = ({"EOL": "EOL", "HID": "HID_PAH" if "Pequeña" in subtype else "HID_GRANDE"}.get(tech)
                  if status == "PROYECTADO" else None)
        if status == "PROYECTADO" and (not isinstance(project, (int, float)) or project <= 0):
            pending = pending or "Falta potencia de proyecto válida."
        r.update(
            capacidad_instalada_mw=installed if status == "OPERATIVO" else None,
            capacidad_historica_mw=installed if status == "SIN_INFO" else None,
            potencia_declarada_proyecto_mw=project,
            condicion_informacion={"OPERATIVO": "observada", "PROYECTADO": "proyecto_futuro", "SIN_INFO": "sin_clasificar"}[status],
            tecnologia_impacto_id=impact,
            nota_conciliacion=pending,
        )
        lat, lon = r.pop("latitud"), r.pop("longitud")
        if (lat is None) != (lon is None):
            raise ValueError(f"Coordenada incompleta en fila {n}")
        features.append({"type": "Feature", "geometry": None if lat is None else {"type": "Point", "coordinates": [lon, lat]}, "properties": r})

    apply_locations(features, data)
    apply_cartographic_references(features, data)
    rows = [f["properties"] for f in features]
    if len({r["instalacion_id"] for r in rows}) != len(rows):
        raise ValueError("IDs duplicados")
    totals = {}
    groups = defaultdict(list)
    for r in rows:
        groups[tuple(r[k] for k in ("departamento_id", "departamento_nombre", "actividad_id", "actividad_nombre", "estado_id", "estado_nombre"))].append(r)
    for tech in LABELS:
        tech_rows = [r for r in rows if r["actividad_id"] == tech]
        future = [r for r in tech_rows if r["estado_id"] == "PROYECTADO"]
        eligible = [r for r in future if not r["nota_conciliacion"]]
        totals[tech] = dict(registros=len(tech_rows), operativos=sum(r["estado_id"] == "OPERATIVO" for r in tech_rows),
                            instalada_mw=round(sum(r["capacidad_instalada_mw"] or 0 for r in tech_rows), 6),
                            proyectos=len(future), proyectada_mw=round(sum(r["potencia_declarada_proyecto_mw"] or 0 for r in future), 6),
                            simulables=len(eligible), simulable_mw=round(sum(r["potencia_declarada_proyecto_mw"] or 0 for r in eligible), 6))
    meta = {
        "nombre": "Inventario productivo y energético · Chubut 2050",
        "version": "0.5.0", "fecha_construccion": "2026-11-16",
        "inventario_auditado": path.name, "hoja": "Capa construida",
        "instalaciones_total": len(rows), "instalaciones_por_actividad": dict(Counter(r["actividad_id"] for r in rows)),
        "actividades": totals, "registros_con_coordenadas": sum(f["geometry"] is not None for f in features),
        "duplicados_excluidos": exclusions,
        "proyectos_pendientes": [{"nombre": r["nombre_instalacion"], "motivo": r["nota_conciliacion"]} for r in rows if r["nota_conciliacion"]],
        "advertencias": [
            "Inventario auditado al 09/11/2026. Los registros sin coordenadas figuran en la tabla y el escenario, cuando corresponda.",
            "La capacidad instalada suma unidades operativas con dato. El piso térmico de septiembre de 2026 es parcial: la potencia histórica de centrales sin estado confirmado queda sólo en sus fichas.",
            "La capacidad hidroeléctrica conserva el registro nacional de 2023; el estado se contrastó con la base de generadores de CAMMESA.",
            "La potencia declarada de instalaciones operativas es una referencia histórica; no integra la cartera. Los proyectos con conciliación pendiente se muestran aparte y no suman MW simulables.",
        ],
    }
    update_metadata(meta, features)
    update_reference_metadata(meta, features)
    def dump(name, value):
        (data/name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    dump("instalaciones_energeticas.geojson", {"type": "FeatureCollection", "features": features})
    dump("productivo_metadata.json", meta)
    with (data/"indicadores_productivos_departamento.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow("departamento_id departamento_nombre actividad_id actividad_nombre estado_id estado_nombre instalaciones_total instalaciones_con_capacidad cobertura_capacidad_instalada_pct capacidad_instalada_mw_conocida instalaciones_con_potencia_proyecto potencia_declarada_proyecto_mw anio_referencia_min anio_referencia_max".split())
        for key, members in sorted(groups.items()):
            installed = [r["capacidad_instalada_mw"] for r in members if r["capacidad_instalada_mw"] is not None]
            projects = [r["potencia_declarada_proyecto_mw"] for r in members if r["estado_id"] == "PROYECTADO" and r["potencia_declarada_proyecto_mw"] is not None]
            years = [r["anio_referencia"] for r in members if isinstance(r["anio_referencia"], int)]
            writer.writerow([*key, len(members), len(installed), round(len(installed)/len(members)*100, 6), round(sum(installed), 6) if installed else None,
                             len(projects), round(sum(projects), 6) if projects else None, min(years, default=None), max(years, default=None)])
    sources = data/"fuentes_productivas.csv"
    with sources.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fields, old = reader.fieldnames, {r["fuente_id"]: r for r in reader}
    for key, (title, owner, url) in {AUDIT: ("Inventario auditado · Capa construida · 09/11/2026", "Equipo Chubut 2050", ""), **EXTRA}.items():
        old[key] = dict(fuente_id=key, titulo=title, institucion=owner, url=url, cobertura="Chubut",
                        uso="Revisión y trazabilidad de la normalización")
    with sources.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fields)
        writer.writeheader()
        writer.writerows(old.values())
    register_source(data)
    register_reference_sources(data)
    print(json.dumps(totals, ensure_ascii=False))

if __name__ == "__main__":
    compile_inventory(Path(sys.argv[1]), Path(__file__).resolve().parents[1]/"data")
