import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { College } from '../../college/entities/college.entity';

@Entity('college_stats')
export class CollegeStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  collegeId: number;

  @OneToOne(() => College)
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({ type: 'varchar', length: 44 })
  walletAddress: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalContributionsReceived: number;

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