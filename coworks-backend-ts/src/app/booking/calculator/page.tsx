'use client';

import { useState } from 'react';
import { calculateBookingCost, formatCurrency } from '../../../utils/bookingCalculations';

export default function BookingCalculator() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [monthlyRate, setMonthlyRate] = useState<string>('5000');
  const [cancellationDate, setCancellationDate] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<{
    totalCost: number;
    breakdown: { description: string; amount: number }[];
    refundAmount: number;
  } | null>(null);

  const handleCalculate = () => {
    if (!startDate || !endDate || !monthlyRate) {
      alert('Please fill out all required fields');
      return;
    }

    const result = calculateBookingCost(
      new Date(startDate),
      new Date(endDate),
      Number(monthlyRate),
      cancellationDate ? new Date(cancellationDate) : undefined
    );

    setCalculationResult(result);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem 1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#1f2937'
      }}>
        Booking Cost Calculator
      </h1>
      <p style={{
        marginBottom: '1.5rem',
        color: '#4b5563'
      }}>
        This calculator demonstrates the pro-rata calculation for bookings that don't start on the 1st of the month
        or end on the last day of the month.
      </p>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
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
            Start Date (required)
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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

        <div style={{ marginBottom: '1rem' }}>
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
            End Date (required)
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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

        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="monthlyRate" 
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Monthly Rate (₹)
          </label>
          <input
            id="monthlyRate"
            type="number"
            value={monthlyRate}
            onChange={(e) => setMonthlyRate(e.target.value)}
            required
            min="0"
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="cancellationDate" 
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Cancellation Date (optional)
          </label>
          <input
            id="cancellationDate"
            type="date"
            value={cancellationDate}
            onChange={(e) => setCancellationDate(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem'
            }}
          />
          <p style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.25rem'
          }}>
            Leave empty if no cancellation is requested
          </p>
        </div>

        <button
          onClick={handleCalculate}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer',
            border: 'none',
            width: '100%'
          }}
        >
          Calculate Cost
        </button>
      </div>

      {calculationResult && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            Calculation Result
          </h2>

          <div style={{
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '500' }}>Total Cost:</span>{' '}
              <span style={{ 
                fontWeight: 'bold',
                fontSize: '1.125rem',
                color: '#3b82f6'
              }}>
                {formatCurrency(calculationResult.totalCost)}
              </span>
            </div>
            
            {calculationResult.refundAmount > 0 && (
              <div style={{ 
                marginBottom: '0.5rem',
                color: '#10b981'
              }}>
                <span style={{ fontWeight: '500' }}>Refund Amount:</span>{' '}
                {formatCurrency(calculationResult.refundAmount)}
              </div>
            )}
          </div>

          <h3 style={{
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '0.75rem',
            color: '#1f2937'
          }}>
            Cost Breakdown
          </h3>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead style={{
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <tr>
                <th style={{
                  padding: '0.625rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#4b5563'
                }}>
                  Description
                </th>
                <th style={{
                  padding: '0.625rem',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#4b5563',
                  width: '30%'
                }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {calculationResult.breakdown.map((item, index) => (
                <tr key={index} style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={{
                    padding: '0.625rem',
                    fontSize: '0.875rem'
                  }}>
                    {item.description}
                  </td>
                  <td style={{
                    padding: '0.625rem',
                    textAlign: 'right',
                    fontSize: '0.875rem',
                    fontWeight: item.description.includes('Cancellation') ? 'normal' : '500'
                  }}>
                    {item.description.includes('Cancellation') 
                      ? '—' 
                      : formatCurrency(item.amount)
                    }
                  </td>
                </tr>
              ))}
              <tr style={{
                backgroundColor: '#f9fafb'
              }}>
                <td style={{
                  padding: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  Total
                </td>
                <td style={{
                  padding: '0.625rem',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  {formatCurrency(calculationResult.totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        color: '#4b5563'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.75rem',
          color: '#1f2937'
        }}>
          Booking Cost Rules
        </h3>
        <ul style={{
          paddingLeft: '1.5rem',
          listStyleType: 'disc'
        }}>
          <li style={{ marginBottom: '0.5rem' }}>
            If booking starts mid-month, a pro-rata amount is calculated for the remaining days of that month.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            Full months are billed at the standard monthly rate.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            If booking ends mid-month, a pro-rata amount is calculated for the days used in that month.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            Cancellations require a 1-month notice period.
          </li>
          <li>
            Refunds are provided for months beyond the notice period.
          </li>
        </ul>
      </div>
    </div>
  );
} 