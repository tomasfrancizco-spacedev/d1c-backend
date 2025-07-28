import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ALL_TIME = 'all_time'
}

@Entity('trading_volume_stats')
export class TradingVolumeStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  periodType: PeriodType;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  periodEnd: Date | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalVolume: number;

  @Column({ type: 'integer', default: 0 })
  transactionCount: number;

  @Column({ type: 'integer', default: 0 })
  uniqueUsers: number;

  @Column({ type: 'integer', default: 0 })
  uniqueColleges: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}