'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Customer type definition
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  profile_picture: string | null;
  company_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

// Booking type definition
interface Booking {
  id: number;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  payment_status: string;
  type: string;
  branch_name?: string;
  seat_name?: string;
}

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerDetails();
    fetchCustomerBookings();
  }, [id]);

  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch customer details
      const response = await fetch(`/api/admin/customers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch customer details');
      }

      const data = await response.json();
      setCustomer(data.data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching customer details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerBookings = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch customer bookings
      const response = await fetch(`/api/admin/bookings?customer_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch customer bookings:', errorData.message);
        return;
      }

      const data = await response.json();
      setBookings(data.data.bookings || []);
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete customer');
      }

      // Redirect to customers list
      router.push('/admin/customers');
    } catch (err) {
      setError((err as Error).message);
      console.error('Error deleting customer:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="text-center">
          <Link href="/admin/customers" className="text-blue-500 hover:underline">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Customer not found</div>
        <div className="text-center">
          <Link href="/admin/customers" className="text-blue-500 hover:underline">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <div className="flex space-x-2">
          <Link 
            href="/admin/customers" 
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
          >
            Back
          </Link>
          <Link 
            href={`/admin/customers/${id}/edit`} 
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Edit
          </Link>
          <button 
            onClick={handleDeleteCustomer}
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">ID</p>
            <p className="font-semibold">{customer.id}</p>
          </div>
          <div>
            <p className="text-gray-600">Name</p>
            <p className="font-semibold">{customer.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Email</p>
            <p className="font-semibold">{customer.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Phone</p>
            <p className="font-semibold">{customer.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Company</p>
            <p className="font-semibold">{customer.company_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Role</p>
            <p className="font-semibold">{customer.role}</p>
          </div>
          <div>
            <p className="text-gray-600">Created At</p>
            <p className="font-semibold">{formatDate(customer.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-600">Updated At</p>
            <p className="font-semibold">{formatDate(customer.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Profile Picture */}
      {customer.profile_picture && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
          <div className="flex justify-center">
            <img 
              src={customer.profile_picture} 
              alt={`${customer.name}'s profile`} 
              className="max-w-xs rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Customer Bookings */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Bookings</h2>
        
        {bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">ID</th>
                  <th className="py-2 px-4 border-b">Type</th>
                  <th className="py-2 px-4 border-b">Start Date</th>
                  <th className="py-2 px-4 border-b">End Date</th>
                  <th className="py-2 px-4 border-b">Amount</th>
                  <th className="py-2 px-4 border-b">Status</th>
                  <th className="py-2 px-4 border-b">Payment</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{booking.id}</td>
                    <td className="py-2 px-4 border-b">{booking.type}</td>
                    <td className="py-2 px-4 border-b">{formatDate(booking.start_date)}</td>
                    <td className="py-2 px-4 border-b">{formatDate(booking.end_date)}</td>
                    <td className="py-2 px-4 border-b">${booking.amount.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                        booking.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        booking.payment_status === 'REFUNDED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.payment_status}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <Link 
                        href={`/admin/bookings/${booking.id}`}
                        className="text-blue-500 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-4">No bookings found for this customer</p>
        )}
      </div>
    </div>
  );
}
