"""Structural checks for the shared sidebar and website sections."""
from html.parser import HTMLParser
from pathlib import Path
import sys
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Check(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.ids={};self.controls=[];self.scenarios=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs);id=attrs.get('id');ancestors=[a.get('id') for t,a in self.stack]
  if id:
   assert id not in self.ids,'Duplicate ID '+id
   self.ids[id]=ancestors
  if attrs.get('data-scenario'):self.scenarios.append((attrs['data-scenario'],ancestors))
  if attrs.get('aria-controls'):self.controls.extend(attrs['aria-controls'].split())
  if tag not in VOID:self.stack.append((tag,attrs))
 def handle_endtag(self,tag):
  assert self.stack and self.stack.pop()[0]==tag,'Invalid nesting '+tag
root=Path(__file__).resolve().parents[1];s=(root/'index.html').read_text(encoding='utf-8');p=Check();p.feed(s);assert not p.stack
for id in p.controls:assert id in p.ids,'Missing aria-controls target '+id
for id in ['future-territory','future-year','future-peak-year','future-horizon','future-reset-territory']:
 assert 'module-sidebar' in p.ids[id] and 'future-sidebar' in p.ids[id],id
assert len(p.scenarios)==4
assert {s for s,a in p.scenarios}=={'tendencial','moderado','intensivo','total'}
assert all('future-sidebar' in a for s,a in p.scenarios)
assert s.index('id="story-pop-title"')<s.index('id="story-territory-title"')<s.index('id="story-edu-title"')<s.index('id="story-capacity-title"')
for module,count in [('demografia',3),('oferta',4)]:
 for i in range(1,count+1):assert f'{module}-section-{i}' in p.ids
if len(sys.argv)>1:
 old=Check();old.feed(Path(sys.argv[1]).read_text(encoding='utf-8'))
 assert set(old.ids)<=set(p.ids),'Existing controls or plots removed'
assert s.index('data-route="demografia"')<s.index('data-route="oferta"')<s.index('data-route="productivos"')<s.index('data-route="escenarios"')<s.index('data-route="comparador"')
for id in ['scenario-projects','scenario-coefficients','scenario-external-percent','scenario-include-construction']:
 assert 'escenarios' in p.ids[id] and 'productivos' not in p.ids[id],id
for id in ['capacity-comparison-mode','capacity-rate-sliders','production-tab-projects','production-results-title']:assert id not in p.ids,id
assert 'productivos' in p.ids['production-inventory-view']
for id in ['energy-projects','energy-analysis-year','production-mode','energy-results']:assert 'productivos' in p.ids[id]
for side in 'abcd':
 for prefix in ['cmp-title-','cmp-scenario-','cmp-map-','cmp-education-']:assert prefix+side in p.ids
 assert 'cmp-population-'+side not in p.ids
assert 'cmp-columns' in p.ids
assert '<span class="future-scenario-icon" aria-hidden="true">↗↗↗</span>' in s
print('ESTRUCTURA WEB OK: HTML, ARIA, nuevo orden 01–05, activación energética en Producción y coeficientes en Escenarios.')
