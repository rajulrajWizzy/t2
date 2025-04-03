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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

interface SeatingType {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  hourly_price_range?: string;
  daily_price_range?: string;
  monthly_price_range?: string;
  features?: string[];
  created_at: string;
  updated_at: string;
}

export default function SeatingTypesPage() {
  const [seatingTypes, setSeatingTypes] = useState<SeatingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<SeatingType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    hourly_price_range: '',
    daily_price_range: '',
    monthly_price_range: '',
    features: ''
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    // Check authentication status
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setIsAuthenticated(true);
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchSeatingTypes();
    }
  }, [isAuthenticated, token]);

  const fetchSeatingTypes = async () => {
    setLoading(true);
    try {
      // Fetch seating types from the API
      const response = await axios.get('/api/seating-types', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Seating types API response:', response.data);
      
      if (response.data && (response.data.success || Array.isArray(response.data))) {
        let seatingTypesData;
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          seatingTypesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          seatingTypesData = response.data.data;
        } else if (response.data.data && response.data.data.seatingTypes && Array.isArray(response.data.data.seatingTypes)) {
          seatingTypesData = response.data.data.seatingTypes;
        } else {
          console.error('Unexpected seating types data format:', response.data);
          seatingTypesData = [];
        }
        
        setSeatingTypes(seatingTypesData);
      } else {
        // Fallback to mock data if API returns empty or invalid data
        console.log('API returned invalid data, using mock data');
        setSeatingTypes(getMockSeatingTypes());
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching seating types:', err);
      // Use mock data as fallback
      console.log('Using mock seating types data due to error');
      setSeatingTypes(getMockSeatingTypes());
      setError('Failed to fetch seating types from the server. Showing sample data instead.');
      setLoading(false);
    }
  };

  const handleOpenDialog = (type: SeatingType | null = null) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        name: type.name,
        description: type.description,
        image_url: type.image_url || '',
        hourly_price_range: type.hourly_price_range || '',
        daily_price_range: type.daily_price_range || '',
        monthly_price_range: type.monthly_price_range || '',
        features: type.features ? type.features.join(', ') : ''
      });
    } else {
      setSelectedType(null);
      setFormData({
        name: '',
        description: '',
        image_url: '',
        hourly_price_range: '',
        daily_price_range: '',
        monthly_price_range: '',
        features: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const dataToSubmit = {
        ...formData,
        features: formData.features.split(',').map(feature => feature.trim()).filter(feature => feature)
      };
      
      if (selectedType) {
        // Update existing seating type
        const response = await axios.put(`/api/seating-types/${selectedType.id}`, dataToSubmit, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: 'Seating type updated successfully',
            severity: 'success'
          });
          fetchSeatingTypes();
          handleCloseDialog();
        } else {
          setError(response.data.message || 'Failed to update seating type');
        }
      } else {
        // Create new seating type
        const response = await axios.post('/api/seating-types', dataToSubmit, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: 'Seating type created successfully',
            severity: 'success'
          });
          fetchSeatingTypes();
          handleCloseDialog();
        } else {
          setError(response.data.message || 'Failed to create seating type');
        }
      }
    } catch (err: any) {
      console.error('Error saving seating type:', err);
      setError(err.response?.data?.message || 'Error saving seating type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this seating type?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(`/api/seating-types/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Seating type deleted successfully',
          severity: 'success'
        });
        fetchSeatingTypes();
      } else {
        setError(response.data.message || 'Failed to delete seating type');
      }
    } catch (err: any) {
      console.error('Error deleting seating type:', err);
      setError(err.response?.data?.message || 'Error deleting seating type');
    }
  };

  // Mock data function
  const getMockSeatingTypes = (): SeatingType[] => {
    return [
      {
        id: '1',
        name: 'Hot Desk',
        description: 'Flexible desk space available on a first-come, first-served basis',
        image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
        hourly_price_range: '$5 - $10',
        daily_price_range: '$25 - $40',
        monthly_price_range: '$200 - $350',
        features: ['High-speed WiFi', 'Access to common areas', 'Coffee & refreshments'],
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'Dedicated Desk',
        description: 'Your own permanent desk in a shared workspace',
        image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2',
        hourly_price_range: 'N/A',
        daily_price_range: '$40 - $60',
        monthly_price_range: '$350 - $500',
        features: ['Permanent desk', 'Storage locker', 'Mail handling', '24/7 access'],
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      },
      {
        id: '3',
        name: 'Private Office',
        description: 'Enclosed private office space for teams',
        image_url: 'https://images.unsplash.com/photo-1497215842964-222b430dc094',
        hourly_price_range: 'N/A',
        daily_price_range: '$80 - $150',
        monthly_price_range: '$800 - $2000',
        features: ['Private space', 'Meeting room credits', 'Business address', 'Phone booth access'],
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      },
      {
        id: '4',
        name: 'Meeting Room',
        description: 'Conference rooms for meetings and presentations',
        image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        hourly_price_range: '$20 - $50',
        daily_price_range: '$120 - $300',
        monthly_price_range: 'N/A',
        features: ['Video conferencing', 'Whiteboard', 'Display screen', 'Catering options'],
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z'
      }
    ];
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Seating Types
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleOpenDialog()}
          >
            Add New Seating Type
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
          <Grid container spacing={3}>
            {seatingTypes.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1">No seating types found</Typography>
                </Paper>
              </Grid>
            ) : (
              seatingTypes.map((type) => (
                <Grid item xs={12} md={6} lg={4} key={type.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {type.image_url && (
                      <CardMedia
                        component="img"
                        height="140"
                        image={type.image_url}
                        alt={type.name}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography gutterBottom variant="h5" component="div">
                          {type.name}
                        </Typography>
                        <Box>
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenDialog(type)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDelete(type.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {type.description}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Pricing
                      </Typography>
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        {type.hourly_price_range && (
                          <Grid item xs={12}>
                            <Typography variant="body2">
                              <strong>Hourly:</strong> {type.hourly_price_range}
                            </Typography>
                          </Grid>
                        )}
                        {type.daily_price_range && (
                          <Grid item xs={12}>
                            <Typography variant="body2">
                              <strong>Daily:</strong> {type.daily_price_range}
                            </Typography>
                          </Grid>
                        )}
                        {type.monthly_price_range && (
                          <Grid item xs={12}>
                            <Typography variant="body2">
                              <strong>Monthly:</strong> {type.monthly_price_range}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                      
                      {type.features && type.features.length > 0 && (
                        <>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Features
                          </Typography>
                          <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                            {type.features.map((feature, index) => (
                              <li key={index}>
                                <Typography variant="body2">{feature}</Typography>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Box>

      {/* Add/Edit Seating Type Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedType ? 'Edit Seating Type' : 'Add New Seating Type'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="image_url"
                label="Image URL"
                value={formData.image_url}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                placeholder="https://example.com/image.jpg"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="hourly_price_range"
                label="Hourly Price Range"
                value={formData.hourly_price_range}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                placeholder="$5 - $10"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="daily_price_range"
                label="Daily Price Range"
                value={formData.daily_price_range}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                placeholder="$25 - $40"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="monthly_price_range"
                label="Monthly Price Range"
                value={formData.monthly_price_range}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                placeholder="$200 - $350"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="features"
                label="Features (comma separated)"
                value={formData.features}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={2}
                placeholder="WiFi, Coffee, 24/7 Access"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedType ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity as any}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
