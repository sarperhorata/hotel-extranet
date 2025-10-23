import { Resend } from 'resend';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface BookingConfirmationData {
  guestName: string;
  bookingReference: string;
  propertyName: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  propertyAddress: string;
  propertyPhone: string;
  propertyEmail: string;
  cancellationPolicy: string;
  specialRequests?: string;
}

export interface PasswordResetData {
  userName: string;
  resetLink: string;
  expiryTime: string;
}

export interface WelcomeEmailData {
  userName: string;
  tenantName: string;
  loginUrl: string;
  supportEmail: string;
}

export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(config.RESEND_API_KEY);
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    try {
      const html = this.generateBookingConfirmationHTML(data);
      const text = this.generateBookingConfirmationText(data);

      const result = await this.resend.emails.send({
        from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
        to: [data.guestName],
        subject: `Booking Confirmation - ${data.bookingReference}`,
        html,
        text
      });

      logger.info(`Booking confirmation email sent: ${data.bookingReference}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send booking confirmation email: ${data.bookingReference}`, error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<boolean> {
    try {
      const html = this.generatePasswordResetHTML(data);
      const text = this.generatePasswordResetText(data);

      const result = await this.resend.emails.send({
        from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
        to: [data.userName],
        subject: 'Password Reset Request',
        html,
        text
      });

      logger.info(`Password reset email sent to: ${data.userName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email to: ${data.userName}`, error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
      const html = this.generateWelcomeHTML(data);
      const text = this.generateWelcomeText(data);

      const result = await this.resend.emails.send({
        from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
        to: [data.userName],
        subject: `Welcome to ${data.tenantName} - Hotel Extranet`,
        html,
        text
      });

      logger.info(`Welcome email sent to: ${data.userName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send welcome email to: ${data.userName}`, error);
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from the Hotel Extranet System.</p>
          <p>If you received this email, the email service is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `;

      const result = await this.resend.emails.send({
        from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
        to: [to],
        subject: 'Test Email - Hotel Extranet System',
        html
      });

      logger.info(`Test email sent to: ${to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send test email to: ${to}`, error);
      return false;
    }
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: template.from || `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
        to: [template.to],
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: template.replyTo,
        attachments: template.attachments
      });

      logger.info(`Custom email sent to: ${template.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send custom email to: ${template.to}`, error);
      return false;
    }
  }

  /**
   * Generate booking confirmation HTML
   */
  private generateBookingConfirmationHTML(data: BookingConfirmationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .highlight { color: #e74c3c; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation</h1>
            <p>Your reservation has been confirmed</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.guestName},</h2>
            <p>Thank you for your booking! Your reservation has been confirmed.</p>
            
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Booking Reference:</strong> <span class="highlight">${data.bookingReference}</span></p>
              <p><strong>Property:</strong> ${data.propertyName}</p>
              <p><strong>Room Type:</strong> ${data.roomType}</p>
              <p><strong>Check-in:</strong> ${data.checkInDate}</p>
              <p><strong>Check-out:</strong> ${data.checkOutDate}</p>
              <p><strong>Total Nights:</strong> ${data.totalNights}</p>
              <p><strong>Guests:</strong> ${data.adults} adults${data.children > 0 ? `, ${data.children} children` : ''}</p>
              <p><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount}</p>
            </div>
            
            <div class="booking-details">
              <h3>Property Information</h3>
              <p><strong>Address:</strong> ${data.propertyAddress}</p>
              <p><strong>Phone:</strong> ${data.propertyPhone}</p>
              <p><strong>Email:</strong> ${data.propertyEmail}</p>
            </div>
            
            ${data.specialRequests ? `
              <div class="booking-details">
                <h3>Special Requests</h3>
                <p>${data.specialRequests}</p>
              </div>
            ` : ''}
            
            <div class="booking-details">
              <h3>Cancellation Policy</h3>
              <p>${data.cancellationPolicy}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing ${data.propertyName}!</p>
            <p>If you have any questions, please contact us at ${data.propertyEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate booking confirmation text
   */
  private generateBookingConfirmationText(data: BookingConfirmationData): string {
    return `
      BOOKING CONFIRMATION
      
      Hello ${data.guestName},
      
      Thank you for your booking! Your reservation has been confirmed.
      
      BOOKING DETAILS:
      - Booking Reference: ${data.bookingReference}
      - Property: ${data.propertyName}
      - Room Type: ${data.roomType}
      - Check-in: ${data.checkInDate}
      - Check-out: ${data.checkOutDate}
      - Total Nights: ${data.totalNights}
      - Guests: ${data.adults} adults${data.children > 0 ? `, ${data.children} children` : ''}
      - Total Amount: ${data.currency} ${data.totalAmount}
      
      PROPERTY INFORMATION:
      - Address: ${data.propertyAddress}
      - Phone: ${data.propertyPhone}
      - Email: ${data.propertyEmail}
      
      ${data.specialRequests ? `SPECIAL REQUESTS:\n${data.specialRequests}\n` : ''}
      
      CANCELLATION POLICY:
      ${data.cancellationPolicy}
      
      Thank you for choosing ${data.propertyName}!
      If you have any questions, please contact us at ${data.propertyEmail}
    `;
  }

  /**
   * Generate password reset HTML
   */
  private generatePasswordResetHTML(data: PasswordResetData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${data.userName},</h2>
            <p>You have requested to reset your password for the Hotel Extranet System.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${data.resetLink}" class="button">Reset Password</a>
            </p>
            <p><strong>Important:</strong> This link will expire at ${data.expiryTime}.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>Hotel Extranet System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate password reset text
   */
  private generatePasswordResetText(data: PasswordResetData): string {
    return `
      PASSWORD RESET REQUEST
      
      Hello ${data.userName},
      
      You have requested to reset your password for the Hotel Extranet System.
      
      Click the link below to reset your password:
      ${data.resetLink}
      
      Important: This link will expire at ${data.expiryTime}.
      
      If you did not request this password reset, please ignore this email.
      
      Hotel Extranet System
    `;
  }

  /**
   * Generate welcome HTML
   */
  private generateWelcomeHTML(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${data.tenantName}!</h1>
            <p>Your Hotel Extranet account has been created</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.userName},</h2>
            <p>Welcome to the ${data.tenantName} Hotel Extranet System!</p>
            <p>Your account has been successfully created and you can now access the system.</p>
            <p style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Login to System</a>
            </p>
            <p>If you have any questions or need assistance, please contact our support team at ${data.supportEmail}.</p>
          </div>
          
          <div class="footer">
            <p>Hotel Extranet System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate welcome text
   */
  private generateWelcomeText(data: WelcomeEmailData): string {
    return `
      WELCOME TO ${data.tenantName.toUpperCase()}!
      
      Hello ${data.userName},
      
      Welcome to the ${data.tenantName} Hotel Extranet System!
      
      Your account has been successfully created and you can now access the system.
      
      Login URL: ${data.loginUrl}
      
      If you have any questions or need assistance, please contact our support team at ${data.supportEmail}.
      
      Hotel Extranet System
    `;
  }
}
