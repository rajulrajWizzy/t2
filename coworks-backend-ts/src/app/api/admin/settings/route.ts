import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess } from '@/utils/auth-helper';

// Mock settings data - in production, this would be fetched from a database
const mockSettings = {
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

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    const authResult = await validateAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    // In a real implementation, you would fetch settings from the database
    // For now, we'll return mock data
    return NextResponse.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: {
        settings: mockSettings
      }
    });
  } catch (error: any) {
    console.error('Error in settings GET endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const authResult = await validateAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    // Parse request body
    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { success: false, message: 'Settings data is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would save settings to the database
    // For now, we'll just return success
    
    // Validate settings (basic validation)
    if (!settings.company_name || !settings.company_email) {
      return NextResponse.json(
        { success: false, message: 'Company name and email are required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: settings
      }
    });
  } catch (error: any) {
    console.error('Error in settings POST endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
