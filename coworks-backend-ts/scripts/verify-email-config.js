const colors = require('colors');
const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config();

const log = (message, color = 'white') => {
  console.log(colors[color](message));
};

async function verifyEmailConfig() {
  log('Verifying email configuration...', 'cyan');
  
  // Check required environment variables
  const requiredVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log('❌ Missing required environment variables:', 'red');
    missingVars.forEach(varName => {
      log(`   - ${varName}`, 'yellow');
    });
    process.exit(1);
  }
  
  // Create test transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    secure: process.env.EMAIL_PORT === '465',
    tls: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Verify connection
    await transporter.verify();
    log('✅ Email configuration verified successfully', 'green');
    
    // Test email
    log('Sending test email...', 'yellow');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: 'Test Email - Coworks Configuration',
      text: 'This is a test email to verify the email configuration.'
    };
    
    await transporter.sendMail(mailOptions);
    log('✅ Test email sent successfully', 'green');
    
    // Display configuration (without sensitive data)
    log('\nEmail Configuration:', 'cyan');
    log(`Host: ${process.env.EMAIL_HOST}`, 'white');
    log(`Port: ${process.env.EMAIL_PORT}`, 'white');
    log(`User: ${process.env.EMAIL_USER}`, 'white');
    log(`From: ${process.env.EMAIL_FROM}`, 'white');
    
  } catch (error) {
    log(`❌ Error verifying email configuration: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    transporter.close();
  }
}

// Run the verification
verifyEmailConfig().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
}); 