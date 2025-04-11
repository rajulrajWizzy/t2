/**
 * Razorpay Configuration
 * 
 * This file contains the configuration for Razorpay payment gateway integration.
 * Make sure to set these environment variables in your .env file.
 */

export default {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
};