"""Referencias del predio La Flecha y ubicaciones departamentales orientativas.

Las referencias departamentales no son coordenadas verificadas del proyecto.
Se conservan al regenerar el inventario auditado.
"""
import csv
import hashlib
import json
from pathlib import Path
from aplicar_localizaciones_hidro import contains

SIDECAR = 'referencias_cartograficas.json'


def department_point(geometry):
    """Midpoint of the widest interior span, on a polygon's middle latitude."""
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    candidates = []
    for polygon in polygons:
        y = (min(p[1] for p in polygon[0]) + max(p[1] for p in polygon[0])) / 2
        intersections = []
        for ring in polygon:
            for a, b in zip(ring, ring[1:] + ring[:1]):
                if (a[1] > y) != (b[1] > y):
                    intersections.append(a[0] + (y-a[1])*(b[0]-a[0])/(b[1]-a[1]))
        intersections.sort()
        for x1, x2 in zip(intersections[::2], intersections[1::2]):
            x = (x1+x2)/2
            if contains(geometry, x, y):
                candidates.append((x2-x1, x, y))
    if not candidates:
        raise ValueError('No se pudo obtener un punto interior del departamento.')
    _, x, y = max(candidates)
    return [round(x, 6), round(y, 6)]


def reference_point(record, geometry):
    if record['tipo_localizacion'] == 'departamental':
        return department_point(geometry)
    vertices = record['vertices_predio_lon_lat']
    return [round(sum(p[i] for p in vertices)/len(vertices), 6) for i in (0, 1)]


def apply_cartographic_references(features, data):
    records = json.loads((data/SIDECAR).read_text(encoding='utf-8'))['registros']
    by_id = {f['properties']['instalacion_id']:f for f in features}
    boundaries = {str(f['properties']['territorio_id']):f['geometry'] for f in json.loads((data/'departamentos_chubut.geojson').read_text(encoding='utf-8'))['features']}
    for record in records:
        feature = by_id[record['instalacion_id']]
        p = feature['properties']
        assert p['nombre_instalacion'] == record['nombre']
        assert p['departamento_id'] == record['departamento_id']
        geometry = boundaries[p['departamento_id']]
        lon, lat = reference_point(record, geometry)
        if not contains(geometry, lon, lat):
            raise ValueError('Referencia fuera del departamento: '+record['nombre'])
        point = {'type':'Point','coordinates':[lon,lat]}
        if feature['geometry'] is not None and feature['geometry'] != point:
            raise ValueError('Conflicto con coordenadas existentes: '+record['nombre'])
        feature['geometry'] = point
        for field in ['tipo_localizacion','etiqueta_localizacion','fuente_localizacion_id','referencia_localizacion','url_localizacion','precision_localizacion']:
            p[field] = record[field]
        p['fecha_verificacion_localizacion'] = '2026-11-18'
    return len(records)


def update_reference_metadata(meta, features):
    meta.update(version='0.7.0', registros_con_coordenadas=sum(f['geometry'] is not None for f in features),
                referencias_departamentales=sum(f['properties'].get('tipo_localizacion')=='departamental' for f in features),
                referencias_predio=sum(f['properties'].get('tipo_localizacion')=='referencia_predio' for f in features),
                fecha_actualizacion_localizaciones='2026-11-18')
    note = 'La Flecha se muestra con un punto de referencia del predio. El Escorial y Aluar–Etapa II (96 MW) usan puntos orientativos dentro de sus departamentos; no son ubicaciones verificadas de los proyectos.'
    if note not in meta['advertencias']:
        meta['advertencias'].append(note)


def register_reference_sources(data):
    audit = json.loads((data/SIDECAR).read_text(encoding='utf-8'))
    path = data/'fuentes_productivas.csv'
    with path.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        fields, rows = reader.fieldnames, list(reader)
    ids = {r['fuente_id'] for r in audit['fuentes']}
    rows = [r for r in rows if r['fuente_id'] not in ids]
    for source in audit['fuentes']:
        rows.append(dict(source, archivo_local=SIDECAR, bytes=(data/SIDECAR).stat().st_size,
                         sha256=hashlib.sha256((data/SIDECAR).read_bytes()).hexdigest(), fecha_descarga='2026-11-18'))
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)


def main():
    data = Path(__file__).resolve().parents[1]/'data'
    path = data/'instalaciones_energeticas.geojson'
    inventory = json.loads(path.read_text(encoding='utf-8'))
    count = apply_cartographic_references(inventory['features'], data)
    meta_path = data/'productivo_metadata.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    update_reference_metadata(meta, inventory['features'])
    for target, value in [(path,inventory),(meta_path,meta)]:
        target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    register_reference_sources(data)
    print(f'{count} referencias aplicadas: {meta["registros_con_coordenadas"]} puntos, incluidos {meta["referencias_departamentales"]} orientativos por departamento.')


if __name__ == '__main__':
    main()
