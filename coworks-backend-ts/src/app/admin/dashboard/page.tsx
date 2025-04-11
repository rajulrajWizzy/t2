'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Divider, 
  CircularProgress, 
  Card, 
  CardContent,
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Stack,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell 
} from 'recharts';
import {
  AttachMoney as MoneyIcon,
  Person as CustomerIcon,
  EventSeat as BookingIcon,
  Business as BranchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { dashboardApi, bookingsApi, paymentsApi } from '@/utils/admin-api';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api-service';
import { ApiResponse, Admin, DashboardStats } from '@/utils/admin-api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [activeChartTab, setActiveChartTab] = useState(0);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const isSessionVerified = useRef(false);
  const router = useRouter();

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      // Only run on client side and if session not already verified
      if (!isClient || isSessionVerified.current) return;

      try {
        // Verify session first
        const sessionResponse = await apiService.verifySession();
        isSessionVerified.current = true;

        if (!sessionResponse.authenticated) {
          throw new Error('Session expired. Please log in again.');
        }

        // Load admin profile
        const adminResponse = await apiService.get<ApiResponse<Admin>>('/admin/profile');
        if (adminResponse.success) {
          setAdminData(adminResponse.data);
          await loadDashboardData();
        } else {
          throw new Error(adminResponse.message || 'Failed to load admin profile');
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        setFallbackData();
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isSessionVerified.current = false;
    };
  }, [isClient]); // Removed router from dependencies as it's not needed

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let hasBackendError = false;
      
      try {
        // Load stats
        const statsData = await dashboardApi.getStats();
        setStats(statsData.data);
      } catch (statsError) {
        console.warn('Error loading stats:', statsError);
        hasBackendError = true;
      }
      
      try {
        // Load recent bookings
        const bookingsData = await dashboardApi.getRecentBookings();
        setRecentBookings(bookingsData.data || []);
      } catch (bookingsError) {
        console.warn('Error loading bookings:', bookingsError);
        hasBackendError = true;
      }
      
      try {
        // Load recent payments
        const paymentsData = await dashboardApi.getRecentPayments();
        setRecentPayments(paymentsData.data || []);
      } catch (paymentsError) {
        console.warn('Error loading payments:', paymentsError);
        hasBackendError = true;
      }
      
      try {
        // Load occupancy chart data
        const occupancy = await dashboardApi.getOccupancyChart();
        setOccupancyData(occupancy.data || []);
      } catch (occupancyError) {
        console.warn('Error loading occupancy data:', occupancyError);
        hasBackendError = true;
      }
      
      try {
        // Load revenue chart data
        const revenue = await dashboardApi.getRevenueChart();
        setRevenueData(revenue.data || []);
      } catch (revenueError) {
        console.warn('Error loading revenue data:', revenueError);
        hasBackendError = true;
      }
      
      // If any backend errors occurred, use fallback data
      if (hasBackendError) {
        setFallbackData();
        setError("Some data couldn't be loaded from the server. Showing fallback data for demonstration.");
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  // Set fallback data when API calls fail
  const setFallbackData = () => {
    console.log('Using fallback dashboard data');
    
    // Set minimal stats to show something
    setStats({
      total_customers: 0,
      total_seats: 0,
      total_bookings: 0,
      active_bookings: 0,
      branches: 0,
      revenue: {
        today: 0,
        week: 0,
        month: 0
      }
    });
    
    setRecentBookings([]);
    setRecentPayments([]);
    setOccupancyData([]);
    setRevenueData([]);
    
    setLoading(false);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    loadDashboardData();
  };

  // Handle chart tab change
  const handleChartTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveChartTab(newValue);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  // Get status color for chips
  const getStatusColor = (status: string) => {
    status = status.toLowerCase();
    if (status === 'active' || status === 'completed') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'cancelled' || status === 'failed') return 'error';
    return 'default';
  };

  // Render status chip
  const renderStatusChip = (status: string) => (
    <Chip 
      label={status.toUpperCase()} 
      size="small" 
      color={getStatusColor(status) as any}
      sx={{ minWidth: 80 }}
    />
  );

  // Show loading state during SSR
  if (!isClient) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button 
            sx={{ ml: 2 }} 
            variant="outlined" 
            size="small" 
            onClick={() => loadDashboardData()}
          >
            Retry
          </Button>
        </Alert>
      ) : (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Dashboard Overview
            </Typography>
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={() => loadDashboardData()}
              variant="outlined"
            >
              Refresh
            </Button>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="div">
                      Total Revenue
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CustomerIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6" component="div">
                      Customers
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalCustomers || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BookingIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" component="div">
                      Active Bookings
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.activeBookings || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BranchIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6" component="div">
                      Branches
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalBranches || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Paper sx={{ p: 2, mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeChartTab} onChange={handleChartTabChange}>
                <Tab label="Occupancy" />
                <Tab label="Revenue" />
              </Tabs>
            </Box>
            
            <Box sx={{ height: 400 }}>
              {activeChartTab === 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hotDesk" name="Hot Desk" fill="#8884d8" />
                    <Bar dataKey="dedicatedDesk" name="Dedicated Desk" fill="#82ca9d" />
                    <Bar dataKey="privateOffice" name="Private Office" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              
              {activeChartTab === 1 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>

          {/* Recent Activity */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  Recent Bookings
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Seat</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentBookings.length > 0 ? (
                        recentBookings.map((booking) => (
                          <TableRow key={booking.id} hover>
                            <TableCell>{booking.seat_number}</TableCell>
                            <TableCell>{booking.customer_name}</TableCell>
                            <TableCell>{formatDate(booking.start_time)}</TableCell>
                            <TableCell>{renderStatusChip(booking.status)}</TableCell>
                            <TableCell align="right">{formatCurrency(booking.amount)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No recent bookings</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  Recent Payments
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Payment ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentPayments.length > 0 ? (
                        recentPayments.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>{payment.id.substring(0, 8)}</TableCell>
                            <TableCell>{payment.customer_name}</TableCell>
                            <TableCell>{formatDate(payment.created_at)}</TableCell>
                            <TableCell>{renderStatusChip(payment.status)}</TableCell>
                            <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No recent payments</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
} 