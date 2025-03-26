/**
 * Email utilities for sending transactional emails
 */

import crypto from 'crypto';
import { ResetToken } from '@/models/resetToken';

/**
 * Generate a reset token for password reset
 * @param userId ID of the user/admin requesting reset
 * @param type Type of user ('user' or 'admin')
 * @returns The generated reset token string
 */
export async function generateResetToken(userId: number, type: 'user' | 'admin'): Promise<string> {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration to 1 hour from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  // Store token in database
  await ResetToken.create({
    token,
    user_id: userId,
    user_type: type,
    expires_at: expiresAt,
    is_used: false
  });
  
  return token;
}

/**
 * Send password reset email to admin
 * @param email Admin email address
 * @param name Admin name
 * @param token Reset token
 */
export async function sendAdminPasswordResetEmail(
  email: string, 
  name: string, 
  token: string
): Promise<void> {
  // In a real implementation, this would send an actual email
  // For this example, we'll just log the information
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reset-password?token=${token}`;
  
  console.log(`[Email Service] Password reset email would be sent to: ${email}`);
  console.log(`[Email Service] Reset URL: ${resetUrl}`);
  console.log(`[Email Service] Email content: 
    Hello ${name},
    
    You recently requested to reset your password for your CoWorks admin account.
    Please use the link below to reset your password. This link will expire in 1 hour.
    
    ${resetUrl}
    
    If you did not request a password reset, please ignore this email.
    
    Thank you,
    CoWorks Team
  `);
  
  // In production, you would use a real email service like SendGrid, AWS SES, etc.
}

/**
 * Send password reset email to user
 * @param email User email address
 * @param name User name
 * @param token Reset token
 */
export async function sendUserPasswordResetEmail(
  email: string, 
  name: string, 
  token: string
): Promise<void> {
  // Similar to admin reset email but for regular users
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  console.log(`[Email Service] Password reset email would be sent to user: ${email}`);
  console.log(`[Email Service] Reset URL: ${resetUrl}`);
  
  // In production, you would use a real email service
} 