'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Snackbar
} from '@mui/material';
import axios from 'axios';

interface SystemSettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_logo_url: string;
  currency: string;
  timezone: string;
  booking_notice_hours: number;
  max_booking_days_in_advance: number;
  enable_online_payments: boolean;
  payment_gateway: string;
  payment_api_key: string;
  payment_api_secret: string;
  enable_notifications: boolean;
  notification_email_from: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  enable_sms_notifications: boolean;
  sms_provider: string;
  sms_api_key: string;
}

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    company_logo_url: '',
    currency: 'USD',
    timezone: 'UTC',
    booking_notice_hours: 1,
    max_booking_days_in_advance: 30,
    enable_online_payments: true,
    payment_gateway: 'stripe',
    payment_api_key: '',
    payment_api_secret: '',
    enable_notifications: true,
    notification_email_from: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    enable_sms_notifications: false,
    sms_provider: 'twilio',
    sms_api_key: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/settings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSettings(response.data.data.settings);
      } else {
        setError(response.data.message || 'Failed to fetch settings');
        // Use mock data if API fails
        setSettings(getMockSettings());
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Error fetching settings. Using default values.');
      // Use mock data if API fails
      setSettings(getMockSettings());
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : Number(value);
    setSettings(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/settings', { settings }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setSuccess('Settings saved successfully');
      } else {
        setError(response.data.message || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Mock data function
  const getMockSettings = (): SystemSettings => {
    return {
      company_name: 'Excel Coworks',
      company_email: 'info@excelcoworks.com',
      company_phone: '+1 (555) 123-4567',
      company_address: '123 Main Street, Suite 101, San Francisco, CA 94105',
      company_logo_url: 'https://example.com/logo.png',
      currency: 'USD',
      timezone: 'America/New_York',
      booking_notice_hours: 2,
      max_booking_days_in_advance: 60,
      enable_online_payments: true,
      payment_gateway: 'stripe',
      payment_api_key: 'pk_test_sample',
      payment_api_secret: 'sk_test_sample',
      enable_notifications: true,
      notification_email_from: 'bookings@excelcoworks.com',
      smtp_host: 'smtp.example.com',
      smtp_port: 587,
      smtp_username: 'smtp_user',
      smtp_password: '********',
      enable_sms_notifications: true,
      sms_provider: 'twilio',
      sms_api_key: 'twilio_api_key_sample'
    };
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            System Settings
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              aria-label="settings tabs"
            >
              <Tab label="General" {...a11yProps(0)} />
              <Tab label="Booking" {...a11yProps(1)} />
              <Tab label="Payments" {...a11yProps(2)} />
              <Tab label="Notifications" {...a11yProps(3)} />
            </Tabs>

            {/* General Settings */}
            <TabPanel value={tabValue} index={0}>
              <Card>
                <CardHeader title="Company Information" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="company_name"
                        label="Company Name"
                        value={settings.company_name}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="company_email"
                        label="Company Email"
                        type="email"
                        value={settings.company_email}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="company_phone"
                        label="Company Phone"
                        value={settings.company_phone}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="company_logo_url"
                        label="Company Logo URL"
                        value={settings.company_logo_url}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        name="company_address"
                        label="Company Address"
                        value={settings.company_address}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardHeader title="Regional Settings" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="currency"
                        label="Currency"
                        value={settings.currency}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        helperText="Currency code (e.g., USD, EUR, GBP)"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="timezone"
                        label="Timezone"
                        value={settings.timezone}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        helperText="IANA timezone (e.g., America/New_York, Europe/London)"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>

            {/* Booking Settings */}
            <TabPanel value={tabValue} index={1}>
              <Card>
                <CardHeader title="Booking Rules" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="booking_notice_hours"
                        label="Minimum Booking Notice (Hours)"
                        type="number"
                        value={settings.booking_notice_hours}
                        onChange={handleNumberChange}
                        fullWidth
                        margin="normal"
                        InputProps={{ inputProps: { min: 0 } }}
                        helperText="Minimum hours in advance a booking can be made"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="max_booking_days_in_advance"
                        label="Maximum Days in Advance"
                        type="number"
                        value={settings.max_booking_days_in_advance}
                        onChange={handleNumberChange}
                        fullWidth
                        margin="normal"
                        InputProps={{ inputProps: { min: 1 } }}
                        helperText="Maximum days in advance a booking can be made"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>

            {/* Payment Settings */}
            <TabPanel value={tabValue} index={2}>
              <Card>
                <CardHeader title="Payment Settings" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enable_online_payments}
                            onChange={handleInputChange}
                            name="enable_online_payments"
                            color="primary"
                          />
                        }
                        label="Enable Online Payments"
                      />
                    </Grid>
                    
                    {settings.enable_online_payments && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="payment_gateway"
                            label="Payment Gateway"
                            value={settings.payment_gateway}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                            helperText="e.g., stripe, paypal, square"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="payment_api_key"
                            label="API Key"
                            value={settings.payment_api_key}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                            type="password"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="payment_api_secret"
                            label="API Secret"
                            value={settings.payment_api_secret}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                            type="password"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>

            {/* Notification Settings */}
            <TabPanel value={tabValue} index={3}>
              <Card>
                <CardHeader title="Email Notifications" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enable_notifications}
                            onChange={handleInputChange}
                            name="enable_notifications"
                            color="primary"
                          />
                        }
                        label="Enable Email Notifications"
                      />
                    </Grid>
                    
                    {settings.enable_notifications && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="notification_email_from"
                            label="From Email Address"
                            value={settings.notification_email_from}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="smtp_host"
                            label="SMTP Host"
                            value={settings.smtp_host}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="smtp_port"
                            label="SMTP Port"
                            type="number"
                            value={settings.smtp_port}
                            onChange={handleNumberChange}
                            fullWidth
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="smtp_username"
                            label="SMTP Username"
                            value={settings.smtp_username}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="smtp_password"
                            label="SMTP Password"
                            type="password"
                            value={settings.smtp_password}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardHeader title="SMS Notifications" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enable_sms_notifications}
                            onChange={handleInputChange}
                            name="enable_sms_notifications"
                            color="primary"
                          />
                        }
                        label="Enable SMS Notifications"
                      />
                    </Grid>
                    
                    {settings.enable_sms_notifications && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="sms_provider"
                            label="SMS Provider"
                            value={settings.sms_provider}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                            helperText="e.g., twilio, nexmo"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            name="sms_api_key"
                            label="SMS API Key"
                            value={settings.sms_api_key}
                            onChange={handleInputChange}
                            fullWidth
                            margin="normal"
                            type="password"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>
          </Paper>
        )}
      </Box>
    </Container>
  );
}
