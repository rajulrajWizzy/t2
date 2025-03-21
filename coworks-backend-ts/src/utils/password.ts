import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @param saltRounds Number of salt rounds (default: 10)
 * @returns Hashed password
 */
export async function hashPassword(password: string, saltRounds = 10): Promise<string> {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 * @param plainPassword Plain text password
 * @param hashedPassword Hashed password
 * @returns Boolean indicating if passwords match
 */
export async function comparePasswords(
  plainPassword: string, 
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a random password of specified length
 * @param length Length of the password (default: 10)
 * @returns Random password
 */
export function generateRandomPassword(length = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
} 