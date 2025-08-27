import { College } from '../../college/entities/college.entity';
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44, nullable: true })
  from: string | null;

  @Column({ type: 'varchar', length: 44, nullable: true })
  to: string | null;

  @Column({ type: 'timestamp', nullable: true })
  timestamp: Date | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  d1cFee: number;

  @Column({ type: 'int', nullable: true })
  linkedCollegeId: number | null;

  @ManyToOne(() => College, { nullable: true })
  @JoinColumn({ name: 'linkedCollegeId' })
  linkedCollege: College | null;

  @Column({ type: 'varchar', length: 88, unique: true })
  signature: string;

  @Column({ type: 'boolean', default: false })
  fee_harvested: boolean;

  @Column({ type: 'boolean', default: false })
  fee_distributed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 