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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Snackbar,
  Alert,
  InputAdornment,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { Edit, Delete, Add, Visibility, VisibilityOff, Settings } from '@mui/icons-material';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  branch_id?: number;
  branch_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: number;
  name: string;
}

interface FormDataType {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: string;
  branch_id: string;
  status: string;
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormDataType>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    branch_id: '',
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      console.log('Fetching users from API');
      const response = await axios.get('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Users API response:', response.data);

      if (response.data && (response.data.success || Array.isArray(response.data))) {
        // Handle different response structures
        if (Array.isArray(response.data)) {
          // Direct array response
          setUsers(response.data);
          setError(null);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Standard success format with data array
          setUsers(response.data.data);
          setError(null);
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Object response with potential users property
          const possibleUsers = Object.entries(response.data.data).find(([_, value]) => Array.isArray(value));
          
          if (possibleUsers) {
            setUsers(possibleUsers[1] as User[]);
            setError(null);
          } else {
            console.error('Unexpected users data format:', response.data.data);
            setError('Unexpected data format received from the server');
            setUsers([]);
          }
        } else {
          console.error('Unexpected users data format:', response.data);
          setError('Unexpected data format received from the server');
          setUsers([]);
        }
      } else {
        setError(response.data.message || 'Failed to fetch users');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Error fetching users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      console.log('Fetching branches from API');
      const response = await axios.get('/api/branches', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Branches API response:', response.data);

      if (response.data && (response.data.success || Array.isArray(response.data))) {
        // Handle different response structures
        if (Array.isArray(response.data)) {
          // Direct array response
          setBranches(response.data);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Standard success format with data array
          setBranches(response.data.data);
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Object response with potential branches property
          const possibleBranches = Object.entries(response.data.data).find(([_, value]) => Array.isArray(value));
          
          if (possibleBranches) {
            setBranches(possibleBranches[1] as Branch[]);
          } else {
            console.error('Unexpected branches data format:', response.data.data);
            setBranches([]);
          }
        } else {
          console.error('Unexpected branches data format:', response.data);
          setBranches([]);
        }
      } else {
        console.error('Failed to fetch branches or invalid data format:', response.data);
        setBranches([]);
      }
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    }
  };

  const handleOpenDialog = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        branch_id: user.branch_id?.toString() || '',
        status: user.status
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
        branch_id: '',
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setShowPassword(false);
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

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name || !formData.email) {
      setSnackbar({
        open: true,
        message: 'Name and email are required',
        severity: 'error'
      });
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 8)) {
      setSnackbar({
        open: true,
        message: 'Password must be at least 8 characters',
        severity: 'error'
      });
      return;
    }

    if (!editingUser && formData.password !== formData.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'Passwords do not match',
        severity: 'error'
      });
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let response;

      // Prepare data for API
      const apiData: Partial<FormDataType> = {
        ...formData,
        branch_id: formData.branch_id ? formData.branch_id : undefined
      };

      // For API, we don't need confirmPassword
      const { confirmPassword, ...apiDataWithoutConfirm } = apiData;
      
      // For existing user, don't send password if it's empty
      if (editingUser && !apiDataWithoutConfirm.password) {
        const { password, ...dataWithoutPassword } = apiDataWithoutConfirm;
        
        if (editingUser) {
          // Update existing user
          response = await axios.put(`/api/users/${editingUser.id}`, dataWithoutPassword, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        }
      } else {
        if (editingUser) {
          // Update existing user with password
          response = await axios.put(`/api/users/${editingUser.id}`, apiDataWithoutConfirm, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } else {
          // Create new user
          response = await axios.post('/api/users', apiDataWithoutConfirm, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        }
      }

      if (response && response.data.success) {
        setSnackbar({
          open: true,
          message: editingUser ? 'User updated successfully' : 'User created successfully',
          severity: 'success'
        });
        handleCloseDialog();
        fetchUsers(); // Refresh user list
      } else {
        setSnackbar({
          open: true,
          message: response?.data.message || 'Operation failed',
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error saving user',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.delete(`/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setSnackbar({
            open: true,
            message: 'User deleted successfully',
            severity: 'success'
          });
          fetchUsers(); // Refresh user list
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || 'Failed to delete user',
            severity: 'error'
          });
        }
      } catch (err: any) {
        console.error('Error deleting user:', err);
        setSnackbar({
          open: true,
          message: err.response?.data?.message || 'Error deleting user',
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'primary';
      case 'staff':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center', bgcolor: '#fff4f4' }}>
          <Typography color="error">{error}</Typography>
          <Button variant="outlined" color="primary" onClick={fetchUsers} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ 
          position: 'relative', 
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <TableContainer sx={{ 
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}>
            <Table stickyHeader aria-label="users table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Branch</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" sx={{ py: 2 }}>
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{user.name}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          color={user.role === 'super_admin' ? 'error' : 'primary'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{user.branch_name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          color={user.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(user)}
                            size="small"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteUser(user.id)}
                            size="small"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText={editingUser ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
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
                  onChange={handleSelectChange}
                >
                  <MenuItem value="">None</MenuItem>
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
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

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

export default UserManager;
