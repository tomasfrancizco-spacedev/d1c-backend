
export interface CreateTransactionDto {
  from: string | null;
  to: string | null;
  timestamp: Date;
  amount: number;
  d1cFee: number;
  linkedCollegeId: number | null;
  signature: string;
} 