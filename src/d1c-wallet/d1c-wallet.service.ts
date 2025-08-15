import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { D1cWallet, WalletType } from './entities/d1c-wallet.entity';
import { CreateD1cWalletDto } from './dto/create-d1c-wallet.dto';

@Injectable()
export class D1cWalletService {
  constructor(
    @InjectRepository(D1cWallet)
    private readonly d1cWalletRepository: Repository<D1cWallet>,
  ) {}

  async create(createD1cWalletDto: CreateD1cWalletDto): Promise<D1cWallet> {
    const wallet = this.d1cWalletRepository.create(createD1cWalletDto);
    return await this.d1cWalletRepository.save(wallet);
  }

  async findByType(walletType: WalletType): Promise<D1cWallet | null> {
    return await this.d1cWalletRepository.findOne({
      where: { walletType }
    });
  }

  async findByAddress(walletAddress: string): Promise<D1cWallet | null> {
    return await this.d1cWalletRepository.findOne({
      where: { walletAddress }
    });
  }

  async findAll(): Promise<D1cWallet[]> {
    return await this.d1cWalletRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async getCommunityWallet(): Promise<string | null> {
    const communityWallet = await this.findByType(WalletType.COMMUNITY);
    return communityWallet?.walletAddress || null;
  }

  async getOpsWallet(): Promise<string | null> {
    const opsWallet = await this.findByType(WalletType.OPS);
    return opsWallet?.walletAddress || null;
  }

  async getFeeExemptWalletAddresses(): Promise<string[]> {
    const rows = await this.d1cWalletRepository.find({ where: { fee_exempt: true } });
    return rows.map(r => r.walletAddress);
  }

  async getIsWalletFeeExempt(walletAddress: string): Promise<boolean> {
    const wallet = await this.findByAddress(walletAddress);
    return wallet?.fee_exempt || false;
  }
} 