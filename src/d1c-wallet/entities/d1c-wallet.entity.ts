import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WalletType {
  OPS = 'OPS',
  COMMUNITY = 'COMMUNITY'
}

@Entity('d1c_wallet')
export class D1cWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: WalletType
  })
  walletType: WalletType;

  @Column({ type: 'varchar', length: 44, unique: true })
  walletAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 