# Tasky · Migración a Vite

Primer paso de la migración de Tasky a una arquitectura compilada.

## Objetivo

Mantener la aplicación actual intacta mientras preparamos:

- código modular;
- build de producción;
- bundles JS/CSS;
- `index.html` pequeño;
- despliegue compatible con GitHub Pages y Median.

## Importante

Estos archivos todavía NO reemplazan el `index.html` actual.

La migración se hará por etapas para no arriesgar los datos de Firebase ni la versión que ya funciona.

## Requisitos

Node.js 20.19+.

Vite 8.3.0 está fijado para que el entorno sea reproducible.
