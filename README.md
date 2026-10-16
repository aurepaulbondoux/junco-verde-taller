# 🧶 Junco Verde — Sistema de gestión de taller

Aplicación web para la gestión integral del taller artesanal de Junco Verde (Punta del Este, Uruguay).

## ¿Qué hace?

- **Pedidos** — seguimiento de estado, fechas de entrega, cobros y envíos
- **Artesanas** — capacidad, carga de trabajo, ficha individual
- **Pagos a artesanas** — mano de obra estimada vs. pagado, historial
- **Clientes** — historial de pedidos, saldo pendiente
- **Stock de prendas** — inventario con control +/−
- **Stock de lanas** — alertas de reposición por tipo
- **Tabla de talles** — medidas, lana y costo estimado por talle
- **Comprobantes** — facturas de compra/venta con lectura por IA (foto)
- **Planificación** — simulador de producción, capacidad por artesana
- **Análisis** — financiero, rendimiento de artesanas, expedición
- **Configuración** — precios del catálogo, tiempos de producción, alertas

## Tecnología

- React (sin framework, corre directo en el browser)
- Estilos inline — sin dependencias de CSS
- Datos en memoria de sesión (sin base de datos externa)
- Integración con Anthropic API para lectura de facturas con IA

## Cómo usar

La app está diseñada para correr como un artefacto React standalone. Podés:

1. Pegarla en [claude.ai](https://claude.ai) como artefacto React
2. Integrarla en un proyecto con Vite + React

## Orden de carga inicial

Ver `INSTRUCTIVO.md` para la guía paso a paso de cómo cargar los datos por primera vez.

## Catálogo de prendas

Incluye el catálogo completo de Junco Verde:
- Ruanas / Ponchos / Chales
- Sweaters / Sacos
- Kids
- Sombreros
- Hilados

---

*Desarrollado con Claude (Anthropic) · 2025*
