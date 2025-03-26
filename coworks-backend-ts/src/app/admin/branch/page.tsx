'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic'

interface BranchStats {
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  openTickets: number;
  totalSeats: number;
  availability: number;
  totalRevenue: number;
  seatsByType: {
    typeId: string;
    typeName: string;
    count: number;
    available: number;
  }[];
}

export default function BranchAdminDashboard() {
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and is a branch admin
    const token = localStorage.getItem('adminToken');
    const role = localStorage.getItem('adminRole');
    
    if (!token || role !== 'branch_admin') {
      router.push('/admin/login');
      return;
    }

    // Get branch ID from localStorage (set during login)
    const userBranchId = localStorage.getItem('adminBranchId');
    if (userBranchId) {
      setBranchId(userBranchId);
      
      // Fetch branch name and stats
      fetchBranchDetails(userBranchId, token);
      fetchBranchStats(userBranchId, token);
    }
  }, [router]);

  const fetchBranchDetails = async (id: string, token: string) => {
    try {
      const response = await fetch(`/api/admin/branches/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch branch details');
      }
      
      const data = await response.json();
      setBranchName(data.name);
    } catch (err) {
      setError('Failed to fetch branch details');
      console.error(err);
    }
  };

  const fetchBranchStats = async (id: string, token: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/branches/${id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch branch stats');
      }
      
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch branch statistics');
      setLoading(false);
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => branchId && fetchBranchStats(branchId, localStorage.getItem('adminToken') || '')}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {branchName ? `${branchName} Dashboard` : 'Branch Dashboard'}
        </h1>
        <p className="text-gray-600">Manage your coworking branch effectively</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Bookings */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Bookings</p>
              <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/branch/bookings" className="text-sm text-blue-600 hover:text-blue-800">View all bookings</Link>
          </div>
        </div>

        {/* Active Bookings */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Bookings</p>
              <p className="text-2xl font-bold">{stats?.activeBookings || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/branch/bookings?status=active" className="text-sm text-blue-600 hover:text-blue-800">View active bookings</Link>
          </div>
        </div>

        {/* Open Support Tickets */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Open Tickets</p>
              <p className="text-2xl font-bold">{stats?.openTickets || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/branch/support" className="text-sm text-blue-600 hover:text-blue-800">View support tickets</Link>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/branch/payments" className="text-sm text-blue-600 hover:text-blue-800">View payment logs</Link>
          </div>
        </div>
      </div>

      {/* Branch Seat Management */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Seat Management</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Seats</p>
            <p className="text-2xl font-bold">{stats?.totalSeats || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Available Seats</p>
            <p className="text-2xl font-bold">{stats?.availability || 0}</p>
            <p className="text-sm text-gray-500">
              {stats?.totalSeats ? Math.round((stats.availability / stats.totalSeats) * 100) : 0}% available
            </p>
          </div>
        </div>
        
        <h3 className="text-md font-medium mb-3">Seats by Type</h3>
        {stats?.seatsByType && stats.seatsByType.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Seating Type</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Available</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.seatsByType.map((type) => (
                  <tr key={type.typeId} className="border-b">
                    <td className="px-4 py-3">{type.typeName}</td>
                    <td className="px-4 py-3">{type.count}</td>
                    <td className="px-4 py-3">{type.available}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/branch/seats?type=${type.typeId}`} className="text-blue-600 hover:text-blue-800">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No seating types available</p>
        )}
        
        <div className="mt-4">
          <Link href="/admin/branch/seats/add" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add New Seats
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/branch/bookings/new" className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center">
            <span className="mr-2">📅</span> Create New Booking
          </Link>
          <Link href="/admin/branch/support/new" className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center">
            <span className="mr-2">🎫</span> Create Support Ticket
          </Link>
          <Link href="/admin/branch/reports" className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center">
            <span className="mr-2">📊</span> Generate Reports
          </Link>
          <Link href="/admin/branch/customers" className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center">
            <span className="mr-2">👥</span> Manage Customers
          </Link>
          <Link href="/admin/branch/profile" className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center">
            <span className="mr-2">👤</span> Branch Profile
          </Link>
          <Link href="/admin/branch/settings" className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center">
            <span className="mr-2">⚙️</span> Branch Settings
          </Link>
        </div>
      </div>
    </div>
  );
} 