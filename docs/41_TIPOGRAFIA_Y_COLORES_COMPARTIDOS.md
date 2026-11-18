# Tipografía y colores de texto compartidos · 2.28.0

Revisión del 18/11/2026, extendiendo el criterio compacto del módulo 01 a los otros cuatro módulos.

## Escala

Variables CSS compartidas: títulos de página 30 px (25 en móvil), secciones 23 px (21 en móvil), encabezados de panel 18 px, texto general 13 px, notas y controles 12 px. Indicadores del lateral: 20 px; principales diferencias del Comparador: 26 px (23 en móvil). Se conservan las etiquetas pequeñas de gráficos cuando su espacio requiere una escala propia.

Los encabezados del módulo 01 comparten las mismas variables de página y sección. Su apertura narrativa conserva una escala propia, ya reducida en el ajuste anterior. Los indicadores más grandes del Comparador se reducen cuatro píxeles respecto de su tamaño anterior.

## Colores

- Títulos e indicadores: #14586A.
- Texto general: #334652.
- Notas y descripciones: #52636E.

Las categorías conservan sus colores en líneas, barras, bordes, iconos y puntos. Los textos pequeños del lateral educativo dejan de usar amarillo, coral o celeste claro como color de letra. Las anotaciones de gráficos usan texto oscuro; las líneas que identifican siguen sus colores. En el gráfico de participación departamental se elige letra blanca u oscura según el fondo de cada barra, en vez de elegirla por el orden del departamento.

## Verificación

Contraste de los tres colores de texto sobre los siete fondos claros revisados, incluido blanco: mínimo 5,61:1. Las etiquetas del gráfico de participación departamental alcanzan al menos 4,52:1 en los 15 colores de su paleta. Blanco sobre el fondo teal de los botones: 4,84:1. Estos controles se refieren a los pares revisados, no a una auditoría integral de accesibilidad.

Navegador: revisión de Demografía, Educación, Producción y Comparador en escritorio; títulos de 30 px y textos oscuros verificados. Vista de 390 px revisada en los cuatro módulos sin desbordamiento de la página. Se corrigió el ancho mínimo del selector del contexto de Producción, que causaba desbordamiento móvil. Las tablas anchas conservan su desplazamiento interno.

Se comprobaron la sintaxis de charts.js y app.js y la estructura HTML. No cambian fuentes de datos, cálculos ni escenarios.
