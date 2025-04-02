# Authentication Issues Fix Guide

This guide will help you resolve the authentication issues on your Digital Ocean deployment.

## Issue Description

You're encountering two authentication errors:

1. **Registration Error**: 
   ```
   {
       "success": false,
       "message": "Registration failed",
       "data": null,
       "error": "Cannot destructure property 'password' of 'customerData' as it is undefined."
   }
   ```

2. **Login Error**:
   ```
   {
       "success": false,
       "message": "Invalid authorization token",
       "data": null
   }
   ```

## Quick Fix Instructions

Follow these steps to fix the authentication issues:

### Step 1: Install Required Dependencies

```bash
# Install required Node.js packages
npm install --save sequelize pg pg-hstore bcryptjs
```

### Step 2: Run the Fix Script

```bash
# Run the fix script to patch the authentication code
node fix-auth-issues.js
```

### Step 3: Create a Test Customer

```bash
# Create a test customer with known credentials
node create-test-customer.js
```

### Step 4: Restart the Application

```bash
# Restart the application to apply changes
pm2 restart all
```

## Testing the Fix

Use the following credentials to test login:

- **Email**: test@example.com
- **Password**: Test@123

You can test the authentication endpoints with:

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'
```

## Manual Fix (If Needed)

If the automatic fix doesn't work, you can manually fix the issues:

### 1. Fix Registration Issue

Edit `src/app/api/auth/register/route.ts` and find where `customerData.password` is being destructured. Replace it with:

```typescript
const password = customerData?.password;
if (!password) {
  console.error('[Customer Register] Password is undefined');
  return NextResponse.json({ 
    success: false, 
    message: 'Registration failed', 
    data: null, 
    error: 'Password is required' 
  }, { status: 400, headers: corsHeaders });
}
```

### 2. Fix Login Issue

Edit `src/app/api/auth/login/route.ts` and update the token generation with:

```typescript
const token = generateToken({
  id: user.id,
  email: user.email,
  name: user.name || '',
  timestamp: new Date().getTime()
});
// Log token generation
console.log(`[Customer Login] Generated token for user ${user.id}`);
```

### 3. Fix JWT Utility

Edit `src/utils/jwt-wrapper.ts` and update the token verification to handle Bearer tokens properly:

```typescript
export const verifyJWT = (token: string) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Clean the token (remove Bearer prefix if present)
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    
    if (!cleanToken) {
      throw new Error('Empty token');
    }
    
    console.log('[JWT] Verifying token');
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification error:', error);
    throw error;
  }
}
```

## Common Authentication Issues

1. **Missing JWT_SECRET**: Ensure your environment has JWT_SECRET defined
2. **Customer Table Structure**: Make sure the customers table has the expected structure
3. **Token Format**: Ensure the frontend sends the token with 'Bearer ' prefix

## Need More Help?

Check the application logs for more details:

```bash
pm2 logs
```

Or contact support with the error details. 