import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Excel Coworks',
  description: 'Coworking space management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="/output.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
