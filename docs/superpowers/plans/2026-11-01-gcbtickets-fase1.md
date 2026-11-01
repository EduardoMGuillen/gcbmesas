# GCBTickets Fase 1 (landing + rutas + tema negro/dorado) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gcbtickets.com tiene landing propio en `/`, el listado actual pasa a `/eventos`, el detalle a `/eventos/:id`, y todo GCBTickets usa el tema negro/dorado del logo.

**Architecture:**
- La decisión de enrutamiento por host se extrae a una función pura (`resolveCbtRequest`), con tests, y `middleware.ts` solo la aplica.
- Las páginas siguen viviendo bajo `app/cbtickets/*`. El landing se compone de componentes pequeños en `app/cbtickets/_components/`.
- No hay cambios de esquema ni del flujo de pago.

**Tech Stack:** Next.js 14.0.4 (App Router), React 18, Tailwind, Prisma. Vitest se agrega solo para tests de lógica pura.

**Spec:** `docs/superpowers/specs/2026-11-01-gcbtickets-landing-y-rediseno-lcb-design.md` (solo la sección "Fase 1"; la Fase 2 tendrá su propio plan).

## Global Constraints

- Hosts GCBTickets: `gcbtickets.com`, `www.gcbtickets.com` + lista de `CBTICKETS_HOST` (separada por comas). Para pruebas locales: `CBTICKETS_HOST=gcbtickets.localhost`.
- Colores:
  - Fondo `#0B0B0B` / superficies `#141210`.
  - Dorado `#B08F42` → `#A3832F`.
  - Texto marfil `#EDE6D6`.
  - Botón primario: dorado con texto `#0B0B0B`.
- Tipografías: Cormorant Garamond (títulos) y Exo 2 (cuerpo). Ya se cargan en `app/cbtickets/layout.tsx`.
- Logos: `/gcbtickets/logo.svg` (header/footer), `/gcbtickets/icon.png` (favicon), `/gcbtickets/logo.png` (imagen OpenGraph).
- WhatsApp:
  - Soporte GCBTickets: `https://wa.me/50498823627` (Nexus Global, +504 9882-3627).
  - Organizadores: el mismo número con `?text=` = `Quiero vender entradas de mi evento con GCBTickets`.
- Instagram: `https://www.instagram.com/casablanca_sps/`.
- Copy hero: "Tus entradas en Honduras, en minutos".
- Política de reembolso: texto exacto del spec (sección FAQ), sin modificar.
- Umbral "Últimas entradas": vendidas ≥ 85 % de `maxEntries`.
- Las fechas se formatean con `timeZone: 'UTC'`, como hoy: `Event.date` se guarda como fecha a mediodía UTC, sin hora real. La cuenta regresiva es en **días**, nunca en horas o minutos.
- No tocar `/api/cybersource/*`, `lib/cybersource*.ts` ni la lógica de compra de `EventPurchaseClient` (solo su paleta).

## Review Focus

1. **Sin eventos publicados en cbtickets**: el hero muestra el mosaico de fotos + "Próximamente" y la sección de destacados no aparece. Nunca una cuadrícula vacía. → Task 5.
2. **Evento agotado o de cover gratuito en hero o tarjeta**: agotado muestra "Agotado" sin enlace de compra; gratuito muestra "Entrada libre" + "Ver evento", nunca "L 0.00". → Task 4 (`getTicketAvailability`) y Task 5.
3. **Links viejos compartidos** `/cbtickets/:id?utm=...` y `/cbtickets/` con barra final: la 301 conserva el query string y normaliza la barra. → Task 1.
4. **Host de LCB**: `lagrancasablanca.com/eventos` sigue sirviendo el listado de LCB y `/cbtickets` sigue accesible sin redirigir. → Task 1 (el resolver devuelve `next` para hosts no-CBT) y Task 2 (curl).
5. **Assets en el host CBT** (`/Eventos/1.png`, `/gcbtickets/logo.svg`, `/cbtickets/sitemap.xml`): no se reescriben al landing ni se redirigen. → Task 1.

---

### Task 1: Rutas GCBTickets como lógica pura (con tests)

**Files:**
- Create: `lib/cbtickets-paths.ts`, `lib/cbtickets-routing.ts`, `lib/__tests__/cbtickets-routing.test.ts`, `vitest.config.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `lib/cbtickets-paths.ts`: `CBT_HOME = '/'`, `CBT_EVENTS = '/eventos'`, `cbtEventPath(id: string): string` → `/eventos/${id}`.
  - `lib/cbtickets-routing.ts`:
    - `getCbtHosts(envValue: string | undefined): string[]`
    - `type CbtDecision = { kind: 'next' } | { kind: 'rewrite'; pathname: string } | { kind: 'redirect'; pathname: string }`
    - `resolveCbtRequest(input: { host: string; pathname: string; method: string; cbtHosts: string[] }): CbtDecision`

- [ ] **Step 1:** `npm i -D vitest@1.6.0`; crear `vitest.config.ts` con `test.include: ['lib/**/*.test.ts']` y alias `@` → raíz (igual que `tsconfig.json`).
- [ ] **Step 2: Escribir los tests que fallan** en `lib/__tests__/cbtickets-routing.test.ts`. Usar `cbtHosts = getCbtHosts('gcbtickets.localhost')`:
  - `getCbtHosts(undefined)` contiene `gcbtickets.com` y `www.gcbtickets.com`; `getCbtHosts(' A.com , ')` agrega `a.com`.
  - Host no-CBT (`lagrancasablanca.com`, `/eventos`) → `{kind:'next'}`.
  - CBT `GET /` → rewrite `/cbtickets`.
  - CBT `/eventos` y `/eventos/` → rewrite `/cbtickets/eventos`.
  - CBT `/eventos/abc123` → rewrite `/cbtickets/abc123`.
  - CBT `/cbtickets` y `/cbtickets/` → redirect `/`.
  - CBT `/cbtickets/eventos` → redirect `/eventos`.
  - CBT `/cbtickets/abc123` → redirect `/eventos/abc123`.
  - CBT `/cbtickets/sitemap.xml`, `/api/x`, `/_next/x`, `/rifas`, `/rifas.html`, `/sw.js`, `/manifest.json`, `/favicon.ico`, `/gcbtickets/logo.svg`, `/Eventos/1.png` → `next`.
  - CBT `/admin` → rewrite `/cbtickets` (comportamiento actual).
  - CBT `POST /` → `next`.
  - Host con puerto y mayúsculas (`GCBTickets.localhost:3000`) se trata como CBT.
- [ ] **Step 3:** `npm test`. Esperado: FAIL (módulos no existen).
- [ ] **Step 4:** Implementar ambos archivos.
  - Normalizar barra final, excepto en `/`.
  - Considerar asset cualquier ruta con extensión de archivo (`/\.[a-z0-9]+$/i`), salvo que empiece con `/cbtickets/` y no sea `sitemap.xml`.
  - Las rutas `/eventos/:id` con más de un segmento hacen rewrite al landing.
- [ ] **Step 5:** `npm test`. Esperado: todos PASS.
- [ ] **Step 6:** Commit `feat(cbtickets): resolver de rutas por host con tests`.

### Task 2: Middleware usa el resolver

**Files:**
- Modify: `middleware.ts` (reemplazar el bloque `hostRaw … NextResponse.rewrite` por el resolver)

**Interfaces:**
- Consumes: `getCbtHosts`, `resolveCbtRequest` (Task 1).

- [ ] **Step 1:** Con `rewrite`: `url.pathname = d.pathname; return NextResponse.rewrite(url)`. Con `redirect`: clonar la URL conservando `search`, `NextResponse.redirect(url, 301)`. Con `next`: seguir con el flujo existente sin cambios.
- [ ] **Step 2:** Crear placeholder `app/cbtickets/eventos/page.tsx` que reexporte el default de `app/cbtickets/page.tsx` (Task 3 lo reemplaza), para que la ruta exista.
- [ ] **Step 3:** `CBTICKETS_HOST=gcbtickets.localhost npm run dev`. En otra terminal, verificar con `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -H 'Host: gcbtickets.localhost:3000' http://localhost:3000<ruta>`:
  - `/` → 200; `/eventos` → 200; `/cbtickets/abc?x=1` → `301 …/eventos/abc?x=1`; `/cbtickets` → `301 …/`.
  - Con `Host: localhost:3000`: `/eventos` → 200 y contiene "Eventos" de LCB; `/cbtickets` → 200 sin redirect.
- [ ] **Step 4:** Commit `feat(cbtickets): middleware enruta / y /eventos en gcbtickets`.

### Task 3: Listado a `/eventos` y enlaces/sitemap con las rutas nuevas

**Files:**
- Create: `app/cbtickets/eventos/page.tsx` (contenido actual de `app/cbtickets/page.tsx`, misma metadata con `alternates.canonical: '/eventos'`)
- Modify:
  - `app/cbtickets/page.tsx`: placeholder temporal que renderiza el listado hasta Task 5.
  - `app/cbtickets/FeaturedEventsCarousel.tsx:89`
  - `app/cbtickets/[id]/page.tsx` (enlaces "Inicio" y "Ver otros eventos", `listHref`, `eventsListPath`)
  - `app/eventos/_components/FreeCoverEventView.tsx:8` (tipo `listHref: '/eventos' | '/cbtickets'` se mantiene; cbtickets pasa `CBT_EVENTS`)
  - `app/cbtickets/CbTicketsHeader.tsx:11` → `CBT_HOME`
  - `app/cbtickets/sitemap.ts` (URLs `https://gcbtickets.com/`, `/eventos`, `/eventos/:id`)
  - `app/cbtickets/layout.tsx` (`canonical`/`og:url` → `/`)
  - `lib/actions.ts:3347,3472,3495` (agregar `revalidatePath('/cbtickets/eventos')`)

**Interfaces:**
- Consumes: `CBT_HOME`, `CBT_EVENTS`, `cbtEventPath` (Task 1).

- [ ] **Step 1:** Mover el listado y reemplazar todo literal `'/cbtickets'` / `` `/cbtickets/${id}` `` de enlaces visibles por los helpers. Verificar con `grep -rn "href=.*/cbtickets\|eventsListPath=\"/cbtickets\|listHref=\"/cbtickets" app/cbtickets` (esperado: sin resultados).
- [ ] **Step 2:** `npx tsc --noEmit`. Esperado: sin errores.
- [ ] **Step 3:** En dev con host CBT: `/eventos` lista eventos; al hacer clic en un evento abre `/eventos/<id>` con el formulario de compra; "Ver otros eventos" vuelve a `/eventos`.
- [ ] **Step 4:** Commit `feat(cbtickets): listado en /eventos y enlaces/sitemap con rutas nuevas`.

### Task 4: Tema negro/dorado y disponibilidad de entradas

**Files:**
- Create:
  - `lib/ticket-availability.ts`
  - `lib/__tests__/ticket-availability.test.ts`
  - `app/cbtickets/_components/CbtFooter.tsx`
  - `app/cbtickets/_components/CbtEventCard.tsx`
- Modify:
  - `app/cbtickets/layout.tsx`: fondo `#0B0B0B`, quitar la cuadrícula crema, `icons: { icon: '/gcbtickets/icon.png' }`, `openGraph.images: ['/gcbtickets/logo.png']`, renderizar `CbtFooter` y textos de metadata sin "oficial de La Gran Casa Blanca".
  - `app/cbtickets/CbTicketsHeader.tsx`: logo `/gcbtickets/logo.svg` (alto 36px móvil / 44px desktop), a la izquierda; a la derecha "Eventos" y un botón WhatsApp de soporte.
  - `app/cbtickets/[id]/page.tsx`: estilos oscuros; quitar su footer propio.
  - `app/cbtickets/eventos/page.tsx`: estilos oscuros; usa `CbtEventCard`.
  - `app/eventos/[id]/EventPurchaseClient.tsx:44-100`: rama `cbtickets` de `getPurchasePalette` con valores oscuros/dorados. Las claves y la forma del objeto no cambian; `isLight: false`.
  - `app/eventos/_components/FreeCoverEventView.tsx`: rama `isCb` en oscuro/dorado.

**Interfaces:**
- Produces:
  - `type TicketAvailability = 'free' | 'available' | 'last' | 'soldout'`
  - `getTicketAvailability(e: { coverPrice: number; paypalPrice: number | string | null; maxEntries: number | null; entriesSoldSum: number }): TicketAvailability` (usa `isPublicFreeCoverOnly`)
  - `export type CbtEvent = { id: string; name: string; date: string; coverImage: string | null; coverPrice: number; paypalPrice: number | null; maxEntries: number | null; entriesSoldSum: number; venueName: string | null; venueAddress: string | null }` y `CbtEventCard({ event }: { event: CbtEvent })`
  - `CbtFooter` (sin props): logo, redes, WhatsApp, "Política de reembolso" (ancla `/#faq`), "Powered by Nexus Global", ©.

- [ ] **Step 1: Tests que fallan**:
  - Gratis → `'free'`.
  - `maxEntries: null` → `'available'`.
  - 100/84 → `'available'`; 100/85 → `'last'`; 100/100 → `'soldout'`; 100/120 → `'soldout'`.
  - `maxEntries: 0` → `'available'` (igual que la regla actual `maxEntries >= 1`).
- [ ] **Step 2:** `npm test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `getTicketAvailability`. `npm test`. Esperado: PASS.
- [ ] **Step 4:** `CbtEventCard`:
  - Afiche (`coverImage`, `object-cover`, proporción 4:5) o un fondo con `icon.svg` si no hay afiche.
  - Chip de fecha (día grande + mes corto, UTC), nombre, línea `venueName · venueAddress` si existe, precio `L x.xx` o "Entrada libre".
  - Insignia "Últimas entradas" (`last`) o "Agotado" (`soldout`).
  - Toda la tarjeta enlaza a `cbtEventPath(id)`, salvo `soldout`, que no es enlace.
- [ ] **Step 5:** Aplicar el tema al resto de archivos de la lista.
- [ ] **Step 6:** `npx tsc --noEmit`. Luego capturas Playwright (390 px y 1440 px) de `/eventos` y `/eventos/<id>` en el host CBT. Verificar a ojo:
  - Texto legible sobre negro.
  - Formulario de pago legible (inputs, chips, botón).
  - Nada en crema/blanco residual.
- [ ] **Step 7:** Commit `feat(cbtickets): tema negro/dorado, logo nuevo y tarjeta de evento`.

### Task 5: Landing de GCBTickets

**Files:**
- Create en `app/cbtickets/_components/`:
  - `CbtHero.tsx`
  - `DaysLeft.tsx` (cliente)
  - `CbtHowItWorks.tsx`
  - `CbtWhy.tsx`
  - `CbtOrganizers.tsx`
  - `CbtFaq.tsx`
- Modify: `app/cbtickets/page.tsx` (reemplaza el placeholder de Task 3)

**Interfaces:**
- Consumes: `CbtEventCard`, `getTicketAvailability` (Task 4); `cbtEventPath`, `CBT_EVENTS` (Task 1); `getPublicEvents('cbtickets')`.
- Produces: `daysUntil(eventDateIso: string, now: Date): number` en `lib/ticket-availability.ts`. Días calendario en zona `America/Tegucigalpa`, mínimo 0.

- [ ] **Step 1: Tests que fallan** para `daysUntil`:
  - Evento `2026-11-07T12:00:00Z` con `now = 2026-11-01T16:00:00Z` → `6`.
  - Mismo día → `0`.
  - Evento pasado → `0`.
  - `now = 2026-11-01T05:30:00Z` (31 oct 23:30 en Honduras) con evento del 1 nov → `1`.
- [ ] **Step 2:** `npm test` FAIL → implementar → PASS.
- [ ] **Step 3:** `CbtHero({ event }: { event: CbtEvent | null })`.
  - Con evento:
    - Columna de texto: H1 "Tus entradas en Honduras, en minutos", subtítulo "Compra en línea, recibe tu QR al instante y entra sin filas."
    - Tarjeta destacada: afiche, nombre, fecha, lugar, precio y `DaysLeft` ("Faltan N días" / "¡Es hoy!").
    - Botón "Comprar" a `cbtEventPath`, o "Agotado" deshabilitado, o "Ver evento" si es gratis.
  - Sin evento: mosaico de `/Eventos/2.png`–`5.png` (sin la 1) con overlay, H1 igual, texto "Próximamente nuevos eventos" y botón a Instagram.
- [ ] **Step 4:** Secciones:
  - `CbtHowItWorks`: 3 pasos del spec.
  - `CbtWhy`: 4 puntos del spec.
  - `CbtOrganizers`: 4 beneficios del spec + CTA WhatsApp con texto prellenado (URL-encoded).
  - `CbtFaq` con `id="faq"`, 4 `<details>`:
    - El de reembolsos usa el texto exacto del spec.
    - Respuestas a las otras 3: el QR llega al correo indicado en la compra; si no llega, revisar spam y escribir al WhatsApp de soporte con el nombre y correo usados; la entrada se muestra desde el celular, no hace falta imprimirla.
- [ ] **Step 5:** `app/cbtickets/page.tsx`:
  - `events = await getPublicEvents('cbtickets')`, `featured = events[0] ?? null`.
  - Orden: Hero → "Próximos eventos" (`events.slice(0,3)` con `CbtEventCard` + enlace "Ver todos los eventos" a `CBT_EVENTS`; la sección no se renderiza si `events.length === 0`) → HowItWorks → Why → Organizers → Faq.
  - Metadata: título "GCBTickets | Entradas para eventos en Honduras".
- [ ] **Step 6:** `npx tsc --noEmit` y `npm test`. Capturas Playwright a 390 px y 1440 px de `/` en el host CBT:
  - En el estado real (sin eventos hoy).
  - Con un evento de prueba: marcar temporalmente un evento existente con `publishOnCbtickets=true` en la BD local o de desarrollo. **No en producción.** Si solo hay BD de producción, simular pasando un evento mock a `CbtHero` en un entorno de desarrollo y revertir.
  - Verificar Review Focus 1 y 2 a ojo.
- [ ] **Step 7:** Commit `feat(cbtickets): landing nuevo con hero, organizadores y FAQ`.

### Task 6: Verificación final

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit`, `npx next lint`. Esperado: sin errores nuevos.
- [ ] **Step 2:** Repetir la matriz de curl de Task 2 completa, incluido el host de LCB.
- [ ] **Step 3:** Revisar `git diff master --stat`. Ningún archivo de `/api/cybersource`, `lib/cybersource*` ni la lógica de `EventPurchaseClient` fuera de la paleta.
- [ ] **Step 4:** Reportar al usuario con capturas. Recordar la compra de prueba de punta a punta en producción tras el deploy y antes del próximo evento.
