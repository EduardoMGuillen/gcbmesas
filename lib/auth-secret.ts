import crypto from 'crypto'

// This file MUST be imported before any NextAuth-related code
// It ensures NEXTAUTH_SECRET is always available in process.env
// NextAuth validates process.env.NEXTAUTH_SECRET during initialization,
// so we must set it before NextAuth modules are loaded

// Get the secret from environment or generate a fallback
const getSecret = () => {
  const existingSecret = process.env.NEXTAUTH_SECRET
  
  if (existingSecret && existingSecret.length >= 32) {
    // Ensure it's set in process.env
    if (!process.env.NEXTAUTH_SECRET) {
      process.env.NEXTAUTH_SECRET = existingSecret
    }
    return existingSecret
  }
  
  // Generate a deterministic secret based on VERCEL_URL or a fixed fallback
  // This ensures the secret is consistent across server restarts for preview deployments
  // WARNING: This is NOT secure for production - NEXTAUTH_SECRET should always be set in production
  const deterministicKey = process.env.VERCEL_URL || process.env.VERCEL || 'preview-deployment-fallback-key'
  const hash = crypto.createHash('sha256').update(deterministicKey).digest('base64')
  
  // Set it in process.env so NextAuth can find it
  process.env.NEXTAUTH_SECRET = hash
  
  console.warn('[NextAuth Secret] NEXTAUTH_SECRET not set or invalid, using generated secret. This should only happen in preview deployments.')
  return hash
}

// Set the secret immediately when this module loads
const secret = getSecret()

// Export the secret value for use in authOptions
export const NEXTAUTH_SECRET = secret
