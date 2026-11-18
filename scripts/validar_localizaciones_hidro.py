"""Valida cobertura, geografía, regeneración e invariancia de atributos del inventario."""
import copy
import json
from pathlib import Path
import sys
from aplicar_localizaciones_hidro import apply_locations, SOURCE_ID, contains

data=Path(__file__).resolve().parents[1]/'data'
current=json.loads((data/'instalaciones_energeticas.geojson').read_text(encoding='utf-8'))
references=json.loads((data/'localizaciones_hidroelectricas.json').read_text(encoding='utf-8'))['registros']
by_id={f['properties']['instalacion_id']:f for f in current['features']}
assert len(current['features'])==92
assert sum(f['geometry'] is not None for f in current['features'])==89
assert len(references)==9
for r in references:
 f=by_id[r['instalacion_id']];p=f['properties']
 assert f['geometry']['coordinates']==[r['longitud'],r['latitud']]
 assert p['fuente_localizacion_id']==SOURCE_ID
 assert 'Punto de referencia del aprovechamiento' in p['referencia_localizacion']
 assert p['url_localizacion']==r['url_ficha']
assert all(f['geometry'] for f in current['features'] if f['properties']['actividad_id']=='HID')
regenerated=copy.deepcopy(current['features'])
for f in regenerated:
 if f['properties']['instalacion_id'] in {r['instalacion_id'] for r in references}:f['geometry']=None
apply_locations(regenerated,data)
assert regenerated==current['features'],'La regeneración debe restaurar las nueve referencias.'
apply_locations(regenerated,data)
assert regenerated==current['features'],'Aplicación idempotente.'
if len(sys.argv)>1:
 baseline=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
 old={f['properties']['instalacion_id']:f for f in baseline['features']}
 location_fields={'fuente_localizacion_id','referencia_localizacion','url_localizacion','precision_localizacion','fecha_verificacion_localizacion'}
 changed=[]
 for id,f in by_id.items():
  before=old[id]
  assert {k:v for k,v in before['properties'].items() if k not in location_fields}=={k:v for k,v in f['properties'].items() if k not in location_fields},id
  if before['geometry']!=f['geometry']:changed.append(id)
 assert set(changed)=={r['instalacion_id'] for r in references},'Sólo cambian las nueve coordenadas autorizadas.'
print('LOCALIZACIONES OK: nueve hidros, coordenadas y fuente; cobertura 89/92; regeneración e idempotencia; atributos productivos preservados.')
