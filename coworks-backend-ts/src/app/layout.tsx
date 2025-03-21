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

export const metadata: Metadata = {
  title: 'Coworks Backend API',
  description: 'Coworking space management system API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}
