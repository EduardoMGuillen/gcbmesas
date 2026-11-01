# GCBTickets: landing propio + rediseño del landing de La Gran Casa Blanca

Fecha: 2026-11-01 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Separar dos marcas que hoy se mezclan:

| | La Gran Casa Blanca (lagrancasablanca.com) | GCBTickets (gcbtickets.com) |
|---|---|---|
| Qué es | El local: la noche, los 3 ambientes (Astronomical, Studio 54, Casa Blanca Beer Garden), las mesas | Ticketera para Casa Blanca **y otros organizadores** |
| Meta de la página | Dar ganas de venir; comprar entrada o reservar mesa | Encontrar el evento y comprarlo en menos de un minuto |
| Estética | Fotos reales y energía; colores de cada ambiente sobre negro | Negro + dorado del logo, sobria, tipo "boleto premium" |

El flujo de compra (CyberSource, QR, correo, taquilla) **no cambia**. Los callbacks de pago viven en `/api/cybersource/*` y no dependen de rutas de página.

Orden de trabajo: **Fase 1 GCBTickets**, luego **Fase 2 La Gran Casa Blanca**. Cada fase se entrega y se revisa por separado.

## Recursos

- Logo GCBTickets vectorizado desde `logoGCBTickets.jpeg` (1280×457) en `public/gcbtickets/`:
  - `logo.svg`, `logo.png` (4000 px, dorado #B08F42→#A3832F, fondo transparente) para fondos oscuros.
  - `logo-dark.png` (dorado oscuro #8A6A24) para fondos claros.
  - `icon.svg`, `icon.png` (balcón solo) para favicon/avatar.
- Fotos: `public/Eventos/1.png`–`5.png`. Verticales, ~600×870, baja resolución. Se usan solo en mosaicos/tarjetas, nunca a pantalla completa. La foto 1 trae un ícono de carrusel de Instagram: se recorta o se excluye.
- Afiches de eventos: `Event.coverImage`.

## Fase 1: GCBTickets

### Rutas (solo para hosts de GCBTickets)

Los hosts son `gcbtickets.com`, `www.gcbtickets.com` y los definidos en `CBTICKETS_HOST`. La lógica vive en `middleware.ts`.

| URL pública | Qué sirve | Tipo |
|---|---|---|
| `/` | Landing nuevo → `app/cbtickets/page.tsx` | rewrite |
| `/eventos` | Listado actual (movido) → `app/cbtickets/eventos/page.tsx` | rewrite |
| `/eventos/:id` | Detalle + compra → `app/cbtickets/[id]/page.tsx` | rewrite |
| `/cbtickets` | → `/` | 301 |
| `/cbtickets/eventos` | → `/eventos` | 301 |
| `/cbtickets/:id` | → `/eventos/:id` | 301 |
| `/cbtickets/sitemap.xml`, `/api/*`, `/_next/*`, assets, `/rifas*` | sin cambios | — |
| cualquier otra ruta | landing (`/cbtickets`) | rewrite, como hoy |

- Los rewrites no vuelven a pasar por el middleware, así que las 301 solo se aplican a peticiones originales.
- En el host de LCB, `/cbtickets/*` sigue funcionando para previsualizar.
- Enlaces internos de GCBTickets: se centralizan en un helper `lib/cbtickets-paths.ts` (`cbtHome = '/'`, `cbtEvents = '/eventos'`, `cbtEvent(id)`), usado por header, carrusel, tarjetas, detalle y `FreeCoverEventView` (`listHref` acepta `'/eventos'`).
- `sitemap.ts` de cbtickets publica `https://gcbtickets.com/`, `/eventos` y `/eventos/:id`.
- `robots.ts` no cambia de forma (ya permite `/` y `/eventos`).
- `revalidatePath` en `lib/actions.ts` agrega `/cbtickets/eventos`.

### Estética

- Fondo negro (#0B0B0B / #141210), dorado del logo como acento, texto marfil.
- Tipografía: serif display fina parecida a la del logo (Cormorant Garamond, ya cargada) para títulos; sans legible (Exo 2 actual o Inter) para el cuerpo.
- Los botones primarios son dorados con texto negro.
- El layout actual de cbtickets es claro (crema/dorado). Header, footer, listado y detalle pasan al tema oscuro para que todo GCBTickets sea coherente. `EventPurchaseClient` recibe la variante `cbtickets` con la paleta oscura nueva.

### Secciones del landing

1. **Header**: logo, enlace "Eventos", botón WhatsApp soporte. Sin Login.
2. **Hero**:
   - Mensaje: "Tus entradas en Honduras, en minutos".
   - Próximo evento destacado: afiche, nombre, fecha, lugar, precio, cuenta regresiva y botón "Comprar".
   - Sin eventos: mosaico de fotos con "Próximamente" y enlace a Instagram.
3. **Eventos destacados**: hasta 3 tarjetas con chip de fecha, lugar y ciudad (`venueName`/`venueAddress`), precio y estado (disponible / "Últimas entradas" a partir del 85 % del cupo / "Agotado"). Abajo, "Ver todos los eventos" → `/eventos`.
4. **Cómo funciona**: elige tu evento → paga con tarjeta de forma segura → recibe tu QR por correo y preséntalo en la entrada.
5. **Por qué GCBTickets**: pago seguro con BAC, QR único anti-falsificación, entrega inmediata, soporte por WhatsApp.
6. **Para organizadores**: venta en línea con tarjeta, QR anti-falsificación, escaneo en puerta con la app, reporte de ventas en tiempo real. CTA a WhatsApp con mensaje prellenado ("Quiero vender entradas de mi evento con GCBTickets").
7. **Preguntas frecuentes** (acordeón nativo `<details>`): ¿cómo recibo mi entrada?, ¿qué hago si no me llega el correo?, ¿puedo usar la entrada desde el celular?, ¿hay reembolsos? (política abajo).

   **Política de reembolso** (texto aprobado, se muestra en la FAQ y como sección en el pie):
   > Las entradas no son reembolsables. La única excepción es la cancelación del evento por parte del organizador: en ese caso se reembolsa el 100 % del valor pagado al mismo método de pago, en un plazo de hasta 15 días hábiles, sin necesidad de solicitarlo. Si el evento cambia de fecha, la entrada sigue siendo válida para la nueva fecha. No aplican reembolsos por inasistencia, llegada tarde, negación de acceso por incumplir las políticas del lugar ni por cambios en el line-up.
8. **Footer**: logo, redes, contacto, "Powered by Nexus Global".

### Datos

- No hay cambios de esquema. Se reutiliza `getPublicEvents('cbtickets')`.
- El organizador se representa con `venueName` por ahora. Un modelo `Organizer` queda fuera de alcance.

### Componentes (archivos)

- `app/cbtickets/page.tsx`: landing nuevo (server).
- `app/cbtickets/eventos/page.tsx`: listado actual, movido sin cambios funcionales.
- `app/cbtickets/_components/`: `CbtHero`, `CbtEventCard`, `CbtHowItWorks`, `CbtOrganizers`, `CbtFaq`, `CbtFooter`, `Countdown` (cliente). Cada archivo tiene una sola responsabilidad.
- `CbTicketsHeader.tsx` y `layout.tsx`: logo nuevo, tema oscuro, favicon `icon.png`, metadata con el logo como imagen OG.

## Fase 2: La Gran Casa Blanca

1. **Hero**:
   - Mosaico de fotos verticales con overlay oscuro, logo Casa Blanca y frase corta.
   - Con evento: nombre, fecha y "Comprar entrada". Sin evento: "Abrimos de jueves a sábado desde las 10 PM".
   - CTAs: **Comprar entrada** y **Reservar mesa**.
2. **Tres ambientes**: tarjeta por **Astronomical**, **Studio 54** y **Casa Blanca Beer Garden**, con logo, foto y color propio. Solo el nombre, sin línea de música.
3. **Próximos eventos**: tarjetas. Sin eventos, franja compacta en lugar de la tarjeta "PRÓXIMAMENTE" enorme. Se quita la hora fija "9:00 PM": `Event.date` no guarda hora real.
4. **Reserva tu mesa**: un solo botón de WhatsApp con mensaje prellenado.
5. **Galería**: fotos de `public/Eventos/`.
6. **Visítanos**: dirección legible, mapa con un embed válido, botones "Abrir en Google Maps" y "Abrir en Waze", horarios compactos.
7. **Footer**: un solo bloque de contacto con el propósito de cada número; "Personal" como enlace discreto que reemplaza el botón rojo "Login".

Técnico:
- Quitar Vanta/three.js, murciélagos y la fuente Creepster.
- Temas de temporada en `lib/landing-themes.ts` con `{ id, start, end }`: se activan y desactivan por fecha (hora Honduras).
- Estilos inline pasan a clases.
- JSON-LD `NightClub` + `Event`.
- `aria-label` en los íconos sociales.
- La redirección por rol y el redirect de la PWA a `/login` se conservan.

## Pruebas y verificación

- `npx tsc --noEmit` y `npm run build` sin errores.
- Local con `CBTICKETS_HOST=gcbtickets.localhost`:
  - `curl -I` verifica cada fila de la tabla de rutas (rewrites con 200, 301 con `Location` correcto).
  - `/eventos` en el host de LCB sigue mostrando el listado de LCB.
- Capturas Playwright a 1440 px y 390 px de `/`, `/eventos` y `/eventos/:id` en GCBTickets, y del landing LCB (Fase 2), con y sin eventos activos.
- Compra de prueba de punta a punta en GCBTickets antes del próximo evento real. El flujo no cambia, pero la página que lo contiene sí.

## Fuera de alcance

- Modelo de organizadores, panel para organizadores externos y comisiones.
- Buscador y filtros por ciudad o categoría (se agregan cuando haya suficiente volumen de eventos).
- Fotos nuevas en alta resolución (se sustituyen cuando el usuario las tenga).
