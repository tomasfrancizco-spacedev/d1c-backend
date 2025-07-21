export class OtpUtil {
  // Generates a 6-digit OTP
  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Creates expiration time (10 minutes from now)
  static getExpirationTime(): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);
    return expiration;
  }

  // Checks if OTP is expired
  static isExpired(expirationDate: Date): boolean {
    return new Date() > expirationDate;
  }
} 