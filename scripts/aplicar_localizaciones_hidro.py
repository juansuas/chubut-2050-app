"""Aplica las referencias PLAHE verificadas sin modificar el modelo productivo.
Uso: python scripts/aplicar_localizaciones_hidro.py
La misma función se invoca al regenerar el inventario desde el Excel auditado.
"""
import csv
import hashlib
import json
from pathlib import Path

SOURCE_ID = 'PLAHE_LOCALIZACION_2026_11_18'
REFERENCE = 'Punto de referencia del aprovechamiento (PLAHE); no necesariamente el edificio de la central.'

def inside_ring(x, y, ring):
    inside = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        x1, y1 = a[:2]
        x2, y2 = b[:2]
        if (y1 > y) != (y2 > y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1:
            inside = not inside
    return inside

def contains(geometry, x, y):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(inside_ring(x,y,p[0]) and not any(inside_ring(x,y,r) for r in p[1:]) for p in polygons)

def apply_locations(features, data):
    audit = json.loads((data/'localizaciones_hidroelectricas.json').read_text(encoding='utf-8'))
    records = audit['registros']
    if len(records) != 9 or len({r['instalacion_id'] for r in records}) != 9:
        raise ValueError('Se requieren las nueve localizaciones verificadas, sin duplicados.')
    by_id = {f['properties']['instalacion_id']: f for f in features}
    boundaries = {str(f['properties']['territorio_id']): f['geometry'] for f in json.loads((data/'departamentos_chubut.geojson').read_text(encoding='utf-8'))['features']}
    for record in records:
        feature = by_id[record['instalacion_id']]
        p = feature['properties']
        assert p['actividad_id'] == 'HID' and p['estado_id'] == 'PROYECTADO'
        assert p['nombre_instalacion'] == record['nombre']
        assert p['departamento_nombre'] == record['departamento_inventario']
        assert abs(p['potencia_declarada_proyecto_mw'] - record['potencia_plahe_mw']) < 1e-8
        lat, lon = record['latitud'], record['longitud']
        if not (-90 <= lat <= 90 and -180 <= lon <= 180) or not contains(boundaries[p['departamento_id']],lon,lat):
            raise ValueError('Coordenada fuera del departamento: '+record['nombre'])
        point = {'type':'Point', 'coordinates':[lon,lat]}
        if feature['geometry'] is not None and feature['geometry'] != point:
            raise ValueError('Conflicto con coordenada existente: '+record['nombre'])
        feature['geometry'] = point
        p.update(fuente_localizacion_id=SOURCE_ID, referencia_localizacion=REFERENCE,
                 url_localizacion=record['url_ficha'], precision_localizacion=record['precision_metrica'],
                 fecha_verificacion_localizacion=record['consulta'])
    return len(records)

def update_metadata(meta, features):
    meta['registros_con_coordenadas'] = sum(f['geometry'] is not None for f in features)
    meta['version'] = '0.6.0'
    meta['fecha_actualizacion_localizaciones'] = '2026-11-18'
    note = 'Nueve proyectos hidroeléctricos incorporan puntos de referencia del aprovechamiento publicados por PLAHE; no necesariamente corresponden al edificio de la central. Precisión métrica no informada.'
    if note not in meta['advertencias']:
        meta['advertencias'].append(note)

def register_source(data):
    path = data/'fuentes_productivas.csv'
    with path.open(encoding='utf-8-sig',newline='') as handle:
        reader = csv.DictReader(handle)
        fields, records = reader.fieldnames, list(reader)
    records = [r for r in records if r['fuente_id'] != SOURCE_ID]
    records.append(dict(fuente_id=SOURCE_ID, titulo='PLAHE · localización de nueve aprovechamientos hidroeléctricos', institucion='Energía Argentina', cobertura='Chubut', tipo_recurso='HTML y JSON', url='https://plahe.energia-argentina.com.ar/aprovechamientos.php', archivo_local='localizaciones_hidroelectricas.json', bytes=(data/'localizaciones_hidroelectricas.json').stat().st_size, sha256=hashlib.sha256((data/'localizaciones_hidroelectricas.json').read_bytes()).hexdigest(), fecha_descarga='2026-11-18', uso='Puntos de referencia del aprovechamiento; coordenadas verificadas por ficha y servicio geográfico', limitaciones='Precisión métrica y datum no explicitados; no identifican necesariamente el edificio de generación'))
    # Only write fields already declared in the source catalogue.
    with path.open('w',encoding='utf-8',newline='') as handle:
        writer = csv.DictWriter(handle,fields,extrasaction='ignore')
        writer.writeheader()
        writer.writerows(records)

def main():
    data = Path(__file__).resolve().parents[1]/'data'
    path = data/'instalaciones_energeticas.geojson'
    inventory = json.loads(path.read_text(encoding='utf-8'))
    count = apply_locations(inventory['features'],data)
    meta_path = data/'productivo_metadata.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    update_metadata(meta,inventory['features'])
    for target, value in [(path,inventory),(meta_path,meta)]:
        target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    register_source(data)
    print(f'{count} referencias hidroeléctricas incorporadas; {meta["registros_con_coordenadas"]} registros localizados en total.')

if __name__ == '__main__':
    main()
