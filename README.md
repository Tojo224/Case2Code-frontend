# Case2Code — Frontend (React CASE Platform)

Frontend del software CASE para diagramado de clases UML con `@xyflow/react`, Zustand y React 19.

## Tecnologías

- React 19
- TypeScript
- Vite
- @xyflow/react (React Flow)
- Zustand
- TailwindCSS

## Arquitectura

El estado del diagrama en Zustand no duplica un modelo propio independiente: despacha `Typed UML Commands` hacia el backend FastAPI para mutar el `CanonicalUmlDocument v1`.

