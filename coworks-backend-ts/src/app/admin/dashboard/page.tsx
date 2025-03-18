'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Dashboard data type definition
interface DashboardData {
  activeBookings: number;
  pendingBookings: number;
  totalUsers: number;
  currentMonthRevenue: number;
  bookingsMetrics: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  availableSeats: number;
  occupancyRate: number;
  topBranches?: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Check if user is logged in and has admin rights
    const token = localStorage.getItem('token');
    const storedUserRole = localStorage.getItem('userRole');
    const storedUserName = localStorage.getItem('userName');
    
    if (!token || (storedUserRole !== 'BRANCH_ADMIN' && storedUserRole !== 'SUPER_ADMIN')) {
      router.push('/admin/login');
      return;
    }
    
    setUserName(storedUserName || 'Admin');
    setUserRole(storedUserRole || '');
    
    // Fetch dashboard data
    fetchDashboardData(token);
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    router.push('/admin/login');
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl text-gray-800">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Coworks Admin</h1>
            <p className="text-gray-600">{userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Branch Admin'} Panel</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {userName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sidebar */}
      <div className="flex">
        <aside className="w-64 bg-white shadow-md h-[calc(100vh-4rem)] p-4">
          <nav>
            <ul>
              <li className="mb-1">
                <Link 
                  href="/admin/dashboard" 
                  className="block py-2 px-4 rounded-md bg-indigo-100 text-indigo-700 font-medium"
                >
                  Dashboard
                </Link>
              </li>
              <li className="mb-1">
                <Link 
                  href="/admin/customers" 
                  className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Customers
                </Link>
              </li>
              <li className="mb-1">
                <Link 
                  href="/admin/bookings" 
                  className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Bookings
                </Link>
              </li>
              <li className="mb-1">
                <Link 
                  href="/admin/branches" 
                  className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Branches
                </Link>
              </li>
              <li className="mb-1">
                <Link 
                  href="/admin/seats" 
                  className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Seats
                </Link>
              </li>
              {userRole === 'SUPER_ADMIN' && (
                <li className="mb-1">
                  <Link 
                    href="/admin/admins" 
                    className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Admin Users
                  </Link>
                </li>
              )}
              <li className="mb-1">
                <Link 
                  href="/admin/payments" 
                  className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Payments
                </Link>
              </li>
              <li className="mb-1">
                <Link 
                  href="/admin/reports" 
                  className="block py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Reports
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard Overview</h2>
          
          {dashboardData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-gray-500 text-sm font-medium">Active Bookings</h3>
                  <p className="text-3xl font-bold text-gray-800">{dashboardData.activeBookings}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-gray-500 text-sm font-medium">Total Customers</h3>
                  <p className="text-3xl font-bold text-gray-800">{dashboardData.totalUsers}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-gray-500 text-sm font-medium">Current Month Revenue</h3>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(dashboardData.currentMonthRevenue)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-gray-500 text-sm font-medium">Occupancy Rate</h3>
                  <p className="text-3xl font-bold text-indigo-600">{dashboardData.occupancyRate}%</p>
                </div>
              </div>
              
              {/* Booking Metrics */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Booking Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-gray-500 text-sm font-medium">Daily Bookings</h4>
                    <p className="text-2xl font-bold text-gray-800">{dashboardData.bookingsMetrics.daily}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-gray-500 text-sm font-medium">Weekly Bookings</h4>
                    <p className="text-2xl font-bold text-gray-800">{dashboardData.bookingsMetrics.weekly}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-gray-500 text-sm font-medium">Monthly Bookings</h4>
                    <p className="text-2xl font-bold text-gray-800">{dashboardData.bookingsMetrics.monthly}</p>
                  </div>
                </div>
              </div>
              
              {/* Top Branches (Super Admin Only) */}
              {userRole === 'SUPER_ADMIN' && dashboardData.topBranches && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Performing Branches</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b text-left">Branch Name</th>
                          <th className="py-2 px-4 border-b text-left">Bookings</th>
                          <th className="py-2 px-4 border-b text-left">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.topBranches.map((branch, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border-b">{branch.name}</td>
                            <td className="py-2 px-4 border-b">{branch.bookings}</td>
                            <td className="py-2 px-4 border-b">{formatCurrency(branch.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    href="/admin/bookings/new" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md"
                  >
                    Create Booking
                  </Link>
                  <Link 
                    href="/admin/customers/new" 
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                  >
                    Add Customer
                  </Link>
                  <Link 
                    href="/admin/reports/generate" 
                    className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-md"
                  >
                    Generate Report
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              No dashboard data available. Please check your connection or try again later.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
