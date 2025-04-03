import cron from 'node-cron';
import { generateDailySlots } from './generate-daily-slots';

// Schedule the task to run at 00:01 AM every day
cron.schedule('1 0 * * *', async () => {
  console.log('Running daily slot generation task...');
  try {
    const result = await generateDailySlots();
    if (result.success) {
      console.log('Daily slot generation completed successfully.');
    } else {
      console.error('Daily slot generation failed:', result.error);
    }
  } catch (error) {
    console.error('Error in scheduled slot generation:', error);
  }
});

console.log('Slot generation scheduler started. Will run at 00:01 AM daily.');