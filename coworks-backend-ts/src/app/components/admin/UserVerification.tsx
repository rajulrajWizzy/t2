import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  AlertColor,
  Chip
} from '@mui/material';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  verification_status: string;
  is_identity_verified: boolean;
  is_address_verified: boolean;
  identity_document_url: string | null;
  address_document_url: string | null;
  created_at: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserVerification: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      console.log('Fetching users for verification from API');
      const response = await axios.get('/api/users?needs_verification=true', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('User verification API response:', response.data);

      if (response.data && (response.data.success || Array.isArray(response.data))) {
        // Handle different response structures
        if (Array.isArray(response.data)) {
          // Direct array response
          setUsers(response.data as User[]);
          setError(null);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Standard success format with data array
          setUsers(response.data.data as User[]);
          setError(null);
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Object response with potential users property
          const possibleUsers = Object.entries(response.data.data).find(([key, value]) => 
            Array.isArray(value) && (key === 'users' || key.includes('user'))
          );
          
          if (possibleUsers) {
            setUsers(possibleUsers[1] as User[]);
            setError(null);
          } else {
            console.error('Unexpected users data format:', response.data.data);
            setSnackbar({
              open: true,
              message: 'Unexpected data format received from the server',
              severity: 'error'
            });
            setUsers([]);
          }
        } else {
          console.error('Unexpected users data format:', response.data);
          setSnackbar({
            open: true,
            message: 'Unexpected data format received from the server',
            severity: 'error'
          });
          setUsers([]);
        }
      } else {
        setSnackbar({
          open: true,
          message: response.data?.message || 'Failed to fetch users for verification',
          severity: 'error'
        });
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching users for verification:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error fetching users for verification',
        severity: 'error'
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setViewUser(user);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setViewUser(null);
    setRejectionReason('');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVerifyDocument = async (userId: number, documentType: 'identity' | 'address', approve: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      console.log(`Verifying ${documentType} document for user ${userId}, approve: ${approve}`);
      
      // Use the admin verification endpoint
      const response = await axios.post(
        `/api/admin/customers/verify`,
        {
          customer_id: userId,
          verification_status: approve ? 'APPROVED' : 'REJECTED',
          is_identity_verified: documentType === 'identity' ? approve : undefined,
          is_address_verified: documentType === 'address' ? approve : undefined,
          verification_notes: approve ? '' : rejectionReason
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Document verification response:', response.data);

      if (response.data && response.data.success) {
        setSnackbar({
          open: true,
          message: `Document ${approve ? 'approved' : 'rejected'} successfully`,
          severity: approve ? 'success' : 'warning'
        });
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              const updatedUser = { ...user };
              if (documentType === 'identity') {
                updatedUser.is_identity_verified = approve;
              } else {
                updatedUser.is_address_verified = approve;
              }
              
              // Update verification status if needed
              if (!approve) {
                updatedUser.verification_status = 'REJECTED';
              } else if (
                (documentType === 'identity' && updatedUser.is_address_verified) ||
                (documentType === 'address' && updatedUser.is_identity_verified)
              ) {
                updatedUser.verification_status = 'VERIFIED';
              }
              
              return updatedUser;
            }
            return user;
          })
        );
        
        // Update viewUser if it's the same user
        if (viewUser && viewUser.id === userId) {
          const updatedViewUser = { ...viewUser };
          if (documentType === 'identity') {
            updatedViewUser.is_identity_verified = approve;
          } else {
            updatedViewUser.is_address_verified = approve;
          }
          
          // Update verification status if needed
          if (!approve) {
            updatedViewUser.verification_status = 'REJECTED';
          } else if (
            (documentType === 'identity' && updatedViewUser.is_address_verified) ||
            (documentType === 'address' && updatedViewUser.is_identity_verified)
          ) {
            updatedViewUser.verification_status = 'VERIFIED';
          }
          
          setViewUser(updatedViewUser);
        }
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to verify document: ' + (response.data?.message || 'Unknown error'),
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error verifying document:', err);
      
      if (err.response?.status === 404) {
        setSnackbar({
          open: true,
          message: 'Verification endpoint not found. The API may not support this feature yet.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Error verifying document: ' + (err.response?.data?.message || err.message),
          severity: 'error'
        });
      }
    }
  };

  const handleManualVerify = async (userId: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      console.log(`Manually verifying user ${userId}`);
      
      // Use the new API endpoint with proper URL format
      const response = await axios.patch(
        `/api/users/${userId}?action=manual-verify`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Manual verification response:', response.data);

      if (response.data && response.data.success) {
        setSnackbar({
          open: true,
          message: 'User manually verified successfully',
          severity: 'success'
        });
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                verification_status: 'VERIFIED',
                is_identity_verified: true,
                is_address_verified: true
              };
            }
            return user;
          })
        );
        
        // Update viewUser if it's the same user
        if (viewUser && viewUser.id === userId) {
          setViewUser({
            ...viewUser,
            verification_status: 'VERIFIED',
            is_identity_verified: true,
            is_address_verified: true
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to manually verify user: ' + (response.data?.message || 'Unknown error'),
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error manually verifying user:', err);
      
      if (err.response?.status === 404) {
        // Create a fallback implementation if the endpoint doesn't exist
        setSnackbar({
          open: true,
          message: 'Manual verification endpoint not found. Using local fallback.',
          severity: 'warning'
        });
        
        // Update local state with mock verification
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                verification_status: 'VERIFIED',
                is_identity_verified: true,
                is_address_verified: true
              };
            }
            return user;
          })
        );
        
        // Update viewUser if it's the same user
        if (viewUser && viewUser.id === userId) {
          setViewUser({
            ...viewUser,
            verification_status: 'VERIFIED',
            is_identity_verified: true,
            is_address_verified: true
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'Error manually verifying user: ' + (err.response?.data?.message || err.message),
          severity: 'error'
        });
      }
    }
  };

  const handleRequestResubmission = async (userId: number) => {
    if (!rejectionReason) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for resubmission',
        severity: 'warning'
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      console.log(`Requesting resubmission for user ${userId}`);
      
      // Use the new API endpoint with proper URL format
      const response = await axios.patch(
        `/api/users/${userId}?action=request-resubmission`,
        {
          reason: rejectionReason
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Resubmission request response:', response.data);

      if (response.data && response.data.success) {
        setSnackbar({
          open: true,
          message: 'Resubmission requested successfully',
          severity: 'success'
        });
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                verification_status: 'PENDING_RESUBMISSION'
              };
            }
            return user;
          })
        );
        
        // Update viewUser if it's the same user
        if (viewUser && viewUser.id === userId) {
          setViewUser({
            ...viewUser,
            verification_status: 'PENDING_RESUBMISSION'
          });
        }
        
        // Close dialog
        handleCloseDialog();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to request resubmission: ' + (response.data?.message || 'Unknown error'),
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error requesting resubmission:', err);
      
      if (err.response?.status === 404) {
        // Create a fallback implementation if the endpoint doesn't exist
        setSnackbar({
          open: true,
          message: 'Resubmission endpoint not found. Using local fallback.',
          severity: 'warning'
        });
        
        // Update local state with mock resubmission request
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                verification_status: 'PENDING_RESUBMISSION'
              };
            }
            return user;
          })
        );
        
        // Update viewUser if it's the same user
        if (viewUser && viewUser.id === userId) {
          setViewUser({
            ...viewUser,
            verification_status: 'PENDING_RESUBMISSION'
          });
        }
        
        // Close dialog
        handleCloseDialog();
      } else {
        setSnackbar({
          open: true,
          message: 'Error requesting resubmission: ' + (err.response?.data?.message || err.message),
          severity: 'error'
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'error';
      case 'PENDING_RESUBMISSION':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        User Verification
      </Typography>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Identity Verified</TableCell>
                <TableCell>Address Verified</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{`${user.first_name || ''} ${user.last_name || ''}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.verification_status || 'PENDING'} 
                        color={getStatusChipColor(user.verification_status || 'PENDING') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.is_identity_verified ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{user.is_address_verified ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleViewUser(user)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No users found that require verification
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* User Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {viewUser && (
          <>
            <DialogTitle>
              User Details: {viewUser.first_name || ''} {viewUser.last_name || ''}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab label="User Info" />
                  <Tab label="Identity Document" />
                  <Tab label="Address Document" />
                </Tabs>
              </Box>
              
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1"><strong>ID:</strong> {viewUser.id}</Typography>
                  <Typography variant="body1"><strong>Email:</strong> {viewUser.email}</Typography>
                  <Typography variant="body1"><strong>Phone:</strong> {viewUser.phone || 'N/A'}</Typography>
                  <Typography variant="body1">
                    <strong>Verification Status:</strong> 
                    <Chip 
                      label={viewUser.verification_status || 'PENDING'} 
                      color={getStatusChipColor(viewUser.verification_status || 'PENDING') as any}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body1">
                    <strong>Identity Verified:</strong> {viewUser.is_identity_verified ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Address Verified:</strong> {viewUser.is_address_verified ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Created At:</strong> {viewUser.created_at ? new Date(viewUser.created_at).toLocaleString() : 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6">Actions</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Button 
                      variant="contained" 
                      color="success"
                      onClick={() => handleManualVerify(viewUser.id)}
                      disabled={viewUser.verification_status === 'VERIFIED'}
                    >
                      Manually Verify User
                    </Button>
                    
                    <Button 
                      variant="contained" 
                      color="info"
                      onClick={() => handleRequestResubmission(viewUser.id)}
                    >
                      Request Resubmission
                    </Button>
                  </Box>
                  
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Reason for rejection/resubmission"
                    multiline
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </Box>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                {viewUser.identity_document_url ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1">
                        <strong>Status:</strong> {viewUser.is_identity_verified ? 'Verified' : 'Not Verified'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={viewUser.identity_document_url} 
                        alt="Identity Document" 
                        style={{ maxWidth: '100%', maxHeight: '400px' }} 
                      />
                    </Box>
                    
                    {!viewUser.is_identity_verified && (
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button 
                          variant="contained" 
                          color="success"
                          onClick={() => handleVerifyDocument(viewUser.id, 'identity', true)}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="contained" 
                          color="error"
                          onClick={() => handleVerifyDocument(viewUser.id, 'identity', false)}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1">No identity document uploaded</Typography>
                )}
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                {viewUser.address_document_url ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1">
                        <strong>Status:</strong> {viewUser.is_address_verified ? 'Verified' : 'Not Verified'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={viewUser.address_document_url} 
                        alt="Address Document" 
                        style={{ maxWidth: '100%', maxHeight: '400px' }} 
                      />
                    </Box>
                    
                    {!viewUser.is_address_verified && (
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button 
                          variant="contained" 
                          color="success"
                          onClick={() => handleVerifyDocument(viewUser.id, 'address', true)}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="contained" 
                          color="error"
                          onClick={() => handleVerifyDocument(viewUser.id, 'address', false)}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1">No address document uploaded</Typography>
                )}
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default UserVerification;
