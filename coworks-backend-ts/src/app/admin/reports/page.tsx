'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Download as DownloadIcon } from '@mui/icons-material';
import ApiService from '@/utils/api-service';

interface ReportData {
  revenue: {
    total: number;
    byBranch: Array<{
      branch_id: string;
      branch_name: string;
      amount: number;
    }>;
    bySeatType: Array<{
      seat_type_id: string;
      seat_type_name: string;
      amount: number;
    }>;
  };
  occupancy: {
    average: number;
    byBranch: Array<{
      branch_id: string;
      branch_name: string;
      occupancy_rate: number;
    }>;
    byDay: Array<{
      date: string;
      occupancy_rate: number;
    }>;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    byBranch: Array<{
      branch_id: string;
      branch_name: string;
      count: number;
    }>;
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<string>('revenue');
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (startDate && endDate) {
      loadReportData();
    }
  }, [reportType, startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        start_date: startDate?.toISOString() || '',
        end_date: endDate?.toISOString() || '',
        type: reportType
      });
      const data = await ApiService.get<ReportData>(`/api/admin/reports?${queryParams}`);
      setReportData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load report data');
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        start_date: startDate?.toISOString() || '',
        end_date: endDate?.toISOString() || '',
        type: reportType
      });
      const response = await ApiService.get(`/api/admin/reports/export?${queryParams}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportType}_${new Date().toISOString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export report');
      console.error('Error exporting report:', err);
    }
  };

  const renderRevenueReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Total Revenue
            </Typography>
            <Typography variant="h4">
              ${reportData?.revenue.total.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Branch</TableCell>
                <TableCell align="right">Revenue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.revenue.byBranch.map((branch) => (
                <TableRow key={branch.branch_id}>
                  <TableCell>{branch.branch_name}</TableCell>
                  <TableCell align="right">${branch.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      <Grid item xs={12} md={6}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Seat Type</TableCell>
                <TableCell align="right">Revenue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.revenue.bySeatType.map((seatType) => (
                <TableRow key={seatType.seat_type_id}>
                  <TableCell>{seatType.seat_type_name}</TableCell>
                  <TableCell align="right">${seatType.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );

  const renderOccupancyReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Average Occupancy Rate
            </Typography>
            <Typography variant="h4">
              {reportData?.occupancy.average.toFixed(2)}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Branch</TableCell>
                <TableCell align="right">Occupancy Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.occupancy.byBranch.map((branch) => (
                <TableRow key={branch.branch_id}>
                  <TableCell>{branch.branch_name}</TableCell>
                  <TableCell align="right">{branch.occupancy_rate.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      <Grid item xs={12} md={6}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Occupancy Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.occupancy.byDay.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                  <TableCell align="right">{day.occupancy_rate.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );

  const renderCustomerReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Total Customers
            </Typography>
            <Typography variant="h4">
              {reportData?.customers.total}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              New Customers
            </Typography>
            <Typography variant="h4">
              {reportData?.customers.new}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Returning Customers
            </Typography>
            <Typography variant="h4">
              {reportData?.customers.returning}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Branch</TableCell>
                <TableCell align="right">Customer Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.customers.byBranch.map((branch) => (
                <TableRow key={branch.branch_id}>
                  <TableCell>{branch.branch_name}</TableCell>
                  <TableCell align="right">{branch.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Reports</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              label="Report Type"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="revenue">Revenue Report</MenuItem>
              <MenuItem value="occupancy">Occupancy Report</MenuItem>
              <MenuItem value="customers">Customer Report</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            fullWidth
            sx={{ height: '56px' }}
          >
            Export Report
          </Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {reportType === 'revenue' && renderRevenueReport()}
          {reportType === 'occupancy' && renderOccupancyReport()}
          {reportType === 'customers' && renderCustomerReport()}
        </>
      )}
    </Box>
  );
} 