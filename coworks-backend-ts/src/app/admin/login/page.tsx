'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [dbStatus, setDbStatus] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize API URL based on current location
    const origin = window.location.origin;
    setApiUrl(`${origin}/api/admin/auth/login`);
    console.log(`Set API URL to: ${origin}/api/admin/auth/login`);
    
    // Check if already logged in
    const token = localStorage.getItem('admin_token');
    if (token) {
      const role = localStorage.getItem('admin_role');
      console.log('User already has a token, redirecting to dashboard');
      
      if (role === 'super_admin') {
        router.push('/admin/super');
      } else {
        router.push('/admin/dashboard');
      }
    }
    
    // Check database status
    checkDatabaseStatus();
  }, [router]);
  
  // Function to check database status
  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch(`${window.location.origin}/api/database-status`);
      if (response.ok) {
        const data = await response.json();
        setDbStatus(data);
        console.log('Database status:', data);
      }
    } catch (err) {
      console.error('Error checking database status:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log(`Attempting login with username: ${username}`);
    console.log(`Using API URL: ${apiUrl}`);

    try {
      // Using full URL from origin to avoid relative path issues
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
      });

      console.log('Login response status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('Login response data keys:', Object.keys(data));
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error('Server returned an invalid response format');
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Login failed with status: ${response.status}`);
      }

      console.log('Login successful, processing response data');
      
      // Store token and admin data
      if (data.data && data.data.token) {
        localStorage.setItem('admin_token', data.data.token);
        
        if (data.data.admin && data.data.admin.role) {
          localStorage.setItem('admin_role', data.data.admin.role);
          localStorage.setItem('admin_name', data.data.admin.name || 'Admin User');
          localStorage.setItem('admin_id', data.data.admin.id.toString());
          
          console.log(`Logged in as ${data.data.admin.role}, redirecting...`);
          
          // Redirect based on role
          if (data.data.admin.role === 'super_admin') {
            router.push('/admin/super');
          } else {
            router.push('/admin/dashboard');
          }
        } else {
          // Default redirect if role isn't found
          console.log('Role not found in response, using default redirect');
          router.push('/admin/dashboard');
        }
      } else {
        throw new Error('Invalid response format - token missing');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#1f2937'
        }}>
          Admin Login
        </h1>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
        
        {dbStatus && !dbStatus.database_connection && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}>
            Database connection error: {dbStatus.database_error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label 
              htmlFor="username" 
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
              placeholder="superadmin"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="password" 
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              fontWeight: '500',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? '0.7' : '1',
              border: 'none'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div style={{marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280'}}>
          Default credentials: <span style={{fontWeight: 'bold'}}>superadmin / CoWorks@SuperAdmin2023</span>
        </div>
        
        <div style={{marginTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem'}}>
          <a 
            href="/api/database-status" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{color: '#3b82f6'}}
          >
            Check Database Status
          </a>
        </div>
        
        {dbStatus && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            fontSize: '0.75rem',
            backgroundColor: dbStatus.super_admin_exists ? '#dcfce7' : '#fee2e2',
            borderRadius: '0.375rem',
            color: dbStatus.super_admin_exists ? '#166534' : '#b91c1c'
          }}>
            <p>Database: {dbStatus.database_connection ? '✅ Connected' : '❌ Not connected'}</p>
            <p>Admin table: {dbStatus.admins_table ? '✅ Exists' : '❌ Not found'}</p>
            <p>Super admin: {dbStatus.super_admin_exists ? '✅ Created' : '❌ Not found'}</p>
          </div>
        )}
      </div>
    </div>
  );
} 