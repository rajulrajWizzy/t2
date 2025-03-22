import React, { useState, useEffect } from 'react';
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
  TextField,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  TablePagination,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { SeatingType, SeatingTypeInput } from '@/types/seating';

const DEFAULT_MULTIPLIERS = {
  '1': 1,
  '2': 0.95,
  '3': 0.9,
  '5': 0.85,
  '10': 0.8
};

const SeatingTypeManager: React.FC = () => {
  const { token, user } = useAuth();
  const [seatingTypes, setSeatingTypes] = useState<SeatingType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [currentSeatingType, setCurrentSeatingType] = useState<SeatingTypeInput | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  
  // Cost multiplier fields
  const [multiplierKeys, setMultiplierKeys] = useState<string[]>(['1', '2', '3', '5', '10']);
  const [newMultiplierKey, setNewMultiplierKey] = useState<string>('');
  const [multiplierError, setMultiplierError] = useState<string | null>(null);
  
  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Fetch seating types
  const fetchSeatingTypes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/admin/seating-types?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSeatingTypes(response.data.data.seatingTypes);
        setTotal(response.data.data.pagination.total);
      } else {
        setError(response.data.message || 'Failed to load seating types');
      }
    } catch (err: any) {
      console.error('Error fetching seating types:', err);
      setError('Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchSeatingTypes();
    }
  }, [token, page, rowsPerPage, searchTerm]);
  
  // Open the menu for a seating type
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedTypeId(id);
  };
  
  // Close the menu
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTypeId(null);
  };
  
  // Open the form to create a new seating type
  const handleAddClick = () => {
    setCurrentSeatingType({
      name: '',
      description: '',
      base_price: 0,
      capacity_options: {},
      quantity_options: {},
      cost_multiplier: { ...DEFAULT_MULTIPLIERS }
    });
    
    // Set multiplier keys based on DEFAULT_MULTIPLIERS
    setMultiplierKeys(Object.keys(DEFAULT_MULTIPLIERS));
    
    setFormOpen(true);
  };
  
  // Open the form to edit an existing seating type
  const handleEditClick = (id: string) => {
    const seatingType = seatingTypes.find(type => type.id === id);
    
    if (seatingType) {
      setCurrentSeatingType({
        id: seatingType.id,
        name: seatingType.name,
        description: seatingType.description || '',
        base_price: seatingType.base_price,
        capacity_options: seatingType.capacity_options || {},
        quantity_options: seatingType.quantity_options || {},
        cost_multiplier: seatingType.cost_multiplier || { ...DEFAULT_MULTIPLIERS }
      });
      
      // Set multiplier keys based on seatingType.cost_multiplier
      setMultiplierKeys(
        seatingType.cost_multiplier 
          ? Object.keys(seatingType.cost_multiplier) 
          : Object.keys(DEFAULT_MULTIPLIERS)
      );
    }
    
    setFormOpen(true);
    handleMenuClose();
  };
  
  // Open the delete confirmation dialog
  const handleDeleteClick = (id: string) => {
    const seatingType = seatingTypes.find(type => type.id === id);
    
    if (seatingType) {
      setCurrentSeatingType({
        id: seatingType.id,
        name: seatingType.name
      });
      setDeleteDialogOpen(true);
    }
    
    handleMenuClose();
  };
  
  // Close the form
  const handleFormClose = () => {
    setFormOpen(false);
    setCurrentSeatingType(null);
    setMultiplierError(null);
  };
  
  // Handle form field changes
  const handleInputChange = (field: keyof SeatingTypeInput, value: any) => {
    if (currentSeatingType) {
      setCurrentSeatingType({
        ...currentSeatingType,
        [field]: value
      });
    }
  };
  
  // Handle cost multiplier changes
  const handleMultiplierChange = (key: string, value: string) => {
    if (currentSeatingType) {
      const numValue = parseFloat(value);
      
      // Validate numeric values between 0-1
      if (isNaN(numValue) || numValue <= 0 || numValue > 1) {
        setMultiplierError('Multiplier must be a number between 0-1');
        return;
      } else {
        setMultiplierError(null);
      }
      
      const updatedMultipliers = {
        ...currentSeatingType.cost_multiplier,
        [key]: numValue
      };
      
      setCurrentSeatingType({
        ...currentSeatingType,
        cost_multiplier: updatedMultipliers
      });
    }
  };
  
  // Add a new multiplier key
  const handleAddMultiplierKey = () => {
    if (!newMultiplierKey || isNaN(parseInt(newMultiplierKey))) {
      setMultiplierError('Please enter a valid number');
      return;
    }
    
    if (multiplierKeys.includes(newMultiplierKey)) {
      setMultiplierError('This quantity already exists');
      return;
    }
    
    // Add the new key with default value 1
    const updatedKeys = [...multiplierKeys, newMultiplierKey].sort((a, b) => parseInt(a) - parseInt(b));
    setMultiplierKeys(updatedKeys);
    
    if (currentSeatingType) {
      const updatedMultipliers = {
        ...currentSeatingType.cost_multiplier,
        [newMultiplierKey]: 1
      };
      
      setCurrentSeatingType({
        ...currentSeatingType,
        cost_multiplier: updatedMultipliers
      });
    }
    
    setNewMultiplierKey('');
    setMultiplierError(null);
  };
  
  // Remove a multiplier key
  const handleRemoveMultiplierKey = (key: string) => {
    const updatedKeys = multiplierKeys.filter(k => k !== key);
    setMultiplierKeys(updatedKeys);
    
    if (currentSeatingType && currentSeatingType.cost_multiplier) {
      const updatedMultipliers = { ...currentSeatingType.cost_multiplier };
      delete updatedMultipliers[key];
      
      setCurrentSeatingType({
        ...currentSeatingType,
        cost_multiplier: updatedMultipliers
      });
    }
  };
  
  // Submit the form to create/update a seating type
  const handleSubmit = async () => {
    if (!currentSeatingType) return;
    
    if (!currentSeatingType.name) {
      setError('Name is required');
      return;
    }
    
    if (multiplierError) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (currentSeatingType.id) {
        // Update existing seating type
        response = await axios.put(
          `/api/admin/seating-types/${currentSeatingType.id}`,
          currentSeatingType,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      } else {
        // Create new seating type
        response = await axios.post(
          '/api/admin/seating-types',
          currentSeatingType,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      
      if (response.data.success) {
        fetchSeatingTypes();
        handleFormClose();
      } else {
        setError(response.data.message || 'Failed to save seating type');
      }
    } catch (err: any) {
      console.error('Error saving seating type:', err);
      setError(err.response?.data?.message || 'Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a seating type
  const handleDelete = async () => {
    if (!currentSeatingType || !currentSeatingType.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.delete(
        `/api/admin/seating-types/${currentSeatingType.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        fetchSeatingTypes();
        setDeleteDialogOpen(false);
        setCurrentSeatingType(null);
      } else {
        setError(response.data.message || 'Failed to delete seating type');
      }
    } catch (err: any) {
      console.error('Error deleting seating type:', err);
      setError(err.response?.data?.message || 'Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pagination changes
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchSeatingTypes();
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Seating Types
        </Typography>
        
        {isSuperAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add Seating Type
          </Button>
        )}
      </Box>
      
      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <form onSubmit={handleSearch}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search seating types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton type="submit" edge="end">
                  <SearchIcon />
                </IconButton>
              )
            }}
            size="small"
          />
        </form>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Seating types table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Base Price</TableCell>
              <TableCell>Capacity Options</TableCell>
              <TableCell>Quantity Options</TableCell>
              <TableCell>Cost Multipliers</TableCell>
              {isSuperAdmin && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !seatingTypes.length ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 7 : 6} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : seatingTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 7 : 6} align="center">
                  No seating types found
                </TableCell>
              </TableRow>
            ) : (
              seatingTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.name}</TableCell>
                  <TableCell>{type.description || 'N/A'}</TableCell>
                  <TableCell>${type.base_price.toFixed(2)}</TableCell>
                  <TableCell>
                    {type.capacity_options && Object.keys(type.capacity_options).length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(type.capacity_options).map(([key, value]) => (
                          <Chip 
                            key={key}
                            size="small"
                            label={`${key}: ${value}`}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {type.quantity_options && type.quantity_options.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {type.quantity_options.map((qty: number) => (
                          <Chip 
                            key={qty}
                            size="small"
                            label={qty}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {type.cost_multiplier && Object.keys(type.cost_multiplier).length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(type.cost_multiplier).map(([qty, multiplier]) => (
                          <Chip 
                            key={qty}
                            size="small"
                            label={`${qty}: ${multiplier}x`}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, type.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Action menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedTypeId && handleEditClick(selectedTypeId)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedTypeId && handleDeleteClick(selectedTypeId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Create/Edit form dialog */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentSeatingType?.id ? 'Edit Seating Type' : 'Create Seating Type'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={currentSeatingType?.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Price"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={currentSeatingType?.base_price || 0}
                onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value))}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={currentSeatingType?.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Cost Multipliers
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Set discount multipliers for different quantity options (1 = no discount, 0.9 = 10% discount)
              </Typography>
              
              {multiplierError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {multiplierError}
                </Alert>
              )}
              
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label="Quantity"
                  size="small"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={newMultiplierKey}
                  onChange={(e) => setNewMultiplierKey(e.target.value)}
                  sx={{ width: 100 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddMultiplierKey}
                >
                  Add
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                {multiplierKeys.map((key) => (
                  <Grid item xs={6} sm={4} key={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        fullWidth
                        label={`Quantity ${key}`}
                        type="number"
                        inputProps={{ min: 0.01, max: 1, step: 0.01 }}
                        value={currentSeatingType?.cost_multiplier?.[key] || 1}
                        onChange={(e) => handleMultiplierChange(key, e.target.value)}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMultiplierKey(key)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFormClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading || !!multiplierError}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Seating Type</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the seating type "{currentSeatingType?.name}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Warning: This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDelete} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatingTypeManager; 