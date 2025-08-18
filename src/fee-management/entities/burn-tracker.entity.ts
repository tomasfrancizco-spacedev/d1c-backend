import { IsDate, IsNotEmpty, IsNumber } from 'class-validator';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('burn_tracker')
@Unique(['periodStartAt'])
export class BurnTracker {
  @PrimaryGeneratedColumn('increment')
  id: number;

  // start of the burn year window; the year is defined as 1 year from this date
  @Column({ type: 'timestamptz' })
  @IsDate()
  periodStartAt: Date;

  // store in whole token units with up to 8 decimals, consistent with other monetary fields
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  @IsNumber()
  @IsNotEmpty()
  burnedAmount: number;

  @CreateDateColumn()
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt: Date;
}


