'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuperAdmin = searchParams.get('role') === 'superadmin';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    if (token && (userRole === 'BRANCH_ADMIN' || userRole === 'SUPER_ADMIN')) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Check if the user has the correct role
      if (data.data.role !== 'BRANCH_ADMIN' && data.data.role !== 'SUPER_ADMIN') {
        throw new Error('You do not have admin privileges');
      }
      
      // If super admin login is requested, verify the user is actually a super admin
      if (isSuperAdmin && data.data.role !== 'SUPER_ADMIN') {
        throw new Error('Super Admin privileges required');
      }
      
      // Store token and user info
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('userId', data.data.id);
      localStorage.setItem('userRole', data.data.role);
      localStorage.setItem('userName', data.data.name);
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      setError((err as Error).message);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {isSuperAdmin ? 'Super Admin Login' : 'Admin Login'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSuperAdmin 
              ? 'Access the super admin dashboard to manage all branches and users'
              : 'Access the admin dashboard to manage your branch'
            }
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@example.com"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 ${
              isSuperAdmin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'
            } text-white font-medium rounded-lg transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">
            Back to Home
          </Link>
        </div>
      </div>
      
      <div className="mt-8 text-gray-600 text-center">
        <p>© 2025 Coworks Space Management. All rights reserved.</p>
      </div>
    </div>
  );
}
