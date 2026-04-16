# CyberSource: estado actual de pagos y anulaciones

Este documento describe **como funciona hoy** el flujo de pagos online y reembolsos/anulaciones con CyberSource en este proyecto.

## Confirmacion de alcance (hoy)

- **Hoy no se cambiaron archivos de CyberSource** (`app/api/cybersource/*`, `lib/cybersource*.ts`).
- La verificacion se hizo revisando commits recientes: los ultimos cambios fueron en seguridad general, cuentas, facturacion cajero y notificaciones, pero no en modulos CyberSource.

## Archivos clave

- Flujo de pago:
  - `app/api/cybersource/create-payment/route.ts`
  - `app/api/cybersource/payer-auth/route.ts`
  - `app/api/cybersource/payer-auth-result/route.ts`
  - `app/api/cybersource/3ds-callback/route.ts`
  - `app/api/cybersource/confirm-payment/route.ts`
- Cliente de compra:
  - `app/eventos/[id]/EventPurchaseClient.tsx`
- Cliente REST + utilidades:
  - `lib/cybersource.ts`
  - `lib/cybersource-sdk-direct.ts`
  - `lib/cybersource-payment-audit.ts`
- Reembolsos/anulaciones:
  - `lib/cybersource-refund.ts`
  - `lib/actions.ts` (funcion `cancelEntry`)

## Variables de entorno relevantes

- `CYBERSOURCE_ENV`: `test` o `live` (acepta aliases tipo `production`, `prod`, `true` para live).
- `CYBERSOURCE_MERCHANT_ID`
- `CYBERSOURCE_KEY_ID`
- `CYBERSOURCE_SHARED_SECRET`
- `CYBERSOURCE_MOCK`: `true` para simulacion.
- `CYBERSOURCE_PAYMENT_MODE`: `unified` (default) o `direct`.
- `CYBERSOURCE_ENABLE_3DS`: `true`/`false`.
- `NEXTAUTH_URL` o `NEXT_PUBLIC_APP_URL` para callbacks/origin.

## Flujo de pago actual (resumen)

## 1) Crear intento de pago (`create-payment`)

Endpoint: `POST /api/cybersource/create-payment`

- Valida evento activo, precio online y cupo disponible.
- Genera `paymentReference`.
- Registra log `EVENT_UPDATED` con `details.type = "CYBERSOURCE_PENDING"`.
- Modos:
  - **Mock**: devuelve `{ mock: true, paymentReference }`.
  - **Direct**: devuelve `{ paymentReference, directMode: true }`.
  - **Unified**: crea `captureContext` de Microform (`/microform/v2/sessions`) y devuelve JWT + libreria cliente.

Nota: en Unified, se construye `targetOrigins` para que coincida con el origin real del navegador.

## 2) 3DS (`payer-auth` y `payer-auth-result`)

Endpoints:
- `POST /api/cybersource/payer-auth`
- `POST /api/cybersource/payer-auth-result`
- Callback ACS: `/api/cybersource/3ds-callback`

Comportamiento:
- Si `CYBERSOURCE_ENABLE_3DS=false`, responde `skipped` y sigue sin 3DS.
- Hace setup/enroll por SDK directo.
- Si banco exige challenge, responde `challenge_required` con `stepUpUrl` y `authenticationTransactionId`.
- Al completar challenge, el callback dispara `postMessage` (`CYBS_3DS_COMPLETE`) y el front consulta `payer-auth-result`.
- Se normaliza data 3DS (CAVV, ECI numerico, XID, IDs 3DS).

## 3) Confirmar y registrar pago (`confirm-payment`)

Endpoint: `POST /api/cybersource/confirm-payment`

- Recupera log pendiente por `paymentReference + eventId`.
- Valida que no este ya procesado.
- Ejecuta autorizacion/cobro:
  - **Direct**: auth via SDK + captura explicita por REST (`/pts/v2/payments/{id}/captures`).
  - **Unified**: pago via SDK con token transient.
  - **Mock**: simulado.
- Resuelve y exige `captureId` (si no hay, se rechaza con mensaje controlado).
- Si pago es exitoso:
  - emite entradas en transaccion serializable,
  - registra `ENTRY_SOLD` con `source: "online_cybersource"`,
  - guarda auditoria (`CYBERSOURCE_PAYMENT_AUDIT`),
  - marca el log pendiente como `PROCESSED`,
  - envia correo con QR.

## Reembolsos y anulaciones actuales

## 1) Entrada offline/legacy (sin log online)

`cancelEntry` en `lib/actions.ts`:
- Si no encuentra log `ENTRY_SOLD` de `online_cybersource`, solo marca entrada como `CANCELLED` (sin refund automatico).

## 2) Entrada online CyberSource

`cancelEntry`:
- Busca log de venta online asociado a la entrada (`findOnlineSaleLogForEntry`).
- Verifica que no exista refund previo para esa entrada.
- Calcula monto proporcional por entrada (`perEntryRefundAmount`) para cuadrar centavos.
- Llama `refundCyberSourceCaptureForEntry`.

`refundCyberSourceCaptureForEntry` (`lib/cybersource-refund.ts`):
- Intenta refund sobre `captureId`.
- Si 404, aplica estrategia de recuperacion de capture IDs:
  - `GET /pts/v2/payments/{id}`
  - `GET /tss/v2/transactions/{id}`
  - `POST/GET /tss/v2/searches` por `clientReferenceInformation.code`
- Reintenta en candidatos validos, excluyendo IDs de autorizacion (no capturas).

Si refund exitoso:
- actualiza log de venta con `cybersourceRefundEvents`,
- cancela entrada,
- registra auditoria `PAYMENT_REFUNDED` (o fallback `EVENT_UPDATED` si enum falla).

Si refund falla:
- registra auditoria de fallo (`CYBERSOURCE_REFUND_FAILED`) con detalles y hints de ambiente/merchant.
- devuelve mensaje controlado al usuario.

## Logs y trazabilidad

- `EVENT_UPDATED` con `type = CYBERSOURCE_PENDING` para pedido pendiente.
- `ENTRY_SOLD` con metadatos de transaccion/captura al completar.
- `CYBERSOURCE_PAYMENT_AUDIT` para auditoria tecnica de pagos (success/rejected/mock).
- `PAYMENT_REFUNDED` para reembolsos exitosos.
- `EVENT_UPDATED` con `type = CYBERSOURCE_REFUND_FAILED` para fallos de refund.

## Riesgos operativos actuales a vigilar

- `CYBERSOURCE_ENV` incorrecto (test/live) causa 404 en consulta de pagos/capturas.
- Merchant/credenciales distintas entre venta y refund bloquean anulaciones automaticas.
- Si no se persiste `captureId`, `confirm-payment` ya protege y no emite entradas.

## Guia rapida de operacion

- Para venta normal: `create-payment` -> (opcional `payer-auth`) -> `confirm-payment`.
- Para anular una entrada online: usar `cancelEntry` desde modulo de entradas; el sistema intenta refund automatico.
- Si falla refund:
  - revisar `admin/logs` por `CYBERSOURCE_REFUND_FAILED`,
  - validar `CYBERSOURCE_ENV`, merchant y `captureId`.

## Nota final

Este documento refleja el comportamiento **actual** del codigo al momento de su creacion.
