import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_stats')
export class UserStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 44 })
  walletAddress: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalContributions: number;

  @Column({ type: 'integer', default: 0 })
  transactionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastContributionDate: Date | null;

  @Column({ type: 'integer', nullable: true })
  rankPosition: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}