'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in as a customer
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const storedUserName = localStorage.getItem('userName');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    // If admin tries to access customer dashboard, redirect to admin dashboard
    if (userRole === 'BRANCH_ADMIN' || userRole === 'SUPER_ADMIN') {
      router.push('/admin/dashboard');
      return;
    }
    
    setUserName(storedUserName || 'Customer');
    
    // Fetch customer data
    fetchCustomerData(token);
  }, [router]);

  const fetchCustomerData = async (token: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/customer/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch customer data');
      }
      
      const data = await response.json();
      setUserBookings(data.data || []);
    } catch (err) {
      console.error('Error fetching customer data:', err);
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
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl text-gray-800 flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Customer Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Coworks Customer Portal</h1>
            <p className="text-gray-600">Manage your bookings and profile</p>
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

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-3xl font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">{userName}</h2>
                <p className="text-gray-500">Customer</p>
              </div>
              
              <nav className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block w-full py-2 px-4 rounded-md bg-blue-100 text-blue-700 font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="block w-full py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  My Bookings
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="block w-full py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Profile Settings
                </Link>
                <Link
                  href="/dashboard/payments"
                  className="block w-full py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Payment History
                </Link>
              </nav>
            </div>
            
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Need Help?</h3>
              <p className="text-gray-600 mb-4">Contact our support team for assistance with your booking or account.</p>
              <button className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors">
                Contact Support
              </button>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-2">Welcome Back, {userName}!</h2>
              <p className="opacity-90 mb-4">Here's an overview of your current bookings and upcoming reservations.</p>
              <div className="flex space-x-4">
                <button className="py-2 px-4 bg-white text-blue-700 rounded-md hover:bg-blue-50 transition-colors">
                  Book a Seat
                </button>
                <button className="py-2 px-4 bg-blue-400 bg-opacity-30 text-white border border-white border-opacity-30 rounded-md hover:bg-opacity-40 transition-colors">
                  View Branches
                </button>
              </div>
            </div>
            
            {/* Current Bookings */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Your Current Bookings</h3>
              </div>
              
              <div className="p-6">
                {userBookings && userBookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="py-3 px-4 text-left font-medium text-gray-700">Branch</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700">Seat</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700">Date</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700">Status</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Sample booking data - will be replaced with actual data */}
                        <tr className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">Downtown Branch</td>
                          <td className="py-3 px-4">Premium Desk A12</td>
                          <td className="py-3 px-4">March 18, 2025</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button className="text-blue-600 hover:text-blue-800">
                              View Details
                            </button>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">Westside Branch</td>
                          <td className="py-3 px-4">Meeting Room C2</td>
                          <td className="py-3 px-4">March 20, 2025</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Upcoming
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button className="text-blue-600 hover:text-blue-800">
                              View Details
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-blue-100 text-blue-700 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No active bookings</h3>
                    <p className="mt-2 text-gray-600">You don't have any active bookings at the moment.</p>
                    <div className="mt-6">
                      <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                        Book a Seat Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Popular Spaces */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Popular Spaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-32 bg-gray-300 flex items-center justify-center text-gray-500">
                    <span>Space Image</span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium">Downtown Premium Desk</h4>
                    <p className="text-sm text-gray-600 mb-2">Quiet zone with ergonomic chairs</p>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 font-medium">$25/day</span>
                      <button className="text-sm py-1 px-2 bg-blue-100 text-blue-700 rounded">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-32 bg-gray-300 flex items-center justify-center text-gray-500">
                    <span>Space Image</span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium">Westside Meeting Room</h4>
                    <p className="text-sm text-gray-600 mb-2">Fully equipped conference room</p>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 font-medium">$45/hour</span>
                      <button className="text-sm py-1 px-2 bg-blue-100 text-blue-700 rounded">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
