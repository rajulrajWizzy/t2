'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../../utils/bookingCalculations';

interface Booking {
  id: string;
  customerName: string;
  seatName: string;
  seatType: string;
  branchName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
}

export default function BookingsList() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    
    try {
      // In a real app, this would be an API call
      // const response = await fetch('/api/admin/bookings', {
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // });
      // const data = await response.json();
      // setBookings(data.bookings);
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockBookings: Booking[] = [
        {
          id: 'b1',
          customerName: 'John Doe',
          seatName: 'Hot Desk 1',
          seatType: 'Hot Desk',
          branchName: 'Downtown Branch',
          startDate: '2023-03-21',
          endDate: '2023-04-30',
          totalAmount: 7580,
          status: 'active'
        },
        {
          id: 'b2',
          customerName: 'Jane Smith',
          seatName: 'Dedicated Desk 1',
          seatType: 'Dedicated Desk',
          branchName: 'Downtown Branch',
          startDate: '2023-02-15',
          endDate: '2023-05-14',
          totalAmount: 22500,
          status: 'active'
        },
        {
          id: 'b3',
          customerName: 'Robert Johnson',
          seatName: 'Private Office 1',
          seatType: 'Private Office',
          branchName: 'Downtown Branch',
          startDate: '2023-04-01',
          endDate: '2023-06-30',
          totalAmount: 45000,
          status: 'upcoming'
        },
        {
          id: 'b4',
          customerName: 'Sarah Williams',
          seatName: 'Hot Desk 2',
          seatType: 'Hot Desk',
          branchName: 'Westside Branch',
          startDate: '2022-11-01',
          endDate: '2023-02-28',
          totalAmount: 18000,
          status: 'completed'
        },
        {
          id: 'b5',
          customerName: 'Michael Brown',
          seatName: 'Dedicated Desk 2',
          seatType: 'Dedicated Desk',
          branchName: 'Westside Branch',
          startDate: '2023-01-15',
          endDate: '2023-03-31',
          totalAmount: 17500,
          status: 'cancelled'
        }
      ];
      
      setBookings(mockBookings);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(booking => booking.status === filter);
  };

  const getStatusBadgeStyle = (status: string) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '0.25rem 0.5rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '500',
      textTransform: 'capitalize' as const
    };
    
    switch (status) {
      case 'active':
        return {
          ...baseStyle,
          backgroundColor: '#dcfce7',
          color: '#166534'
        };
      case 'upcoming':
        return {
          ...baseStyle,
          backgroundColor: '#dbeafe',
          color: '#1e40af'
        };
      case 'completed':
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
          color: '#4b5563'
        };
      case 'cancelled':
        return {
          ...baseStyle,
          backgroundColor: '#fee2e2',
          color: '#b91c1c'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          Bookings
        </h1>
        
        <button
          onClick={() => router.push('/admin/bookings/create')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <span>+</span>
          <span>New Booking</span>
        </button>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        {['all', 'active', 'upcoming', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: filter === status ? '#3b82f6' : '#f3f4f6',
              color: filter === status ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: '500',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {status}
          </button>
        ))}
      </div>
      
      {error && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          borderRadius: '0.375rem'
        }}>
          {error}
        </div>
      )}
      
      {loading ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Loading bookings...
        </div>
      ) : getFilteredBookings().length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          color: '#6b7280'
        }}>
          No bookings found.
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            overflowX: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Customer
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Seat / Branch
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Duration
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Amount
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredBookings().map((booking, index) => (
                  <tr 
                    key={booking.id}
                    style={{
                      borderBottom: index < getFilteredBookings().length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}
                  >
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      color: '#111827'
                    }}>
                      {booking.customerName}
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      color: '#111827'
                    }}>
                      <div>{booking.seatName}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {booking.branchName}
                      </div>
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      color: '#111827'
                    }}>
                      <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        to {new Date(booking.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      {formatCurrency(booking.totalAmount)}
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      color: '#111827'
                    }}>
                      <span style={getStatusBadgeStyle(booking.status)}>
                        {booking.status}
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem',
                      textAlign: 'right'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem'
                      }}>
                        <button
                          onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#f3f4f6',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                        {booking.status === 'active' && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this booking?')) {
                                // Cancel booking logic here
                                alert('Booking cancelled');
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontWeight: '500',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 