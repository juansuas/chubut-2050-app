# Módulo 01 · Escenarios de futuro

Implementación local 2.17.0, basada en la propuesta de proyectos y calendario del 17/11/2026. No implica publicación de la app.

## Contenido

La demanda educativa es el eje: comparación tendencial/escenario a 2050, diferencia absoluta y porcentual, apertura por Inicial, Primario, Secundario de 12 a 17 y Secundario a los 18; mapa departamental de incremento; trayectoria total y trayectoria adicional 2026–2050; máximo temporal explicado. Energía y población se presentan como factores explicativos secundarios.

El tendencial permanece visible. Los únicos escenarios seleccionables son Moderado e Intensivo. La selección se persiste en una clave propia del navegador, sin escribir filtros demográficos, tasas educativas ni proyectos del módulo 04. El mapa permite consultar un departamento sin alterar la comparación provincial ni el horizonte común 2050.

El detalle desplegable muestra los proyectos completos, sus MW, departamento, período de construcción y año de operación, además de los supuestos y el alcance educativo.

## Fuentes y modelo

- Configuración activa: `V2/03_App/data/escenarios_futuro.json`, derivada de `28_PROPUESTA_ESCENARIOS_FUTURO_2050.json`.
- Moderado: 14 proyectos, 589,17 MW, 36,03 % de la cartera. Intensivo: 19 proyectos, 1.083,17 MW, 66,24 %. Los proyectos comunes conservan sus fechas.
- Se reutilizan `scheduledProjects`, `projectImpact`, `populationImpactSeries`, `educationImpact` y `currentRate`; no se modifican las fórmulas existentes.
- El tendencial educativo se calcula con la población de residencia proyectada por edad simple, sexo y departamento, multiplicada por las tasas censales del grupo/sexo correspondiente, con el respaldo provincial vigente. Se incluye el grupo independiente de Secundario a los 18.
- El escenario suma a esa referencia la demanda adicional calculada con el perfil de Confluencia y el calendario de cada fase. Se incluyen construcción, empleo asociado y migración externa con proporción extraprovincial del 100 %, como hipótesis prefijadas.
- El envejecimiento y la salida de población temporal se mantienen. No se agregan natalidad, mortalidad o movilidad interdepartamental al modelo.
- La demanda potencial no es matrícula administrativa ni distribución de vacantes por escuela. Las cifras se redondean al presentar; los cálculos conservan decimales.
- El inventario y los IDs de proyectos se validan antes de construir las vistas. Un cambio de potencia total de la cartera requiere revisar los escenarios.

## Referencias numéricas verificadas

Tendencial 2050: población 634.804; demanda educativa potencial 107.001,745588.

| Salida | Moderado | Intensivo |
|---|---:|---:|
| Incremento educativo a 2050 | 37,031900 | 127,267877 |
| Máximo adicional durante la trayectoria | 529,524029 en 2038 | 984,944616 en 2046 |
| Capacidad adicional a 2050 | 589,17 MW | 1.083,17 MW |

## Verificación

- `node scripts/validar_escenarios_futuro.mjs`: cartera, calendario, anidamiento, referencia, sumas por nivel y territorio, 25 años, máximos y rechazo de IDs inválidos.
- `node scripts/validar_escenario_proyectos.mjs`: modelo y datos productivos, proporción extraprovincial y demanda adicional.
- `node scripts/validar_interfaz_productiva.mjs`: coordinación del módulo 04.
- Sintaxis JavaScript, estructura HTML, IDs y referencias ARIA comprobados.
- Comparación de archivos mediante SHA-256: datos analíticos y módulos de cálculo anteriores sin cambios; las secciones HTML de Demografía y Educación son idénticas. Los metadatos de disponibilidad se actualizan para habilitar el módulo 01.
- Navegador local: carga inicial, valores educativos y cambio Moderado → Intensivo comprobados. La referencia tendencial se mantuvo en 107.002 estudiantes potenciales al redondear. Revisión visual en el ancho disponible; no se afirma una prueba exhaustiva de todos los dispositivos.

Acceso local: `http://127.0.0.1:8125/#escenarios`.
