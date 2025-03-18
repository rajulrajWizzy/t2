import React from 'react';

export const metadata = {
  title: 'Coworks - Coworking Space Management',
  description: 'Backend for coworking space management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
