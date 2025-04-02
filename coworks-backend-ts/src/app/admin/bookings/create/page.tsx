'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculateBookingCost, formatCurrency } from '../../../../utils/bookingCalculations';

interface SeatingOption {
  id: string;
  name: string;
  type: string;
  priceMonthly: number;
  branchId: string;
  branchName: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

export default function CreateBooking() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    seatId: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  
  // Data for dropdowns
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [seatingOptions, setSeatingOptions] = useState<SeatingOption[]>([]);
  const [filteredSeats, setFilteredSeats] = useState<SeatingOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  // Calculation result
  const [costBreakdown, setCostBreakdown] = useState<{
    totalCost: number;
    breakdown: { description: string; amount: number }[];
  } | null>(null);
  
  // Selected seat details
  const [selectedSeat, setSelectedSeat] = useState<SeatingOption | null>(null);

  useEffect(() => {
    // Fetch initial data
    fetchBranches();
    fetchCustomers();
    fetchSeatingOptions();
  }, []);
  
  useEffect(() => {
    // Filter seats when branch selection changes
    if (selectedBranch) {
      setFilteredSeats(seatingOptions.filter(seat => seat.branchId === selectedBranch));
    } else {
      setFilteredSeats(seatingOptions);
    }
  }, [selectedBranch, seatingOptions]);
  
  useEffect(() => {
    // Update cost breakdown when relevant fields change
    calculateCost();
  }, [formData.startDate, formData.endDate, formData.seatId]);
  
  // Find selected seat details when seat ID changes
  useEffect(() => {
    if (formData.seatId) {
      const seat = seatingOptions.find(s => s.id === formData.seatId);
      setSelectedSeat(seat || null);
    } else {
      setSelectedSeat(null);
    }
  }, [formData.seatId, seatingOptions]);

  // Mock data fetching functions
  const fetchBranches = async () => {
    // In a real app, this would be an API call
    setBranches([
      { id: 'b1', name: 'Downtown Branch' },
      { id: 'b2', name: 'Westside Branch' },
      { id: 'b3', name: 'North Campus' },
    ]);
  };
  
  const fetchSeatingOptions = async () => {
    // In a real app, this would be an API call
    setSeatingOptions([
      { id: 's1', name: 'Hot Desk 1', type: 'Hot Desk', priceMonthly: 5000, branchId: 'b1', branchName: 'Downtown Branch' },
      { id: 's2', name: 'Dedicated Desk 1', type: 'Dedicated Desk', priceMonthly: 7500, branchId: 'b1', branchName: 'Downtown Branch' },
      { id: 's3', name: 'Private Office 1', type: 'Private Office', priceMonthly: 15000, branchId: 'b1', branchName: 'Downtown Branch' },
      { id: 's4', name: 'Hot Desk 2', type: 'Hot Desk', priceMonthly: 4500, branchId: 'b2', branchName: 'Westside Branch' },
      { id: 's5', name: 'Dedicated Desk 2', type: 'Dedicated Desk', priceMonthly: 7000, branchId: 'b2', branchName: 'Westside Branch' },
      { id: 's6', name: 'Hot Desk 3', type: 'Hot Desk', priceMonthly: 5500, branchId: 'b3', branchName: 'North Campus' },
    ]);
  };
  
  const fetchCustomers = async () => {
    // In a real app, this would be an API call
    setCustomers([
      { id: 'c1', name: 'John Doe', email: 'john@example.com' },
      { id: 'c2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: 'c3', name: 'Robert Johnson', email: 'robert@example.com' },
    ]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBranch(e.target.value);
  };
  
  const calculateCost = () => {
    if (!formData.startDate || !formData.endDate || !formData.seatId || !selectedSeat) {
      setCostBreakdown(null);
      return;
    }
    
    const result = calculateBookingCost(
      new Date(formData.startDate),
      new Date(formData.endDate),
      selectedSeat.priceMonthly
    );
    
    setCostBreakdown(result);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validate first step
      if (!formData.customerId || !formData.seatId || !formData.startDate || !formData.endDate) {
        setError('Please fill out all required fields');
        return;
      }
      
      // Move to confirmation step
      setStep(2);
      return;
    }
    
    // Submit booking
    setLoading(true);
    setError('');
    
    try {
      // In a real app, this would be an API call
      // const response = await fetch('/api/admin/bookings', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     ...formData,
      //     totalAmount: costBreakdown?.totalCost || 0
      //   })
      // });
      
      // Mock successful response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to bookings list
      router.push('/admin/bookings');
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the booking');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#1f2937'
      }}>
        {step === 1 ? 'Create New Booking' : 'Confirm Booking Details'}
      </h1>
      
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
      
      <form onSubmit={handleSubmit}>
        {step === 1 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="customerId"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Customer
              </label>
              <select
                id="customerId"
                name="customerId"
                value={formData.customerId}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">-- Select Customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="branchSelect"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Branch (Optional Filter)
              </label>
              <select
                id="branchSelect"
                value={selectedBranch}
                onChange={handleBranchChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="seatId"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Seat / Desk
              </label>
              <select
                id="seatId"
                name="seatId"
                value={formData.seatId}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">-- Select Seat --</option>
                {filteredSeats.map(seat => (
                  <option key={seat.id} value={seat.id}>
                    {seat.name} - {seat.type} - {formatCurrency(seat.priceMonthly)}/month
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label
                  htmlFor="startDate"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}
                >
                  Start Date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="endDate"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}
                >
                  End Date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="notes"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
                placeholder="Add any additional notes about this booking"
              />
            </div>
            
            {costBreakdown && (
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  marginBottom: '0.75rem',
                  color: '#1f2937'
                }}>
                  Cost Breakdown
                </h3>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>Total Cost: </span>
                  {formatCurrency(costBreakdown.totalCost)}
                </div>
                <div>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                    color: '#4b5563'
                  }}>
                    Details:
                  </h4>
                  <ul style={{
                    listStyleType: 'none',
                    margin: 0,
                    padding: 0,
                    fontSize: '0.875rem'
                  }}>
                    {costBreakdown.breakdown.map((item, index) => (
                      <li key={index}>
                        {item.description}: {formatCurrency(item.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => router.push('/admin/bookings')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
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
                Next: Review &amp; Confirm
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  marginBottom: '0.75rem',
                  color: '#1f2937'
                }}>
                  Booking Details
                </h3>
                <table style={{
                  width: '100%',
                  fontSize: '0.875rem'
                }}>
                  <tbody>
                    <tr>
                      <td style={{
                        padding: '0.375rem 0',
                        fontWeight: '500',
                        color: '#6b7280',
                        width: '40%'
                      }}>
                        Customer:
                      </td>
                      <td style={{
                        padding: '0.375rem 0'
                      }}>
                        {customers.find(c => c.id === formData.customerId)?.name || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '0.375rem 0',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Seat:
                      </td>
                      <td style={{
                        padding: '0.375rem 0'
                      }}>
                        {selectedSeat?.name || 'N/A'} ({selectedSeat?.type})
                      </td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '0.375rem 0',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Branch:
                      </td>
                      <td style={{
                        padding: '0.375rem 0'
                      }}>
                        {selectedSeat?.branchName || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '0.375rem 0',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        Start Date:
                      </td>
                      <td style={{
                        padding: '0.375rem 0'
                      }}>
                        {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '0.375rem 0',
                        fontWeight: '500',
                        color: '#6b7280'
                      }}>
                        End Date:
                      </td>
                      <td style={{
                        padding: '0.375rem 0'
                      }}>
                        {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                    {formData.notes && (
                      <tr>
                        <td style={{
                          padding: '0.375rem 0',
                          fontWeight: '500',
                          color: '#6b7280'
                        }}>
                          Notes:
                        </td>
                        <td style={{
                          padding: '0.375rem 0'
                        }}>
                          {formData.notes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  marginBottom: '0.75rem',
                  color: '#1f2937'
                }}>
                  Payment Summary
                </h3>
                {costBreakdown ? (
                  <div>
                    <div style={{
                      borderBottom: '1px solid #e5e7eb',
                      paddingBottom: '0.75rem',
                      marginBottom: '0.75rem'
                    }}>
                      {costBreakdown.breakdown.map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                          fontSize: '0.875rem'
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
                      <span>Total Amount:</span>
                      <span>{formatCurrency(costBreakdown.totalCost)}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Unable to calculate cost
                  </p>
                )}
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
              <p>
                <strong>Pro-rata Calculation Notice:</strong> This booking includes pro-rata calculations 
                as per company policy. The customer will be charged for partial months on a per-day basis.
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Creating Booking...' : 'Confirm & Create Booking'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 