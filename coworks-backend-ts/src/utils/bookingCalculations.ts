/**
 * Booking cost calculation utility
 * Handles pro-rata calculations for partial months and cancellation rules
 */

/**
 * Calculate the total cost of a booking with pro-rata for partial months
 * 
 * Rules:
 * 1. For partial first month: Pro-rata calculation based on remaining days
 * 2. For full months: Full monthly amount
 * 3. For cancellations: 1 month notice required, refund for months beyond notice period
 * 
 * @param startDate Booking start date
 * @param endDate Booking end date
 * @param monthlyRate Monthly rate for the seat/desk
 * @param cancellationDate Optional cancellation date
 * @returns Object with cost breakdown and total
 */
export function calculateBookingCost(
  startDate: Date, 
  endDate: Date, 
  monthlyRate: number,
  cancellationDate?: Date
): {
  totalCost: number;
  breakdown: {
    description: string;
    amount: number;
  }[];
  refundAmount: number;
} {
  const breakdown: { description: string; amount: number }[] = [];
  let totalCost = 0;
  let refundAmount = 0;
  
  // Clone dates to avoid modifying original objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate pro-rata for first month if start is not 1st of month
  if (start.getDate() !== 1) {
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const remainingDays = lastDayOfMonth - start.getDate() + 1;
    const proRataAmount = (monthlyRate / lastDayOfMonth) * remainingDays;
    
    const firstMonthName = start.toLocaleString('default', { month: 'long' });
    
    breakdown.push({
      description: `Pro-rata for ${firstMonthName} (${start.getDate()}-${lastDayOfMonth})`,
      amount: proRataAmount
    });
    
    totalCost += proRataAmount;
  }
  
  // Calculate for full months
  let currentDate = new Date(start);
  currentDate.setDate(1); // Move to first day of month
  
  // If we started mid-month, move to next month
  if (start.getDate() !== 1) {
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  while (currentDate <= end) {
    // Check if this is a full month
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // If this month includes the end date and it's not the last day of month
    if (
      end.getMonth() === currentDate.getMonth() && 
      end.getFullYear() === currentDate.getFullYear() && 
      end.getDate() !== lastDayOfMonth.getDate()
    ) {
      // Pro-rata for partial last month
      const proRataAmount = (monthlyRate / lastDayOfMonth.getDate()) * end.getDate();
      breakdown.push({
        description: `Pro-rata for ${monthName} (1-${end.getDate()})`,
        amount: proRataAmount
      });
      totalCost += proRataAmount;
    } else {
      // Full month
      breakdown.push({
        description: `Full month: ${monthName}`,
        amount: monthlyRate
      });
      totalCost += monthlyRate;
    }
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  // Handle cancellation with 1-month notice period
  if (cancellationDate) {
    const noticeEndDate = new Date(cancellationDate);
    noticeEndDate.setMonth(noticeEndDate.getMonth() + 1); // Add 1 month notice period
    
    // If notice end date is before booking end date, calculate refund
    if (noticeEndDate < end) {
      // Traverse the breakdown to find months after notice period
      let afterNoticeAmount = 0;
      const refundItems: { description: string; amount: number }[] = [];
      
      breakdown.forEach(item => {
        // Extract month and year from description
        const matches = item.description.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/);
        
        if (matches) {
          const [_, month, yearString] = matches;
          const year = parseInt(yearString);
          const monthIndex = new Date(`${month} 1, 2000`).getMonth();
          const itemDate = new Date(year, monthIndex, 1);
          
          // If this entry is after notice period ends
          if (itemDate > noticeEndDate) {
            afterNoticeAmount += item.amount;
            refundItems.push(item);
          }
        }
      });
      
      refundAmount = afterNoticeAmount;
      
      // Remove refunded items from breakdown
      refundItems.forEach(refundItem => {
        const index = breakdown.findIndex(item => item.description === refundItem.description);
        if (index !== -1) {
          breakdown.splice(index, 1);
        }
      });
      
      // Adjust total cost
      totalCost -= refundAmount;
      
      // Add cancellation info to breakdown
      breakdown.push({
        description: `Cancellation notice: ${cancellationDate.toLocaleDateString()} (1 month notice)`,
        amount: 0
      });
    }
  }
  
  return {
    totalCost,
    breakdown,
    refundAmount
  };
}

/**
 * Calculate days between two dates (inclusive)
 */
function daysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  return Math.round(Math.abs((start.getTime() - end.getTime()) / oneDay)) + 1;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
} 