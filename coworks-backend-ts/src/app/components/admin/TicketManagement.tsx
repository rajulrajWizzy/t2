'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  Customer: {
    name: string;
    email: string;
  };
  Messages: Array<{
    id: number;
    message: string;
    sender_type: string;
    sender_id: number;
    created_at: string;
  }>;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  open: 'error',
  'in-progress': 'warning',
  resolved: 'success',
  closed: 'default'
};

const priorityColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
  urgent: 'error'
};

export default function TicketManagement() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const fetchTickets = async () => {
    try {
      const response = await axios.get('/api/admin/support/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTickets();
    }
  }, [token]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setStatusUpdate(ticket.status);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTicket(null);
    setResponseText('');
    setStatusUpdate('');
  };

  const handleStatusUpdate = async () => {
    if (!selectedTicket || !statusUpdate) return;

    try {
      const response = await axios.put(
        `/api/admin/support/tickets/${selectedTicket.id}/status`,
        {
          status: statusUpdate,
          message: responseText
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update the tickets list with the new status
      setTickets(tickets.map(ticket =>
        ticket.id === selectedTicket.id ? response.data.data : ticket
      ));

      handleCloseDialog();
    } catch (err) {
      setError('Failed to update ticket status');
      console.error('Error updating ticket status:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        {tickets.map((ticket) => (
          <Card key={ticket.id} sx={{ cursor: 'pointer' }} onClick={() => handleTicketClick(ticket)}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">{ticket.subject}</Typography>
                <Box>
                  <Chip
                    label={ticket.priority}
                    color={priorityColors[ticket.priority]}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={ticket.status}
                    color={statusColors[ticket.status]}
                    size="small"
                  />
                </Box>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                From: {ticket.Customer.name}
              </Typography>
              <Typography variant="body2">
                {ticket.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedTicket && (
          <>
            <DialogTitle>
              Ticket #{selectedTicket.id} - {selectedTicket.subject}
            </DialogTitle>
            <DialogContent>
              <Box mb={2}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusUpdate}
                    label="Status"
                    onChange={(e) => setStatusUpdate(e.target.value)}
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response..."
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Message History
              </Typography>
              <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedTicket.Messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      mb: 1,
                      p: 1,
                      bgcolor: message.sender_type === 'admin' ? 'primary.light' : 'grey.100',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="caption" display="block" gutterBottom>
                      {message.sender_type === 'admin' ? 'Admin' : 'Customer'} -
                      {new Date(message.created_at).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">{message.message}</Typography>
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button
                onClick={handleStatusUpdate}
                variant="contained"
                disabled={!statusUpdate}
              >
                Update Status & Send Response
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}