<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
'use client';

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
=======
import '@/styles/globals.css'
import { Metadata } from 'next'
import { Providers } from './providers'

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic'
>>>>>>> Stashed changes
=======
import '@/styles/globals.css'
import { Metadata } from 'next'
import { Providers } from './providers'

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic'
>>>>>>> Stashed changes
=======
import '@/styles/globals.css'
import { Metadata } from 'next'
import { Providers } from './providers'

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic'
>>>>>>> Stashed changes

export const metadata: Metadata = {
  title: 'Excel Coworks Admin Portal',
  description: 'Administration portal for Excel Coworks booking management',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    <html lang="en" className="h-full">
      <head>
        {/* Fallback CSS link for production builds */}
        <link 
          rel="stylesheet" 
          href="/css/tailwind.css" 
          precedence="default"
        />
        <Script id="fb-error-fix" strategy="beforeInteractive">
          {`
            // Fix for Facebook getUserFbFullName error
            window.addEventListener('error', function(e) {
              if (e.message && e.message.includes("Cannot read properties of null (reading 'getAttribute')") && 
                  (e.filename && e.filename.includes('ma_payload.js'))) {
                console.log('Prevented Facebook script error');
                e.stopPropagation();
                e.preventDefault();
              }
            }, true);
          `}
        </Script>
      </head>
      <body className={`${inter.className} min-h-full`}>
        {children}
        <Script id="theme-script" strategy="afterInteractive">
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
=======
    <Providers>
      {children}
    </Providers>
>>>>>>> Stashed changes
=======
    <Providers>
      {children}
    </Providers>
>>>>>>> Stashed changes
=======
    <Providers>
      {children}
    </Providers>
>>>>>>> Stashed changes
  )
}
