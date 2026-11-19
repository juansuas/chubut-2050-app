# Escenarios compartidos y capacidad educativa

Versión 2.29.0 · 19/11/2026. Implementación revisada localmente y aprobada para publicación en GitHub el 19/11/2026.

## Recorrido del módulo 01

1. Proyectos y puestos de trabajo: qué cambia en el escenario productivo.
2. Población: llegada de trabajadores y familias durante construcción y operación.
3. Distribución territorial: departamentos con aumentos diferentes.
4. Demanda educativa: trayectorias por nivel y diferencias frente a la referencia sin proyectos.
5. Oferta y capacidad: ocupación esperada manteniendo los cursos y la capacidad de referencia actuales.

La sección 5 incluye selección de Inicial, Primario y Secundario, mapa de escuelas, comparación entre departamentos, tasas efectivas por edad y panel flotante para modificarlas. Permite leer la ocupación, el cambio respecto de 2024 y el efecto específico de los proyectos.

## Selección compartida

Los módulos 01–04 comparten Tendencial (sin nuevos proyectos), Moderado, Intensivo y Total. Año y departamento se conservan al navegar. Los mapas mantienen el zoom al cambiar de escenario. En Producción, editar proyectos o parámetros activa Personalizado; elegir uno de los cuatro botones recupera su cartera y supuestos. El comparador del módulo 05 conserva sus dos selecciones independientes.

La población adicional utiliza las mismas fases, perfiles por edad y sexo y calendarios que el cálculo educativo. Las nuevas incorporaciones se aplican desde 2026; no se modifica la serie histórica. La población tendencial original y los archivos fuente se conservan.

## Capacidad actual y ocupación estimada

La base observada es matrícula y cursos de 2024. Se mantiene fija la capacidad de referencia por curso: Inicial 18, Primario 22 y Secundario 26. Estos valores son referencias del modelo, no una medición de vacantes físicas, aulas o infraestructura. La capacidad provincial suma 170.716 lugares de referencia en 7.612 cursos.

La matrícula observada de cada curso se escala por la relación entre demanda potencial del año elegido y demanda de referencia de 2024, por departamento, nivel y sexo. La demanda incorpora población tendencial, población adicional del escenario y tasas de asistencia. Se mantiene la distribución proporcional entre escuelas: el modelo no conoce el domicilio de las familias ni asigna estudiantes a una escuela concreta.

El indicador de ocupación divide la matrícula estimada por la capacidad de referencia. Los lugares disponibles se calculan por curso y los cursos con alta presión o saturados se cuentan por separado: una escuela con margen no compensa automáticamente otra con presión elevada. La ausencia de oferta se identifica como tal, sin presentarla como capacidad disponible. Secundario incluye los cursos de 18 años una sola vez.

El mapa conserva las categorías de ocupación del módulo Educación. Sus otras lecturas muestran diferencias en puntos porcentuales. Las escuelas sin coordenadas participan en indicadores y tablas; una nota informa cuántas escuelas de la selección aparecen en el mapa.

## Tasas de asistencia

El punto de partida es el Censo 2022 por departamento, grupo de edad y sexo, con respaldo provincial cuando falta información local. La edición se comparte entre los módulos 01 y 03. Internamente se guarda la proporción de mejora hacia el 100 %, conservando las diferencias de partida entre departamentos y sexos. Las tasas efectivas visibles ponderan la población del año elegido.

La comparación sin proyectos utiliza las mismas tasas seleccionadas que el escenario. Por lo tanto, su diferencia permite identificar el aporte de los proyectos sin atribuirles los cambios de asistencia. El contraste con la ocupación observada de 2024 incluye también la evolución demográfica y la asistencia elegida.

## Verificación

- Integración con datos reales: cuatro escenarios, coherencia de población y demanda entre módulos, capacidad fija, cambios de asistencia, selección compartida y Secundario sin duplicaciones.
- Regresiones del modelo de escenarios, comparador y editor productivo.
- Estructura HTML, sintaxis JavaScript y revisión de diferencias.
- Revisión de escritorio y móvil: cinco secciones, botones compartidos, panel flotante y zoom conservado.

Para revisar localmente, servir la carpeta de la app con un servidor HTTP y abrir la ruta `#escenarios`. No se requiere regenerar los datos fuente.

## Ajustes de lectura posteriores a la revisión local

Los tooltips de los gráficos utilizan fondo marfil opaco y texto contrastado. La botonera de escenarios es compacta en los módulos 02–04, manteniendo su tamaño en el módulo 01. El mapa de ocupación del módulo 01 permite resaltar en ámbar los departamentos con proyectos de la cartera completa del escenario, independientemente del año consultado. El control no filtra escuelas ni cambia el zoom; un segundo clic quita el resaltado. Los departamentos siguen pudiendo seleccionarse individualmente sobre el mapa. En Tendencial el control queda deshabilitado por ausencia de proyectos.
