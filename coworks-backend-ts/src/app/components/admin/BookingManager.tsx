import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  SelectChangeEvent
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

interface Booking {
  id: number;
  customer_id: number;
  customer_name: string;
  seat_id: number;
  seat_name: string;
  seating_type: string;
  branch_id: number;
  branch_name: string;
  start_date: string;
  end_date: string;
  status: string;
  amount: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Seat {
  id: number;
  name: string;
  seating_type_id: number;
  seating_type_name: string;
  branch_id: number;
}

interface Branch {
  id: number;
  name: string;
}

const BookingManager: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    seat_id: '',
    branch_id: '',
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
    status: 'pending',
    amount: 0,
    payment_status: 'pending'
  });
  const [filteredSeats, setFilteredSeats] = useState<Seat[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  useEffect(() => {
    fetchBookings();
    fetchCustomers();
    fetchBranches();
    fetchSeats();
  }, []);

  // Filter seats when branch changes
  useEffect(() => {
    if (formData.branch_id) {
      const branchId = parseInt(formData.branch_id);
      setFilteredSeats(seats.filter(seat => seat.branch_id === branchId));
    } else {
      setFilteredSeats(seats);
    }
  }, [formData.branch_id, seats]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      let url = '/api/bookings';
      
      // Add query parameters
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      if (dateRange.startDate) params.append('start_date', dateRange.startDate.toISOString().split('T')[0]);
      if (dateRange.endDate) params.append('end_date', dateRange.endDate.toISOString().split('T')[0]);
      
      // Add pagination
      params.append('page', page.toString());
      params.append('limit', rowsPerPage.toString());
      
      // Append params to URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Bookings API response:', response.data);

      if (response.data.success) {
        // Handle different response structures
        if (response.data.data && Array.isArray(response.data.data)) {
          setBookings(response.data.data);
          // If total is provided, use it for pagination
          if (response.data.total) {
            setTotalBookings(response.data.total);
          } else {
            setTotalBookings(response.data.data.length);
          }
        } else if (response.data.data && response.data.data.bookings && Array.isArray(response.data.data.bookings)) {
          setBookings(response.data.data.bookings);
          setTotalBookings(response.data.data.pagination?.total || response.data.data.bookings.length);
        } else {
          console.error('Unexpected bookings data format:', response.data);
          setError('Unexpected data format received from the server');
          setBookings([]);
          setTotalBookings(0);
        }
      } else {
        setError(response.data.message || 'Failed to fetch bookings');
        setBookings([]);
        setTotalBookings(0);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.message || 'Error fetching bookings');
      setBookings([]);
      setTotalBookings(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Customers API response:', response.data);

      // Handle different response formats
      if (response.data) {
        let customersData = [];
        
        // Handle array response
        if (Array.isArray(response.data)) {
          customersData = response.data;
        } 
        // Handle data property containing array
        else if (response.data.data && Array.isArray(response.data.data)) {
          customersData = response.data.data;
        }
        // Handle data object containing customers array
        else if (response.data.data && typeof response.data.data === 'object') {
          // Try to find an array property
          const possibleCustomers = Object.entries(response.data.data).find(([key, value]) => 
            Array.isArray(value) && (key === 'customers' || key.includes('customer') || key.includes('user'))
          );
          
          if (possibleCustomers) {
            customersData = possibleCustomers[1] as Customer[];
          }
        }
        
        if (customersData.length > 0) {
          setCustomers(customersData);
        } else {
          console.error('No customers found in the response');
          setCustomers([]);
        }
      } else {
        console.error('Failed to fetch customers: empty response');
        setCustomers([]);
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/branches', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Branches API response:', response.data);

      // Handle different response formats
      if (response.data) {
        let branchesData = [];
        
        // Handle array response
        if (Array.isArray(response.data)) {
          branchesData = response.data;
        } 
        // Handle data property containing array
        else if (response.data.data && Array.isArray(response.data.data)) {
          branchesData = response.data.data;
        }
        // Handle data object containing branches array
        else if (response.data.data && typeof response.data.data === 'object') {
          // Try to find an array property
          const possibleBranches = Object.entries(response.data.data).find(([key, value]) => 
            Array.isArray(value) && (key === 'branches' || key.includes('branch'))
          );
          
          if (possibleBranches) {
            branchesData = possibleBranches[1] as Branch[];
          }
        }
        
        if (branchesData.length > 0) {
          setBranches(branchesData);
        } else {
          console.error('No branches found in the response');
          setBranches([]);
        }
      } else {
        console.error('Failed to fetch branches: empty response');
        setBranches([]);
      }
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    }
  };

  const fetchSeats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/seats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Seats API response:', response.data);

      // Handle different response formats
      if (response.data) {
        let seatsData = [];
        
        // Case 1: Direct array response
        if (Array.isArray(response.data)) {
          seatsData = response.data;
        } 
        // Case 2: Success with seats in data property
        else if (response.data.data && Array.isArray(response.data.data)) {
          seatsData = response.data.data;
        } 
        // Case 3: Success with seats in data.seats property
        else if (response.data.data && response.data.data.seats && Array.isArray(response.data.data.seats)) {
          seatsData = response.data.data.seats;
        }
        // Case 4: Success with seats in other property
        else if (response.data.data && typeof response.data.data === 'object') {
          // Try to find an array property
          const possibleSeats = Object.entries(response.data.data).find(([key, value]) => 
            Array.isArray(value) && (key === 'seats' || key.includes('seat'))
          );
          
          if (possibleSeats) {
            seatsData = possibleSeats[1] as Seat[];
          } else {
            console.error('Unexpected seats data format:', response.data.data);
            setSeats([]);
            setFilteredSeats([]);
            return;
          }
        } else {
          console.error('Unexpected seats data format:', response.data);
          setSeats([]);
          setFilteredSeats([]);
          return;
        }
        
        if (seatsData.length > 0) {
          setSeats(seatsData);
          setFilteredSeats(seatsData);
        } else {
          console.error('No seats found in the response');
          setSeats([]);
          setFilteredSeats([]);
        }
      } else {
        console.error('Failed to fetch seats:', response.data?.message || 'Unknown error');
        setSeats([]);
        setFilteredSeats([]);
      }
    } catch (err: any) {
      console.error('Error fetching seats:', err);
      setSeats([]);
      setFilteredSeats([]);
    }
  };

  const handleOpenDialog = (booking: Booking | null = null) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
        customer_id: booking.customer_id.toString(),
        seat_id: booking.seat_id.toString(),
        branch_id: booking.branch_id.toString(),
        start_date: new Date(booking.start_date),
        end_date: new Date(booking.end_date),
        status: booking.status,
        amount: booking.amount,
        payment_status: booking.payment_status
      });
    } else {
      setEditingBooking(null);
      setFormData({
        customer_id: '',
        seat_id: '',
        branch_id: '',
        start_date: new Date(),
        end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
        status: 'pending',
        amount: 0,
        payment_status: 'pending'
      });
    }
    setOpenDialog(true);
  };

  const handleViewBooking = (booking: Booking) => {
    setViewBooking(booking);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setViewBooking(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    if (date) {
      setFormData({
        ...formData,
        [name]: date
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      let response;

      // Prepare data for API
      const apiData = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        seat_id: parseInt(formData.seat_id),
        branch_id: parseInt(formData.branch_id),
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString()
      };

      if (editingBooking) {
        // Update existing booking
        response = await axios.put(`/api/bookings/${editingBooking.id}`, apiData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        // Create new booking
        response = await axios.post('/api/bookings', apiData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: editingBooking ? 'Booking updated successfully' : 'Booking created successfully',
          severity: 'success'
        });
        fetchBookings();
        handleCloseDialog();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'Operation failed',
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error submitting booking data:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error submitting booking data',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(`/api/bookings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Booking cancelled successfully',
          severity: 'success'
        });
        fetchBookings();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'Failed to cancel booking',
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error cancelling booking',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const getStatusChip = (status: string) => {
    let color = 'default';
    switch (status) {
      case 'active':
        color = 'success';
        break;
      case 'pending':
        color = 'warning';
        break;
      case 'completed':
        color = 'info';
        break;
      case 'cancelled':
        color = 'error';
        break;
      default:
        color = 'default';
    }
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={color as any}
        size="small"
      />
    );
  };

  const getPaymentStatusChip = (status: string) => {
    let color = 'default';
    switch (status) {
      case 'paid':
        color = 'success';
        break;
      case 'pending':
        color = 'warning';
        break;
      case 'failed':
        color = 'error';
        break;
      case 'refunded':
        color = 'info';
        break;
      default:
        color = 'default';
    }
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={color as any}
        size="small"
      />
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const handleUpdateBookingStatus = async (id: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.patch(`/api/bookings/${id}`, 
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Update the booking in the local state
        setBookings(prev => prev.map(booking => 
          booking.id === id 
            ? { ...booking, status: newStatus } 
            : booking
        ));
        setSnackbar({
          open: true,
          message: `Booking #${id} status updated to ${newStatus}`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'Failed to update booking status',
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error updating booking status',
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Booking Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Booking
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Seat</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>{booking.customer_name}</TableCell>
                    <TableCell>
                      <Tooltip title={booking.seating_type}>
                        <span>{booking.seat_name}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{booking.branch_name}</TableCell>
                    <TableCell>
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </TableCell>
                    <TableCell>${booking.amount.toFixed(2)}</TableCell>
                    <TableCell>{getStatusChip(booking.status)}</TableCell>
                    <TableCell>{getPaymentStatusChip(booking.payment_status)}</TableCell>
                    <TableCell>
                      <IconButton color="info" onClick={() => handleViewBooking(booking)}>
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton color="primary" onClick={() => handleOpenDialog(booking)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(booking.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Booking Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingBooking ? 'Edit Booking' : 'Add New Booking'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  name="customer_id"
                  value={formData.customer_id}
                  label="Customer"
                  onChange={handleInputChange}
                >
                  <MenuItem value="">Select Customer</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id.toString()}>
                      {customer.first_name} {customer.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Branch</InputLabel>
                <Select
                  name="branch_id"
                  value={formData.branch_id}
                  label="Branch"
                  onChange={handleInputChange}
                >
                  <MenuItem value="">Select Branch</MenuItem>
                  {Array.isArray(branches) && branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Seat</InputLabel>
                <Select
                  name="seat_id"
                  value={formData.seat_id}
                  label="Seat"
                  onChange={handleInputChange}
                  disabled={!formData.branch_id}
                >
                  <MenuItem value="">Select Seat</MenuItem>
                  {Array.isArray(filteredSeats) ? filteredSeats.map((seat) => (
                    <MenuItem key={seat.id} value={seat.id.toString()}>
                      {seat.name} ({seat.seating_type_name})
                    </MenuItem>
                  )) : <MenuItem disabled>No seats available</MenuItem>}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="amount"
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                fullWidth
                InputProps={{
                  startAdornment: <Box component="span" mr={1}>$</Box>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(date) => handleDateChange('start_date', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={formData.end_date}
                  onChange={(date) => handleDateChange('end_date', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                  minDate={formData.start_date}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleInputChange}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  name="payment_status"
                  value={formData.payment_status}
                  label="Payment Status"
                  onChange={handleInputChange}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingBooking ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Booking Dialog */}
      {viewBooking && (
        <Dialog open={!!viewBooking} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Booking ID</Typography>
                <Typography variant="body1" gutterBottom>{viewBooking.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Customer</Typography>
                <Typography variant="body1" gutterBottom>{viewBooking.customer_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Seat</Typography>
                <Typography variant="body1" gutterBottom>{viewBooking.seat_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Seating Type</Typography>
                <Typography variant="body1" gutterBottom>{viewBooking.seating_type}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Branch</Typography>
                <Typography variant="body1" gutterBottom>{viewBooking.branch_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Amount</Typography>
                <Typography variant="body1" gutterBottom>${viewBooking.amount.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Start Date</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(viewBooking.start_date)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">End Date</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(viewBooking.end_date)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Typography variant="body1" gutterBottom>{getStatusChip(viewBooking.status)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Payment Status</Typography>
                <Typography variant="body1" gutterBottom>{getPaymentStatusChip(viewBooking.payment_status)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Created At</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(viewBooking.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Last Updated</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(viewBooking.updated_at)}</Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
            <Button onClick={() => {
              handleCloseDialog();
              handleOpenDialog(viewBooking);
            }} variant="contained" color="primary">
              Edit
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookingManager;
