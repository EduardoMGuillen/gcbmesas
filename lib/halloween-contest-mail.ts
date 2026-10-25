import { escapeHtml } from './html-escape'
import { sendMailWithInlineImages } from './send-mail'
import { contestRegistrationCode } from './contest-code'

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.lagrancasablanca.com').replace(/\/$/, '')
const TICKETS_URL = 'https://gcbtickets.com'
const MAPS_URL = 'https://maps.google.com/?q=La+Gran+Casa+Blanca+San+Pedro+Sula'
const WHATSAPP_URL = 'https://wa.me/50498240217'
const INSTAGRAM_URL = 'https://www.instagram.com/casablanca_sps/'

// Paleta del landing (Resident Evil Halloween Party)
const VOID = '#07040a'
const PANEL = '#14070b'
const BLOOD = '#c8141c'
const BONE = '#ede3cf'
const GOLD = '#c9a15a'
const FOG = '#8e8597'
const LINE = '#3a1a1f'

const DISPLAY = "'Oswald','Arial Narrow','Helvetica Neue',Arial,sans-serif"
const BODY = "'Barlow','Helvetica Neue',Arial,sans-serif"

export type HalloweenContestMailData = {
  id: string
  fullName: string
  nationalId: string
  phone: string
  email: string
  instagramUrl: string
}

function maskId(nationalId: string) {
  return nationalId.length <= 4 ? nationalId : `•••• ${nationalId.slice(-4)}`
}

function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${BODY};font-size:14px;color:${FOG};width:38%;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${BODY};font-size:15px;color:${BONE};vertical-align:top;word-break:break-all;">${value}</td>
    </tr>`
}

function stepRow(n: number, html: string) {
  return `
    <tr>
      <td width="40" style="padding:0 0 16px;vertical-align:top;">
        <div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${BLOOD};color:#ffffff;text-align:center;font-family:${DISPLAY};font-weight:700;font-size:14px;">${n}</div>
      </td>
      <td style="padding:3px 0 16px;font-family:${BODY};font-size:15px;line-height:1.55;color:${BONE};vertical-align:top;">${html}</td>
    </tr>`
}

function prizeRow(place: string, prize: string, note = '') {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${BODY};font-size:13px;color:${GOLD};width:34%;vertical-align:top;">${place}</td>
      <td style="padding:12px 0;border-bottom:1px solid ${LINE};vertical-align:top;">
        <div style="font-family:${DISPLAY};font-size:19px;font-weight:700;color:${BONE};letter-spacing:0.5px;">${prize}</div>
        ${note ? `<div style="font-family:${BODY};font-size:13px;color:${FOG};padding-top:2px;">${note}</div>` : ''}
      </td>
    </tr>`
}

export function buildHalloweenContestEmailHtml(data: HalloweenContestMailData) {
  const firstName = escapeHtml(data.fullName.trim().split(/\s+/)[0] || data.fullName)
  const code = contestRegistrationCode(data.id)
  const igUrl = escapeHtml(data.instagramUrl)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Inscripción confirmada · Concurso de disfraces</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @media (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .title { font-size: 40px !important; }
      .subtitle { font-size: 17px !important; letter-spacing: 6px !important; }
      .code { font-size: 28px !important; }
    }
    a { color: ${GOLD}; }
  </style>
</head>
<body style="margin:0;padding:0;background:${VOID};" bgcolor="${VOID}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${VOID};">
    Ya estás inscrito en el concurso de disfraces. Te esperamos el sábado 31 de octubre en La Gran Casa Blanca.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${VOID}" style="background:${VOID};">
    <tr>
      <td align="center" style="padding:28px 12px 40px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 22px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${SITE_URL}/LogoCasaBlanca.png" width="76" alt="La Gran Casa Blanca" style="display:block;width:76px;height:auto;border:0;">
              </a>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td bgcolor="${PANEL}" style="background:${PANEL};background-image:radial-gradient(ellipse at 50% 0%,#5a0a10 0%,${PANEL} 65%);border:1px solid ${LINE};border-bottom:0;border-radius:18px 18px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="px" align="center" style="padding:40px 40px 10px;">
                    <div class="title" style="font-family:${DISPLAY};font-size:52px;line-height:1;font-weight:700;color:${BONE};letter-spacing:1px;text-transform:uppercase;">Resident Evil</div>
                    <div class="subtitle" style="font-family:${DISPLAY};font-size:20px;line-height:1.4;font-weight:700;color:${BLOOD};letter-spacing:9px;text-transform:uppercase;padding-top:8px;">Halloween Party</div>
                  </td>
                </tr>
                <tr>
                  <td class="px" align="center" style="padding:22px 40px 8px;">
                    <div style="font-family:${DISPLAY};font-size:26px;font-weight:500;color:${BONE};">¡Estás dentro, ${firstName}!</div>
                    <div style="font-family:${BODY};font-size:16px;line-height:1.6;color:${FOG};padding-top:10px;max-width:440px;">
                      Tu inscripción al concurso de disfraces quedó registrada. Guarda este correo: lo vas a necesitar la noche del evento.
                    </div>
                  </td>
                </tr>
                <!-- Código -->
                <tr>
                  <td class="px" align="center" style="padding:26px 40px 36px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px dashed ${GOLD};border-radius:14px;">
                      <tr>
                        <td align="center" style="padding:16px 34px;">
                          <div style="font-family:${BODY};font-size:13px;color:${GOLD};">Número de inscripción</div>
                          <div class="code" style="font-family:${DISPLAY};font-size:34px;font-weight:700;color:${BONE};letter-spacing:4px;padding-top:4px;">${code}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${LINE};border-top:0;border-radius:0 0 18px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Fecha -->
                <tr>
                  <td class="px" style="padding:0 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1d0a0e" style="background:#1d0a0e;border-left:3px solid ${BLOOD};border-radius:6px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <div style="font-family:${DISPLAY};font-size:22px;font-weight:700;color:${BONE};">Sábado 31 de octubre, 8 PM</div>
                          <div style="font-family:${BODY};font-size:14px;line-height:1.5;color:${FOG};padding-top:4px;">
                            Inscripciones al concurso en sitio de 7:00 a 11:00 PM.<br>
                            <a href="${MAPS_URL}" style="color:${GOLD};text-decoration:underline;">La Gran Casa Blanca, frente a la Fuente Luminosa, SPS</a>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Pasos -->
                <tr>
                  <td class="px" style="padding:34px 40px 6px;">
                    <div style="font-family:${DISPLAY};font-size:20px;font-weight:700;color:${BONE};padding-bottom:16px;">Qué hacer la noche del evento</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${stepRow(1, 'Llega disfrazado entre las <strong style="color:#ffffff;">7:00 y 11:00 PM</strong> y busca la mesa de inscripción del concurso.')}
                      ${stepRow(2, `Presenta tu identidad y tu número <strong style="color:#ffffff;white-space:nowrap;">${code}</strong>.`)}
                      ${stepRow(3, 'Deja tu post público con <strong style="color:#ffffff;">#CBHalloween2026</strong> hasta que anunciemos a los ganadores.')}
                    </table>
                  </td>
                </tr>

                <!-- Datos -->
                <tr>
                  <td class="px" style="padding:22px 40px 6px;">
                    <div style="font-family:${DISPLAY};font-size:20px;font-weight:700;color:${BONE};padding-bottom:6px;">Tus datos</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${detailRow('Nombre', escapeHtml(data.fullName))}
                      ${detailRow('Identidad', escapeHtml(maskId(data.nationalId)))}
                      ${detailRow('Teléfono', escapeHtml(data.phone))}
                      ${detailRow('Post de Instagram', `<a href="${igUrl}" style="color:${GOLD};text-decoration:underline;">Ver mi publicación</a>`)}
                    </table>
                    <div style="font-family:${BODY};font-size:13px;color:${FOG};padding-top:10px;">¿Algo está mal? Escríbenos por <a href="${WHATSAPP_URL}" style="color:${GOLD};">WhatsApp</a> y lo corregimos.</div>
                  </td>
                </tr>

                <!-- Premios -->
                <tr>
                  <td class="px" style="padding:30px 40px 6px;">
                    <div style="font-family:${DISPLAY};font-size:20px;font-weight:700;color:${BONE};padding-bottom:6px;">Lo que está en juego</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${prizeRow('1er lugar', 'iPhone 18 Pro Max')}
                      ${prizeRow('2do lugar', 'L. 10,000')}
                      ${prizeRow('3er lugar', 'L. 5,000')}
                      ${prizeRow('Categoría parejas', 'Viaje a Roatán para 2', 'Vuelo y estadía completa en Paradise Hotel')}
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td class="px" align="center" style="padding:34px 40px 10px;">
                    <div style="font-family:${BODY};font-size:15px;line-height:1.55;color:${BONE};padding-bottom:18px;">
                      La inscripción al concurso no incluye la entrada a la fiesta.<br>
                      <span style="color:${FOG};">Preventa L.600 hasta el 29 de octubre · Taquilla L.750</span>
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${BLOOD}" style="border-radius:999px;background:${BLOOD};">
                          <a href="${TICKETS_URL}" style="display:inline-block;padding:15px 38px;font-family:${DISPLAY};font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:999px;">Comprar mi entrada</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Poster -->
                <tr>
                  <td class="px" align="center" style="padding:30px 40px 40px;">
                    <a href="${SITE_URL}/#halloween" style="text-decoration:none;">
                      <img src="${SITE_URL}/halloween/premios-resident-evil-2026.jpg" width="320" alt="Premios del concurso de disfraces Resident Evil Halloween Party" style="display:block;width:320px;max-width:100%;height:auto;border:1px solid ${LINE};border-radius:12px;">
                    </a>
                    <div style="font-family:${BODY};font-size:13px;color:${FOG};padding-top:12px;">DJs David Luna &amp; Blake</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:26px 20px 0;font-family:${BODY};font-size:13px;line-height:1.7;color:${FOG};">
              <a href="${INSTAGRAM_URL}" style="color:${BONE};text-decoration:none;">Instagram @casablanca_sps</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="${WHATSAPP_URL}" style="color:${BONE};text-decoration:none;">WhatsApp 9824-0217</a><br>
              Recibes este correo porque te inscribiste en el concurso en
              <a href="${SITE_URL}" style="color:${FOG};">lagrancasablanca.com</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendHalloweenContestConfirmation(data: HalloweenContestMailData) {
  await sendMailWithInlineImages({
    to: data.email,
    subject: `Inscripción confirmada ${contestRegistrationCode(data.id)} · Concurso de disfraces Resident Evil`,
    html: buildHalloweenContestEmailHtml(data),
  })
}
