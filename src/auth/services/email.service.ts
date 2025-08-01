import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = {
      host: this.configService.get('SMTP_HOST', 'smtp.sendgrid.net'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
    } else {
      this.logger.warn('Email configuration not found. OTP emails will be logged to console.');
    }
  }

  async sendOtp(email: string, otpCode: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`📧 OTP for ${email}: ${otpCode}`);
      console.log(`\n🔐 Your OTP Code: ${otpCode}\n`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'divisiononecrypto@gmail.com'),
        to: email,
        subject: 'Your D1C Login Code',
        html: `
          <h2>Your Division 1 Crypto Login Code</h2>
          <p>Use this code to complete your login:</p>
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 8px; text-align: center;">${otpCode}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
        text: `Your D1C login code is: ${otpCode}. This code will expire in 10 minutes.`,
      });

      this.logger.log(`OTP email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      // Fallback to console logging
      this.logger.log(`📧 OTP for ${email}: ${otpCode}`);
    }
  }
} 