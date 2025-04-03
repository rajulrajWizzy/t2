'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import UserVerification from '@/app/components/admin/UserVerification';

export default function VerificationPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          User Verification Management
        </Typography>
        <Typography variant="body1" gutterBottom>
          Review and verify user identification documents. Users need both identity and address verification to access booking features.
        </Typography>
      </Paper>
      
      <UserVerification />
    </Box>
  );
}
