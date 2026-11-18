"""Verifica referencias dentro del territorio y conservación de datos productivos."""
import copy
import json
from pathlib import Path
import sys
from aplicar_localizaciones_hidro import contains
from aplicar_referencias_cartograficas import apply_cartographic_references

data = Path(__file__).resolve().parents[1]/'data'
inventory = json.loads((data/'instalaciones_energeticas.geojson').read_text(encoding='utf-8'))
features = inventory['features']
records = json.loads((data/'referencias_cartograficas.json').read_text(encoding='utf-8'))['registros']
boundaries = {str(f['properties']['territorio_id']):f['geometry'] for f in json.loads((data/'departamentos_chubut.geojson').read_text(encoding='utf-8'))['features']}
by_id = {f['properties']['instalacion_id']:f for f in features}
assert len(features) == 92 and all(f['geometry'] for f in features)
for r in records:
    f = by_id[r['instalacion_id']]
    lon, lat = f['geometry']['coordinates']
    assert contains(boundaries[r['departamento_id']],lon,lat), r['nombre']
    assert f['properties']['referencia_localizacion'] == r['referencia_localizacion']
assert sum(f['properties'].get('tipo_localizacion')=='departamental' for f in features) == 2
flecha = by_id['AUD-EOL-0E949805E5DE']
assert flecha['properties']['tipo_localizacion'] == 'referencia_predio'
assert -65.46 < flecha['geometry']['coordinates'][0] < -65.32
assert -42.78 < flecha['geometry']['coordinates'][1] < -42.67
restored = copy.deepcopy(features)
for f in restored:
    if f['properties']['instalacion_id'] in {r['instalacion_id'] for r in records}:
        f['geometry'] = None
apply_cartographic_references(restored,data)
assert restored == features, 'La regeneración debe restaurar las tres referencias.'
apply_cartographic_references(restored,data)
assert restored == features, 'La aplicación debe ser idempotente.'
if len(sys.argv)>1:
    old = {f['properties']['instalacion_id']:f for f in json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))['features']}
    fields = {'tipo_localizacion','etiqueta_localizacion','fuente_localizacion_id','referencia_localizacion','url_localizacion','precision_localizacion','fecha_verificacion_localizacion'}
    changed = []
    for id, f in by_id.items():
        assert {k:v for k,v in f['properties'].items() if k not in fields} == {k:v for k,v in old[id]['properties'].items() if k not in fields}, id
        if f['geometry'] != old[id]['geometry']:
            changed.append(id)
    assert set(changed) == {r['instalacion_id'] for r in records}, 'Sólo cambian las tres ubicaciones autorizadas.'
print('REFERENCIAS OK: La Flecha y dos puntos departamentales interiores; 92/92 representados; regeneración e idempotencia; atributos productivos conservados.')
