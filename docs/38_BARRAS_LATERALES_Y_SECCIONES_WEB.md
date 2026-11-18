# Barras laterales y secciones web · 2.25.0

Solicitud del 18/11/2026: llevar los controles de Escenarios de futuro al lateral izquierdo, fijar ese lateral en todos los módulos y organizar la lectura con secciones y fondos suaves.

## Organización

- Módulo 01: Moderado, Intensivo y Total, territorio, año de lectura, máximo adicional, acceso a 2050 y restablecimiento territorial en el lateral. Se conserva su estado independiente.
- Módulos 02 y 03: contexto, indicadores, restablecimiento y exportación en el mismo lateral fijo. Los controles analíticos y sus paneles flotantes conservan su funcionamiento.
- Módulos 04 y 05: contexto y accesos a las zonas principales en el lateral. El editor productivo y la comparación de escenarios mantienen sus controles propios.
- La navegación abre cada módulo desde arriba.

El lateral de escritorio queda fijado debajo de la cabecera y no acompaña el desplazamiento del contenido. Su altura se adapta a la ventana y a la cabecera medida con ResizeObserver. Si los controles superan la altura disponible, se desplaza únicamente su contenido interior para mantenerlos accesibles.

Hasta 980 px se presenta como un panel fijo que se abre con «Opciones del módulo». Incluye cierre, fondo exterior, Escape, foco inicial y recorrido de foco dentro del panel. Al cambiar de módulo se cierra.

## Secciones de lectura

Escenarios distingue apertura, proyectos, población, demanda educativa y lectura territorial con tonos suaves y separadores. Demografía agrupa distribución/evolución, edades/composición y cambios/datos de referencia. Educación agrupa demanda/oferta, asistencia, presión sobre la capacidad y método. Producción y Comparador adoptan las mismas bandas para sus áreas principales.

Se preservan los identificadores de mapas, gráficos y controles, así como las fórmulas, fuentes y resultados de los modelos. Los encabezados se reorganizan al reducirse el ancho disponible.

## Verificación

- `python scripts/validar_estructura_web.py`: anidación HTML, IDs únicos, referencias ARIA, ubicación de controles y secciones. Acepta una copia anterior de index.html como argumento para comprobar la conservación de IDs.
- Sintaxis de app.js, future.js, comparator.js y page-layout.js mediante `node --check`.
- Navegador: revisión de los cinco módulos, control de escenario y máximo adicional, lateral a 172 px antes y después del scroll, encabezados educativos adaptados, comparación en dos columnas y panel móvil a 390 px sin desbordamiento horizontal.

La reorganización es visual y de navegación; no altera el calendario ni los resultados del escenario Total.
