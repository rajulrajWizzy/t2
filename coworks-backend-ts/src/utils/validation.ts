// Validate email format
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  
  // Validate password (minimum 8 characters)
  export const isValidPassword = (password: string): boolean => {
    return password.length >= 8;
  };
  
  export default {
    isValidEmail,
    isValidPhone,
    isValidName,
    isValidPassword
  };