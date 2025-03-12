declare namespace NodeJS {
    interface ProcessEnv {
      // Database Variables
      DB_HOST?: string;
      DB_USER?: string;
      DB_PASS?: string;
      DB_NAME?: string;
      DB_PORT?: string;
      DB_SSL?: string;
      DB_SCHEMA?: string;
      DATABASE_URL?: string;
      
      // Auth Variables
      JWT_SECRET: string;
      JWT_EXPIRES_IN?: string;
      
      // Email Service
      EMAIL_HOST?: string;
      EMAIL_PORT?: string;
      EMAIL_USER?: string;
      EMAIL_PASS?: string;
      EMAIL_FROM?: string;
      
      // Google Cloud Storage
      GOOGLE_CLOUD_CREDENTIALS?: string;
      GOOGLE_CLOUD_BUCKET?: string;
      
      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }