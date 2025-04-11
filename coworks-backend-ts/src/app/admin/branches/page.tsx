'use client';

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
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Tooltip,
  Grid,
  InputAdornment,
  Switch,
  FormControlLabel,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Image as ImageIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { branchesApi } from '@/utils/admin-api';

// Branch type definition
interface Branch {
  id: string | number;
  name: string;
  address: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  image_url?: string;
  total_seats?: number;
  available_seats?: number;
  created_at: string;
  short_code?: string;
}

export default function BranchesPage() {
  // State for branch list and pagination
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  
  // State for branch form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    address: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Load branches on initial render and when search/page changes
  useEffect(() => {
    loadBranches();
  }, [page, search]);
  
  // Load branches from API
  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await branchesApi.getAll({
        page,
        limit,
        search: search.trim() || undefined
      });
      
      if (response.success) {
        setBranches(response.data || []);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        setError(response.message || 'Failed to load branches');
        setBranches([]);
      }
    } catch (err: any) {
      console.error('Error loading branches:', err);
      setError(err.message || 'Failed to load branches');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    // Reset to first page when search changes
    setPage(1);
  };
  
  // Handle search submit
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    loadBranches();
  };
  
  // Open dialog to add new branch
  const handleAddClick = () => {
    setDialogMode('add');
    setCurrentBranch(null);
    setFormData({
      name: '',
      short_code: '',
      address: '',
      location: '',
      contact_email: '',
      contact_phone: '',
      is_active: true
    });
    setFormErrors({});
    setDialogOpen(true);
  };
  
  // Open dialog to edit branch
  const handleEditClick = (branch: Branch) => {
    setDialogMode('edit');
    setCurrentBranch(branch);
    setFormData({
      name: branch.name || '',
      short_code: branch.short_code || '',
      address: branch.address || '',
      location: branch.location || '',
      contact_email: branch.contact_email || '',
      contact_phone: branch.contact_phone || '',
      is_active: branch.is_active
    });
    setFormErrors({});
    setDialogOpen(true);
  };
  
  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  
  // Handle form input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    
    // Use checked for checkbox/switch inputs, value for others
    const inputValue = type === 'checkbox' ? checked : value;
    
    setFormData({
      ...formData,
      [name]: inputValue
    });
    
    // Clear error for this field when changed
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Branch name is required';
    }
    
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      errors.contact_email = 'Invalid email format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      let response;
      
      if (dialogMode === 'add') {
        response = await branchesApi.create(formData);
      } else if (currentBranch) {
        response = await branchesApi.update(currentBranch.id.toString(), formData);
      }
      
      if (response?.success) {
        setDialogOpen(false);
        loadBranches();
      } else {
        setError(response?.message || 'Failed to save branch');
      }
    } catch (err: any) {
      console.error('Error saving branch:', err);
      setError(err.message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setBranchToDelete(null);
  };
  
  // Delete branch
  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;
    
    setDeleting(true);
    
    try {
      const response = await branchesApi.delete(branchToDelete.id.toString());
      
      if (response.success) {
        setDeleteDialogOpen(false);
        loadBranches();
      } else {
        setError(response.message || 'Failed to delete branch');
      }
    } catch (err: any) {
      console.error('Error deleting branch:', err);
      setError(err.message || 'Failed to delete branch');
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Branches
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add Branch
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box component="form" onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                placeholder="Search branches..."
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => loadBranches()} edge="end">
                        <RefreshIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Seats</TableCell>
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
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No branches found
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch) => (
                <TableRow key={branch.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {branch.image_url ? (
                        <Box
                          component="img"
                          src={branch.image_url}
                          alt={branch.name}
                          sx={{ width: 40, height: 40, borderRadius: 1, mr: 1, objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 1, 
                            mr: 1, 
                            bgcolor: 'primary.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <LocationIcon sx={{ color: 'white' }} />
                        </Box>
                      )}
                      <Typography variant="body1">{branch.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{branch.short_code || '-'}</TableCell>
                  <TableCell>{branch.address}</TableCell>
                  <TableCell>
                    {branch.contact_email && (
                      <Typography variant="body2" noWrap>{branch.contact_email}</Typography>
                    )}
                    {branch.contact_phone && (
                      <Typography variant="body2" color="textSecondary" noWrap>
                        {branch.contact_phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={branch.is_active ? 'Active' : 'Inactive'} 
                      color={branch.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {branch.total_seats !== undefined ? (
                      <Typography variant="body2">
                        {branch.available_seats !== undefined ? (
                          <>{branch.available_seats} / {branch.total_seats} available</>
                        ) : (
                          <>{branch.total_seats} total</>
                        )}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditClick(branch)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(branch)} color="error">
                        <DeleteIcon />
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
      
      {/* Branch Form Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Branch' : 'Edit Branch'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Branch Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Short Code"
                  name="short_code"
                  value={formData.short_code}
                  onChange={handleInputChange}
                  error={!!formErrors.short_code}
                  helperText={formErrors.short_code}
                  margin="normal"
                  placeholder="e.g. B001"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  error={!!formErrors.address}
                  helperText={formErrors.address}
                  required
                  margin="normal"
                  multiline
                  rows={2}
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
                  margin="normal"
                  placeholder="e.g. Downtown, Central District"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  error={!!formErrors.contact_email}
                  helperText={formErrors.contact_email}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  error={!!formErrors.contact_phone}
                  helperText={formErrors.contact_phone}
                  margin="normal"
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
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the branch "{branchToDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 