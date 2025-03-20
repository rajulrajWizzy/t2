'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  openTickets: number;
  revenue: number;
  branches?: number;
  seats?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeBookings: 0,
    pendingBookings: 0,
    openTickets: 0,
    revenue: 0,
    branches: 0,
    seats: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    setAdminRole(role);
    
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
          setError('You are not authenticated');
          setLoading(false);
          return;
        }
        
        const response = await fetch('/api/admin/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (!data.success) {
          setError(data.message || 'Failed to fetch dashboard statistics');
          setLoading(false);
          return;
        }
        
        setStats(data.data);
      } catch (err) {
        setError('An error occurred while fetching dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Welcome to your admin dashboard</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-500 text-sm">Total Bookings</h2>
            <span className="rounded-full bg-blue-100 p-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.totalBookings}</p>
          <div className="mt-2">
            <Link href="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-800">
              View all bookings →
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-500 text-sm">Active Bookings</h2>
            <span className="rounded-full bg-green-100 p-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.activeBookings}</p>
          <div className="mt-2">
            <Link href="/admin/bookings?status=active" className="text-sm text-blue-600 hover:text-blue-800">
              View active bookings →
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-500 text-sm">Open Tickets</h2>
            <span className="rounded-full bg-yellow-100 p-2">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"></path>
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.openTickets}</p>
          <div className="mt-2">
            <Link href="/admin/tickets" className="text-sm text-blue-600 hover:text-blue-800">
              View support tickets →
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-500 text-sm">Total Revenue</h2>
            <span className="rounded-full bg-indigo-100 p-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(stats.revenue)}</p>
          <div className="mt-2">
            <Link href="/admin/super/payments" className="text-sm text-blue-600 hover:text-blue-800">
              View payment details →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Additional stats for Super Admin */}
      {adminRole === 'super_admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex justify-between items-center">
              <h2 className="text-gray-500 text-sm">Total Branches</h2>
              <span className="rounded-full bg-purple-100 p-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">{stats.branches}</p>
            <div className="mt-2">
              <Link href="/admin/super/branches" className="text-sm text-blue-600 hover:text-blue-800">
                Manage branches →
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex justify-between items-center">
              <h2 className="text-gray-500 text-sm">Total Seats</h2>
              <span className="rounded-full bg-pink-100 p-2">
                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">{stats.seats}</p>
            <div className="mt-2">
              <Link href="/admin/super/seats" className="text-sm text-blue-600 hover:text-blue-800">
                Manage all seats →
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link 
            href={adminRole === 'super_admin' ? '/admin/super/branches/create' : '/admin/seats/create'} 
            className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 flex flex-col items-center text-center transition-colors"
          >
            <span className="rounded-full bg-blue-100 p-3 mb-2">
              {adminRole === 'super_admin' ? (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
              )}
            </span>
            <span className="font-medium text-gray-800">
              {adminRole === 'super_admin' ? 'Create Branch' : 'Add New Seat'}
            </span>
          </Link>
          
          <Link 
            href="/admin/tickets/create" 
            className="bg-green-50 hover:bg-green-100 rounded-lg p-4 flex flex-col items-center text-center transition-colors"
          >
            <span className="rounded-full bg-green-100 p-3 mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"></path>
              </svg>
            </span>
            <span className="font-medium text-gray-800">Create Ticket</span>
          </Link>
          
          <Link 
            href="/admin/bookings/reports" 
            className="bg-purple-50 hover:bg-purple-100 rounded-lg p-4 flex flex-col items-center text-center transition-colors"
          >
            <span className="rounded-full bg-purple-100 p-3 mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </span>
            <span className="font-medium text-gray-800">Booking Reports</span>
          </Link>
          
          <Link 
            href="/admin/profile" 
            className="bg-yellow-50 hover:bg-yellow-100 rounded-lg p-4 flex flex-col items-center text-center transition-colors"
          >
            <span className="rounded-full bg-yellow-100 p-3 mb-2">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </span>
            <span className="font-medium text-gray-800">Your Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 