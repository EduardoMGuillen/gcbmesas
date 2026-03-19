import { NextRequest, NextResponse } from 'next/server'

/**
 * ACS Challenge Callback
 *
 * CyberSource POSTs here (via the browser) after the cardholder completes the
 * 3DS challenge inside the step-up iframe.  This route returns a tiny HTML page
 * that immediately fires a postMessage to the parent window so the checkout UI
 * knows the challenge is done and can proceed to confirm-payment.
 */
function buildCallbackHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>3DS</title></head>
<body>
<script>
  try {
    window.parent.postMessage({ type: 'CYBS_3DS_COMPLETE' }, '*');
  } catch (e) {
    // If cross-origin restrictions block postMessage, try top as well
    try { window.top.postMessage({ type: 'CYBS_3DS_COMPLETE' }, '*'); } catch (_) {}
  }
</script>
<p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#555;">
  Verificaci&oacute;n completada. Regresando al pago&hellip;
</p>
</body>
</html>`
}

export async function POST(_req: NextRequest) {
  return new NextResponse(buildCallbackHtml(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Some ACS implementations redirect with GET instead of POST
export async function GET(_req: NextRequest) {
  return new NextResponse(buildCallbackHtml(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
