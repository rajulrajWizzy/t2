import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'

// Define a CSS class instead of using next/font
const interFontClass = 'font-inter';

export const metadata: Metadata = {
  title: 'Excel Coworks',
  description: 'Excel Coworks - Coworking Space Management System',
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
        {/* Add Inter font via standard CSS */}
        <link 
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
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
      <body className={`${interFontClass} min-h-full`}>
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
