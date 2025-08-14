import { BaseRepository } from '../base-repository';
import type { Booking, CreateBookingData } from '../types/bookings';
import { BookingStatus } from '../types/bookings';
import { DateUtils } from '../../../utils/date-utils';
import type { 
  BookingCalculationInput, 
  BookingCalculationResult 
} from '../../../../scheduling/lib/types/booking-calculations';
import { BookingCalculator } from '../../../../scheduling/lib/bookings/booking-calculator';

export class BookingsRepository extends BaseRepository<Booking> {
  private bookingCalculator: BookingCalculator;

  constructor() {
    super('bookings'); // Table name (plural)
    this.bookingCalculator = new BookingCalculator();
  }

  /**
   * Create a booking with automatic price and time calculations
   */
  async createBookingWithCalculation(
    input: BookingCalculationInput,
    user_id: string,
    start_at: string // UTC ISO string
  ): Promise<Booking> {
    try {
      // Step 1: Calculate booking pricing and time
      const calculationResult: BookingCalculationResult = await this.bookingCalculator.calculateBooking(input);
      
      // Step 2: Add required booking fields and create directly
      const bookingData: CreateBookingData = {
        user_id,
        business_id: input.business.id,
        status: BookingStatus.PENDING,
        start_at,
        end_at: DateUtils.addMinutesUTC(start_at, calculationResult.total_estimate_time_in_minutes),
        ...calculationResult // Spread the calculation result directly
      };
      
      // Step 3: Create the booking in database
      return await this.create(bookingData);
      
    } catch (error) {
      throw new Error(`Failed to create booking with calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update booking prices when services or addresses change
   */
  async recalculateBooking(bookingId: string, input: BookingCalculationInput): Promise<Booking> {
    try {
      // Step 1: Get existing booking
      const existingBooking = await this.findOne({ id: bookingId });
      if (!existingBooking) {
        throw new Error(`Booking with id ${bookingId} not found`);
      }
      
      // Step 2: Recalculate pricing
      const calculationResult: BookingCalculationResult = await this.bookingCalculator.calculateBooking(input);
      
      // Step 3: Update booking with new calculations
      const updatedBooking = await this.updateOne({ id: bookingId }, {
        ...calculationResult, // Spread the calculation result directly
        updated_at: DateUtils.nowUTC()
      });
      
      return updatedBooking;
      
    } catch (error) {
      throw new Error(`Failed to recalculate booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
