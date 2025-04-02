'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import axios from 'axios';

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  user_id: string;
  user_name: string;
  booking_id?: string;
  invoice_id?: string;
  created_at: string;
  description?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    amount: 0,
    status: 'pending',
    payment_method: 'credit_card',
    user_id: '',
    user_name: '',
    booking_id: '',
    invoice_id: '',
    description: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/payments', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPayments(response.data.data.payments || []);
      } else {
        setError(response.data.message || 'Failed to fetch payments');
        // Use mock data if API fails
        setPayments(getMockPayments());
      }
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError('Error fetching payments. Using sample data.');
      // Use mock data if API fails
      setPayments(getMockPayments());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (payment: Payment | null = null) => {
    if (payment) {
      setSelectedPayment(payment);
      setFormData({
        amount: payment.amount,
        status: payment.status,
        payment_method: payment.payment_method,
        user_id: payment.user_id,
        user_name: payment.user_name,
        booking_id: payment.booking_id || '',
        invoice_id: payment.invoice_id || '',
        description: payment.description || ''
      });
    } else {
      setSelectedPayment(null);
      setFormData({
        amount: 0,
        status: 'pending',
        payment_method: 'credit_card',
        user_id: '',
        user_name: '',
        booking_id: '',
        invoice_id: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      if (selectedPayment) {
        // Update existing payment
        const response = await axios.put(`/api/admin/payments/${selectedPayment.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          fetchPayments();
          handleCloseDialog();
        } else {
          setError(response.data.message || 'Failed to update payment');
        }
      } else {
        // Create new payment
        const response = await axios.post('/api/admin/payments', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          fetchPayments();
          handleCloseDialog();
        } else {
          setError(response.data.message || 'Failed to create payment');
        }
      }
    } catch (err: any) {
      console.error('Error saving payment:', err);
      setError(err.response?.data?.message || 'Error saving payment');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'successful':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'declined':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  // Mock data function
  const getMockPayments = (): Payment[] => {
    return [
      {
        id: '1',
        amount: 250,
        status: 'completed',
        payment_method: 'credit_card',
        user_id: '101',
        user_name: 'John Doe',
        booking_id: 'B1001',
        invoice_id: 'INV-2023-001',
        created_at: '2023-03-15T10:30:00Z',
        description: 'Monthly membership payment'
      },
      {
        id: '2',
        amount: 50,
        status: 'pending',
        payment_method: 'bank_transfer',
        user_id: '102',
        user_name: 'Jane Smith',
        booking_id: 'B1002',
        invoice_id: 'INV-2023-002',
        created_at: '2023-03-16T14:20:00Z',
        description: 'Meeting room booking'
      },
      {
        id: '3',
        amount: 150,
        status: 'failed',
        payment_method: 'credit_card',
        user_id: '103',
        user_name: 'Robert Johnson',
        booking_id: 'B1003',
        invoice_id: 'INV-2023-003',
        created_at: '2023-03-17T09:15:00Z',
        description: 'Weekly desk rental'
      },
      {
        id: '4',
        amount: 75,
        status: 'refunded',
        payment_method: 'paypal',
        user_id: '104',
        user_name: 'Emily Wilson',
        booking_id: 'B1004',
        invoice_id: 'INV-2023-004',
        created_at: '2023-03-18T16:45:00Z',
        description: 'Day pass'
      }
    ];
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Payments Management
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleOpenDialog()}
          >
            Record New Payment
          </Button>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.id}</TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                      <TableCell>{payment.user_name}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {payment.payment_method.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={payment.status} 
                          color={getStatusColor(payment.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleOpenDialog(payment)}
                        >
                          View/Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedPayment ? 'Payment Details' : 'Record New Payment'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="user_name"
                label="User Name"
                value={formData.user_name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="user_id"
                label="User ID"
                value={formData.user_id}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="amount"
                label="Amount ($)"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  label="Payment Method"
                >
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="invoice_id"
                label="Invoice ID"
                value={formData.invoice_id}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="booking_id"
                label="Booking ID"
                value={formData.booking_id}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedPayment ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
