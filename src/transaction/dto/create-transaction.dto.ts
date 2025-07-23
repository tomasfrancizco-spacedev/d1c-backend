export interface CreateTransactionDto {
  from: string | null;
  to: string | null;
  timestamp: Date;
  amount: number;
  d1cFee: number;
  linkedSchoolWallet: string | null;
  signature: string;
} 