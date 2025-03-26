#!/usr/bin/env node

/**
 * Test script for booking calculations
 * Run with: node scripts/test-booking-calculation.js
 */

// Example data
const startDate = new Date('2023-03-21');
const monthlyRate = 5000; // Rs per month

// Function to calculate pro-rata amount
function calculateProRata(startDate, monthlyRate) {
  // Clone date to avoid modifying original
  const start = new Date(startDate);
  
  // Get days in the month
  const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const remainingDays = lastDayOfMonth - start.getDate() + 1;
  
  // Calculate pro-rata
  const proRataAmount = Math.round((monthlyRate / lastDayOfMonth) * remainingDays);
  
  return {
    startDate: start,
    daysInMonth: lastDayOfMonth,
    remainingDays,
    proRataAmount,
    monthlyRate,
    nextMonthAmount: monthlyRate
  };
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Calculate and display results
const result = calculateProRata(startDate, monthlyRate);

console.log('====================================');
console.log('Pro-rata Calculation for Hot Desk');
console.log('====================================');
console.log(`Start Date: ${result.startDate.toDateString()}`);
console.log(`Days in Month: ${result.daysInMonth}`);
console.log(`Remaining Days: ${result.remainingDays}`);
console.log(`Monthly Rate: ${formatCurrency(result.monthlyRate)}`);
console.log('\nPro-rata Calculation:');
console.log(`${formatCurrency(result.monthlyRate)} × (${result.remainingDays}/${result.daysInMonth}) = ${formatCurrency(result.proRataAmount)}`);
console.log('\nPayment Breakdown:');
console.log(`1. Partial month (Mar 21-31): ${formatCurrency(result.proRataAmount)}`);
console.log(`2. Full month (Apr 1-30): ${formatCurrency(result.nextMonthAmount)}`);
console.log(`Total Initial Payment: ${formatCurrency(result.proRataAmount + result.nextMonthAmount)}`);

// User calculation comparison
console.log('\nComparison with User Calculation:');
console.log(`1. Partial month (Mar 21-31): User calculated ${formatCurrency(500)}, Our calculation: ${formatCurrency(result.proRataAmount)}`);
console.log(`2. Full month (Apr 1-30): ${formatCurrency(5000)}`);
console.log(`Total: User calculated ${formatCurrency(5500)}, Our calculation: ${formatCurrency(result.proRataAmount + result.nextMonthAmount)}`);
console.log('\nNote: The difference is because our calculation is based on actual days in month (31) rather than dividing by 10.');
console.log('For accurate pro-rata calculation, we should use: Monthly rate ÷ Days in month × Remaining days');

// Explanation of the calculation
console.log('\nExplanation:');
console.log('For March 21-31 (11 days of a 31-day month):');
console.log(`₹5,000 ÷ 31 days × 11 days = ₹${(5000/31*11).toFixed(2)} ≈ ${formatCurrency(Math.round(5000/31*11))}`);
console.log('\nThis follows standard pro-rata calculation practice for rental payments.'); 