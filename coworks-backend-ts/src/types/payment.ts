export enum PaymentMethodEnum {
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    BANK_TRANSFER = 'BANK_TRANSFER',
    CASH = 'CASH',
    DIGITAL_WALLET = 'DIGITAL_WALLET'
  }
  
  export enum PaymentStatusEnum {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
  }
  
  export enum BookingTypeEnum {
    SEAT = 'seat',
    MEETING = 'meeting'
  }
  
  export interface Payment {
    id: number;
    booking_id: number;
    booking_type: BookingTypeEnum;
    amount: number;
    payment_method: PaymentMethodEnum;
    payment_status: PaymentStatusEnum;
    transaction_id: string | null;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface PaymentInput {
    booking_id: number;
    booking_type: BookingTypeEnum;
    amount: number;
    payment_method: PaymentMethodEnum;
    payment_status?: PaymentStatusEnum;
    transaction_id?: string;
  }
  
  export interface PaymentAttributes extends PaymentInput {
    id?: number;
    created_at?: Date;
    updated_at?: Date;
  }