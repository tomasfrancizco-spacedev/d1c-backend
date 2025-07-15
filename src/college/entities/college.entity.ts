import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class College {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  commonName: string;

  @Column({ type: 'varchar', length: 40 })
  nickname: string;

  @Column({ type: 'varchar', length: 40 })
  city: string;

  @Column({ type: 'varchar', length: 40 })
  state: string;

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 40 })
  subdivision: string;

  @Column({ type: 'varchar', length: 40 })
  primary: string;

  @Column({ type: 'varchar', length: 40 })
  walletAddress: string;
  
}