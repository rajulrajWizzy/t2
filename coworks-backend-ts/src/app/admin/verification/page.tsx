'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  VerifiedUser as VerifiedIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { verificationApi } from '@/utils/admin-api';
import { format } from 'date-fns';

// Verification status type
type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

// Customer type definition
interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  profile_picture?: string;
  proof_of_identity?: string;
  proof_of_address?: string;
  address?: string;
  is_identity_verified: boolean;
  is_address_verified: boolean;
  verification_status: VerificationStatus;
  verification_notes?: string;
  verification_date?: string;
  verified_by?: number;
  verified_by_name?: string;
  created_at: string;
  updated_at: string;
}

export default function VerificationPage() {
  // State for tab selection
  const [activeTab, setActiveTab] = useState<VerificationStatus>('PENDING');
  
  // State for customers list and pagination
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(10);
  
  // State for document viewer
  const [documentDialog, setDocumentDialog] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState<'identity' | 'address'>('identity');
  const [documentTitle, setDocumentTitle] = useState('');
  
  // State for verification dialog
  const [verifyDialog, setVerifyDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [verificationForm, setVerificationForm] = useState({
    verification_status: 'APPROVED' as VerificationStatus,
    is_identity_verified: true,
    is_address_verified: true,
    verification_notes: ''
  });
  const [verifying, setVerifying] = useState(false);
  
  // Load customers on initial render and when tab or page changes
  useEffect(() => {
    loadCustomers();
  }, [activeTab, page]);
  
  // Load customers from API
  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (activeTab) {
        case 'PENDING':
          response = await verificationApi.getPending({ page, limit });
          break;
        case 'APPROVED':
          response = await verificationApi.getApproved({ page, limit });
          break;
        case 'REJECTED':
          response = await verificationApi.getRejected({ page, limit });
          break;
        default:
          response = await verificationApi.getAll({ page, limit });
      }
      
      if (response.success) {
        setCustomers(response.data || []);
        
        if (response.meta?.pagination) {
          setTotalPages(response.meta.pagination.pages || 1);
          setTotalCount(response.meta.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalCount(response.data?.length || 0);
        }
      } else {
        setError(response.message || 'Failed to load verification requests');
        setCustomers([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Error loading verifications:', err);
      setError(err.message || 'Failed to load verification requests');
      setCustomers([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: VerificationStatus) => {
    setActiveTab(newValue);
    setPage(1); // Reset to first page when changing tabs
  };
  
  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Open document viewer
  const handleViewDocument = async (customer: Customer, type: 'identity' | 'address') => {
    try {
      setDocumentType(type);
      setDocumentTitle(`${customer.name}'s ${type === 'identity' ? 'Proof of Identity' : 'Proof of Address'}`);
      
      // For demo purpose, use the document URL directly from customer object
      // In production, you might want to fetch a secure URL from the API
      const docUrl = type === 'identity' ? customer.proof_of_identity : customer.proof_of_address;
      
      if (docUrl) {
        setDocumentUrl(docUrl);
        setDocumentDialog(true);
      } else {
        setError(`No ${type === 'identity' ? 'identity' : 'address'} document found`);
      }
    } catch (err: any) {
      console.error('Error opening document:', err);
      setError(err.message || 'Failed to open document');
    }
  };
  
  // Close document viewer
  const handleCloseDocument = () => {
    setDocumentDialog(false);
    setDocumentUrl('');
  };
  
  // Open verification dialog
  const handleVerifyClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setVerificationForm({
      verification_status: 'APPROVED',
      is_identity_verified: true,
      is_address_verified: true,
      verification_notes: customer.verification_notes || ''
    });
    setVerifyDialog(true);
  };
  
  // Close verification dialog
  const handleCloseVerify = () => {
    setVerifyDialog(false);
    setSelectedCustomer(null);
  };
  
  // Handle verification form change
  const handleVerificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = event.target;
    
    setVerificationForm({
      ...verificationForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle verification status change
  const handleStatusChange = (status: VerificationStatus) => {
    setVerificationForm({
      ...verificationForm,
      verification_status: status,
      // Auto-update checkbox values based on status
      is_identity_verified: status === 'APPROVED',
      is_address_verified: status === 'APPROVED'
    });
  };
  
  // Submit verification
  const handleSubmitVerification = async () => {
    if (!selectedCustomer) return;
    
    setVerifying(true);
    
    try {
      const response = await verificationApi.updateStatus(selectedCustomer.id.toString(), verificationForm);
      
      if (response.success) {
        setVerifyDialog(false);
        loadCustomers();
      } else {
        setError(response.message || 'Failed to update verification status');
      }
    } catch (err: any) {
      console.error('Error updating verification:', err);
      setError(err.message || 'Failed to update verification status');
    } finally {
      setVerifying(false);
    }
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };
  
  // Get status chip color
  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Customer Verification
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {totalCount} {activeTab.toLowerCase()} {totalCount === 1 ? 'customer' : 'customers'}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Pending" value="PENDING" />
          <Tab label="Approved" value="APPROVED" />
          <Tab label="Rejected" value="REJECTED" />
          <Tab label="All" value="ALL" />
        </Tabs>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Verification Status</TableCell>
              <TableCell>Verified By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No {activeTab.toLowerCase()} verification requests found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        src={customer.profile_picture}
                        alt={customer.name}
                        sx={{ mr: 2 }}
                      >
                        {customer.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{customer.name}</Typography>
                        {customer.company_name && (
                          <Typography variant="body2" color="textSecondary">
                            {customer.company_name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{customer.email}</Typography>
                    {customer.phone && (
                      <Typography variant="body2" color="textSecondary">
                        {customer.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View ID Proof">
                        <span>
                          <IconButton
                            size="small"
                            color={customer.is_identity_verified ? "success" : "primary"}
                            onClick={() => handleViewDocument(customer, 'identity')}
                            disabled={!customer.proof_of_identity}
                          >
                            <DocumentIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="View Address Proof">
                        <span>
                          <IconButton
                            size="small"
                            color={customer.is_address_verified ? "success" : "primary"}
                            onClick={() => handleViewDocument(customer, 'address')}
                            disabled={!customer.proof_of_address}
                          >
                            <DocumentIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={customer.verification_status} 
                      color={getStatusColor(customer.verification_status)}
                      size="small"
                    />
                    {customer.verification_notes && (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                        <NotesIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16 }} />
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 150 }}>
                          {customer.verification_notes}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.verified_by_name || (customer.verified_by ? 'Admin #' + customer.verified_by : '-')}
                  </TableCell>
                  <TableCell>
                    {formatDate(customer.verification_date)}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Verify Customer">
                      <IconButton
                        onClick={() => handleVerifyClick(customer)}
                        color="primary"
                      >
                        <VerifiedIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
      
      {/* Document Viewer Dialog */}
      <Dialog
        open={documentDialog}
        onClose={handleCloseDocument}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{documentTitle}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          {documentUrl ? (
            documentUrl.endsWith('.pdf') ? (
              <Box sx={{ height: '70vh', width: '100%' }}>
                <iframe
                  src={documentUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title={documentTitle}
                />
              </Box>
            ) : (
              <Box
                component="img"
                src={documentUrl}
                alt={documentTitle}
                sx={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />
            )
          ) : (
            <Box sx={{ py: 5 }}>
              <Typography variant="body1" color="textSecondary">
                Document not found or unable to display
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDocument}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Verification Dialog */}
      <Dialog
        open={verifyDialog}
        onClose={handleCloseVerify}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Verify Customer</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6">
                {selectedCustomer.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {selectedCustomer.email}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Verification Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant={verificationForm.verification_status === 'APPROVED' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleStatusChange('APPROVED')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant={verificationForm.verification_status === 'REJECTED' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => handleStatusChange('REJECTED')}
                  >
                    Reject
                  </Button>
                  <Button
                    variant={verificationForm.verification_status === 'PENDING' ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => handleStatusChange('PENDING')}
                  >
                    Pending
                  </Button>
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={verificationForm.is_identity_verified}
                        onChange={handleVerificationChange}
                        name="is_identity_verified"
                        color="primary"
                      />
                    }
                    label="ID Verified"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={verificationForm.is_address_verified}
                        onChange={handleVerificationChange}
                        name="is_address_verified"
                        color="primary"
                      />
                    }
                    label="Address Verified"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Verification Notes"
                    name="verification_notes"
                    value={verificationForm.verification_notes}
                    onChange={handleVerificationChange}
                    multiline
                    rows={3}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVerify}>Cancel</Button>
          <Button 
            onClick={handleSubmitVerification} 
            variant="contained" 
            color={verificationForm.verification_status === 'APPROVED' ? 'success' : 
                  verificationForm.verification_status === 'REJECTED' ? 'error' : 'primary'}
            disabled={verifying}
          >
            {verifying ? <CircularProgress size={24} /> : 
              verificationForm.verification_status === 'APPROVED' ? 'Approve' : 
              verificationForm.verification_status === 'REJECTED' ? 'Reject' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 