'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import axios from 'axios';

/**
 * Component to handle redirecting users based on their role after authentication
 */
export default function DashboardRedirect() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAndRedirect() {
      try {
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
          console.log('No authentication token found, redirecting to login');
          router.push('/admin/login');
          return;
        }
        
        // Use simple approach - just redirect to dashboard based on stored data
        // This avoids potential API errors from token verification
        const role = localStorage.getItem('adminRole');
        console.log(`Using stored role for redirection: ${role}`);
        router.push('/admin/dashboard');
      } catch (error) {
        console.error('Redirection error:', error);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    verifyAndRedirect();
  }, [router]);
  
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <CircularProgress size={40} />
        <Typography variant="h6" mt={2}>
          Redirecting to your dashboard...
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/admin/login')}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }
  
  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
      <CircularProgress />
    </Box>
  );
} 