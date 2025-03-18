'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Define types for dashboard data
interface DashboardData {
  totalSeats: number;
  totalBranches: number;
  totalCustomers: number;
  bookingMetrics: {
    totalBookings: number;
    totalRevenue: number;
    seatBookings: {
      count: number;
      revenue: number;
    };
    meetingBookings: {
      count: number;
      revenue: number;
    };
  };
  seatingTypeMetrics: Array<{
    id: number;
    name: string;
    shortCode: string;
    seatCount: number;
    bookingCount: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/admin');
        return;
      }

      const response = await fetch(
        `/api/admin/dashboard?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin');
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {dashboardData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Branches</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{dashboardData.totalBranches}</dd>
                </dl>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Seats</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{dashboardData.totalSeats}</dd>
                </dl>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{dashboardData.totalCustomers}</dd>
                </dl>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-600">
                    ${dashboardData.bookingMetrics.totalRevenue.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Booking Metrics */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Booking Metrics</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-sm font-medium text-gray-500">Total Bookings</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {dashboardData.bookingMetrics.totalBookings}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Seat Bookings:</span>
                      <span className="font-medium">{dashboardData.bookingMetrics.seatBookings.count}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Meeting Bookings:</span>
                      <span className="font-medium">{dashboardData.bookingMetrics.meetingBookings.count}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-sm font-medium text-gray-500">Revenue Breakdown</div>
                  <div className="mt-1 text-2xl font-semibold text-green-600">
                    ${dashboardData.bookingMetrics.totalRevenue.toFixed(2)}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Seat Revenue:</span>
                      <span className="font-medium">${dashboardData.bookingMetrics.seatBookings.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Meeting Revenue:</span>
                      <span className="font-medium">${dashboardData.bookingMetrics.meetingBookings.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-sm font-medium text-gray-500">Average Revenue per Booking</div>
                  <div className="mt-1 text-2xl font-semibold text-green-600">
                    ${dashboardData.bookingMetrics.totalBookings > 0 
                      ? (dashboardData.bookingMetrics.totalRevenue / dashboardData.bookingMetrics.totalBookings).toFixed(2) 
                      : '0.00'}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Avg. Seat Booking:</span>
                      <span className="font-medium">
                        ${dashboardData.bookingMetrics.seatBookings.count > 0 
                          ? (dashboardData.bookingMetrics.seatBookings.revenue / dashboardData.bookingMetrics.seatBookings.count).toFixed(2) 
                          : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Avg. Meeting Booking:</span>
                      <span className="font-medium">
                        ${dashboardData.bookingMetrics.meetingBookings.count > 0 
                          ? (dashboardData.bookingMetrics.meetingBookings.revenue / dashboardData.bookingMetrics.meetingBookings.count).toFixed(2) 
                          : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seating Type Metrics */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Seating Type Metrics</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seating Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seats
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Revenue per Booking
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.seatingTypeMetrics.map((seatingType) => (
                      <tr key={seatingType.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {seatingType.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {seatingType.shortCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {seatingType.seatCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {seatingType.bookingCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          ${seatingType.revenue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${seatingType.bookingCount > 0 
                            ? (seatingType.revenue / seatingType.bookingCount).toFixed(2) 
                            : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
