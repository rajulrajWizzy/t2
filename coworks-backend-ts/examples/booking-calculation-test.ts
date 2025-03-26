/**
 * Booking calculation test script
 * Demonstrates the pro-rata payment calculation for different scenarios
 */

import { calculateInitialPayment, formatCurrency, SEATING_TYPE_CONSTRAINTS } from '../src/utils/bookingCalculations';
import { SeatingTypeEnum } from '../src/types/seating';

// Example: Booking starting on March 21st for a Hot Desk at 5000 Rs/month
function testHotDeskBooking() {
  console.log('====================================');
  console.log('Hot Desk Booking Starting on March 21st');
  console.log('====================================');
  
  const startDate = new Date('2023-03-21');
  const monthlyRate = 5000; // Rs per month
  const seatingType = SeatingTypeEnum.HOT_DESK;
  
  const result = calculateInitialPayment(startDate, monthlyRate, seatingType);
  
  console.log('Initial Payment Breakdown:');
  result.breakdown.forEach(item => {
    console.log(`- ${item.description}: ${formatCurrency(item.amount)}`);
  });
  
  console.log('\nTotal Initial Payment: ' + formatCurrency(result.totalAmount));
  
  if (result.extraDetails && result.extraDetails.length > 0) {
    console.log('\nAdditional Details:');
    result.extraDetails.forEach(detail => {
      console.log(`- ${detail}`);
    });
  }
  
  // Calculate first payment (no security deposit - just the first month and pro-rata)
  const firstPaymentWithoutDeposit = result.totalAmount - monthlyRate; // Subtract security deposit
  console.log('\nFirst Payment (without security deposit): ' + formatCurrency(firstPaymentWithoutDeposit));
  
  // Show results similar to the user's calculation
  console.log('\nComparison with User Calculation:');
  console.log('1. Partial month (Mar 21-31): User calculated ₹500, Our calculation is shown above');
  console.log('2. First full month (Apr 1-30): ₹5,000');
  console.log('Note: Hot desk minimum duration is actually 3 months per requirements');
}

// Example: Dedicated Desk with 10 seats starting mid-month
function testDedicatedDeskBooking() {
  console.log('\n====================================');
  console.log('Dedicated Desk Booking (10 seats) Starting on March 21st');
  console.log('====================================');
  
  const startDate = new Date('2023-03-21');
  const monthlyRate = 10000; // Rs per month per seat
  const seats = 10;
  const seatingType = SeatingTypeEnum.DEDICATED_DESK;
  
  const totalMonthlyRate = monthlyRate * seats;
  
  const result = calculateInitialPayment(startDate, totalMonthlyRate, seatingType);
  
  console.log('Initial Payment Breakdown:');
  result.breakdown.forEach(item => {
    console.log(`- ${item.description}: ${formatCurrency(item.amount)}`);
  });
  
  console.log('\nTotal Initial Payment (for 10 seats): ' + formatCurrency(result.totalAmount));
  
  if (result.extraDetails && result.extraDetails.length > 0) {
    console.log('\nAdditional Details:');
    result.extraDetails.forEach(detail => {
      console.log(`- ${detail}`);
    });
  }
}

// Run the tests
testHotDeskBooking();
testDedicatedDeskBooking(); 