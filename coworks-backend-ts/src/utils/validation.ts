/**
 * Validates an email address format
 * @param email The email to validate
 * @returns True if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || email.trim() === '') return false;
  
  // Standard email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};
  
// Validate phone number (10 digits)
export const isValidPhone = (phone: string): boolean => {
  if (!phone || phone.trim() === '') return false;
  
  // Only allows digits, spaces, dashes, parentheses, and plus sign
  const phoneRegex = /^[0-9\s\-\(\)\+]+$/;
  if (!phoneRegex.test(phone)) return false;
  
  // Ensures the phone number has at least 10 digits
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10;
};
  
// Validate name (not just whitespace)
export const isValidName = (text: string): boolean => {
  if (!text || text.trim() === '') return false;
  
  // Only alphabetic characters and spaces allowed
  const nameRegex = /^[a-zA-Z\s]+$/;
  return nameRegex.test(text);
};

export const isNotEmpty = (value: string): boolean => {
  return !!value && value.trim() !== '';
};

/**
 * Validates password strength
 * @param password The password to validate
 * @returns True if valid, false otherwise
 */
export const isValidPassword = (password: string): boolean => {
  if (!password || password.trim() === '') return false;
  
  // Minimum 8 characters
  if (password.length < 8) return false;
  
  // Should contain at least one uppercase letter, one lowercase letter, and one number
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongPasswordRegex.test(password);
};

export default {
  isValidEmail,
  isValidPhone,
  isValidName,
  isNotEmpty,
  isValidPassword
};