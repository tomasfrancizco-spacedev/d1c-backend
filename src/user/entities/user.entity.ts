import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', array: true })
  emails: string[];

  @Column({ type: 'varchar', length: 44 })
  walletAddress: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' , nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  currentLinkedCollege: string | null;

  @Column({ type: 'varchar', array: true, nullable: true })
  linkedCollegeHistory: string[] | null;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otpCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiration: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}