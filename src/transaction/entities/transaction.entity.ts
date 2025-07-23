import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44, nullable: true })
  from: string | null;

  @Column({ type: 'varchar', length: 44, nullable: true })
  to: string | null;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  d1cFee: number;

  @Column({ type: 'varchar', length: 44, nullable: true })
  linkedSchoolWallet: string | null;

  @Column({ type: 'varchar', length: 88, unique: true })
  signature: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 