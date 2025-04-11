import models from '@/models';
import { SeatingTypeEnum } from '@/types/seating';

export async function generateDailySlots() {
  try {
    console.log('Starting daily slot generation...');
    
    // Get all branches
    const branches = await models.Branch.findAll({
      where: { is_active: true },
      include: [{
        model: models.Seat,
        as: 'Seats',
        where: { availability_status: 'AVAILABLE' },
        include: [{
          model: models.SeatingType,
          as: 'SeatingType',
          where: {
            name: SeatingTypeEnum.MEETING_ROOM,
            is_hourly: true
          }
        }]
      }]
    });

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let totalSlotsCreated = 0;

    // Process each branch
    for (const branch of branches) {
      const newSlots = [];

      // Generate slots for each meeting room
      for (const seat of branch.Seats) {
        // Generate 24 hourly slots (one for each hour of the day)
        for (let hour = 0; hour < 24; hour++) {
          const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
          const endTime = `${((hour + 1) % 24).toString().padStart(2, '0')}:00:00`;

          newSlots.push({
            branch_id: branch.id,
            seat_id: seat.id,
            date: tomorrowStr,
            start_time: startTime,
            end_time: endTime,
            is_available: true,
            booking_id: null,
            hourly_rate: seat.SeatingType.hourly_rate
          });
        }
      }

      // Bulk create slots for this branch
      if (newSlots.length > 0) {
        const createdSlots = await models.TimeSlot.bulkCreate(newSlots);
        totalSlotsCreated += createdSlots.length;
        console.log(`Created ${createdSlots.length} slots for branch ${branch.name}`);
      }
    }

    console.log(`Daily slot generation completed. Created ${totalSlotsCreated} slots for ${branches.length} branches.`);
    return { success: true, slotsCreated: totalSlotsCreated };
  } catch (error) {
    console.error('Error generating daily slots:', error);
    return { success: false, error: (error as Error).message };
  }
}

// If running directly (not imported)
if (require.main === module) {
  generateDailySlots()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}