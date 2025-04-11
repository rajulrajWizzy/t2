import nodemailer from 'nodemailer';

// Create transporter with environment variables and enhanced configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Enhanced TLS configuration
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // Connection settings
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 30000,     // 30 seconds
  // Pool configuration
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // Rate limiting
  rateDelta: 1000, // 1 second
  rateLimit: 5     // 5 messages per second
});

// Verify transporter configuration with retry mechanism
const verifyTransporter = async (retries = 3): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        transporter.verify((error: Error | null, success: boolean) => {
          if (error) {
            console.error(`Mail service verification attempt ${i + 1} failed:`, error);
            reject(error);
          } else {
            console.log('Mail service is ready to send emails');
            resolve(success);
          }
        });
      });
      return true;
    } catch (error) {
      if (i === retries - 1) {
        console.error('All mail service verification attempts failed:', error);
        return false;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return false;
};

// Initialize the transporter
verifyTransporter().catch(error => {
  console.error('Failed to initialize mail service:', error);
});

// Email for forgot password with retry mechanism
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@coworks.com',
        to: email,
        subject: 'Reset Your Password - Coworks',
        html: `
          <h1>Hello ${name},</h1>
          <p>You recently requested to reset your password for your Coworks account.</p>
          <p>Please click the button below to reset your password:</p>
          <div style="margin: 20px 0;">
            <a 
              href="${resetLink}" 
              style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;"
            >
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p>Regards,<br>The Coworks Team</p>
        `
      };
      
      // Send email with timeout
      const sendMailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout')), 30000);
      });
      
      await Promise.race([sendMailPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed to send password reset email:`, error);
      
      if (attempt === maxRetries) {
        console.error('All attempts to send password reset email failed');
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
};

// Welcome email for new users with retry mechanism
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@coworks.com',
        to: email,
        subject: 'Welcome to Coworks!',
        html: `
          <h1>Welcome to Coworks, ${name}!</h1>
          <p>Thank you for joining our platform. We're excited to have you as part of our coworking community.</p>
          <p>With Coworks, you can:</p>
          <ul>
            <li>Book workspaces and meeting rooms</li>
            <li>Manage your bookings</li>
            <li>Access special offers and events</li>
          </ul>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Happy coworking!</p>
          <p>Regards,<br>The Coworks Team</p>
        `
      };
      
      // Send email with timeout
      const sendMailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout')), 30000);
      });
      
      await Promise.race([sendMailPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed to send welcome email:`, error);
      
      if (attempt === maxRetries) {
        console.error('All attempts to send welcome email failed');
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
};

export default {
  sendPasswordResetEmail,
  sendWelcomeEmail
};