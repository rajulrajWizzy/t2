'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  VpnKey as VpnKeyIcon,
  AdminPanelSettings as AdminIcon,
  EventNote as EventNoteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, isAuthenticated, token } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [isAuthenticated, token]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch profile data from your API
      // For now, we'll use mock data based on the user from AuthContext
      setTimeout(() => {
        if (user) {
          const mockProfileData = {
            id: user.id || 1,
            name: user.name || 'Admin User',
            email: user.email || 'admin@example.com',
            phone: user.phone || '+1234567890',
            role: user.role || 'super_admin',
            branch: user.branch || 'All Branches',
            created_at: user.created_at || '2023-01-15T10:00:00Z',
            last_login: new Date().toISOString(),
            permissions: user.permissions || {
              branches: ['view', 'create', 'update', 'delete'],
              users: ['view', 'create', 'update', 'delete'],
              bookings: ['view', 'create', 'update', 'delete']
            },
            activity_log: [
              { action: 'Login', timestamp: new Date().toISOString(), ip: '192.168.1.1' },
              { action: 'Updated User #105', timestamp: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1' },
              { action: 'Created Branch #B4', timestamp: new Date(Date.now() - 172800000).toISOString(), ip: '192.168.1.1' }
            ]
          };
          
          setProfileData(mockProfileData);
          setFormData({
            ...formData,
            name: mockProfileData.name,
            email: mockProfileData.email,
            phone: mockProfileData.phone || ''
          });
        }
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to fetch profile data. Please try again later.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      // In a real implementation, you would send the updated profile data to your API
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setProfileData({
        ...profileData,
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
      
      setSuccessMessage('Profile updated successfully!');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again later.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      // In a real implementation, you would send the password change request to your API
      // For now, we'll just simulate a successful password change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear form fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setPasswordError('');
      setSuccessMessage('Password changed successfully!');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Failed to change password. Please check your current password and try again.');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

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
        My Profile
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {profileData && (
        <Grid container spacing={3}>
          {/* Profile Summary */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <Avatar
                  sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main' }}
                >
                  {profileData.name.charAt(0)}
                </Avatar>
                <Typography variant="h5">{profileData.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {profileData.role.replace('_', ' ').toUpperCase()}
                </Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText primary="Email" secondary={profileData.email} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText primary="Phone" secondary={profileData.phone || 'Not set'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText primary="Branch" secondary={profileData.branch} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AdminIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Account Type" 
                    secondary={profileData.role.replace('_', ' ').toUpperCase()} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EventNoteIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Member Since" 
                    secondary={new Date(profileData.created_at).toLocaleDateString()} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          {/* Profile Edit Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Edit Profile
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <form onSubmit={handleProfileUpdate}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                    >
                      Update Profile
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
            
            {/* Change Password Form */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}
              
              <form onSubmit={handlePasswordChange}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Current Password"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="New Password"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                    >
                      Change Password
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
            
            {/* Recent Activity */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <List>
                {profileData.activity_log.map((activity, index) => (
                  <ListItem key={index} divider={index < profileData.activity_log.length - 1}>
                    <ListItemText
                      primary={activity.action}
                      secondary={`${new Date(activity.timestamp).toLocaleString()} • IP: ${activity.ip}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Container>
  );
}
