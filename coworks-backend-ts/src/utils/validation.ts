// Validate email format with more robust validation
export const isValidEmail = (email: string): boolean => {
  // More comprehensive email regex that checks for proper format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validate phone number (10 digits, first digit between 6-9)
export const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate name (only letters, no numbers or special characters, not empty or just spaces)
export const isValidName = (name: string): boolean => {
  // Check if name is null or empty
  if (!name || name.trim().length === 0) return false;
  
  // Check if name contains only letters and spaces between words
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(name)) return false;
  
  // Check if name has at least one non-space character
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

// Validate seat number (alphanumeric only, 1-10 characters, no spaces or special characters)
export const isValidSeatNumber = (seatNumber: string): boolean => {
  const seatNumberRegex = /^[a-zA-Z0-9]{1,10}$/;
  return seatNumberRegex.test(seatNumber);
};

// Get seat number validation requirements as a string for error messages
export const getSeatNumberRequirements = (): string => {
  return 'Seat number must contain only alphanumeric characters (no spaces or special characters) and be at most 10 characters long.';
};

// Validate address (not just whitespace)
export const isValidAddress = (address: string): boolean => {
  return address.trim().length > 0;
};

// Validate file path for profile pictures (PNG, JPEG, JPG only)
export const isValidProfilePicturePath = (path: string): boolean => {
  if (!path) return true; // Path is optional
  const allowedExtensions = /\.(jpg|jpeg|png)$/i;
  return allowedExtensions.test(path);
};

// Validate file path for proof documents (PDF, PNG, JPEG, JPG)
export const isValidDocumentPath = (path: string): boolean => {
  if (!path) return true; // Path is optional
  const allowedExtensions = /\.(pdf|jpg|jpeg|png)$/i;
  return allowedExtensions.test(path);
};

export default {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidPassword,
  isValidSeatNumber,
  isValidAddress,
  isValidDocumentPath,
  isValidProfilePicturePath,
  getPasswordRequirements,
  getSeatNumberRequirements
};