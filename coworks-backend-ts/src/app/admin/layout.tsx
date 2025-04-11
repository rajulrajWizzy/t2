'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
  createTheme,
  ThemeProvider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as CustomerIcon,
  VerifiedUser as VerifyIcon,
  Business as BranchIcon,
  Chair as SeatIcon,
  CategoryOutlined as SeatingTypeIcon,
  EventSeat as BookingIcon,
  Payment as PaymentIcon,
  ExitToApp as LogoutIcon,
  AccountCircle,
  ChevronLeft
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiService } from '@/utils/api-service';

// Create a green theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Green 800
      light: '#4caf50', // Green 500
      dark: '#1b5e20', // Green 900
    },
    secondary: {
      main: '#81c784', // Green 300
      light: '#a5d6a7', // Green 200
      dark: '#66bb6a', // Green 400
    },
  },
});

const drawerWidth = 256;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have a token
        if (!apiService.isAuthenticated()) {
          if (pathname !== '/admin/login') {
            router.push(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
          }
          setLoading(false);
          return;
        }

        // Verify session and get user data
        const { authenticated: isAuthenticated } = await apiService.verifySession();
        const user = apiService.getUser();
        
        if (!isAuthenticated || !user) {
          apiService.clearToken();
          if (pathname !== '/admin/login') {
            router.push(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
          }
        } else {
          setAuthenticated(true);
          setAdminUser(user);
          if (pathname === '/admin/login') {
            router.push('/admin/dashboard');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        apiService.clearToken();
        if (pathname !== '/admin/login') {
          router.push(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    apiService.logout();
    router.push('/admin/login');
  };

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  // Skip layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Menu items with icons and routes
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, href: '/admin/dashboard' },
    { text: 'Branches', icon: <BranchIcon />, href: '/admin/branches' },
    { text: 'Seating Types', icon: <SeatingTypeIcon />, href: '/admin/seating-types' },
    { text: 'Seats', icon: <SeatIcon />, href: '/admin/seats' },
    { text: 'Customers', icon: <CustomerIcon />, href: '/admin/customers' },
    { text: 'Verifications', icon: <VerifyIcon />, href: '/admin/verification' },
    { text: 'Bookings', icon: <BookingIcon />, href: '/admin/bookings' },
    { text: 'Payments', icon: <PaymentIcon />, href: '/admin/payments' },
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
            ml: { sm: `${open ? drawerWidth : 0}px` },
            transition: theme => theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              {open ? <ChevronLeft /> : <MenuIcon />}
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              CoWorks Admin
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {adminUser && (
                <>
                  <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                    {adminUser.name || adminUser.email}
                  </Typography>
                  <IconButton
                    size="large"
                    edge="end"
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenuOpen}
                    color="inherit"
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      {(adminUser.name || adminUser.email).charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem component={Link} href="/admin/profile" onClick={handleMenuClose}>
                      <AccountCircle sx={{ mr: 1 }} />
                      Profile
                    </MenuItem>
                    <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}>
                      <LogoutIcon sx={{ mr: 1 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            width: open ? drawerWidth : 64,
            flexShrink: 0,
            transition: theme => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            '& .MuiDrawer-paper': {
              width: open ? drawerWidth : 64,
              boxSizing: 'border-box',
              transition: theme => theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: [1],
            }}
          >
            <Typography variant="h6" component="div" sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              textAlign: 'center',
              width: '100%'
            }}>
              {open ? 'CoWorks Admin' : 'CW'}
            </Typography>
          </Toolbar>
          <Divider />
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  selected={pathname === item.href}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color: pathname === item.href ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      color: pathname === item.href ? 'primary.main' : 'inherit',
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${open ? drawerWidth : 64}px)` },
            mt: 8,
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
} 