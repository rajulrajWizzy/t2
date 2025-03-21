'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  openTickets: number;
  revenue: number;
  branches?: number;
  seats?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    // Get admin role
    const role = localStorage.getItem('admin_role');
    setAdminRole(role);

    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch('/api/admin/dashboard/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard statistics');
        }

        const data = await response.json();
        setStats(data.stats);
      } catch (err) {
        setError('Error loading dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        borderRadius: '0.375rem',
        margin: '1rem 0'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#1f2937'
      }}>
        Dashboard
      </h1>

      {/* Primary Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Total Bookings */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            Total Bookings
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            {stats?.totalBookings || 0}
          </div>
          <Link href="/admin/bookings" style={{
            color: '#3b82f6',
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}>
            View all bookings
          </Link>
        </div>

        {/* Active Bookings */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            Active Bookings
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            {stats?.activeBookings || 0}
          </div>
          <Link href="/admin/bookings?status=active" style={{
            color: '#3b82f6',
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}>
            View active bookings
          </Link>
        </div>

        {/* Open Tickets */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            Open Tickets
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            {stats?.openTickets || 0}
          </div>
          <Link href="/admin/tickets?status=open" style={{
            color: '#3b82f6',
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}>
            View open tickets
          </Link>
        </div>

        {/* Total Revenue */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            Total Revenue
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            {formatCurrency(stats?.revenue || 0)}
          </div>
          <Link href="/admin/bookings?view=revenue" style={{
            color: '#3b82f6',
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}>
            View revenue details
          </Link>
        </div>

        {/* Super Admin Only Stats */}
        {adminRole === 'super_admin' && (
          <>
            {/* Total Branches */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Total Branches
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                {stats?.branches || 0}
              </div>
              <Link href="/admin/branch" style={{
                color: '#3b82f6',
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}>
                Manage branches
              </Link>
            </div>

            {/* Total Seats */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Total Seats
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                {stats?.seats || 0}
              </div>
              <Link href="/admin/seats" style={{
                color: '#3b82f6',
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}>
                View all seats
              </Link>
            </div>
            
            {/* Admin Users */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Admin Users
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Manage
              </div>
              <Link href="/admin/users" style={{
                color: '#3b82f6',
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}>
                Manage admin users
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: '#1f2937'
      }}>
        Quick Actions
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {adminRole === 'super_admin' && (
          <>
            <Link href="/admin/branch/create" style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1rem',
              textAlign: 'center',
              color: '#4b5563',
              textDecoration: 'none'
            }}>
              Create Branch
            </Link>
            <Link href="/admin/users/create" style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1rem',
              textAlign: 'center',
              color: '#4b5563',
              textDecoration: 'none'
            }}>
              Create Admin User
            </Link>
          </>
        )}

        <Link href="/admin/seats/create" style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1rem',
          textAlign: 'center',
          color: '#4b5563',
          textDecoration: 'none'
        }}>
          Create Seat
        </Link>

        <Link href="/admin/tickets/create" style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1rem',
          textAlign: 'center',
          color: '#4b5563',
          textDecoration: 'none'
        }}>
          Create Ticket
        </Link>

        <Link href="/admin/bookings/report" style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1rem',
          textAlign: 'center',
          color: '#4b5563',
          textDecoration: 'none'
        }}>
          Booking Report
        </Link>

        <Link href="/admin/profile" style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1rem',
          textAlign: 'center',
          color: '#4b5563',
          textDecoration: 'none'
        }}>
          My Profile
        </Link>
      </div>
    </div>
  );
} 