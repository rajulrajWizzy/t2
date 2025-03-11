import nodemailer from 'nodemailer';

// Create transporter with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.MAIL_PORT || '2525'),
  auth: {
    user: process.env.MAIL_USER || 'your_user',
    pass: process.env.MAIL_PASS || 'your_password'
  }
});

// Email for forgot password
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@coworks.com',
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
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// Welcome email for new users
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@coworks.com',
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
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

export default {
  sendPasswordResetEmail,
  sendWelcomeEmail
};