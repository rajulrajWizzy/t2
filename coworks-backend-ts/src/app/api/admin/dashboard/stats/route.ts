// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";




import { verifyAdmin } from '@/utils/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';
import { ApiResponse } from '@/types/common';
import { SeatingTypeEnum } from '@/types/seating';

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    const { role, branch_id } = adminAuth;
    
    const url = new URL(req.url);
    const showQuantityStats = url.searchParams.get('quantity_stats') === 'true';
    const showCostSavings = url.searchParams.get('cost_savings') === 'true';
    const detailedSeatingStats = url.searchParams.get('detailed_seating') === 'true';
    const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from') as string) : null;
    const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to') as string) : null;
    
    if (role === 'branch_admin' && branch_id) {
      const branchStats = await getBranchStats(
        branch_id, 
        showQuantityStats, 
        showCostSavings, 
        detailedSeatingStats, 
        from, 
        to
      );
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Branch statistics retrieved successfully',
        data: branchStats
      });
    } else {
      const globalStats = await getGlobalStats(
        showQuantityStats, 
        showCostSavings, 
        detailedSeatingStats, 
        from, 
        to
      );
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Global statistics retrieved successfully',
        data: globalStats
      });
    }
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        message: 'Failed to fetch dashboard statistics', 
        data: null,
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

async function getBranchStats(
  branchId: string | number, 
  showQuantityStats = false,
  showCostSavings = false,
  detailedSeatingStats = false,
  from: Date | null = null,
  to: Date | null = null
) {
  const dateFilter: any = {};
  if (from && to) {
    dateFilter['created_at'] = {
      [Op.between]: [from, to]
    };
  } else if (from) {
    dateFilter['created_at'] = {
      [Op.gte]: from
    };
  } else if (to) {
    dateFilter['created_at'] = {
      [Op.lte]: to
    };
  }
  
  const branchSeats = await db.Seat.findAll({
    where: { branch_id: branchId },
    attributes: ['id']
  });
  
  const seatIds = branchSeats.map((seat: any) => seat.id);
  
  const totalBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      ...dateFilter
    }
  }) : 0;

  const activeBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      status: 'CONFIRMED',
      start_time: { [Op.lte]: new Date() },
      end_time: { [Op.gt]: new Date() },
      ...dateFilter
    }
  }) : 0;

  const pendingBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      status: 'PENDING',
      ...dateFilter
    }
  }) : 0;

  const openTickets = await db.SupportTicket.count({
    where: { 
      branch_id: branchId,
      status: { [Op.in]: ['OPEN', 'IN_PROGRESS', 'ASSIGNED'] },
      ...dateFilter
    }
  });

  const totalSeats = await db.Seat.count({
    where: { branch_id: branchId }
  });
  
  const availableSeats = await db.Seat.count({
    where: { 
      branch_id: branchId,
      availability_status: 'AVAILABLE'
    }
  });

  const payments = await db.Payment.findAll({
    where: {
      booking_id: { 
        [Op.in]: db.sequelize.literal(`
          SELECT id FROM seat_bookings 
          WHERE seat_id IN (
            SELECT id FROM seats WHERE branch_id = ${branchId}
          )
          ${from ? `AND created_at >= '${from.toISOString()}'` : ''}
          ${to ? `AND created_at <= '${to.toISOString()}'` : ''}
        `)
      },
      payment_status: 'COMPLETED'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(payments[0]?.total || '0');

  const response: any = {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    totalSeats,
    availability: availableSeats,
  };
  
  if (detailedSeatingStats) {
  const seatingTypes = await db.SeatingType.findAll({
    include: [{
      model: db.Seat,
      as: 'Seats',
      where: { branch_id: branchId },
      required: false
    }],
    attributes: [
      'id',
      'name',
        'capacity_options',
        'quantity_options',
        'cost_multiplier',
      [db.sequelize.fn('COUNT', db.sequelize.col('Seats.id')), 'count'],
      [
        db.sequelize.fn(
          'SUM', 
            db.sequelize.literal(`CASE WHEN "Seats"."availability_status" = 'AVAILABLE' THEN 1 ELSE 0 END`)
        ), 
        'available'
      ]
    ],
    group: ['SeatingType.id'],
    raw: true,
    nest: true
  });

    response.seatsByType = seatingTypes.map((type: any) => ({
    typeId: type.id,
    typeName: type.name,
    count: parseInt(type.count || '0'),
      available: parseInt(type.available || '0'),
      capacity_options: type.capacity_options,
      quantity_options: type.quantity_options,
      cost_multiplier: type.cost_multiplier
    }));
  }
  
  if (showQuantityStats) {
    const hotDeskId = await getSeatingTypeId(SeatingTypeEnum.HOT_DESK);
    const dedicatedDeskId = await getSeatingTypeId(SeatingTypeEnum.DEDICATED_DESK);
    
    if (hotDeskId && dedicatedDeskId) {
      const configurableSeats = await db.Seat.findAll({
        where: {
          branch_id: branchId,
          seating_type_id: {
            [Op.in]: [hotDeskId, dedicatedDeskId]
          }
        },
        attributes: ['id', 'seating_type_id']
      });
      
      const hotDeskSeatIds = configurableSeats
        .filter((s: any) => s.seating_type_id === hotDeskId)
        .map((s: any) => s.id);
        
      const dedicatedDeskSeatIds = configurableSeats
        .filter((s: any) => s.seating_type_id === dedicatedDeskId)
        .map((s: any) => s.id);
      
      const hotDeskBookingsByQuantity = await getBookingsByQuantity(hotDeskSeatIds, dateFilter);
      
      const dedicatedDeskBookingsByQuantity = await getBookingsByQuantity(dedicatedDeskSeatIds, dateFilter);
      
      response.quantityStats = {
        hotDesk: hotDeskBookingsByQuantity,
        dedicatedDesk: dedicatedDeskBookingsByQuantity
      };
    }
  }
  
  if (showCostSavings && seatIds.length > 0) {
    const savingsData = await db.SeatBooking.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_price')), 'adjusted_price'],
        [
          db.sequelize.literal(`
            SUM(CASE 
              WHEN original_price IS NOT NULL THEN original_price 
              ELSE total_price 
            END)
          `),
          'original_price'
        ]
      ],
      where: {
        seat_id: { [Op.in]: seatIds },
        ...dateFilter
      },
      raw: true
    });
    
    if (savingsData && savingsData.length > 0) {
      const adjustedPrice = parseFloat((savingsData[0] as any).adjusted_price || '0');
      const originalPrice = parseFloat((savingsData[0] as any).original_price || '0');
      const savings = originalPrice - adjustedPrice;
      
      response.costSavings = {
        originalPrice,
        adjustedPrice,
        savings,
        savingsPercentage: originalPrice > 0 ? (savings / originalPrice) * 100 : 0
      };
    }
  }

  return response;
}

async function getSeatingTypeId(seatingTypeEnum: SeatingTypeEnum): Promise<number | null> {
  const seatingType = await db.SeatingType.findOne({
    where: { name: seatingTypeEnum },
    attributes: ['id']
  });
  
  return seatingType ? seatingType.id : null;
}

async function getBookingsByQuantity(seatIds: number[], dateFilter: any) {
  if (!seatIds.length) return [];
  
  const bookingsByQuantity = await db.sequelize.query(`
    SELECT 
      quantity, 
      COUNT(*) as count,
      SUM(total_price) as revenue,
      SUM(CASE WHEN original_price IS NOT NULL THEN original_price - total_price ELSE 0 END) as savings
    FROM seat_bookings
    WHERE seat_id IN (${seatIds.join(',')})
    ${dateFilter.created_at ? 
      `AND created_at ${
        dateFilter.created_at[Op.between] ? 
          `BETWEEN '${dateFilter.created_at[Op.between][0].toISOString()}' AND '${dateFilter.created_at[Op.between][1].toISOString()}'` :
        dateFilter.created_at[Op.gte] ?
          `>= '${dateFilter.created_at[Op.gte].toISOString()}'` :
        dateFilter.created_at[Op.lte] ?
          `<= '${dateFilter.created_at[Op.lte].toISOString()}'` :
        ''
      }` 
    : ''}
    GROUP BY quantity
    ORDER BY quantity ASC
  `, { type: 'SELECT' } as any);
  
  return bookingsByQuantity;
}

async function getGlobalStats(
  showQuantityStats = false,
  showCostSavings = false,
  detailedSeatingStats = false,
  from: Date | null = null,
  to: Date | null = null
) {
  const dateFilter: any = {};
  if (from && to) {
    dateFilter['created_at'] = {
      [Op.between]: [from, to]
    };
  } else if (from) {
    dateFilter['created_at'] = {
      [Op.gte]: from
    };
  } else if (to) {
    dateFilter['created_at'] = {
      [Op.lte]: to
    };
  }
  
  const totalBookings = await db.SeatBooking.count({
    where: dateFilter
  });

  const activeBookings = await db.SeatBooking.count({
    where: { 
      status: 'CONFIRMED',
      start_time: { [Op.lte]: new Date() },
      end_time: { [Op.gt]: new Date() },
      ...dateFilter
    }
  });

  const pendingBookings = await db.SeatBooking.count({
    where: { 
      status: 'PENDING',
      ...dateFilter
    }
  });

  const openTickets = await db.SupportTicket.count({
    where: { 
      status: { [Op.in]: ['OPEN', 'IN_PROGRESS', 'ASSIGNED'] },
      ...dateFilter
    }
  });

  const payments = await db.Payment.findAll({
    where: {
      payment_status: 'COMPLETED',
      ...dateFilter
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(payments[0]?.total || '0');

  const branches = await db.Branch.count();

  const seats = await db.Seat.count();
  
  const availableSeats = await db.Seat.count({
    where: { availability_status: 'AVAILABLE' }
  });

  const response: any = {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    branches,
    seats,
    availableSeats
  };
  
  if (detailedSeatingStats) {
    const seatingTypes = await db.SeatingType.findAll({
      include: [{
        model: db.Seat,
        as: 'Seats',
        required: false
      }],
      attributes: [
        'id',
        'name',
        'capacity_options',
        'quantity_options',
        'cost_multiplier',
        [db.sequelize.fn('COUNT', db.sequelize.col('Seats.id')), 'count'],
        [
          db.sequelize.fn(
            'SUM', 
            db.sequelize.literal(`CASE WHEN "Seats"."availability_status" = 'AVAILABLE' THEN 1 ELSE 0 END`)
          ), 
          'available'
        ]
      ],
      group: ['SeatingType.id'],
      raw: true,
      nest: true
    });

    response.seatsByType = seatingTypes.map((type: any) => ({
      typeId: type.id,
      typeName: type.name,
      count: parseInt(type.count || '0'),
      available: parseInt(type.available || '0'),
      capacity_options: type.capacity_options,
      quantity_options: type.quantity_options,
      cost_multiplier: type.cost_multiplier
    }));
  }
  
  if (showQuantityStats) {
    const hotDeskId = await getSeatingTypeId(SeatingTypeEnum.HOT_DESK);
    const dedicatedDeskId = await getSeatingTypeId(SeatingTypeEnum.DEDICATED_DESK);
    
    if (hotDeskId && dedicatedDeskId) {
      const hotDeskSeatIds = (await db.Seat.findAll({
        where: {
          seating_type_id: hotDeskId
        },
        attributes: ['id']
      })).map((s: any) => s.id);
      
      const dedicatedDeskSeatIds = (await db.Seat.findAll({
        where: {
          seating_type_id: dedicatedDeskId
        },
        attributes: ['id']
      })).map((s: any) => s.id);
      
      const hotDeskBookingsByQuantity = await getBookingsByQuantity(hotDeskSeatIds, dateFilter);
      
      const dedicatedDeskBookingsByQuantity = await getBookingsByQuantity(dedicatedDeskSeatIds, dateFilter);
      
      response.quantityStats = {
        hotDesk: hotDeskBookingsByQuantity,
        dedicatedDesk: dedicatedDeskBookingsByQuantity
      };
    }
  }
  
  if (showCostSavings) {
    const savingsData = await db.SeatBooking.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_price')), 'adjusted_price'],
        [
          db.sequelize.literal(`
            SUM(CASE 
              WHEN original_price IS NOT NULL THEN original_price 
              ELSE total_price 
            END)
          `),
          'original_price'
        ]
      ],
      where: dateFilter,
      raw: true
    });
    
    if (savingsData && savingsData.length > 0) {
      const adjustedPrice = parseFloat((savingsData[0] as any).adjusted_price || '0');
      const originalPrice = parseFloat((savingsData[0] as any).original_price || '0');
      const savings = originalPrice - adjustedPrice;
      
      response.costSavings = {
        originalPrice,
        adjustedPrice,
        savings,
        savingsPercentage: originalPrice > 0 ? (savings / originalPrice) * 100 : 0
      };
    }
  }

  return response;
}
