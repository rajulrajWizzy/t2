// test_register.js
import fetch from 'node-fetch';

async function testRegistration() {
  const userData = {
    name: "Test User",
    email: "test" + Math.floor(Math.random() * 10000) + "@example.com", // Random email to avoid duplicates
    phone: "+1234567890",
    password: "SecurePassword123!",
    profile_picture: "https://example.com/profile.jpg",
    company_name: "Test Company"
  };

  console.log("Sending registration request with data:", userData);

  try {
    const response = await fetch('https://t2t1-nvuvp2n1e-rajulrajs-projects.vercel.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const responseText = await response.text();
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);
    
    try {
      const data = JSON.parse(responseText);
      console.log("Response data:", data);
    } catch (e) {
      console.log("Raw response (not JSON):", responseText);
    }
  } catch (error) {
    console.error("Error making request:", error);
  }
}

testRegistration(); 