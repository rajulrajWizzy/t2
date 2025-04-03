ing room/**
 * Coin system utility functions
 * Handles coin calculations and rewards for bookings
 */

/**
 * Calculate coins earned for a booking based on duration and price
 * 
 * Rules:
 * 1. Base coins: 10 coins per month of booking
 * 2. Price bonus: 1 coin per 100 in booking value
 * 3. Duration bonus: 5 extra coins per 3 months of continuous booking
 * 
 * @param startDate Booking start date
 * @param endDate Booking end date
 * @param totalPrice Total booking price
 * @returns Number of coins earned
 */
export function calculateBookingCoins(
  startDate: Date,
  endDate: Date,
  totalPrice: number,
  bookingType: string
): number {
  // No coins for meeting room bookings
  if (bookingType === 'meeting_room') {
    return 0;
  }

  // Calculate booking duration in months including partial months
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  
  // Add one month to the duration for pro-rata calculation
  const months = monthsDiff + 1;
  
  // Calculate partial month (if any)
  const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  const partialDays = end.getDate() - start.getDate() + 1;
  const partialMonth = partialDays / daysInMonth;
  
  // Base coins calculation
  let totalCoins = months * 10;
  
  // Price bonus calculation (1 coin per 100 in booking value)
  totalCoins += Math.floor(totalPrice / 100);
  
  // Duration bonus (5 coins per 3 months)
  const durationBonus = Math.floor(months / 3) * 5;
  totalCoins += durationBonus;
  
  return Math.max(0, Math.round(totalCoins));
}

/**
 * Calculate coin rewards for user activity
 * 
 * Rules:
 * 1. Early payment: 5 coins
 * 2. Referral: 20 coins
 * 3. Extended booking (6+ months): 15 coins
 * 4. Perfect attendance: 10 coins per month
 * 
 * @param activityType Type of activity that earns coins
 * @param params Additional parameters for calculation
 * @returns Number of coins earned
 */
export function calculateActivityCoins(
  activityType: 'early_payment' | 'referral' | 'extended_booking' | 'perfect_attendance',
  params?: {
    months?: number;
    referralCount?: number;
  }
): number {
  switch (activityType) {
    case 'early_payment':
      return 5;
    
    case 'referral':
      return 20;
    
    case 'extended_booking':
      return 15;
    
    case 'perfect_attendance':
      return (params?.months || 1) * 10;
    
    default:
      return 0;
  }
}