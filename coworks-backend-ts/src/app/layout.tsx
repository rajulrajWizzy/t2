import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'

// Define the font at module scope with a fallback
const inter = Inter({ 
  subsets: ['latin'],
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Coworks App',
  description: 'Coworks - Coworking Space Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Try to load CSS from multiple possible locations */}
        <link href="/css/tailwind.css" rel="stylesheet" />
        <link href="/globals.css" rel="stylesheet" />
        {/* Fallback inline styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
          .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
        `}} />
      </head>
      <body className={inter.className}>
        {children}
        <Script id="tailwind-config" strategy="afterInteractive">
          {`
            try {
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            } catch (e) {}
          `}
        </Script>
      </body>
    </html>
  )
}
