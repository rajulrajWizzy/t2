declare namespace NodeJS {
  interface ProcessEnv {
    // Database Variables
    DB_HOST: string;
    DB_USER: string;
    DB_PASS: string;
    DB_NAME: string;
    DB_PORT: string;
    DB_SSL: string;
    DB_SCHEMA: string;
    DATABASE_URL?: string;
    
    // Auth Variables
    JWT_SECRET: string;
    JWT_EXPIRY: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRY: string;
    
    // Email Service
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_FROM: string;
    SMTP_FROM_NAME: string;
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    
    // Razorpay
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    
    // Application
    NODE_ENV: 'development' | 'production' | 'test';
    BASE_URL: string;
    CORS_ORIGIN: string;
    NEXT_PUBLIC_BASE_URL: string;
    
    // Vercel
    BLOB_READ_WRITE_TOKEN: string;
  }
}