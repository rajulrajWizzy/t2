'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ApiService from '@/utils/api-service';

// Add this to prevent static generation
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface Booking {
  id: string;
  customer_id: string;
  customer_name: string;
  branch_id: string;
  branch_name: string;
  seat_id: string;
  seat_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [page, rowsPerPage, searchQuery, statusFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        search: searchQuery,
        status: statusFilter
      });
      const bookings = await ApiService.get<Booking[]>(`/api/admin/bookings?${queryParams}`);
      setBookings(bookings);
      setError(null);
    } catch (err) {
      setError('Failed to load bookings');
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      await ApiService.put(`/api/admin/bookings/${bookingId}/status`, { status: newStatus });
      loadBookings();
    } catch (err) {
      setError('Failed to update booking status');
      console.error('Error updating booking status:', err);
    }
  };

  const handleDelete = async (bookingId: string) => {
    try {
      await ApiService.delete(`/api/admin/bookings/${bookingId}`);
      loadBookings();
    } catch (err) {
      setError('Failed to delete booking');
      console.error('Error deleting booking:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'refunded':
        return 'info';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Bookings Management</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Search"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, branch, or seat"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Seat</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.customer_name}</TableCell>
                  <TableCell>{booking.branch_name}</TableCell>
                  <TableCell>{booking.seat_name}</TableCell>
                  <TableCell>
                    {new Date(booking.start_date).toLocaleDateString()} -{' '}
                    {new Date(booking.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status}
                      color={getStatusColor(booking.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.payment_status}
                      color={getPaymentStatusColor(booking.payment_status)}
                    />
                  </TableCell>
                  <TableCell>${booking.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => {
                      setSelectedBooking(booking);
                      setOpenDialog(true);
                    }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(booking.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Booking Status</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                select
                label="Status"
                value={selectedBooking.status}
                onChange={(e) => {
                  setSelectedBooking({
                    ...selectedBooking,
                    status: e.target.value as Booking['status']
                  });
                }}
                sx={{ mb: 2 }}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedBooking) {
                handleStatusChange(selectedBooking.id, selectedBooking.status);
                setOpenDialog(false);
              }
            }}
            variant="contained"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 