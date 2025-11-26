# 🚀 Guía Rápida: Acceso desde Cualquier iPad

## ✅ Opción Más Rápida: Usar Vercel (Si ya está desplegado)

1. **Ve a Vercel Dashboard:** https://vercel.com/dashboard
2. **Encuentra tu URL:** Debería ser algo como `https://gcbmesas-xxxxx.vercel.app`
3. **Abre en iPad:** Safari → `https://tu-url.vercel.app`
4. **¡Listo!** Funciona desde cualquier lugar con Internet

## 🔧 Si Necesitas Desarrollo Local Accesible desde Internet

### Opción A: localtunnel (Más Fácil)

1. **Instalar:**
   ```bash
   npm install -g localtunnel
   ```

2. **Usar:**
   ```bash
   # Terminal 1: Inicia el servidor
   npm run dev
   
   # Terminal 2: Inicia el túnel
   lt --port 3000
   ```

3. **Copiar la URL** que te da (ej: `https://abc123.loca.lt`)

4. **Crear `.env.local`:**
   ```env
   NEXTAUTH_URL=https://abc123.loca.lt
   NEXT_PUBLIC_APP_URL=https://abc123.loca.lt
   ```

5. **Reiniciar el servidor** y usar la URL en el iPad

### Opción B: ngrok (Más Estable)

1. **Instalar:** https://ngrok.com/download
2. **Crear cuenta gratis:** https://ngrok.com
3. **Configurar:**
   ```bash
   ngrok config add-authtoken TU_TOKEN
   ```
4. **Usar:**
   ```bash
   # Terminal 1: npm run dev
   # Terminal 2: ngrok http 3000
   ```
5. **Copiar URL** y configurar `.env.local` igual que arriba

## 📱 Acceso desde iPad

1. Abre Safari
2. Ve a la URL (Vercel o túnel)
3. Inicia sesión
4. ¡Listo!

## ⚠️ Importante

- **Vercel:** Mejor para producción, siempre funciona
- **Túneles:** Solo para desarrollo, URL puede cambiar
- **Siempre usa HTTPS** (no HTTP) para que funcione en iPad

## 🆘 Si No Funciona

1. Verifica que `NEXTAUTH_URL` coincida exactamente con la URL que usas
2. Limpia caché y cookies en el iPad
3. Verifica que el servidor esté corriendo
4. Revisa `ACCESO_DESDE_CUALQUIER_IPAD.md` para más detalles

