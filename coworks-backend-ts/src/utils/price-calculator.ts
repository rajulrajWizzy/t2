/**
 * Utility functions for calculating prices for seats and bookings
 */

/**
 * Calculate the total price based on duration, rate, and quantity with prorated pricing
 * @param startDate Start date of the booking
 * @param endDate End date of the booking
 * @param rate Hourly/daily/weekly/monthly rate
 * @param quantity Number of seats/rooms being booked
 * @param rateType Type of rate (hourly, daily, weekly, monthly)
 * @returns Total price for the booking
 */
export function calculateTotalPrice(
  startDate: string | Date,
  endDate: string | Date,
  rate: number,
  quantity: number = 1,
  rateType: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'hourly'
): number {
  // Convert string dates to Date objects if needed
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Calculate duration in milliseconds
  const durationMs = end.getTime() - start.getTime();
  
  // Calculate duration based on rate type
  let totalPrice = 0;
  
  switch (rateType) {
    case 'hourly': {
      // Calculate exact hours (not rounded up)
      const hours = durationMs / (1000 * 60 * 60);
      totalPrice = rate * hours;
      break;
    }
    case 'daily': {
      // Calculate exact days (not rounded up)
      const days = durationMs / (1000 * 60 * 60 * 24);
      totalPrice = rate * days;
      break;
    }
    case 'weekly': {
      // Calculate exact weeks (not rounded up)
      const weeks = durationMs / (1000 * 60 * 60 * 24 * 7);
      totalPrice = rate * weeks;
      break;
    }
    case 'monthly': {
      // Calculate exact months (using actual days in each month)
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      
      // Calculate total months (including partial months)
      let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
      
      // Add partial month if there are remaining days
      const startDay = start.getDate();
      const endDay = end.getDate();
      const daysInStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
      const daysInEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
      
      // Calculate partial month ratio
      const startMonthRatio = (daysInStartMonth - startDay + 1) / daysInStartMonth;
      const endMonthRatio = endDay / daysInEndMonth;
      
      // Add partial months to total
      totalMonths += startMonthRatio + endMonthRatio;
      
      totalPrice = rate * totalMonths;
      break;
    }
  }
  
  // Apply quantity
  totalPrice = totalPrice * quantity;
  
  // Round to 2 decimal places
  return parseFloat(totalPrice.toFixed(2));
}

/**
 * Calculate price with any applicable discounts for quantity
 * @param basePrice The base price calculated
 * @param quantity Number of seats/rooms
 * @param costMultiplier Optional cost multiplier for quantity discounts
 * @returns Final price with discounts applied
 */
export function applyQuantityDiscounts(
  basePrice: number,
  quantity: number = 1,
  costMultiplier: Record<string, number> | null = null
): number {
  // If no multiplier or quantity is 1, return the base price
  if (!costMultiplier || quantity <= 1) {
    return basePrice;
  }
  
  // Find the closest multiplier
  const multiplierKeys = Object.keys(costMultiplier)
    .map(Number)
    .sort((a, b) => a - b);
  
  let selectedMultiplier = 1.0;
  
  // Find the highest applicable multiplier for the quantity
  for (const key of multiplierKeys) {
    if (quantity >= key) {
      selectedMultiplier = costMultiplier[key.toString()];
    } else {
      break;
    }
  }
  
  // Apply the multiplier to the base price
  const discountedPrice = basePrice * selectedMultiplier;
  
  return parseFloat(discountedPrice.toFixed(2));
}

/**
 * Calculate the best rate type based on duration
 * @param startDate Start date of the booking
 * @param endDate End date of the booking
 * @param rates Object containing hourly, daily, weekly, and monthly rates
 * @returns The most cost-effective rate type
 */
export function findBestRateType(
  startDate: string | Date,
  endDate: string | Date,
  rates: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  }
): 'hourly' | 'daily' | 'weekly' | 'monthly' {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  const days = durationMs / (1000 * 60 * 60 * 24);
  const weeks = durationMs / (1000 * 60 * 60 * 24 * 7);
  
  // Calculate price for each rate type
  const hourlyPrice = rates.hourly * hours;
  const dailyPrice = rates.daily * days;
  const weeklyPrice = rates.weekly * weeks;
  const monthlyPrice = rates.monthly * (days / 30); // Approximate monthly rate
  
  // Find the lowest price
  const prices = [
    { type: 'hourly', price: hourlyPrice },
    { type: 'daily', price: dailyPrice },
    { type: 'weekly', price: weeklyPrice },
    { type: 'monthly', price: monthlyPrice }
  ];
  
  return prices.reduce((min, current) => 
    current.price < min.price ? current : min
  ).type as 'hourly' | 'daily' | 'weekly' | 'monthly';
} 