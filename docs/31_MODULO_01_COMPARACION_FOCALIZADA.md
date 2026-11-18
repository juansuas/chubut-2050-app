# Módulo 01 · comparación focalizada · 2.19.0

Implementación local del 18/11/2026. Sustituye la organización visual del documento 30.

- Cabecera compacta con escenario, territorio y año; regreso explícito a toda la provincia.
- Switch Población total / Demanda educativa. Educación permite Todos los niveles, Inicial, Primario, Secundario 12–17 o Secundario 18 años. Siempre se muestran dos curvas: tendencial y escenario, con una franja entre ambas.
- Franja inferior alineada por año para la diferencia adicional. Unidades, tarjetas, máximo y botón de salto se calculan para la vista y nivel activos. La selección de año se conserva al cambiar de vista.
- Verticales discretas para inicio de obra y entrada en operación. Selector Ambos / Obra / Operación / Sin hitos. Marcadores agrupados por año y fase con nombres al consultar; el calendario accesible completo está en Proyectos y supuestos. Los hitos se filtran por territorio.
- Tres indicadores del mismo año debajo del gráfico: tendencial, escenario y diferencia con porcentaje local. Los máximos quedan en el gráfico y su pie.
- Detalle en tres pestañas: Territorios, Niveles educativos, Proyectos y supuestos. La comparación territorial conserva los 15 departamentos y el total educativo, explícitamente indicado, aun cuando el gráfico principal esté en población o un nivel particular.
- Mapa educativo sin instalaciones por defecto; capa optativa. Barras territoriales ordenables y tabla completa desplegable. Barras por nivel y detalle de población/tasas desplegable.
- Estado propio del módulo; migración de preferencias antiguas con valores válidos. Los modelos, datos, calendarios, tasas y fórmulas anteriores se conservan. No se publicaron cambios.

## Verificación

- `node scripts/validar_escenarios_futuro.mjs`: referencias y sumas anteriores aprobadas.
- `node scripts/validar_vista_futuro.mjs`: magnitudes, niveles, denominadores nulos y máximos independientes de población/educación.
- Sintaxis de JS, anidación HTML, IDs únicos y referencias DOM comprobadas.
- Las secciones HTML de los módulos 02, 03 y 04 se compararon con el respaldo previo y permanecen idénticas.
- Navegador: población/educación, nivel Primario, provincia/Languiñeo, escenarios Moderado/Intensivo, máximo, 2050, filtro de operación y tres pestañas comprobados. Pantalla angosta de 390 px revisada sin desbordamiento horizontal de página. No constituye prueba exhaustiva de dispositivos.

Respaldo previo de los cuatro archivos modificados: `D:/91_CFI_II/tmp/modulo01_backup/`.
