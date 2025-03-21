'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Component to handle redirecting users based on their role after authentication
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('admin_role');
    
    if (!token) {
      // If no token, redirect to login
      console.log('No authentication token found, redirecting to login');
      router.push('/admin/login');
      return;
    }
    
    console.log(`Redirecting authenticated user with role: ${role}`);
    
    // Redirect based on role
    if (role === 'super_admin') {
      router.push('/admin/super');
    } else if (role === 'branch_admin' || role === 'support_admin') {
      router.push('/admin/dashboard');
    } else {
      // Default dashboard for unknown roles
      router.push('/admin/dashboard');
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto 1rem',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem',
        }}>
          Redirecting to your dashboard
        </h1>
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
        }}>
          Please wait while we take you to the appropriate dashboard based on your role.
        </p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
} 