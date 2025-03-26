/**
 * Booking cost calculation utility
 * Handles pro-rata calculations for partial months and cancellation rules
 */

import { SeatingTypeEnum } from '@/types/seating';

/**
 * Seating type specific constraints
 */
interface SeatingTypeConstraint {
  minMonths?: number;
  minHours?: number;
  minDays?: number;
  minSeats: number;
  isHourly: boolean;
  isDaily?: boolean;
  noticePeriodDays: number;
}

export const SEATING_TYPE_CONSTRAINTS: Record<SeatingTypeEnum, SeatingTypeConstraint> = {
  [SeatingTypeEnum.HOT_DESK]: {
    minMonths: 3,
    minSeats: 1,
    isHourly: false,
    isDaily: false,
    noticePeriodDays: 30, // 1 month notice
  },
  [SeatingTypeEnum.DEDICATED_DESK]: {
    minMonths: 2,
    minSeats: 10,
    isHourly: false,
    isDaily: false,
    noticePeriodDays: 30, // 1 month notice
  },
  [SeatingTypeEnum.CUBICLE]: {
    minMonths: 3,
    minSeats: 1,
    isHourly: false,
    isDaily: false,
    noticePeriodDays: 30, // 1 month notice
  },
  [SeatingTypeEnum.MEETING_ROOM]: {
    minHours: 2,
    minSeats: 1,
    isHourly: true,
    isDaily: false,
    noticePeriodDays: 2, // 2 days notice
  },
  [SeatingTypeEnum.DAILY_PASS]: {
    minDays: 1,
    minSeats: 1,
    isHourly: false,
    isDaily: true,
    noticePeriodDays: 1, // 1 day notice
  }
};

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
 * @param seatingType Optional seating type to apply specific rules
 * @returns Object with cost breakdown and total
 */
export function calculateBookingCost(
  startDate: Date, 
  endDate: Date, 
  monthlyRate: number,
  cancellationDate?: Date,
  seatingType?: SeatingTypeEnum
): {
  totalCost: number;
  breakdown: {
    description: string;
    amount: number;
  }[];
  refundAmount: number;
  extraDetails?: string[];
} {
  const breakdown: { description: string; amount: number }[] = [];
  let totalCost = 0;
  let refundAmount = 0;
  const extraDetails: string[] = [];
  
  // Clone dates to avoid modifying original objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Handle hourly bookings (e.g., meeting rooms) separately
  if (seatingType === SeatingTypeEnum.MEETING_ROOM) {
    // Calculate hourly cost
    const hours = hoursBetween(start, end);
    const hourlyRate = monthlyRate; // For meeting rooms, the rate is already hourly
    totalCost = hours * hourlyRate;
    
    breakdown.push({
      description: `Meeting room booking: ${hours} hours at ${formatCurrency(hourlyRate)}/hour`,
      amount: totalCost
    });

    return { totalCost, breakdown, refundAmount, extraDetails };
  }
  
  // Handle daily pass separately
  if (seatingType === SeatingTypeEnum.DAILY_PASS) {
    const days = daysBetween(start, end);
    const dailyRate = monthlyRate; // For daily passes, the rate is already daily
    totalCost = days * dailyRate;
    
    breakdown.push({
      description: `Daily Pass: ${days} days at ${formatCurrency(dailyRate)}/day`,
      amount: totalCost
    });
    
    return { totalCost, breakdown, refundAmount, extraDetails };
  }
  
  // Calculate pro-rata for first month if start is not 1st of month
  if (start.getDate() !== 1) {
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const remainingDays = lastDayOfMonth - start.getDate() + 1;
    const proRataAmount = Math.round((monthlyRate / lastDayOfMonth) * remainingDays);
    
    const firstMonthName = start.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    breakdown.push({
      description: `Pro-rata for ${firstMonthName} (${start.getDate()}-${lastDayOfMonth})`,
      amount: proRataAmount
    });
    
    totalCost += proRataAmount;
    
    // Add explanation for pro-rata calculation
    extraDetails.push(
      `Pro-rata calculation for ${firstMonthName}: ${formatCurrency(monthlyRate)} × (${remainingDays}/${lastDayOfMonth}) = ${formatCurrency(proRataAmount)}`
    );
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
      const proRataAmount = Math.round((monthlyRate / lastDayOfMonth.getDate()) * end.getDate());
      breakdown.push({
        description: `Pro-rata for ${monthName} (1-${end.getDate()})`,
        amount: proRataAmount
      });
      totalCost += proRataAmount;
      
      // Add explanation for pro-rata calculation
      extraDetails.push(
        `Pro-rata calculation for ${monthName}: ${formatCurrency(monthlyRate)} × (${end.getDate()}/${lastDayOfMonth.getDate()}) = ${formatCurrency(proRataAmount)}`
      );
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
  
  // Add minimum duration warning if applicable
  if (seatingType) {
    const constraints = SEATING_TYPE_CONSTRAINTS[seatingType];
    if (constraints) {
      if (!constraints.isHourly && !constraints.isDaily && constraints.minMonths) {
        const durationMonths = monthsBetween(start, end);
        if (durationMonths < constraints.minMonths) {
          extraDetails.push(
            `Warning: ${seatingType} requires a minimum booking duration of ${constraints.minMonths} months. Current booking is for ${durationMonths.toFixed(1)} months.`
          );
        }
      }
      
      if (constraints.minSeats > 1) {
        extraDetails.push(
          `Note: ${seatingType} requires booking a minimum of ${constraints.minSeats} seats.`
        );
      }
    }
  }
  
  // Handle cancellation with notice period
  if (cancellationDate) {
    // Determine notice period based on seating type
    const noticePeriodDays = seatingType 
      ? SEATING_TYPE_CONSTRAINTS[seatingType]?.noticePeriodDays || 30 
      : 30;
    
    const noticeEndDate = new Date(cancellationDate);
    noticeEndDate.setDate(noticeEndDate.getDate() + noticePeriodDays);
    
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
        description: `Cancellation notice: ${cancellationDate.toLocaleDateString()} (${noticePeriodDays} days notice)`,
        amount: 0
      });
      
      extraDetails.push(
        `Cancellation refund: ${formatCurrency(refundAmount)} for period after ${noticeEndDate.toLocaleDateString()}`
      );
    }
  }
  
  return {
    totalCost,
    breakdown,
    refundAmount,
    extraDetails
  };
}

/**
 * Calculate the initial payment amount for a booking
 * This handles the specific case mentioned where a user would pay for the partial
 * first month plus the first full month upfront
 * 
 * @param startDate Booking start date
 * @param monthlyRate Monthly rate for the seat/desk
 * @param seatingType Optional seating type to apply specific rules
 * @returns Object with payment breakdown and total
 */
export function calculateInitialPayment(
  startDate: Date,
  monthlyRate: number,
  seatingType?: SeatingTypeEnum
): {
  totalAmount: number;
  breakdown: {
    description: string;
    amount: number;
  }[];
  extraDetails?: string[];
} {
  const breakdown: { description: string; amount: number }[] = [];
  let totalAmount = 0;
  const extraDetails: string[] = [];
  
  // Clone date to avoid modifying original object
  const start = new Date(startDate);
  
  // Handle hourly bookings (e.g., meeting rooms) separately - full payment upfront
  if (seatingType === SeatingTypeEnum.MEETING_ROOM) {
    totalAmount = monthlyRate; // For meeting rooms, this would be the hourly rate * booked hours
    breakdown.push({
      description: `Full payment for meeting room booking`,
      amount: totalAmount
    });
    return { totalAmount, breakdown, extraDetails };
  }
  
  // Handle daily pass separately - full payment upfront
  if (seatingType === SeatingTypeEnum.DAILY_PASS) {
    totalAmount = monthlyRate; // For daily passes, this would be the daily rate * days
    breakdown.push({
      description: `Full payment for daily pass`,
      amount: totalAmount
    });
    return { totalAmount, breakdown, extraDetails };
  }
  
  // Calculate pro-rata for first partial month if start is not 1st of month
  if (start.getDate() !== 1) {
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const remainingDays = lastDayOfMonth - start.getDate() + 1;
    const proRataAmount = Math.round((monthlyRate / lastDayOfMonth) * remainingDays);
    
    const firstMonthName = start.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    breakdown.push({
      description: `Pro-rata for ${firstMonthName} (${start.getDate()}-${lastDayOfMonth})`,
      amount: proRataAmount
    });
    
    totalAmount += proRataAmount;
    
    // Add explanation for pro-rata calculation
    extraDetails.push(
      `Pro-rata calculation for ${firstMonthName}: ${formatCurrency(monthlyRate)} × (${remainingDays}/${lastDayOfMonth}) = ${formatCurrency(proRataAmount)}`
    );
    
    // Add the next full month's payment
    const nextMonth = new Date(start);
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    breakdown.push({
      description: `Full month: ${nextMonthName}`,
      amount: monthlyRate
    });
    
    totalAmount += monthlyRate;
  } else {
    // If starting on the 1st, just pay for the first month
    const monthName = start.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    breakdown.push({
      description: `Full month: ${monthName}`,
      amount: monthlyRate
    });
    
    totalAmount += monthlyRate;
  }
  
  // Add security deposit if applicable
  const securityDeposit = monthlyRate; // Typically one month's rent
  breakdown.push({
    description: `Security deposit (refundable)`,
    amount: securityDeposit
  });
  totalAmount += securityDeposit;
  
  // Add minimum duration note if applicable
  if (seatingType) {
    const constraints = SEATING_TYPE_CONSTRAINTS[seatingType];
    if (constraints) {
      if (!constraints.isHourly && !constraints.isDaily && constraints.minMonths) {
        extraDetails.push(
          `Note: ${seatingType} requires a minimum booking duration of ${constraints.minMonths} months.`
        );
      }
      
      if (constraints.minSeats > 1) {
        extraDetails.push(
          `Note: ${seatingType} requires booking a minimum of ${constraints.minSeats} seats.`
        );
      }
    }
  }
  
  return {
    totalAmount,
    breakdown,
    extraDetails
  };
}

/**
 * Calculate days between two dates (inclusive)
 */
function daysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay)) + 1;
}

/**
 * Calculate hours between two dates
 */
function hoursBetween(startDate: Date, endDate: Date): number {
  const oneHour = 60 * 60 * 1000; // minutes*seconds*milliseconds
  return Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneHour));
}

/**
 * Calculate months between two dates (can return fractional months)
 */
function monthsBetween(startDate: Date, endDate: Date): number {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  const days = endDate.getDate() - startDate.getDate();
  
  // Calculate fractional months based on days
  const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
  const fractionalMonth = days / daysInMonth;
  
  return years * 12 + months + fractionalMonth;
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