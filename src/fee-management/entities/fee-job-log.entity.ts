import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fee_job_logs')
export class FeeJobLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'timestamptz' })
  @IsDate()
  @IsNotEmpty()
  executedAt: Date;

  @Column({ type: 'boolean' })
  @IsBoolean()
  @IsNotEmpty()
  success: boolean;

  @Column({ 
    type: 'decimal', 
    precision: 20, 
    scale: 8, 
    default: 0
  })
  @IsNumber()
  @IsOptional()
  harvestedAmount: number;

  @Column({ 
    type: 'decimal', 
    precision: 20, 
    scale: 8, 
    default: 0
  })
  @IsNumber()
  @IsOptional()
  distributedAmount: number;

  @Column({ 
    type: 'decimal', 
    precision: 20, 
    scale: 8, 
    default: 0
  })
  @IsNumber()
  @IsOptional()
  burnedAmount: number;

  @Column({ 
    type: 'text', 
    nullable: true
  })
  @IsString()
  @IsOptional()
  errorMessage: string | null;

  @CreateDateColumn()
  @IsDate()
  createdAt: Date;
}
