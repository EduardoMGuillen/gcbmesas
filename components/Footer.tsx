'use client'

export function Footer() {
  return (
    <footer className="w-full py-4 text-center border-t border-dark-200 mt-auto">
      <p className="text-white/60 text-sm">
        Powered by{' '}
        <a
          href="https://www.instagram.com/nexus_suministros/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-400 hover:text-primary-300 transition-colors underline"
        >
          Nexus Global Suministros
        </a>
      </p>
    </footer>
  )
}
