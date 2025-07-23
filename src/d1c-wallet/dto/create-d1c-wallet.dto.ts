import { WalletType } from '../entities/d1c-wallet.entity';

export interface CreateD1cWalletDto {
  walletType: WalletType;
  walletAddress: string;
} 