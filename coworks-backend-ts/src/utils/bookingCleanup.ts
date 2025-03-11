// src/utils/bookingCleanup.ts
import models from '@/models';
import { Op } from 'sequelize';
import { BookingStatusEnum } from '@/types/booking';
import { AvailabilityStatusEnum } from '@/types/seating';

/**
 * Updates bookings that are past their end time to COMPLETED status
 * and releases the seats back to AVAILABLE status
 */
export async function cleanupExpiredBookings(): Promise<{ seatBookings: number, meetingBookings: number }> {
  const now = new Date();
  const transaction = await models.sequelize.transaction();
  
  try {
    // Find seat bookings that have ended but are not marked as COMPLETED or CANCELLED
    const expiredSeatBookings = await models.SeatBooking.findAll({
      where: {
        end_time: { [Op.lt]: now },
        status: {
          [Op.notIn]: [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED]
        }
      },
      transaction
    });
    
    // Find meeting bookings that have ended but are not marked as COMPLETED or CANCELLED
    const expiredMeetingBookings = await models.MeetingBooking.findAll({
      where: {
        end_time: { [Op.lt]: now },
        status: {
          [Op.notIn]: [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED]
        }
      },
      transaction
    });
    
    // Update seat bookings to COMPLETED
    for (const booking of expiredSeatBookings) {
      await booking.update({ status: BookingStatusEnum.COMPLETED }, { transaction });
      
      // Release the seat
      const seat = await models.Seat.findByPk(booking.seat_id, { transaction });
      if (seat) {
        await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE }, { transaction });
      }
      
      // Release time slots if they exist
      await models.TimeSlot.update(
        { is_available: true, booking_id: null },
        { 
          where: { booking_id: booking.id },
          transaction
        }
      );
    }
    
    // Update meeting bookings to COMPLETED
    for (const booking of expiredMeetingBookings) {
      await booking.update({ status: BookingStatusEnum.COMPLETED }, { transaction });
      
      // Release the meeting room
      const seat = await models.Seat.findByPk(booking.meeting_room_id, { transaction });
      if (seat) {
        await seat.update({ availability_status: AvailabilityStatusEnum.AVAILABLE }, { transaction });
      }
    }
    
    await transaction.commit();
    
    return {
      seatBookings: expiredSeatBookings.length,
      meetingBookings: expiredMeetingBookings.length
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error cleaning up expired bookings:', error);
    throw error;
  }
}