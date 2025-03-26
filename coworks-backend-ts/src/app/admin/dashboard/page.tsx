'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../../utils/bookingCalculations';

<<<<<<< Updated upstream
interface BookingSummary {
  totalBookings: number;
  activeBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  revenueByBranch: {
    branchName: string;
    revenue: number;
  }[];
  bookingsByType: {
    type: string;
    count: number;
  }[];
  recentBookings: {
    id: string;
    customerName: string;
    seatName: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    status: string;
  }[];
=======
export const dynamic = 'force-dynamic'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
>>>>>>> Stashed changes
}

export default function AdminDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/admin/dashboard/stats?timeframe=${selectedTimeframe}`, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // });
      // const data = await response.json();
      // setSummary(data.summary);
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockSummary: BookingSummary = {
        totalBookings: 47,
        activeBookings: 28,
        upcomingBookings: 8,
        completedBookings: 9,
        cancelledBookings: 2,
        totalRevenue: 452000,
        revenueByBranch: [
          { branchName: 'Downtown Branch', revenue: 210000 },
          { branchName: 'Westside Branch', revenue: 152000 },
          { branchName: 'North Campus', revenue: 90000 }
        ],
        bookingsByType: [
          { type: 'Hot Desk', count: 18 },
          { type: 'Dedicated Desk', count: 21 },
          { type: 'Private Office', count: 8 }
        ],
        recentBookings: [
          {
            id: 'b1',
            customerName: 'John Doe',
            seatName: 'Hot Desk 1',
            startDate: '2023-03-21',
            endDate: '2023-04-30',
            totalAmount: 7580,
            status: 'active'
          },
          {
            id: 'b2',
            customerName: 'Jane Smith',
            seatName: 'Dedicated Desk 1',
            startDate: '2023-02-15',
            endDate: '2023-05-14',
            totalAmount: 22500,
            status: 'active'
          },
          {
            id: 'b3',
            customerName: 'Robert Johnson',
            seatName: 'Private Office 1',
            startDate: '2023-04-01',
            endDate: '2023-06-30',
            totalAmount: 45000,
            status: 'upcoming'
          },
          {
            id: 'b4',
            customerName: 'Sarah Williams',
            seatName: 'Hot Desk 2',
            startDate: '2022-11-01',
            endDate: '2023-02-28',
            totalAmount: 18000,
            status: 'completed'
          }
        ]
      };
      
      setSummary(mockSummary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#16a34a';
      case 'upcoming':
        return '#2563eb';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const renderBarChart = (data: { branchName: string; revenue: number }[]) => {
    const maxValue = Math.max(...data.map(item => item.revenue));
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        height: '200px',
        justifyContent: 'flex-end'
      }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '120px',
              fontSize: '0.75rem',
              color: '#4b5563',
              textAlign: 'right',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {item.branchName}
            </div>
            <div style={{
              height: '24px',
              width: `${(item.revenue / maxValue) * 100}%`,
              backgroundColor: '#3b82f6',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 0.5rem',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '500',
              minWidth: '40px',
              transition: 'width 0.3s ease'
            }}>
              {formatCurrency(item.revenue)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPieChart = (data: { type: string; count: number }[]) => {
    const total = data.reduce((acc, item) => acc + item.count, 0);
    let startAngle = 0;
    
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899'];
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        height: '200px'
      }}>
        <svg width="160" height="160" viewBox="0 0 32 32">
          {data.map((item, index) => {
            const percentage = item.count / total;
            const angle = percentage * 360;
            const endAngle = startAngle + angle;
            
            // Calculate SVG arc path
            const x1 = 16 + 14 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 16 + 14 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 16 + 14 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 16 + 14 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 16 16`,
              `L ${x1} ${y1}`,
              `A 14 14 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');
            
            const path = (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length]}
              />
            );
            
            startAngle = endAngle;
            
            return path;
          })}
        </svg>
        
        <div style={{
          position: 'absolute',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {data.map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#4b5563'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: colors[index % colors.length],
                borderRadius: '2px'
              }}></div>
              <div>{item.type} ({item.count})</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProRataExampleChart = () => {
    // This is a simplified visualization of pro-rata calculation
    const days = [
      { day: 'Mar 21', amount: 161, color: '#3b82f6' },
      { day: 'Mar 22', amount: 161, color: '#3b82f6' },
      { day: 'Mar 23', amount: 161, color: '#3b82f6' },
      { day: 'Mar 24', amount: 161, color: '#3b82f6' },
      { day: 'Mar 25', amount: 161, color: '#3b82f6' },
      { day: 'Mar 26', amount: 161, color: '#3b82f6' },
      { day: 'Mar 27', amount: 161, color: '#3b82f6' },
      { day: 'Mar 28', amount: 161, color: '#3b82f6' },
      { day: 'Mar 29', amount: 161, color: '#3b82f6' },
      { day: 'Mar 30', amount: 161, color: '#3b82f6' },
      { day: 'Mar 31', amount: 161, color: '#3b82f6' },
      { day: 'Apr 1', amount: 167, color: '#8b5cf6' },
      { day: 'Apr 2', amount: 167, color: '#8b5cf6' },
      { day: 'Apr 3', amount: 167, color: '#8b5cf6' },
      { day: 'Apr 4', amount: 167, color: '#8b5cf6' },
      { day: 'Apr 5', amount: 167, color: '#8b5cf6' },
      { day: 'Apr 6', amount: 167, color: '#8b5cf6' },
      { day: 'Apr 7', amount: 167, color: '#8b5cf6' }
    ];
    
    return (
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem'
      }}>
        <h3 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.75rem',
          color: '#374151'
        }}>
          Pro-rata Calculation Example (Hot Desk at ₹5,000/month)
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          height: '120px',
          overflowX: 'auto',
          paddingBottom: '1.5rem'
        }}>
          {days.map((day, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <div style={{
                width: '16px',
                height: `${(day.amount / 170) * 100}px`,
                backgroundColor: day.color,
                borderRadius: '2px 2px 0 0'
              }}></div>
              <div style={{
                fontSize: '0.625rem',
                color: '#6b7280',
                transform: 'rotate(-45deg)',
                transformOrigin: 'top left',
                position: 'relative',
                top: '16px',
                left: '8px',
                whiteSpace: 'nowrap'
              }}>
                {day.day}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#4b5563'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#3b82f6',
              borderRadius: '2px'
            }}></div>
            <span>March: ₹161/day</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#8b5cf6',
              borderRadius: '2px'
            }}></div>
            <span>April: ₹167/day</span>
          </div>
        </div>
        
        <p style={{
          fontSize: '0.75rem',
          color: '#4b5563',
          marginTop: '0.75rem',
          textAlign: 'center'
        }}>
          Daily rates vary because they're calculated as: Monthly Rate ÷ Days in Month
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        borderRadius: '0.375rem'
      }}>
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        color: '#6b7280'
      }}>
        No dashboard data available.
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
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          Dashboard
        </h1>
        
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          {['month', 'quarter', 'year'].map(timeframe => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: selectedTimeframe === timeframe ? '#3b82f6' : '#f3f4f6',
                color: selectedTimeframe === timeframe ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            Total Bookings
          </p>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {summary.totalBookings}
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            Active Bookings
          </p>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#16a34a'
          }}>
            {summary.activeBookings}
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            Upcoming Bookings
          </p>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#2563eb'
          }}>
            {summary.upcomingBookings}
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            Total Revenue
          </p>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>
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
          padding: '1.25rem'
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            Revenue by Branch
          </h2>
          
          {renderBarChart(summary.revenueByBranch)}
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem'
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            Bookings by Type
          </h2>
          
          {renderPieChart(summary.bookingsByType)}
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Pro-rata Booking Calculations
            </h2>
            
            <button
              onClick={() => router.push('/booking/calculator')}
              style={{
                fontSize: '0.75rem',
                color: '#3b82f6',
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0.25rem 0',
                cursor: 'pointer'
              }}
            >
              View Calculator →
            </button>
          </div>
          
          {renderProRataExampleChart()}
        </div>
      </div>
      
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Recent Bookings
          </h2>
          
          <button
            onClick={() => router.push('/admin/bookings')}
            style={{
              fontSize: '0.75rem',
              color: '#3b82f6',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0.25rem 0',
              cursor: 'pointer'
            }}
          >
            View All →
          </button>
        </div>
        
        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f9fafb'
              }}>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Customer
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Seat
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Duration
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Amount
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.recentBookings.map((booking, index) => (
                <tr 
                  key={booking.id}
                  style={{
                    borderBottom: index < summary.recentBookings.length - 1 ? '1px solid #e5e7eb' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                >
                  <td style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#1f2937'
                  }}>
                    {booking.customerName}
                  </td>
                  <td style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#1f2937'
                  }}>
                    {booking.seatName}
                  </td>
                  <td style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#1f2937'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem'
                    }}>
                      <span>{new Date(booking.startDate).toLocaleDateString()}</span>
                      <span>-</span>
                      <span>{new Date(booking.endDate).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {formatCurrency(booking.totalAmount)}
                  </td>
                  <td style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: getStatusColor(booking.status),
                      marginRight: '0.5rem'
                    }}></span>
                    <span style={{
                      color: getStatusColor(booking.status),
                      textTransform: 'capitalize'
                    }}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 