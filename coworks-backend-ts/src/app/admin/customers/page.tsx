'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  Chip
} from '@mui/material';
import { Visibility as VisibilityIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import ApiService from '@/utils/api-service';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  documents: {
    id: string;
    type: string;
    url: string;
    status: string;
  }[];
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customers = await ApiService.get<Customer[]>('/api/admin/customers');
      setCustomers(customers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCustomer(null);
  };

  const handleVerifyDocument = async (documentId: string, status: 'verified' | 'rejected') => {
    try {
      await ApiService.post(`/api/admin/customers/verify`, {
        document_id: documentId,
        status
      });
      loadCustomers();
    } catch (err) {
      setError('Failed to update document status');
      console.error('Error updating document status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Customers</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Verification Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    <Chip
                      label={customer.verification_status}
                      color={getStatusColor(customer.verification_status)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleViewDocuments(customer)}>
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Customer Documents</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedCustomer.name}'s Documents
              </Typography>
              {selectedCustomer.documents.map((doc) => (
                <Box key={doc.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                  <Typography variant="subtitle1">Document Type: {doc.type}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      View Document
                    </Button>
                    {doc.status === 'pending' && (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => handleVerifyDocument(doc.id, 'verified')}
                        >
                          Verify
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => handleVerifyDocument(doc.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Chip
                      label={doc.status}
                      color={getStatusColor(doc.status)}
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 