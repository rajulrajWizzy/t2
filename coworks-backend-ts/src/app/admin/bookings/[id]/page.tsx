'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../../../utils/bookingCalculations';

interface BookingDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  seatName: string;
  seatType: string;
  branchName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  cancelledDate?: string;
  createdAt: string;
  notes?: string;
  costBreakdown: {
    description: string;
    amount: number;
  }[];
}

export default function BookingDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [params.id]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/admin/bookings/${params.id}`, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // });
      // const data = await response.json();
      // setBooking(data.booking);
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find matching booking ID
      const mockBookingId = params.id;
      
      // This would normally come from an API
      const mockBooking: BookingDetail = {
        id: mockBookingId,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        seatName: 'Hot Desk 1',
        seatType: 'Hot Desk',
        branchName: 'Downtown Branch',
        startDate: '2023-03-21',
        endDate: '2023-04-30',
        totalAmount: 7580,
        status: 'active',
        createdAt: '2023-03-15T10:30:00Z',
        notes: 'Customer requested a desk near the window if possible.',
        costBreakdown: [
          { description: 'March 21-31 (11 days at ₹5,000/month)', amount: 1774 },
          { description: 'April 1-30 (Full month at ₹5,000/month)', amount: 5000 },
          { description: 'Security deposit', amount: 806 },
        ]
      };
      
      setBooking(mockBooking);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    
    setProcessingCancel(true);
    
    try {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/admin/bookings/${params.id}/cancel`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ reason: cancelReason })
      // });
      
      // Mock successful response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update booking status locally
      if (booking) {
        setBooking({
          ...booking,
          status: 'cancelled',
          cancelledDate: new Date().toISOString()
        });
      }
      
      // Close dialog
      setCancelDialogOpen(false);
      setCancelReason('');
    } catch (err: any) {
      alert(err.message || 'An error occurred while cancelling the booking');
    } finally {
      setProcessingCancel(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
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

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Loading booking details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        borderRadius: '0.375rem',
        marginBottom: '1rem'
      }}>
        <p>{error}</p>
        <button
          onClick={() => router.push('/admin/bookings')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        color: '#6b7280'
      }}>
        <p>Booking not found.</p>
        <button
          onClick={() => router.push('/admin/bookings')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem'
          }}>
            <button
              onClick={() => router.push('/admin/bookings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '0.875rem',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Booking Details
            </h1>
            <span style={getStatusBadgeStyle(booking.status)}>
              {booking.status}
            </span>
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Booking ID: {booking.id}
          </p>
        </div>
        
        {booking.status === 'active' && (
          <button
            onClick={() => setCancelDialogOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: '500',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Cancel Booking
          </button>
        )}
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            Booking Information
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            rowGap: '1rem',
            columnGap: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <div>
              <p style={{
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Start Date
              </p>
              <p>{new Date(booking.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p style={{
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                End Date
              </p>
              <p>{new Date(booking.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p style={{
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Seat
              </p>
              <p>{booking.seatName} ({booking.seatType})</p>
            </div>
            <div>
              <p style={{
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Branch
              </p>
              <p>{booking.branchName}</p>
            </div>
            <div>
              <p style={{
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Created On
              </p>
              <p>{new Date(booking.createdAt).toLocaleDateString()}</p>
            </div>
            {booking.cancelledDate && (
              <div>
                <p style={{
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '0.25rem'
                }}>
                  Cancelled On
                </p>
                <p>{new Date(booking.cancelledDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          
          {booking.notes && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem',
                fontSize: '0.875rem'
              }}>
                Notes
              </p>
              <p style={{
                fontSize: '0.875rem',
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '0.375rem'
              }}>
                {booking.notes}
              </p>
            </div>
          )}
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            Customer Information
          </h2>
          
          <div style={{
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <p style={{
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              Name
            </p>
            <p style={{ marginBottom: '0.75rem' }}>{booking.customerName}</p>
            
            <p style={{
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              Email
            </p>
            <p>{booking.customerEmail}</p>
          </div>
          
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            Payment Summary
          </h2>
          
          <div style={{
            fontSize: '0.875rem'
          }}>
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              {booking.costBreakdown.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <span>{item.description}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              <span>Total Amount</span>
              <span>{formatCurrency(booking.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{
        backgroundColor: '#eff6ff',
        padding: '1rem',
        borderRadius: '0.375rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        <h3 style={{
          fontWeight: '600',
          marginBottom: '0.5rem'
        }}>
          Pro-rata Calculation Information
        </h3>
        <ul style={{
          listStyleType: 'disc',
          paddingLeft: '1.5rem',
          marginBottom: '0.5rem'
        }}>
          <li>Partial months are calculated on a per-day basis (Monthly rate ÷ Days in month × Days booked)</li>
          <li>A security deposit equal to 15 days of the daily rate is collected</li>
          <li>Cancellations require one month notice or forfeit of the security deposit</li>
        </ul>
        <p>
          For any questions regarding the calculation, please contact the finance department.
        </p>
      </div>
      
      {cancelDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '28rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              Cancel Booking
            </h3>
            
            <p style={{
              fontSize: '0.875rem',
              marginBottom: '1rem',
              color: '#4b5563'
            }}>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="cancelReason"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Reason for Cancellation
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                placeholder="Please provide a reason for cancellation"
              />
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
                disabled={processingCancel}
              >
                Cancel
              </button>
              <button
                onClick={handleCancelBooking}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  cursor: processingCancel ? 'not-allowed' : 'pointer',
                  opacity: processingCancel ? 0.7 : 1
                }}
                disabled={processingCancel}
              >
                {processingCancel ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 