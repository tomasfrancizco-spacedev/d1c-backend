import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Unique, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { College } from '../../college/entities/college.entity';

@Unique('UQ_user_stats_wallet_college_safe', ['walletAddress', 'linkedCollegeIdSafe'])
@Entity('user_stats')
export class UserStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', nullable: true })
  userId: number | null;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'varchar', length: 44 })
  walletAddress: string;

  @Column({ type: 'bigint', nullable: true })
  linkedCollegeId: number | null;

  @Column({ type: 'bigint', insert: false, update: false, select: false })
  linkedCollegeIdSafe: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  contributions: number;

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