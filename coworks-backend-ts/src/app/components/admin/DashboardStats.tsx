import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, Chip, Switch, FormControlLabel, TextField, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface DashboardStatsProps {
  branchId?: string | number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ branchId }) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and customization options
  const [showQuantityStats, setShowQuantityStats] = useState<boolean>(true);
  const [showCostSavings, setShowCostSavings] = useState<boolean>(true);
  const [detailedSeating, setDetailedSeating] = useState<boolean>(true);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  
  const fetchStats = async () => {
    setLoading(true);
    try {
      // Build URL with query parameters
      let url = '/api/admin/dashboard/stats';
      const params = new URLSearchParams();
      
      if (showQuantityStats) params.append('quantity_stats', 'true');
      if (showCostSavings) params.append('cost_savings', 'true');
      if (detailedSeating) params.append('detailed_seating', 'true');
      if (fromDate) params.append('from', fromDate.toISOString());
      if (toDate) params.append('to', toDate.toISOString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setStats(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);
  
  const handleRefresh = () => {
    fetchStats();
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!stats) {
    return null;
  }
  
  // Format data for the quantity usage chart
  const prepareQuantityData = (typeData: any[]) => {
    if (!typeData || !typeData.length) return [];
    
    return typeData.map((item: any) => ({
      quantity: item.quantity,
      count: parseInt(item.count),
      revenue: parseFloat(item.revenue),
      savings: parseFloat(item.savings) || 0,
    }));
  };
  
  const hotDeskQuantityData = stats.quantityStats?.hotDesk ? 
    prepareQuantityData(stats.quantityStats.hotDesk) : [];
    
  const dedicatedDeskQuantityData = stats.quantityStats?.dedicatedDesk ? 
    prepareQuantityData(stats.quantityStats.dedicatedDesk) : [];
  
  // Format data for seating types pie chart
  const seatsByTypeData = stats.seatsByType?.map((type: any) => ({
    name: type.typeName,
    value: type.count,
    available: type.available,
    capacity: type.capacity_options,
    quantity: type.quantity_options,
    multiplier: type.cost_multiplier
  })) || [];
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h4" gutterBottom>
          Dashboard Statistics
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(newValue) => setFromDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(newValue) => setToDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </LocalizationProvider>
          <Button variant="contained" onClick={handleRefresh}>
            Apply Filters
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={<Switch checked={showQuantityStats} onChange={(e) => setShowQuantityStats(e.target.checked)} />}
          label="Show Quantity Stats"
        />
        <FormControlLabel
          control={<Switch checked={showCostSavings} onChange={(e) => setShowCostSavings(e.target.checked)} />}
          label="Show Cost Savings"
        />
        <FormControlLabel
          control={<Switch checked={detailedSeating} onChange={(e) => setDetailedSeating(e.target.checked)} />}
          label="Detailed Seating"
        />
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Bookings
              </Typography>
              <Typography variant="h4">
                {stats.totalBookings}
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                {stats.activeBookings} active, {stats.pendingBookings} pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Revenue
              </Typography>
              <Typography variant="h4">
                {formatCurrency(stats.totalRevenue)}
              </Typography>
              {showCostSavings && stats.costSavings && (
                <Typography variant="subtitle2" color="success.main">
                  {formatCurrency(stats.costSavings.savings)} saved ({stats.costSavings.savingsPercentage.toFixed(1)}%)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Seats
              </Typography>
              <Typography variant="h4">
                {stats.totalSeats || stats.seats}
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                {stats.availability || stats.availableSeats} available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Support Tickets
              </Typography>
              <Typography variant="h4">
                {stats.openTickets}
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                Open tickets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Quantity Usage Stats */}
      {showQuantityStats && stats.quantityStats && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Quantity Usage Statistics
          </Typography>
          
          <Grid container spacing={3}>
            {/* Hot Desk Quantity Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Hot Desk Quantity Distribution
                  </Typography>
                  
                  {hotDeskQuantityData.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={hotDeskQuantityData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="quantity" label={{ value: 'Quantity', position: 'insideBottom', offset: -5 }} />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                              if (name === 'savings') return [formatCurrency(value as number), 'Savings'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" name="Number of Bookings" fill="#8884d8" />
                          <Bar dataKey="revenue" name="Revenue" fill="#82ca9d" />
                          {stats.costSavings && <Bar dataKey="savings" name="Savings" fill="#ffc658" />}
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography color="textSecondary">No hot desk booking data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Dedicated Desk Quantity Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Dedicated Desk Quantity Distribution
                  </Typography>
                  
                  {dedicatedDeskQuantityData.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dedicatedDeskQuantityData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="quantity" label={{ value: 'Quantity', position: 'insideBottom', offset: -5 }} />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                              if (name === 'savings') return [formatCurrency(value as number), 'Savings'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" name="Number of Bookings" fill="#8884d8" />
                          <Bar dataKey="revenue" name="Revenue" fill="#82ca9d" />
                          {stats.costSavings && <Bar dataKey="savings" name="Savings" fill="#ffc658" />}
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography color="textSecondary">No dedicated desk booking data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Seating Types Distribution */}
      {detailedSeating && stats.seatsByType && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Seating Types Distribution
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Seats by Type
                  </Typography>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={seatsByTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {seatsByTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => {
                            const entry = props.payload;
                            return [`${value} seats (${entry.available} available)`, entry.name];
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Seating Types Details
                  </Typography>
                  
                  <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                    {seatsByTypeData.map((type, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS[index % COLORS.length] }}>
                          {type.name}
                        </Typography>
                        <Typography variant="body2">
                          Total: {type.value} seats ({type.available} available)
                        </Typography>
                        
                        {type.capacity && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Capacity Options:</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              {Object.keys(type.capacity).map(cap => (
                                <Chip 
                                  key={cap} 
                                  label={`${cap}: ${type.capacity[cap]}`}
                                  size="small"
                                  sx={{ bgcolor: `${COLORS[index % COLORS.length]}22` }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {type.quantity && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Quantity Options:</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              {Object.keys(type.quantity).map(qty => (
                                <Chip 
                                  key={qty} 
                                  label={`${qty}`}
                                  size="small"
                                  sx={{ bgcolor: `${COLORS[index % COLORS.length]}22` }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {type.multiplier && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Cost Multipliers:</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              {Object.keys(type.multiplier).map(qty => (
                                <Chip 
                                  key={qty} 
                                  label={`${qty}: ${type.multiplier[qty]}x`}
                                  size="small"
                                  sx={{ bgcolor: `${COLORS[index % COLORS.length]}22` }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Cost Savings Analysis */}
      {showCostSavings && stats.costSavings && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Cost Savings Analysis
          </Typography>
          
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h6" gutterBottom>Original Price</Typography>
                    <Typography variant="h4" color="textPrimary">
                      {formatCurrency(stats.costSavings.originalPrice)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h6" gutterBottom>Actual Revenue</Typography>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(stats.costSavings.adjustedPrice)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h6" gutterBottom>Customer Savings</Typography>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(stats.costSavings.savings)}
                      <Typography variant="subtitle1" component="span" color="success.main">
                        {` (${stats.costSavings.savingsPercentage.toFixed(1)}%)`}
                      </Typography>
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                These savings represent discounts applied through quantity pricing and promotions. 
                While they reduce immediate revenue, they drive higher booking volumes and customer satisfaction.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default DashboardStats; 