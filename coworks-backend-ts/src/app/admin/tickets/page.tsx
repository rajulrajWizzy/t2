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
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

// Status color mapping
const statusColors = {
  open: 'primary',
  'in-progress': 'warning',
  resolved: 'success',
  closed: 'default'
};

// Priority color mapping
const priorityColors = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
};

// Mock data for tickets
const mockTickets = [
  {
    id: 'TCK-001',
    subject: 'Air conditioning not working',
    description: 'The AC in meeting room 3 is not cooling properly.',
    status: 'open',
    priority: 'medium',
    created_at: '2023-06-15T10:30:00Z',
    updated_at: '2023-06-15T10:30:00Z',
    user_id: '101',
    user_name: 'John Doe',
    branch_id: 'b1',
    branch_name: 'Downtown Branch',
    assigned_to: null
  },
  {
    id: 'TCK-002',
    subject: 'WiFi connectivity issues',
    description: 'Unable to connect to the WiFi network in the east wing.',
    status: 'in-progress',
    priority: 'high',
    created_at: '2023-06-14T14:45:00Z',
    updated_at: '2023-06-14T16:20:00Z',
    user_id: '102',
    user_name: 'Jane Smith',
    branch_id: 'b1',
    branch_name: 'Downtown Branch',
    assigned_to: 'Admin User'
  },
  {
    id: 'TCK-003',
    subject: 'Printer not working',
    description: 'The printer on the second floor is showing error code E-02.',
    status: 'resolved',
    priority: 'low',
    created_at: '2023-06-13T09:15:00Z',
    updated_at: '2023-06-13T14:30:00Z',
    user_id: '103',
    user_name: 'Robert Johnson',
    branch_id: 'b2',
    branch_name: 'Westside Branch',
    assigned_to: 'Tech Support'
  },
  {
    id: 'TCK-004',
    subject: 'Booking system error',
    description: 'Getting an error when trying to book a meeting room for next week.',
    status: 'open',
    priority: 'critical',
    created_at: '2023-06-12T16:20:00Z',
    updated_at: '2023-06-12T16:20:00Z',
    user_id: '104',
    user_name: 'Emily Davis',
    branch_id: 'b3',
    branch_name: 'North Campus',
    assigned_to: null
  },
  {
    id: 'TCK-005',
    subject: 'Request for additional desk',
    description: 'Need an additional desk for a new team member joining next week.',
    status: 'closed',
    priority: 'medium',
    created_at: '2023-06-11T11:30:00Z',
    updated_at: '2023-06-11T15:45:00Z',
    user_id: '105',
    user_name: 'Michael Wilson',
    branch_id: 'b2',
    branch_name: 'Westside Branch',
    assigned_to: 'Facilities Manager'
  }
];

export default function TicketsPage() {
  const { isAuthenticated, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [isAuthenticated, token]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch tickets from your API
      // For now, we'll use mock data
      setTimeout(() => {
        setTickets(mockTickets);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to fetch tickets. Please try again later.');
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handlePriorityFilterChange = (event) => {
    setPriorityFilter(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setTicketDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setTicketDialogOpen(false);
    setResponseText('');
  };

  const handleResponseChange = (event) => {
    setResponseText(event.target.value);
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;

    setSubmitting(true);
    try {
      // In a real implementation, you would send the response to your API
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the ticket status to in-progress if it's open
      if (selectedTicket.status === 'open') {
        const updatedTickets = tickets.map(ticket => 
          ticket.id === selectedTicket.id 
            ? { ...ticket, status: 'in-progress', updated_at: new Date().toISOString() } 
            : ticket
        );
        setTickets(updatedTickets);
      }
      
      setSubmitting(false);
      handleCloseDialog();
      
      // Show success message
      alert('Response submitted successfully!');
    } catch (err) {
      console.error('Error submitting response:', err);
      setSubmitting(false);
      alert('Failed to submit response. Please try again.');
    }
  };

  // Filter tickets based on selected filters and search query
  const filteredTickets = tickets.filter(ticket => {
    // Apply status filter
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    
    // Apply priority filter
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.id.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.user_name.toLowerCase().includes(query) ||
        ticket.branch_name.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Support Tickets
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search tickets"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by ID, subject, user, or branch"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={handlePriorityFilterChange}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchTickets}
              disabled={loading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>{ticket.id}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>{ticket.user_name}</TableCell>
                    <TableCell>{ticket.branch_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={ticket.status.replace('-', ' ')} 
                        color={statusColors[ticket.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ticket.priority} 
                        color={priorityColors[ticket.priority] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No tickets found matching the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Ticket Details Dialog */}
      <Dialog open={ticketDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedTicket && (
          <>
            <DialogTitle>
              Ticket {selectedTicket.id}: {selectedTicket.subject}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedTicket.status.replace('-', ' ')} 
                    color={statusColors[selectedTicket.status] || 'default'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Priority</Typography>
                  <Chip 
                    label={selectedTicket.priority} 
                    color={priorityColors[selectedTicket.priority] || 'default'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">User</Typography>
                  <Typography variant="body2">{selectedTicket.user_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Branch</Typography>
                  <Typography variant="body2">{selectedTicket.branch_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Created</Typography>
                  <Typography variant="body2">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Last Updated</Typography>
                  <Typography variant="body2">
                    {new Date(selectedTicket.updated_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Assigned To</Typography>
                  <Typography variant="body2">
                    {selectedTicket.assigned_to || 'Not assigned'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 2 }}>
                    <Typography variant="body2">{selectedTicket.description}</Typography>
                  </Paper>
                </Grid>
                
                {/* Response section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Add Response
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    placeholder="Type your response here..."
                    value={responseText}
                    onChange={handleResponseChange}
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button 
                variant="contained" 
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Response'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}
