'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
  Checkbox,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useUsername, setUseUsername] = useState(false);
  const [useTestMode, setUseTestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard';

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      console.log('Admin already logged in, redirecting to', redirectTo);
      router.push(redirectTo);
    } else {
      console.log('No admin token found, showing login form');
    }
  }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    const loginIdentifier = useUsername ? username : email;
    console.log(`Attempting login with ${useUsername ? 'username' : 'email'}: ${loginIdentifier}`);
    
    if (useTestMode) {
      console.log('Using test mode login');
    }

    try {
      // Prepare request payload based on login method and test mode
      let payload: any = useUsername 
        ? { username, password } 
        : { email, password };
        
      // Add test mode flag if enabled
      if (useTestMode) {
        payload.test_mode = true;
      }
        
      const response = await axios.post('/api/admin/auth/login', payload);

      console.log('Login response:', response.status);

      if (response.data.success) {
        // Save token in localStorage for API requests
        localStorage.setItem('adminToken', response.data.data.token);
        
        // Also set as a cookie for middleware
        Cookies.set('adminToken', response.data.data.token, { expires: 1 }); // 1 day expiry
        
        // Save admin data if available
        if (response.data.data.admin) {
          const admin = response.data.data.admin;
          console.log('Admin data:', admin);
          
          localStorage.setItem('adminRole', admin.role);
          localStorage.setItem('adminName', admin.name);
          if (admin.branch_id) {
            localStorage.setItem('adminBranchId', admin.branch_id.toString());
          }
        }
        
        console.log('Login successful, redirecting to', redirectTo);
        // Redirect to admin dashboard or the original requested page
        router.push(redirectTo);
      } else {
        console.error('Login failed with success=false:', response.data.message);
        setError(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
      
      // Add debug info in development
      if (process.env.NODE_ENV !== 'production') {
        const debugMsg = `
          Status: ${err.response?.status || 'Unknown'}
          Message: ${err.response?.data?.message || err.message || 'Unknown error'}
          Details: ${JSON.stringify(err.response?.data || {}, null, 2)}
        `;
        setDebugInfo(debugMsg);
        console.error('Debug info:', debugMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Default credentials helper for development
  const fillDefaultCredentials = () => {
    if (process.env.NODE_ENV !== 'production') {
      if (useUsername) {
        setUsername('admin');
      } else {
        setEmail('admin@coworks.com');
      }
      setPassword('Admin@123');
    }
  };
  
  // Toggle between email and username login
  const toggleLoginMethod = () => {
    setUseUsername(!useUsername);
    // Clear previous errors when switching methods
    setError(null);
  };
  
  // Toggle test mode
  const toggleTestMode = () => {
    setUseTestMode(!useTestMode);
    // Clear previous errors when switching modes
    setError(null);
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Admin Login
        </Typography>
        
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>Login Method</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={useUsername}
                  onChange={toggleLoginMethod}
                  color="primary"
                />
              }
              label={useUsername ? "Username Login" : "Email Login"}
            />
            
            {useUsername && (
              <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                <strong>Important:</strong> Username is 'admin', not your email address
              </Alert>
            )}
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {!useTestMode && (
              <>
                {useUsername ? (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="Username (admin)"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    helperText="Enter just the username, not email address"
                  />
                ) : (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@coworks.com"
                  />
                )}
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin@123"
                />
              </>
            )}
            
            {process.env.NODE_ENV !== 'production' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useTestMode}
                    onChange={toggleTestMode}
                    color="primary"
                  />
                }
                label="Use Test Mode Login (Bypass DB)"
                sx={{ mt: 1, mb: 1 }}
              />
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            {process.env.NODE_ENV !== 'production' && !useTestMode && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="caption" color="text.secondary">Development Options</Typography>
                </Divider>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  color="secondary" 
                  onClick={fillDefaultCredentials}
                >
                  Use Default Credentials
                </Button>
              </>
            )}
          </Box>
          
          {debugInfo && process.env.NODE_ENV !== 'production' && (
            <Box mt={3} p={2} bgcolor="rgba(0,0,0,0.05)" borderRadius={1}>
              <Typography variant="caption" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                {debugInfo}
              </Typography>
            </Box>
          )}
        </Paper>
        
        <Card sx={{ mt: 4, width: '100%' }}>
          <CardContent>
            <Typography variant="h6" color="primary" gutterBottom>
              Login Help
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Email Login:</strong> admin@coworks.com
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Username Login:</strong> admin (not your email)
            </Typography>
            <Typography variant="body2">
              <strong>Password for both:</strong> Admin@123
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}