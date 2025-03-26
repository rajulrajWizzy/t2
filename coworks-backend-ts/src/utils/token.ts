/**
 * Token utilities for verification and validation
 */

import { ResetToken } from '@/models/resetToken';

/**
 * Verify a password reset token
 * @param token The reset token to verify
 * @param type Type of user ('user' or 'admin')
 * @returns Object containing validity and user/admin ID
 */
export async function verifyResetToken(
  token: string,
  type: 'user' | 'admin'
): Promise<{ valid: boolean; userId?: number; adminId?: number }> {
  // Find token in database
  const resetToken = await ResetToken.findOne({
    where: {
      token,
      user_type: type,
      is_used: false
    }
  });

  // Token not found
  if (!resetToken) {
    return { valid: false };
  }

  // Check if token is expired
  if (resetToken.isExpired()) {
    return { valid: false };
  }

  // Return success with the appropriate ID
  if (type === 'admin') {
    return { valid: true, adminId: resetToken.user_id };
  } else {
    return { valid: true, userId: resetToken.user_id };
  }
}

/**
 * Mark a reset token as used after successful password reset
 * @param token The token to mark as used
 */
export async function markResetTokenAsUsed(token: string): Promise<boolean> {
  const resetToken = await ResetToken.findOne({
    where: { token }
  });

  if (!resetToken) {
    return false;
  }

  await resetToken.markAsUsed();
  return true;
} 