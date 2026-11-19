# Reorganización de módulos y escenarios

Versión 2.30.0 · 19/11/2026. Cambios revisados localmente y aprobados para publicación el 19/11/2026.

## Orden y alcance

1. Demografía: proyección tendencial por departamento, edad y sexo.
2. Educación: demanda potencial y ocupación de la capacidad actual con asistencia de referencia censal, sin impacto de proyectos productivos.
3. Producción y energía: inventario energético registrado y vista de activación de proyectos con año de entrada y resultados de potencia. La cartera energética es independiente del módulo 04; no se muestran resultados poblacionales ni educativos.
4. Escenarios de futuro: cinco secciones infográficas, cuatro escenarios prefijados, editor de proyectos y años, parámetros productivos, tabla de coeficientes y ajuste de asistencia.
5. Comparador: Tendencial, Moderado, Intensivo y Total en ambos lados, con mapas sincronizados e indicadores principales.

Las rutas por nombre se conservan. Se actualizan navegación, encabezados, orden del HTML y lista de módulos.

## Separación de las vistas

`module-context.js` genera un estado de consulta neutro para Demografía, Educación y Producción. Conserva los filtros de consulta y excluye proyectos seleccionados y mejoras de asistencia. Educación trabaja en modo tendencial. Producción utiliza el inventario como base y puede superponer su cartera energética independiente al activar proyectos. El estado original de Escenarios se conserva para retomarlo al volver.

La neutralización se aplica también a la exportación de Educación y Producción. Demografía consulta y exporta directamente la serie poblacional de base. La selección de territorio y año sigue disponible en los filtros propios de cada vista.

Se retira la botonera de escenarios de los módulos temáticos; Producción conserva la activación individual de proyectos. Educación muestra una única trayectoria tendencial por grupo o nivel y sus tasas censales por departamento, sin líneas o marcadores duplicados de escenario. Su capacidad de referencia permanece fija.

## Editor y coeficientes

Se reutiliza el catálogo de proyectos y su lógica de selección en una sección desplegable del módulo 04. Allí están los supuestos de construcción, empleo asociado y migración externa y la tabla de coeficientes con sus explicaciones. Los resultados se leen en las cinco secciones infográficas; se elimina el tablero duplicado que estaba en Producción.

Las tasas editables del panel flotante sólo afectan al módulo 04. El comparador sigue utilizando los escenarios prefijados y sus tasas censales, sin incorporar el escenario personalizado. Los coeficientes metodológicos no se modifican.

## Verificación

- Orden HTML, navegación 01–05, IDs únicos y relaciones ARIA.
- Editor y coeficientes dentro de Escenarios, sin controles de simulación en Producción.
- Con datos reales, los cuatro escenarios y las mejoras de asistencia generan los mismos valores de base en los tres módulos temáticos.
- Escenarios conserva el impacto productivo, sus calendarios y capacidad fija.
- Comparador: referencias, diferencias, escalas y opciones Tendencial/Total.
- Pruebas de navegador para navegación, selección, editor, coeficientes y módulos de base.

No se alteran las fuentes de población, matrícula, capacidad ni inventario energético.

## Comparador de cuatro columnas y secuencia de iconos

Se añade una vista inicial de cuatro columnas con Tendencial, Moderado, Intensivo y Total. Cada columna conserva un selector de escenario, los indicadores principales, su mapa y barras de demanda educativa por nivel. La vista de cuatro aprovecha el ancho completo; en pantallas pequeñas la comparación permite desplazamiento horizontal. El selector de vista permite volver a dos columnas, conservando la diferencia entre derecha e izquierda.

Los cuatro mapas sincronizan desplazamiento y zoom y mantienen escalas comunes por variable y nivel. Se eliminan los gráficos de líneas del Comparador. Las barras educativas también comparten escala entre las columnas visibles. La secuencia de iconos en Escenarios es Moderado ↗, Intensivo ↗↗ y Total ↗↗↗.

## Ajuste de Producción y energía

La vista «Activar proyectos» recupera selección, año de entrada y año de consulta. Muestra potencia de la cartera, proyectos ya en operación y MW incorporados, con detalle departamental de capacidad actual y total conocido. Un proyecto suma su potencia completa desde el año elegido.

La selección energética se guarda en `energyProjects`, separada de `scenarioProjects` del módulo 04. Cambiarla no modifica los supuestos de población y educación ni el escenario activo. Al migrar una sesión anterior, se toma su cartera guardada como selección inicial. La vista Inventario conserva sus filtros, fichas, gráficos y exportación originales. Los coeficientes metodológicos y los impactos poblacionales y educativos permanecen en Escenarios.

Prueba adicional: `node scripts/validar_activacion_energetica.mjs`.
