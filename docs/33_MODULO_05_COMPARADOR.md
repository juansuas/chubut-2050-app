# Módulo 05 · Comparador · 2.21.0

Implementación local del 18/11/2026. Se recupera el módulo 05 y la ruta `#comparador`, antes redirigida al módulo 01. La página del módulo 01 se conserva.

## Contenido y coordinación

Dos columnas seleccionables: Tendencial, Moderado e Intensivo. Inicio con Moderado A, Intensivo B, toda la provincia y 2050. Estado persistido propio, sin escribir escenarios, tasas o filtros de los otros módulos.

Controles compartidos: territorio, año 2026–2050, capa de mapas, variable de impacto y nivel educativo. Capas:

- Cambio productivo: MW adicionales de proyectos ya en operación respecto del tendencial.
- Impacto territorial: población adicional o demanda educativa adicional; esta última permite total o nivel.

Mapas departamentales con leyendas y escala común fija para cada variable/nivel entre todos los escenarios y años. La escala se determina por el máximo departamental, no provincial. Los colores siempre expresan diferencia con el tendencial; no son diferencias A−B. Seleccionar un departamento actualiza ambos indicadores y gráficos. La extensión, zoom y desplazamiento se sincronizan. Todos los departamentos permanecen representados, incluidos proyectos sin coordenadas puntuales.

Indicadores por lado: cartera completa (proyectos/MW), MW incorporados en operación en el año, población total/adicional y demanda educativa total/adicional. Franja B−A con signo, que admite escenarios iguales y cambios de orden. La comparación educativa de indicadores es siempre el total de niveles, aunque el mapa muestre un nivel particular.

Gráficos mínimos por lado: trayectoria poblacional tendencial/escenario con escala vertical común y barras educativas por nivel con escala común. Un clic en un año de la curva actualiza el año compartido. En móvil las columnas se apilan.

## Modelo

`comparator-model.js` adapta la referencia tendencial desde `model.bases` y consume directamente los resultados de `buildFutureTerritories`. No modifica sus datos, supuestos, cartera ni fórmulas. `comparator.js` maneja el estado y las vistas. La potencia de cartera y la ya incorporada en operación están identificadas por separado. Los resultados educativos son demanda potencial anual, no matrícula ni vacantes.

## Verificación

`node scripts/validar_comparador.mjs`: referencia tendencial, diferencias verificadas 2050 (494 MW y 90,23597695 estudiantes potenciales entre Intensivo y Moderado), identidad y simetría, sumas provinciales/departamentales 2026–2050, escalas comunes, MW desde fecha de operación y modelo no mutado.

Sintaxis JS, HTML y referencias comprobadas. Secciones de los módulos 01–04 idénticas al respaldo previo. Navegador: capas, nivel Primario, año 2045, Languiñeo por clic, zoom sincronizado, escenarios iguales y Tendencial verificados.

Respaldo anterior: `D:/91_CFI_II/tmp/pre_modulo05/`. No se realizó publicación.
