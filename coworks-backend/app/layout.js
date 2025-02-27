import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata = {
  title: 'Coworks - Coworking Space Management',
  description: 'Backend for coworking space management system',
};
// test
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}