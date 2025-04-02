'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Divider,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  EventSeat as SeatIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

// Mock data for branches
const mockBranches = [
  {
    id: 'b1',
    name: 'Downtown Branch',
    short_code: 'DT001',
    location: '123 Main St, Downtown',
    address: '123 Main St, Downtown, City, 10001',
    description: 'Our flagship location in the heart of downtown with premium amenities.',
    contact_email: 'downtown@coworks.com',
    contact_phone: '+1234567890',
    is_active: true,
    capacity: 120,
    occupancy_rate: 85,
    total_seats: 120,
    available_seats: 18,
    total_bookings: 450,
    active_bookings: 102,
    monthly_revenue: 75000,
    longitude: -73.9857,
    latitude: 40.7484,
    created_at: '2023-01-15T10:00:00Z',
    managers: [
      { id: 2, name: 'Branch Admin 1', email: 'branchadmin1@example.com' }
    ]
  },
  {
    id: 'b2',
    name: 'Westside Branch',
    short_code: 'WS002',
    location: '456 West Ave, Westside',
    address: '456 West Ave, Westside, City, 10002',
    description: 'Modern workspace with a focus on technology startups.',
    contact_email: 'westside@coworks.com',
    contact_phone: '+1987654321',
    is_active: true,
    capacity: 85,
    occupancy_rate: 92,
    total_seats: 85,
    available_seats: 7,
    total_bookings: 320,
    active_bookings: 78,
    monthly_revenue: 62000,
    longitude: -74.0060,
    latitude: 40.7128,
    created_at: '2023-02-20T14:30:00Z',
    managers: [
      { id: 3, name: 'Branch Admin 2', email: 'branchadmin2@example.com' }
    ]
  },
  {
    id: 'b3',
    name: 'North Campus',
    short_code: 'NC003',
    location: '789 North Blvd, Northside',
    address: '789 North Blvd, Northside, City, 10003',
    description: 'Spacious campus-style workspace with outdoor areas.',
    contact_email: 'north@coworks.com',
    contact_phone: '+1122334455',
    is_active: true,
    capacity: 150,
    occupancy_rate: 78,
    total_seats: 150,
    available_seats: 33,
    total_bookings: 520,
    active_bookings: 117,
    monthly_revenue: 89000,
    longitude: -73.9654,
    latitude: 40.8116,
    created_at: '2023-03-10T09:15:00Z',
    managers: []
  },
  {
    id: 'b4',
    name: 'East Village Office',
    short_code: 'EV004',
    location: '321 East St, East Village',
    address: '321 East St, East Village, City, 10004',
    description: 'Boutique coworking space with a creative atmosphere.',
    contact_email: 'eastvillage@coworks.com',
    contact_phone: '+1555666777',
    is_active: false,
    capacity: 75,
    occupancy_rate: 0,
    total_seats: 75,
    available_seats: 75,
    total_bookings: 180,
    active_bookings: 0,
    monthly_revenue: 0,
    longitude: -73.9400,
    latitude: 40.7264,
    created_at: '2023-04-05T11:45:00Z',
    managers: []
  }
];

export default function AllBranchesPage() {
  const { isAuthenticated, token, user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    location: '',
    address: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    is_active: true,
    longitude: '',
    latitude: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBranches();
    }
  }, [isAuthenticated, token]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch branches from your API
      // For now, we'll use mock data
      const response = await axios.get('/api/admin/branches', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Check if the API returns data, otherwise use mock data
      if (response.data && response.data.branches && response.data.branches.length > 0) {
        setBranches(response.data.branches);
      } else {
        console.log('Using mock branch data');
        setBranches(mockBranches);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching branches:', err);
      // Use mock data as fallback
      console.log('Using mock branch data due to error');
      setBranches(mockBranches);
      setError('Failed to fetch branches from the server. Showing sample data instead.');
      setLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleAddBranch = () => {
    setCurrentBranch(null);
    setFormData({
      name: '',
      short_code: '',
      location: '',
      address: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      is_active: true,
      longitude: '',
      latitude: ''
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleEditBranch = (branch) => {
    setCurrentBranch(branch);
    setFormData({
      name: branch.name,
      short_code: branch.short_code,
      location: branch.location,
      address: branch.address || branch.location,
      description: branch.description || '',
      contact_email: branch.contact_email || '',
      contact_phone: branch.contact_phone || '',
      is_active: branch.is_active,
      longitude: branch.longitude ? String(branch.longitude) : '',
      latitude: branch.latitude ? String(branch.latitude) : ''
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Branch name is required';
    }
    
    if (!formData.short_code.trim()) {
      errors.short_code = 'Short code is required';
    }
    
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }
    
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      errors.contact_email = 'Invalid email format';
    }
    
    if (formData.longitude && (isNaN(Number(formData.longitude)) || Number(formData.longitude) < -180 || Number(formData.longitude) > 180)) {
      errors.longitude = 'Longitude must be a number between -180 and 180';
    }
    
    if (formData.latitude && (isNaN(Number(formData.latitude)) || Number(formData.latitude) < -90 || Number(formData.latitude) > 90)) {
      errors.latitude = 'Latitude must be a number between -90 and 90';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      if (currentBranch) {
        // Update existing branch
        await axios.put(`/api/admin/branches/${currentBranch.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Update local state
        setBranches(branches.map(branch => 
          branch.id === currentBranch.id 
            ? { ...branch, ...formData, longitude: formData.longitude ? Number(formData.longitude) : null, latitude: formData.latitude ? Number(formData.latitude) : null } 
            : branch
        ));
        
        setSuccessMessage('Branch updated successfully!');
      } else {
        // Create new branch
        const response = await axios.post('/api/admin/branches', formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Add new branch to local state
        const newBranch = response.data.data || {
          ...formData,
          id: `b${branches.length + 1}`,
          created_at: new Date().toISOString(),
          longitude: formData.longitude ? Number(formData.longitude) : null,
          latitude: formData.latitude ? Number(formData.latitude) : null,
          managers: []
        };
        
        setBranches([...branches, newBranch]);
        setSuccessMessage('Branch created successfully!');
      }
      
      setSnackbarOpen(true);
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving branch:', err);
      setFormErrors({
        ...formErrors,
        submit: 'Failed to save branch. Please try again.'
      });
    }
  };

  const handleToggleStatus = async (branch) => {
    try {
      await axios.patch(`/api/admin/branches/${branch.id}/status`, 
        { is_active: !branch.is_active },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update local state
      setBranches(branches.map(b => 
        b.id === branch.id 
          ? { ...b, is_active: !b.is_active } 
          : b
      ));
      
      setSuccessMessage(`Branch ${branch.is_active ? 'deactivated' : 'activated'} successfully!`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error toggling branch status:', err);
      setError(`Failed to ${branch.is_active ? 'deactivate' : 'activate'} branch. Please try again.`);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Filter branches based on search query and status filter
  const filteredBranches = branches.filter(branch => {
    // Apply status filter
    if (statusFilter === 'active' && !branch.is_active) return false;
    if (statusFilter === 'inactive' && branch.is_active) return false;
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        branch.name.toLowerCase().includes(query) ||
        branch.short_code.toLowerCase().includes(query) ||
        branch.location.toLowerCase().includes(query) ||
        (branch.description && branch.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Paginate branches for table view
  const paginatedBranches = filteredBranches.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        All Branches
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search branches"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="all">All Branches</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" justifyContent="center">
              <Button
                variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                onClick={() => handleViewModeChange('grid')}
                sx={{ mr: 1 }}
              >
                Grid View
              </Button>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => handleViewModeChange('table')}
              >
                Table View
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddBranch}
            >
              Add Branch
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredBranches.length > 0 ? (
            filteredBranches.map((branch) => (
              <Grid item xs={12} md={6} lg={4} key={branch.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    opacity: branch.is_active ? 1 : 0.7
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6" component="div">
                        {branch.name}
                      </Typography>
                      <Chip 
                        label={branch.is_active ? 'Active' : 'Inactive'} 
                        color={branch.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography color="text.secondary" gutterBottom>
                      {branch.short_code}
                    </Typography>
                    <Box display="flex" alignItems="center" mb={1}>
                      <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{branch.location}</Typography>
                    </Box>
                    {branch.contact_email && (
                      <Box display="flex" alignItems="center" mb={1}>
                        <EmailIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">{branch.contact_email}</Typography>
                      </Box>
                    )}
                    {branch.contact_phone && (
                      <Box display="flex" alignItems="center" mb={1}>
                        <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">{branch.contact_phone}</Typography>
                      </Box>
                    )}
                    {branch.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {branch.description}
                      </Typography>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <SeatIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            <strong>{branch.total_seats}</strong> seats
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <PeopleIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            <strong>{branch.occupancy_rate}%</strong> occupied
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <BusinessIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            <strong>{branch.active_bookings}</strong> active bookings
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <MoneyIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            <strong>${branch.monthly_revenue.toLocaleString()}</strong> monthly
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => handleEditBranch(branch)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      color={branch.is_active ? 'error' : 'success'}
                      onClick={() => handleToggleStatus(branch)}
                    >
                      {branch.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button 
                      size="small" 
                      component="a"
                      href={`/admin/branch/${branch.id}`}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6">No branches found</Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search criteria or add a new branch.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Seats</TableCell>
                  <TableCell>Occupancy</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBranches.length > 0 ? (
                  paginatedBranches.map((branch) => (
                    <TableRow key={branch.id} hover>
                      <TableCell>{branch.name}</TableCell>
                      <TableCell>{branch.short_code}</TableCell>
                      <TableCell>{branch.location}</TableCell>
                      <TableCell>{branch.total_seats}</TableCell>
                      <TableCell>{branch.occupancy_rate}%</TableCell>
                      <TableCell>${branch.monthly_revenue.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={branch.is_active ? 'Active' : 'Inactive'} 
                          color={branch.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditBranch(branch)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color={branch.is_active ? 'error' : 'success'}
                          onClick={() => handleToggleStatus(branch)}
                        >
                          {branch.is_active ? <DeleteIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                        </IconButton>
                        <Button 
                          size="small" 
                          component="a"
                          href={`/admin/branch/${branch.id}`}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No branches found matching the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredBranches.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
      
      {/* Branch Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentBranch ? `Edit Branch: ${currentBranch.name}` : 'Add New Branch'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Branch Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Short Code"
                name="short_code"
                value={formData.short_code}
                onChange={handleInputChange}
                error={!!formErrors.short_code}
                helperText={formErrors.short_code}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                error={!!formErrors.location}
                helperText={formErrors.location}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                error={!!formErrors.address}
                helperText={formErrors.address}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleInputChange}
                error={!!formErrors.contact_email}
                helperText={formErrors.contact_email}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                error={!!formErrors.contact_phone}
                helperText={formErrors.contact_phone}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                error={!!formErrors.longitude}
                helperText={formErrors.longitude || 'Decimal degrees (e.g., -73.9857)'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                error={!!formErrors.latitude}
                helperText={formErrors.latitude || 'Decimal degrees (e.g., 40.7484)'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    name="is_active"
                    color="primary"
                  />
                }
                label="Branch is active"
              />
            </Grid>
            {formErrors.submit && (
              <Grid item xs={12}>
                <Alert severity="error">{formErrors.submit}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {currentBranch ? 'Update Branch' : 'Create Branch'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Container>
  );
}
