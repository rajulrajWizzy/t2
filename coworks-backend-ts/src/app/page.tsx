'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(to bottom, #ffffff, #f3f4f6)'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        background: 'white'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#1f2937'
        }}>
          Coworks API Backend
        </h1>
        <p style={{
          marginBottom: '2rem',
          color: '#4b5563'
        }}>
          Welcome to the Coworks coworking space management system backend API.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '2rem'
        }}>
          <Link href="/admin/login" style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.25rem',
            textDecoration: 'none',
            fontWeight: 500
          }}>
            Admin Login
          </Link>
          
          <Link href="/api/test" style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#e5e7eb',
            color: '#1f2937',
            borderRadius: '0.25rem',
            textDecoration: 'none',
            fontWeight: 500
          }}>
            API Test
          </Link>
        </div>
      </div>
    </main>
  );
}