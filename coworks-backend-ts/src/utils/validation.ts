// Validate email format with more robust validation
export const isValidEmail = (email: string): boolean => {
  // More comprehensive email regex that checks for proper format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validate phone number (10 digits)
export const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

// Validate name (not just whitespace)
export const isValidName = (name: string): boolean => {
  return name.trim().length > 0;
};

// Validate password with stronger requirements:
// - At least 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
// - No whitespace
export const isValidPassword = (password: string): boolean => {
  // Check for minimum length
  if (password.length < 8) return false;
  
  // Check for whitespace
  if (/\s/.test(password)) return false;
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) return false;
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  
  return true;
};

// Get password validation requirements as a string for error messages
export const getPasswordRequirements = (): string => {
  return 'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, one special character, and no spaces.';
};

export default {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidPassword,
  getPasswordRequirements
};