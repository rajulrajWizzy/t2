'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsLoading(false);
      return;
    }

    // Check if user is logged in and is an admin
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Verify admin status
    fetch('/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (response.status === 403 || response.status === 401) {
          // Not an admin or unauthorized
          router.push('/admin/login');
        } else {
          setIsAdmin(true);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error verifying admin status:', error);
        router.push('/admin/login');
        setIsLoading(false);
      });
  }, [router, pathname]);

  // Show loading indicator while checking admin status
  if (isLoading && pathname !== '/admin/login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  // If we're on the login page or we've verified the user is an admin, show the content
  if (pathname === '/admin/login' || isAdmin) {
    return (
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-blue-800 text-white">
          <div className="p-4">
            <h1 className="text-2xl font-bold">Admin Portal</h1>
          </div>
          <nav className="mt-6">
            <ul>
              <li>
                <Link href="/admin" className="block py-3 px-4 hover:bg-blue-700 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/branches" className="block py-3 px-4 hover:bg-blue-700 transition-colors">
                  Branches
                </Link>
              </li>
              <li>
                <Link href="/admin/seats" className="block py-3 px-4 hover:bg-blue-700 transition-colors">
                  Seats
                </Link>
              </li>
              <li>
                <Link href="/admin/bookings" className="block py-3 px-4 hover:bg-blue-700 transition-colors">
                  Bookings
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Admin Portal</h2>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  router.push('/admin/login');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // If we get here, we're still loading
  return null;
}
