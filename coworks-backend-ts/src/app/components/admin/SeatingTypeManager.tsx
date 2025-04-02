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
import { SeatingType, SeatingTypeInput, SeatingTypeEnum } from '@/types/seating';

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
      console.log('Fetching seating types from API, page:', page + 1, 'limit:', rowsPerPage);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/seating-types?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Seating types API response:', response.data);
      
      // Handle different response structures
      if (response.data) {
        // Success response with data object containing seatingTypes array
        if (response.data.success && response.data.data && response.data.data.seatingTypes && Array.isArray(response.data.data.seatingTypes)) {
          console.log('Standard API format with pagination');
          setSeatingTypes(response.data.data.seatingTypes);
          setTotal(response.data.data.pagination?.total || response.data.data.seatingTypes.length);
        } 
        // Success response with data array directly
        else if (response.data.success && Array.isArray(response.data.data)) {
          console.log('API returned direct array in data field');
          setSeatingTypes(response.data.data);
          setTotal(response.data.data.length);
        } 
        // Direct array response
        else if (Array.isArray(response.data)) {
          console.log('API returned direct array');
          setSeatingTypes(response.data);
          setTotal(response.data.length);
        }
        // Object response that might contain a seatingTypes array
        else if (typeof response.data === 'object') {
          console.log('Searching for seatingTypes array in response object');
          // Look for any array property that might contain seating types
          const possibleArrays = Object.entries(response.data)
            .filter(([_, value]) => Array.isArray(value))
            .map(([key, value]) => ({ key, value }));
            
          if (possibleArrays.length > 0) {
            // Prioritize arrays that look like they contain seating types
            const seatingTypesArray = possibleArrays.find(arr => 
              arr.key.toLowerCase().includes('seat') || 
              arr.key.toLowerCase().includes('type')
            ) || possibleArrays[0];
            
            console.log(`Found array in property: ${seatingTypesArray.key}`);
            setSeatingTypes(seatingTypesArray.value as SeatingType[]);
            setTotal((seatingTypesArray.value as any[]).length);
          } else {
            console.error('Unexpected data format: no arrays found in response', response.data);
            setSeatingTypes([]);
            setTotal(0);
            setError('No seating types data found in server response');
          }
        } else {
          console.error('Completely unexpected data format:', response.data);
          setSeatingTypes([]);
          setTotal(0);
          setError('Unexpected data format received from the server');
        }
      } else {
        console.error('Empty response from server');
        setSeatingTypes([]);
        setTotal(0);
        setError('Empty response received from the server');
      }
    } catch (err: any) {
      console.error('Error fetching seating types:', err);
      
      // Handle different error types
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setError('Authentication error. Please log in again.');
        } else if (err.response.status === 404) {
          setError('Seating types endpoint not found. The API may be unavailable.');
        } else {
          setError(`Error ${err.response.status}: ${err.response.data?.message || 'Unknown error'}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response received from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error connecting to the server: ${err.message}`);
      }
      
      setSeatingTypes([]);
      setTotal(0);
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
      name: SeatingTypeEnum.HOT_DESK,
      description: 'Flexible workspace with hot desk option',
      hourly_rate: 150.00,
      daily_rate: 750.00,
      weekly_rate: 4500.00,
      monthly_rate: 15000.00,
      capacity: 1,
      is_meeting_room: false,
      is_active: true,
      is_hourly: true,
      min_booking_duration: 1,
      min_seats: 1,
      base_price: 150.00,
      quantity_options: [1, 2, 3, 5, 10],
      cost_multiplier: { ...DEFAULT_MULTIPLIERS }
    });
    
    // Set multiplier keys based on DEFAULT_MULTIPLIERS
    setMultiplierKeys(Object.keys(DEFAULT_MULTIPLIERS));
    
    setFormOpen(true);
  };
  
  // Open the form to edit an existing seating type
  const handleEditClick = (id: number) => {
    const seatingType = seatingTypes.find(type => type.id === id);
    
    if (seatingType) {
      setCurrentSeatingType({
        id: seatingType.id,
        name: seatingType.name,
        description: seatingType.description || '',
        hourly_rate: seatingType.hourly_rate,
        daily_rate: seatingType.daily_rate,
        weekly_rate: seatingType.weekly_rate,
        monthly_rate: seatingType.monthly_rate,
        capacity: seatingType.capacity,
        is_meeting_room: seatingType.is_meeting_room,
        is_active: seatingType.is_active,
        is_hourly: seatingType.is_hourly,
        min_booking_duration: seatingType.min_booking_duration,
        min_seats: seatingType.min_seats,
        base_price: seatingType.base_price,
        quantity_options: seatingType.quantity_options,
        cost_multiplier: seatingType.cost_multiplier || { ...DEFAULT_MULTIPLIERS }
      });
      
      // Set multiplier keys based on the seating type's cost_multiplier
      setMultiplierKeys(Object.keys(seatingType.cost_multiplier || DEFAULT_MULTIPLIERS));
    }
    
    setFormOpen(true);
    handleMenuClose();
  };
  
  // Open the delete confirmation dialog
  const handleDeleteClick = (id: number) => {
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
      // Convert string values to numbers for numeric fields
      if (['hourly_rate', 'daily_rate', 'weekly_rate', 'monthly_rate', 'base_price', 'min_booking_duration', 'min_seats', 'capacity'].includes(field) && typeof value === 'string') {
        const numValue = parseFloat(value);
        setCurrentSeatingType({
          ...currentSeatingType,
          [field]: isNaN(numValue) ? 0 : numValue
        });
      } else {
        setCurrentSeatingType({
          ...currentSeatingType,
          [field]: value
        });
      }
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
      }
      
      setMultiplierError(null);
      
      // Update the cost_multiplier object
      if (currentSeatingType.cost_multiplier) {
        const updatedMultipliers = { ...currentSeatingType.cost_multiplier };
        updatedMultipliers[key] = numValue; // Store as number, not string
        
        setCurrentSeatingType({
          ...currentSeatingType,
          cost_multiplier: updatedMultipliers
        });
      }
    }
  };
  
  // Add a new multiplier key
  const handleAddMultiplierKey = () => {
    if (!newMultiplierKey || multiplierKeys.includes(newMultiplierKey)) {
      setMultiplierError('Please enter a unique quantity value');
      return;
    }
    
    // Validate that the key is a positive number
    const numKey = parseInt(newMultiplierKey, 10);
    if (isNaN(numKey) || numKey <= 0) {
      setMultiplierError('Quantity must be a positive number');
      return;
    }
    
    setMultiplierError(null);
    
    // Add the new key to the list
    const updatedKeys = [...multiplierKeys, newMultiplierKey];
    setMultiplierKeys(updatedKeys);
    
    // Add a default value for the new key in the cost_multiplier object
    if (currentSeatingType && currentSeatingType.cost_multiplier) {
      const updatedMultipliers = { ...currentSeatingType.cost_multiplier };
      updatedMultipliers[newMultiplierKey] = 0.8; // Default value
      
      setCurrentSeatingType({
        ...currentSeatingType,
        cost_multiplier: updatedMultipliers
      });
    }
    
    // Clear the input
    setNewMultiplierKey('');
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
  
  // Handle form submission (create/update)
  const handleSubmit = async () => {
    if (!currentSeatingType) return;
    
    // Validate form
    if (!currentSeatingType.name) {
      setError('Name is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (currentSeatingType.id) {
        // Update existing seating type
        response = await axios.put(`/api/seating-types/${currentSeatingType.id}`, currentSeatingType, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        // Create new seating type
        response = await axios.post('/api/seating-types', currentSeatingType, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      
      if (response.data.success) {
        handleFormClose();
        fetchSeatingTypes();
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
  
  // Handle delete
  const handleDelete = async () => {
    if (!currentSeatingType?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.delete(`/api/seating-types/${currentSeatingType.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setDeleteDialogOpen(false);
        fetchSeatingTypes();
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
                  <TableCell>${type.base_price ? type.base_price.toFixed(2) : '0.00'}</TableCell>
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
                        {Object.entries(type.cost_multiplier || {}).map(([qty, multiplier]) => (
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
                        onClick={(e) => handleMenuOpen(e, type.id.toString())}
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
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => handleChangePage(event, newPage)}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Action menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedTypeId && handleEditClick(Number(selectedTypeId))}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedTypeId && handleDeleteClick(Number(selectedTypeId))}>
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