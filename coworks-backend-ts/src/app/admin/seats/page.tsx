'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Define types for seat data
interface Seat {
  id: number;
  branch_id: number;
  seating_type_id: number;
  seat_number: string;
  price: number;
  availability_status: string;
  created_at: string;
  updated_at: string;
  Branch: {
    id: number;
    name: string;
    short_code: string;
    address: string;
    location: string;
  };
  SeatingType: {
    id: number;
    name: string;
    short_code: string;
    hourly_rate: number;
    is_hourly: boolean;
  };
  bookingCount: number;
  revenue: number;
}

interface Branch {
  id: number;
  name: string;
  short_code: string;
}

interface SeatingType {
  id: number;
  name: string;
  short_code: string;
}

interface SeatFormData {
  branch_id: string;
  seating_type_id: string;
  seat_number: string;
  price: string;
  availability_status: string;
}

export default function AdminSeats() {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [seatingTypes, setSeatingTypes] = useState<SeatingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<SeatFormData>({
    branch_id: '',
    seating_type_id: '',
    seat_number: '',
    price: '',
    availability_status: 'AVAILABLE'
  });
  const [filters, setFilters] = useState({
    branch_id: '',
    seating_type_id: ''
  });

  useEffect(() => {
    fetchSeats();
    fetchBranches();
    fetchSeatingTypes();
  }, []);

  useEffect(() => {
    fetchSeats();
  }, [filters]);

  const fetchSeats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/admin/seats');
        return;
      }

      // Build query params
      let queryParams = '';
      if (filters.branch_id) {
        queryParams += `branch_id=${filters.branch_id}`;
      }
      if (filters.seating_type_id) {
        queryParams += queryParams ? `&seating_type_id=${filters.seating_type_id}` : `seating_type_id=${filters.seating_type_id}`;
      }

      const url = `/api/admin/seats${queryParams ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/seats');
          return;
        }
        throw new Error('Failed to fetch seats');
      }

      const data = await response.json();
      setSeats(data.data);
    } catch (err) {
      console.error('Error fetching seats:', err);
      setError('Failed to load seats. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }

      const data = await response.json();
      setBranches(data.data);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchSeatingTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/seating-types', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seating types');
      }

      const data = await response.json();
      setSeatingTypes(data.data);
    } catch (err) {
      console.error('Error fetching seating types:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/admin/seats');
        return;
      }

      // Get the selected seating type
      const selectedSeatingType = seatingTypes.find(st => st.id.toString() === formData.seating_type_id);
      
      // Generate a seat number with type code if not provided
      let seatNumber = formData.seat_number;
      if (!seatNumber && selectedSeatingType) {
        // Count existing seats of this type to generate next number
        const existingSeatsOfType = seats.filter(
          seat => seat.seating_type_id.toString() === formData.seating_type_id
        ).length;
        
        const typeCode = selectedSeatingType.short_code || selectedSeatingType.name.substring(0, 2).toUpperCase();
        seatNumber = `${typeCode}-${(existingSeatsOfType + 101).toString().padStart(3, '0')}`;
      }

      // Convert form data to proper types
      const seatData = {
        branch_id: parseInt(formData.branch_id),
        seating_type_id: parseInt(formData.seating_type_id),
        seat_number: seatNumber,
        price: parseFloat(formData.price),
        availability_status: formData.availability_status
      };

      const response = await fetch('/api/admin/seats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(seatData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create seat');
      }

      // Reset form and refresh seats
      setFormData({
        branch_id: '',
        seating_type_id: '',
        seat_number: '',
        price: '',
        availability_status: 'AVAILABLE'
      });
      setShowAddForm(false);
      fetchSeats();
    } catch (err) {
      console.error('Error creating seat:', err);
      setError(`Failed to create seat: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSeat = async (id: number) => {
    if (!confirm('Are you sure you want to delete this seat? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/admin/seats');
        return;
      }

      const response = await fetch(`/api/admin/seats?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete seat');
      }

      // Refresh seats
      fetchSeats();
    } catch (err) {
      console.error('Error deleting seat:', err);
      setError(`Failed to delete seat: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && seats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading seats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Seats</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add New Seat'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Seat</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700">Branch</label>
                  <select
                    id="branch_id"
                    name="branch_id"
                    required
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="seating_type_id" className="block text-sm font-medium text-gray-700">Seating Type</label>
                  <select
                    id="seating_type_id"
                    name="seating_type_id"
                    required
                    value={formData.seating_type_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select a seating type</option>
                    {seatingTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="seat_number" className="block text-sm font-medium text-gray-700">Seat Number</label>
                  <input
                    type="text"
                    name="seat_number"
                    id="seat_number"
                    value={formData.seat_number}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty for auto-generated number</p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="availability_status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    id="availability_status"
                    name="availability_status"
                    required
                    value={formData.availability_status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex flex-wrap items-center justify-between">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Seat List</h3>
          
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <div>
              <label htmlFor="filter_branch_id" className="block text-sm font-medium text-gray-700">Filter by Branch</label>
              <select
                id="filter_branch_id"
                name="branch_id"
                value={filters.branch_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="filter_seating_type_id" className="block text-sm font-medium text-gray-700">Filter by Type</label>
              <select
                id="filter_seating_type_id"
                name="seating_type_id"
                value={filters.seating_type_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                {seatingTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seat Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seating Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {seats.map((seat) => (
                  <tr key={seat.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {seat.seat_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seat.Branch?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seat.SeatingType?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${seat.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${seat.availability_status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 
                          seat.availability_status === 'UNAVAILABLE' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {seat.availability_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seat.bookingCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      ${seat.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteSeat(seat.id)}
                        disabled={seat.bookingCount > 0}
                        className={`text-red-600 hover:text-red-900 ${seat.bookingCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={seat.bookingCount > 0 ? "Cannot delete seat with bookings" : "Delete seat"}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {seats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      No seats found. Create your first seat to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
