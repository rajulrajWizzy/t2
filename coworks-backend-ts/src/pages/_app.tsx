import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';

import './global.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  // Log page changes for debugging
  useEffect(() => {
    console.log('Page loaded:', window.location.pathname);
  }, []);

  return (
    <>
      <Head>
        <title>CoWorks API</title>
        <meta name="description" content="CoWorks API Management Portal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
} 