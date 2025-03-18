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
  is_admin: boolean;
  created_at: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, searchTerm]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Prepare query parameters
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      // Fetch customers
      const response = await fetch(`/api/admin/customers?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch customers');
      }

      const data = await response.json();
      setCustomers(data.data.customers);
      setTotalPages(Math.ceil(data.data.total / itemsPerPage));
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
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

      // Refresh the customer list
      fetchCustomers();
    } catch (err) {
      setError((err as Error).message);
      console.error('Error deleting customer:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Management</h1>
        <Link href="/admin/customers/new" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
          Add New Customer
        </Link>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email"
            className="flex-grow p-2 border border-gray-300 rounded-l"
          />
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r">
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">ID</th>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Phone</th>
                  <th className="py-2 px-4 border-b">Company</th>
                  <th className="py-2 px-4 border-b">Role</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{customer.id}</td>
                      <td className="py-2 px-4 border-b">{customer.name}</td>
                      <td className="py-2 px-4 border-b">{customer.email}</td>
                      <td className="py-2 px-4 border-b">{customer.phone || 'N/A'}</td>
                      <td className="py-2 px-4 border-b">{customer.company_name || 'N/A'}</td>
                      <td className="py-2 px-4 border-b">{customer.role}</td>
                      <td className="py-2 px-4 border-b">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/admin/customers/${customer.id}`}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-sm"
                          >
                            View
                          </Link>
                          <Link 
                            href={`/admin/customers/${customer.id}/edit`}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded text-sm"
                          >
                            Edit
                          </Link>
                          <button 
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 text-center">No customers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 mx-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 mx-1 bg-gray-100 rounded">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 mx-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
