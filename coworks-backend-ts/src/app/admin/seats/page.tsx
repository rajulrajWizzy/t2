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

interface Seat {
  id: string;
  name: string;
  type: string;
  status: string;
  branch_id: string;
  branch_name: string;
  price_hourly: number;
  price_daily: number;
  price_monthly: number;
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: string;
  name: string;
}

interface SeatingType {
  id: string;
  name: string;
  description: string;
}

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [seatingTypes, setSeatingTypes] = useState<SeatingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    branch_id: '',
    price_hourly: 0,
    price_daily: 0,
    price_monthly: 0,
    status: 'available'
  });

  useEffect(() => {
    fetchSeats();
    fetchBranches();
    fetchSeatingTypes();
  }, []);

  const fetchSeats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/seats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSeats(response.data.data.seats || []);
      } else {
        setError(response.data.message || 'Failed to fetch seats');
        // Use mock data if API fails
        setSeats(getMockSeats());
      }
    } catch (err: any) {
      console.error('Error fetching seats:', err);
      setError('Error fetching seats. Using sample data.');
      // Use mock data if API fails
      setSeats(getMockSeats());
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/branches', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setBranches(response.data.data.branches || []);
      } else {
        console.error('Failed to fetch branches:', response.data.message);
        // Use mock data if API fails
        setBranches(getMockBranches());
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      // Use mock data if API fails
      setBranches(getMockBranches());
    }
  };

  const fetchSeatingTypes = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/seating-types', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSeatingTypes(response.data.data.seatingTypes || []);
      } else {
        console.error('Failed to fetch seating types:', response.data.message);
        // Use mock data if API fails
        setSeatingTypes(getMockSeatingTypes());
      }
    } catch (err) {
      console.error('Error fetching seating types:', err);
      // Use mock data if API fails
      setSeatingTypes(getMockSeatingTypes());
    }
  };

  const handleOpenDialog = (seat: Seat | null = null) => {
    if (seat) {
      setSelectedSeat(seat);
      setFormData({
        name: seat.name,
        type: seat.type,
        branch_id: seat.branch_id,
        price_hourly: seat.price_hourly,
        price_daily: seat.price_daily,
        price_monthly: seat.price_monthly,
        status: seat.status
      });
    } else {
      setSelectedSeat(null);
      setFormData({
        name: '',
        type: '',
        branch_id: '',
        price_hourly: 0,
        price_daily: 0,
        price_monthly: 0,
        status: 'available'
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
      
      if (selectedSeat) {
        // Update existing seat
        const response = await axios.put(`/api/admin/seats/${selectedSeat.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          fetchSeats();
          handleCloseDialog();
        } else {
          setError(response.data.message || 'Failed to update seat');
        }
      } else {
        // Create new seat
        const response = await axios.post('/api/admin/seats', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          fetchSeats();
          handleCloseDialog();
        } else {
          setError(response.data.message || 'Failed to create seat');
        }
      }
    } catch (err: any) {
      console.error('Error saving seat:', err);
      setError(err.response?.data?.message || 'Error saving seat');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'success';
      case 'occupied':
        return 'error';
      case 'maintenance':
        return 'warning';
      case 'reserved':
        return 'info';
      default:
        return 'default';
    }
  };

  // Mock data functions
  const getMockSeats = (): Seat[] => {
    return [
      {
        id: '1',
        name: 'Desk A1',
        type: 'Hot Desk',
        status: 'available',
        branch_id: '1',
        branch_name: 'Downtown Branch',
        price_hourly: 5,
        price_daily: 25,
        price_monthly: 300,
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'Office 101',
        type: 'Private Office',
        status: 'occupied',
        branch_id: '1',
        branch_name: 'Downtown Branch',
        price_hourly: 15,
        price_daily: 80,
        price_monthly: 1200,
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      },
      {
        id: '3',
        name: 'Desk B3',
        type: 'Dedicated Desk',
        status: 'maintenance',
        branch_id: '2',
        branch_name: 'Uptown Branch',
        price_hourly: 8,
        price_daily: 40,
        price_monthly: 500,
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      },
      {
        id: '4',
        name: 'Meeting Room A',
        type: 'Meeting Room',
        status: 'reserved',
        branch_id: '2',
        branch_name: 'Uptown Branch',
        price_hourly: 20,
        price_daily: 120,
        price_monthly: 0,
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      }
    ];
  };

  const getMockBranches = (): Branch[] => {
    return [
      { id: '1', name: 'Downtown Branch' },
      { id: '2', name: 'Uptown Branch' },
      { id: '3', name: 'West End Branch' }
    ];
  };

  const getMockSeatingTypes = (): SeatingType[] => {
    return [
      { id: '1', name: 'Hot Desk', description: 'Flexible desk space' },
      { id: '2', name: 'Dedicated Desk', description: 'Permanent desk space' },
      { id: '3', name: 'Private Office', description: 'Enclosed private office' },
      { id: '4', name: 'Meeting Room', description: 'Conference room for meetings' }
    ];
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Seats Management
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleOpenDialog()}
          >
            Add New Seat
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
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Hourly Price</TableCell>
                  <TableCell>Daily Price</TableCell>
                  <TableCell>Monthly Price</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {seats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No seats found
                    </TableCell>
                  </TableRow>
                ) : (
                  seats.map((seat) => (
                    <TableRow key={seat.id}>
                      <TableCell>{seat.name}</TableCell>
                      <TableCell>{seat.type}</TableCell>
                      <TableCell>{seat.branch_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={seat.status} 
                          color={getStatusColor(seat.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(seat.price_hourly)}</TableCell>
                      <TableCell>{formatCurrency(seat.price_daily)}</TableCell>
                      <TableCell>{formatCurrency(seat.price_monthly)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleOpenDialog(seat)}
                        >
                          Edit
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

      {/* Add/Edit Seat Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedSeat ? 'Edit Seat' : 'Add New Seat'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Seat Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  label="Type"
                >
                  {seatingTypes.map((type) => (
                    <MenuItem key={type.id} value={type.name}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Branch</InputLabel>
                <Select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleInputChange}
                  label="Branch"
                >
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </MenuItem>
                  ))}
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
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="occupied">Occupied</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="reserved">Reserved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="price_hourly"
                label="Hourly Price ($)"
                type="number"
                value={formData.price_hourly}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="price_daily"
                label="Daily Price ($)"
                type="number"
                value={formData.price_daily}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="price_monthly"
                label="Monthly Price ($)"
                type="number"
                value={formData.price_monthly}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedSeat ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
