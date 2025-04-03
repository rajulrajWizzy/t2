'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Alert, 
  AlertTitle,
  Button, 
  CircularProgress, 
  Divider 
} from '@mui/material';
import DashboardStats from '@/app/components/admin/DashboardStats';
import SeatingTypeManager from '@/app/components/admin/SeatingTypeManager';
import BranchManager from '@/app/components/admin/BranchManager';
import UserManager from '@/app/components/admin/UserManager';
import BookingManager from '@/app/components/admin/BookingManager';
import { useRouter } from 'next/navigation';
import axios from 'axios';

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
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

function AdminDashboardContent() {
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Get the current origin to handle port changes
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const verifyUrl = `${currentOrigin}/api/users/verify`;
      
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLocalError("No authentication token found. Please log in.");
        setRefreshing(false);
        return;
      }
      
      const response = await axios.post(verifyUrl, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setLocalError(null);
        setUserData(response.data.data.user);
        console.log('[AdminDashboard] Session refreshed successfully');
      } else {
        setLocalError("Failed to refresh authentication. Please try logging in again.");
      }
    } catch (error) {
      console.error('[AdminDashboard] Error refreshing session:', error);
      setLocalError("Error refreshing session. Please try logging in again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Check authentication status once when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[AdminDashboard] Checking authentication status');
        
        // Check if token exists
        const token = localStorage.getItem('adminToken');
        const userStr = localStorage.getItem('adminUser');
        
        if (!token) {
          console.log('[AdminDashboard] No token found, not authenticated');
          setAuthChecked(true);
          setLocalError('No authentication token found. Please log in.');
          return;
        }
        
        // Try to parse user data from localStorage
        if (userStr) {
          try {
            const parsedUser = JSON.parse(userStr);
            setUserData(parsedUser);
          } catch (parseError) {
            console.error('[AdminDashboard] Error parsing user data:', parseError);
          }
        }
        
        // Verify token in the background
        try {
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
          const verifyUrl = `${currentOrigin}/api/users/verify`;
          
          const response = await axios.post(verifyUrl, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            setUserData(response.data.data.user);
            setLocalError(null);
          }
        } catch (verifyError) {
          console.error('[AdminDashboard] Error verifying token:', verifyError);
          // Don't set error here to prevent redirect loops
          // Just use the user data from localStorage
        }
        
        setAuthChecked(true);
      } catch (error) {
        console.error('[AdminDashboard] Error checking auth:', error);
        setAuthChecked(true);
        // Don't set error here to prevent redirect loops
      }
    };

    checkAuth();
  }, []);

  // Display loading indicator while checking auth
  if (!authChecked) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show a warning if there's an auth error, but don't redirect
  if (localError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert 
          severity="warning" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Session'}
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <AlertTitle>Authentication Issue</AlertTitle>
          {localError}
        </Alert>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please log in to access the admin dashboard.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ my: 4, flexGrow: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h3" component="h1">
            Admin Dashboard
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              onClick={handleRefresh} 
              disabled={refreshing}
              sx={{ mr: 1 }}
            >
              {refreshing ? <CircularProgress size={24} /> : 'Refresh Session'}
            </Button>
          </Box>
        </Box>
        
        <Box mb={2}>
          <Alert severity="info">
            Welcome, {userData?.name || 'Admin'}! You are logged in as {userData?.role || 'admin'}.
          </Alert>
        </Box>
      </Box>
        
      <Paper sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="dashboard tabs"
          sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
        >
          <Tab label="Statistics" {...a11yProps(0)} />
          <Tab label="Seating Types" {...a11yProps(1)} />
          <Tab label="Branches" {...a11yProps(2)} />
          <Tab label="Users" {...a11yProps(3)} />
          <Tab label="Bookings" {...a11yProps(4)} />
          <Tab label="Settings" {...a11yProps(5)} />
        </Tabs>
        
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <DashboardStats />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <SeatingTypeManager />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <BranchManager />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <UserManager />
          </TabPanel>
          
          <TabPanel value={tabValue} index={4}>
            <BookingManager />
          </TabPanel>
          
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <iframe 
                src="/admin/settings" 
                style={{ 
                  width: '100%', 
                  height: 'calc(100vh - 250px)', 
                  border: 'none' 
                }}
                title="Settings"
              />
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
}

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}