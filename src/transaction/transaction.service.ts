import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create(createTransactionDto);
    return await this.transactionRepository.save(transaction);
  }

  async findBySignature(signature: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { signature }
    });
  }

  async findByWalletAddress(walletAddress: string): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: [
        { from: walletAddress },
        { to: walletAddress }
      ],
      order: { timestamp: 'DESC' }
    });
  }

  async findAll(): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      order: { timestamp: 'DESC' }
    });
  }
} 