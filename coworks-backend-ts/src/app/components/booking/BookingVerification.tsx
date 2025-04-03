import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Divider
} from '@mui/material';
import axios from 'axios';

interface BookingVerificationProps {
  seatTypeId: string;
  numSeats: number;
  startTime: string;
  endTime: string;
  duration: number;
  durationType: 'hourly' | 'daily' | 'monthly';
  onVerificationComplete: (verified: boolean, data?: any) => void;
  onProceedToPayment: () => void;
}

interface VerificationResponse {
  success: boolean;
  data?: {
    availableSeats: number;
    totalPrice: number;
    canBook: boolean;
    message?: string;
  };
  error?: string;
}

const BookingVerification: React.FC<BookingVerificationProps> = ({
  seatTypeId,
  numSeats,
  startTime,
  endTime,
  duration,
  durationType,
  onVerificationComplete,
  onProceedToPayment
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationResponse['data'] | null>(null);

  const verifyBooking = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post<VerificationResponse>(
        '/api/booking/verify',
        {
          seatTypeId,
          numSeats,
          startTime,
          endTime,
          duration,
          durationType
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success && response.data.data) {
        setVerificationData(response.data.data);
        onVerificationComplete(true, response.data.data);
      } else {
        setError(response.data.error || 'Verification failed');
        onVerificationComplete(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify booking');
      onVerificationComplete(false);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    verifyBooking();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!verificationData) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Booking Verification
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <Typography variant="body1">
            Available Seats: <strong>{verificationData.availableSeats}</strong>
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="body1">
            Total Price: <strong>${verificationData.totalPrice.toFixed(2)}</strong>
          </Typography>
        </Grid>

        {verificationData.message && (
          <Grid item xs={12}>
            <Alert severity="warning">
              {verificationData.message}
            </Alert>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={onProceedToPayment}
          disabled={!verificationData.canBook}
        >
          {verificationData.canBook ? 'Proceed to Payment' : 'Not Available'}
        </Button>
      </Box>
    </Paper>
  );
};

export default BookingVerification;