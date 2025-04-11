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
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Image as ImageIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { seatingTypesApi, SeatingType } from '@/utils/admin-api';

export default function SeatingTypesPage() {
  // State for seating types list and pagination
  const [seatingTypes, setSeatingTypes] = useState<SeatingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  
  // State for seating type form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentSeatingType, setCurrentSeatingType] = useState<SeatingType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    description: '',
    hourly_rate: 0,
    daily_rate: 0,
    monthly_rate: 0,
    is_active: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<SeatingType | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Load seating types on initial render and when search/page changes
  useEffect(() => {
    loadSeatingTypes();
  }, [page, search]);
  
  // Load seating types from API
  const loadSeatingTypes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await seatingTypesApi.getAll({
        page,
        limit,
        search: search.trim() || undefined
      });
      
      if (response.success) {
        setSeatingTypes(response.data || []);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        setError(response.message || 'Failed to load seating types');
        setSeatingTypes([]);
      }
    } catch (err: any) {
      console.error('Error loading seating types:', err);
      setError(err.message || 'Failed to load seating types');
      setSeatingTypes([]);
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
    loadSeatingTypes();
  };
  
  // Open dialog to add new seating type
  const handleAddClick = () => {
    setDialogMode('add');
    setCurrentSeatingType(null);
    setFormData({
      name: '',
      short_code: '',
      description: '',
      hourly_rate: 0,
      daily_rate: 0,
      monthly_rate: 0,
      is_active: true
    });
    setFormErrors({});
    setDialogOpen(true);
  };
  
  // Open dialog to edit seating type
  const handleEditClick = (type: SeatingType) => {
    setDialogMode('edit');
    setCurrentSeatingType(type);
    setFormData({
      name: type.name || '',
      short_code: type.short_code || '',
      description: type.description || '',
      hourly_rate: type.hourly_rate || 0,
      daily_rate: type.daily_rate || 0,
      monthly_rate: type.monthly_rate || 0,
      is_active: type.is_active
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
    
    // Convert to number for rate fields
    if (name.includes('rate')) {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: inputValue
      });
    }
    
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
      errors.name = 'Name is required';
    }
    
    if (!formData.short_code.trim()) {
      errors.short_code = 'Short code is required';
    }
    
    if (formData.hourly_rate < 0) {
      errors.hourly_rate = 'Rate cannot be negative';
    }
    
    if (formData.daily_rate < 0) {
      errors.daily_rate = 'Rate cannot be negative';
    }
    
    if (formData.monthly_rate < 0) {
      errors.monthly_rate = 'Rate cannot be negative';
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
        response = await seatingTypesApi.create(formData);
      } else if (currentSeatingType) {
        response = await seatingTypesApi.update(currentSeatingType.id.toString(), formData);
      }
      
      if (response?.success) {
        setDialogOpen(false);
        loadSeatingTypes();
      } else {
        setError(response?.message || 'Failed to save seating type');
      }
    } catch (err: any) {
      console.error('Error saving seating type:', err);
      setError(err.message || 'Failed to save seating type');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (type: SeatingType) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setTypeToDelete(null);
  };
  
  // Delete seating type
  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;
    
    setDeleting(true);
    
    try {
      const response = await seatingTypesApi.delete(typeToDelete.id.toString());
      
      if (response.success) {
        setDeleteDialogOpen(false);
        loadSeatingTypes();
      } else {
        setError(response.message || 'Failed to delete seating type');
      }
    } catch (err: any) {
      console.error('Error deleting seating type:', err);
      setError(err.message || 'Failed to delete seating type');
    } finally {
      setDeleting(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Seating Types
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add Seating Type
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
                placeholder="Search seating types..."
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
                      <IconButton onClick={() => loadSeatingTypes()} edge="end">
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
              <TableCell>Description</TableCell>
              <TableCell>Hourly Rate</TableCell>
              <TableCell>Daily Rate</TableCell>
              <TableCell>Monthly Rate</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : seatingTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No seating types found
                </TableCell>
              </TableRow>
            ) : (
              seatingTypes.map((type) => (
                <TableRow key={type.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {type.image_url ? (
                        <Box
                          component="img"
                          src={type.image_url}
                          alt={type.name}
                          sx={{ width: 40, height: 40, borderRadius: 1, mr: 1, objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 1, 
                            mr: 1, 
                            bgcolor: 'secondary.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <CategoryIcon sx={{ color: 'white' }} />
                        </Box>
                      )}
                      <Typography variant="body1">{type.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{type.short_code}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {type.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatCurrency(type.hourly_rate)}</TableCell>
                  <TableCell>{formatCurrency(type.daily_rate)}</TableCell>
                  <TableCell>{formatCurrency(type.monthly_rate)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={type.is_active ? 'Active' : 'Inactive'} 
                      color={type.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditClick(type)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(type)} color="error">
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
      
      {/* Seating Type Form Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Seating Type' : 'Edit Seating Type'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Name"
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
                  required
                  margin="normal"
                  placeholder="e.g. HD"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Hourly Rate"
                  name="hourly_rate"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  error={!!formErrors.hourly_rate}
                  helperText={formErrors.hourly_rate}
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Daily Rate"
                  name="daily_rate"
                  type="number"
                  value={formData.daily_rate}
                  onChange={handleInputChange}
                  error={!!formErrors.daily_rate}
                  helperText={formErrors.daily_rate}
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Monthly Rate"
                  name="monthly_rate"
                  type="number"
                  value={formData.monthly_rate}
                  onChange={handleInputChange}
                  error={!!formErrors.monthly_rate}
                  helperText={formErrors.monthly_rate}
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
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
            Are you sure you want to delete the seating type "{typeToDelete?.name}"?
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