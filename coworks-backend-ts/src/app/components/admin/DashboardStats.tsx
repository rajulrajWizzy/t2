import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, Chip, Switch, FormControlLabel, TextField, Button, Paper, Divider, Tooltip, IconButton, Collapse } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { formatCurrency } from '@/utils/formatters';
import { parseISO, format } from 'date-fns';
import { Settings, DarkMode, LightMode, Info, Refresh, ExpandMore, ExpandLess } from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Stats interface type
interface DashboardStats {
  totalBookings: number;
  bookingChange: number;
  activeUsers: number;
  userChange: number;
  revenue: number;
  revenueChange: number;
  occupancyRate: number;
  occupancyChange: number;
  popularSeatingTypes: any[];
  bookingTrend: any[];
  revenueTrend: any[];
}

interface DashboardStatsProps {
  branchId?: string;
}

export default function DashboardStats({ branchId }: DashboardStatsProps) {
  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuantity, setShowQuantity] = useState(true);
  const [showSavings, setShowSavings] = useState(true);
  const [detailedSeating, setDetailedSeating] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string | null>(branchId || null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Theme colors based on dark mode
  const theme = {
    background: darkMode ? '#1e1e1e' : '#ffffff',
    text: darkMode ? '#ffffff' : '#333333',
    grid: darkMode ? '#333333' : '#e0e0e0',
  };

  // Effect to check for dark mode preference
  useEffect(() => {
    // Check for dark mode
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Function to fetch stats with exponential backoff
  const fetchStats = async (retries = 3, delay = 1000) => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/stats?`;
      
      // Add query parameters
      if (showQuantity) url += 'show_quantity=true&';
      if (showSavings) url += 'show_savings=true&';
      if (detailedSeating) url += 'detailed_seating=true&';
      if (branchFilter) url += `branch_id=${branchFilter}&`;
      if (startDate) url += `start_date=${startDate.toISOString().split('T')[0]}&`;
      if (endDate) url += `end_date=${endDate.toISOString().split('T')[0]}&`;
      
      const response = await axios.get(url);
      
      if (response.data.success && response.data.data) {
        setStats(response.data.data);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError(response.data.message || 'Failed to fetch statistics');
        setStats(null);
      }
      
      setLoading(false);
    } catch (error: any) {
      if (retries > 0) {
        setTimeout(() => fetchStats(retries - 1, delay * 2), delay);
        return;
      }
      
      setError(error.response?.data?.message || error.message || 'Failed to fetch statistics');
      setStats(null);
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchStats();
  }, [branchFilter, showQuantity, showSavings, detailedSeating]);

  // Helper function to format percentage changes
  const formatChange = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchStats();
  };

  // Handle filter change
  const handleBranchFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBranchFilter(event.target.value || null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          bgcolor: 'error.light', 
          color: 'error.contrastText',
          borderRadius: 2
        }}
      >
        <Typography variant="h6" gutterBottom>Error Loading Dashboard</Typography>
        <Typography variant="body1" paragraph>{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRefresh}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ 
      backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
      color: darkMode ? '#ffffff' : '#333333',
      padding: 2,
      borderRadius: 2,
      transition: 'background-color 0.3s ease'
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" gutterBottom>
            Dashboard Statistics
          </Typography>
          <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "textSecondary"}>
            Showing data {branchId ? `for branch #${branchId}` : 'across all branches'}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton onClick={() => setDarkMode(!darkMode)} sx={{ mr: 1 }}>
              {darkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Dashboard Settings">
            <IconButton onClick={toggleSettings} sx={{ mr: 1 }}>
              <Settings />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Settings Panel */}
      <Collapse in={settingsOpen}>
        <Paper 
          elevation={3} 
          sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: darkMode ? '#333' : '#fff',
            color: darkMode ? '#fff' : 'inherit',
            maxHeight: '300px',
            overflow: 'auto'
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Dashboard Settings</Typography>
            <IconButton onClick={() => setSettingsOpen(false)}>
              <ExpandLess />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Appearance & Behavior</Typography>
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <Typography sx={{ mr: 1 }}>Dark Mode</Typography>
                      <Tooltip title="Toggles between light and dark theme for better visibility in different lighting conditions.">
                        <Info fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Data Filters</Typography>
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showQuantity}
                      onChange={(e) => setShowQuantity(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <Typography sx={{ mr: 1 }}>Quantity Stats</Typography>
                      <Tooltip title="Shows booking and user counts. When disabled, focuses only on revenue and financial metrics.">
                        <Info fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showSavings}
                      onChange={(e) => setShowSavings(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <Typography sx={{ mr: 1 }}>Cost Savings</Typography>
                      <Tooltip title="Displays potential cost savings metrics and efficiency calculations.">
                        <Info fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={detailedSeating}
                      onChange={(e) => setDetailedSeating(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <Typography sx={{ mr: 1 }}>Detailed Seating</Typography>
                      <Tooltip title="Shows granular breakdown of different seating types and their performance metrics.">
                        <Info fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                <Box display="flex" alignItems="center">
                  <Typography sx={{ mr: 1 }}>Date Range</Typography>
                  <Tooltip title="Filter dashboard data by specific start and end dates to analyze performance over custom time periods.">
                    <Info fontSize="small" color="action" />
                  </Tooltip>
                </Box>
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="From Date"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          variant: 'outlined',
                          size: 'small'
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={5}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="To Date"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          variant: 'outlined',
                          size: 'small'
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button 
                    variant="contained" 
                    onClick={handleRefresh} 
                    fullWidth
                    sx={{ height: '40px' }}
                  >
                    Apply Filters
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>
      
      <DashboardContent stats={stats} darkMode={darkMode} />
    </Box>
  );
}

// Separate component for the dashboard content to improve readability
const DashboardContent = ({ stats, darkMode }: { stats: typeof emptyStats, darkMode: boolean }) => {
  // Extract values from either the new or legacy format
  const totalBookings = stats.totalBookings ?? 0;
  const bookingChange = stats.bookingChange ?? 0;
  const activeUsers = stats.activeUsers ?? 0;
  const userChange = stats.userChange ?? 0;
  
  // Handle revenue which could be a number or an object
  const revenue = stats.revenue ?? 0;
  // Extract the numeric value if it's an object
  const revenueValue = typeof revenue === 'object' && revenue !== null ? (revenue as any).value : revenue;
  
  const revenueChange = stats.revenueChange ?? 0;
  const occupancyRate = stats.occupancyRate ?? 0;
  const occupancyChange = stats.occupancyChange ?? 0;
  
  // Handle booking by type data
  const bookingsByType = stats.popularSeatingTypes ?? [];
  
  // Handle revenue by month data
  const revenueByMonth = stats.revenueTrend ?? [];
  
  return (
    <>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={totalBookings}
            change={bookingChange}
            format="number"
            darkMode={darkMode}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={activeUsers}
            change={userChange}
            format="number"
            darkMode={darkMode}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Revenue"
            value={revenueValue}
            change={revenueChange}
            format="currency"
            darkMode={darkMode}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Occupancy Rate"
            value={occupancyRate}
            change={occupancyChange}
            format="percent"
            darkMode={darkMode}
          />
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: darkMode ? '#333' : '#fff', color: darkMode ? '#fff' : 'inherit' }}>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Bookings by Type
              </Typography>
              <Box height={300} sx={{ 
                overflowY: 'auto', 
                overflowX: 'hidden', 
                scrollbarWidth: 'thin', 
                '&::-webkit-scrollbar': {width: '6px'}, 
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: darkMode ? '#555' : '#ccc', 
                  borderRadius: '4px'
                } 
              }}>
                {bookingsByType && bookingsByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {bookingsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [`${value} bookings`, 'Count']} 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#333' : '#fff', 
                          color: darkMode ? '#fff' : '#333', 
                          border: darkMode ? '1px solid #555' : '1px solid #ddd' 
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography>No booking type data available</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: darkMode ? '#333' : '#fff', color: darkMode ? '#fff' : 'inherit' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Month
              </Typography>
              <Box height={300} sx={{ 
                overflowY: 'auto', 
                overflowX: 'auto', 
                scrollbarWidth: 'thin', 
                '&::-webkit-scrollbar': {width: '6px', height: '6px'}, 
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: darkMode ? '#555' : '#ccc', 
                  borderRadius: '4px'
                } 
              }}>
                {revenueByMonth && revenueByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueByMonth}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#555' : '#eee'} />
                      <XAxis dataKey="month" tick={{ fill: darkMode ? '#fff' : '#333' }} />
                      <YAxis tick={{ fill: darkMode ? '#fff' : '#333' }} />
                      <RechartsTooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Revenue']} 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#333' : '#fff', 
                          color: darkMode ? '#fff' : '#333', 
                          border: darkMode ? '1px solid #555' : '1px solid #ddd' 
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography>No revenue data available</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

// Stat card component for the top metrics
const StatCard = ({ 
  title, 
  value, 
  change, 
  format,
  darkMode
}: { 
  title: string; 
  value: number; 
  change?: number; 
  format: 'number' | 'currency' | 'percent';
  darkMode: boolean;
}) => {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return `${val}%`;
      default:
        return val !== undefined && val !== null ? val.toLocaleString() : '';
    }
  };
  
  return (
    <Card sx={{ backgroundColor: darkMode ? '#333' : '#fff', color: darkMode ? '#fff' : 'inherit' }}>
      <CardContent>
        <Typography color={darkMode ? "rgba(255,255,255,0.7)" : "textSecondary"} gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div">
          {formatValue(value, format)}
        </Typography>
        {change !== undefined && (
          <Box display="flex" alignItems="center" mt={1}>
            <Chip
              label={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
              color={change >= 0 ? 'success' : 'error'}
              size="small"
              sx={{ mr: 1 }}
            />
            <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "textSecondary"}>
              vs last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};