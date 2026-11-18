# Escenario Total · 2.24.0

Solicitud del 18/11/2026: agregar un escenario que tenga todos los proyectos en marcha a 2050.

## Definición

Total incluye todos los proyectos habilitados del inventario: 22, por 1.635,17 MW (100 % de la cartera). Se incorpora como tercer botón del módulo 01 y como cuarta opción, junto con Tendencial, en cada lado del Comparador (05). Conserva los mismos parámetros productivos, migratorios y educativos.

El calendario conserva exactamente las fechas de los 19 proyectos de Intensivo. Los tres proyectos restantes entran en operación en 2050 como hipótesis explícita:

| Proyecto | MW | Inicio de obra modelado | Operación |
|---|---:|---:|---:|
| P.E. Rada Tilly | 152 | 2048 | 2050 |
| P.E. El Angelito | 200 | 2048 | 2050 |
| Parque Eólico El Escorial | 200 | 2048 | 2050 |

Estas fechas completan el escenario; no son cronogramas oficiales. El requisito de operación en 2050 no significa que todos los proyectos comiencen ese año: los compartidos conservan su calendario.

## Datos activos y controles

La definición activa es `data/escenarios_futuro.json`, clave `selecciones.total`. La propuesta histórica 28 queda conservada; el escenario Total se define en este documento. El modelo exige cobertura completa de la cartera, conservación de fechas compartidas y ausencia de construcción pendiente en 2050. Los modelos de demanda no se modifican.

Las escalas cartográficas del Comparador incluyen ahora los tres escenarios, de forma común entre lados y años para cada métrica y nivel. Los filtros del módulo 01 y del Comparador siguen siendo independientes; Total no modifica el escenario editable del módulo 04.

## Referencias verificadas

- Proyectos: 22; MW en operación a 2050: 1.635,17.
- Población adicional a 2050: 1.544,240866.
- Demanda educativa adicional a 2050: 206,828889 estudiantes potenciales.
- Máximo educativo provincial: 1.252,878946 en 2048.

`validar_escenarios_futuro.mjs` comprueba cobertura, calendario anidado, tres incorporaciones de 552 MW y referencia de operación. `validar_comparador.mjs` incluye Total en las sumas departamentales y controles de escala. Los resultados anteriores de Moderado e Intensivo se conservan.

Navegador local: botón Total en módulo 01 y selección Total en Comparador comprobados; en 2050 el comparador informa 22 proyectos en operación. Revisión de 390 px sin desbordamiento horizontal. Sin errores de consola observados.
