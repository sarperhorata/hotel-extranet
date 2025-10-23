import { Resend } from 'resend';
import { logger } from '../../utils/logger';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@hotel-extranet.com';
  }

  // Send email
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: emailData.from || this.fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        reply_to: emailData.replyTo
      });

      if (result.error) {
        logger.error('Email send failed:', result.error);
        return false;
      }

      logger.info(`Email sent successfully to ${emailData.to}: ${result.data?.id}`);
      return true;
    } catch (error) {
      logger.error('Email service error:', error);
      return false;
    }
  }

  // Send booking confirmation email
  async sendBookingConfirmation(bookingData: any, guestEmail: string): Promise<boolean> {
    const subject = `Booking Confirmation - ${bookingData.bookingReference}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Booking Confirmation</h2>
        <p>Dear ${bookingData.guest?.firstName || 'Guest'},</p>
        
        <p>Your booking has been confirmed. Here are the details:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Booking Details</h3>
          <p><strong>Booking Reference:</strong> ${bookingData.bookingReference}</p>
          <p><strong>Property:</strong> ${bookingData.property?.name}</p>
          <p><strong>Room:</strong> ${bookingData.room?.name}</p>
          <p><strong>Check-in:</strong> ${new Date(bookingData.checkInDate).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(bookingData.checkOutDate).toLocaleDateString()}</p>
          <p><strong>Guests:</strong> ${bookingData.adults} adults, ${bookingData.children} children</p>
          <p><strong>Total Amount:</strong> ${bookingData.currency} ${bookingData.totalAmount}</p>
        </div>
        
        <p>Thank you for choosing us!</p>
        <p>Best regards,<br>Hotel Management Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: guestEmail,
      subject,
      html
    });
  }

  // Send booking cancellation email
  async sendBookingCancellation(bookingData: any, guestEmail: string, reason?: string): Promise<boolean> {
    const subject = `Booking Cancellation - ${bookingData.bookingReference}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Booking Cancellation</h2>
        <p>Dear ${bookingData.guest?.firstName || 'Guest'},</p>
        
        <p>Your booking has been cancelled. Here are the details:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Cancelled Booking Details</h3>
          <p><strong>Booking Reference:</strong> ${bookingData.bookingReference}</p>
          <p><strong>Property:</strong> ${bookingData.property?.name}</p>
          <p><strong>Room:</strong> ${bookingData.room?.name}</p>
          <p><strong>Original Check-in:</strong> ${new Date(bookingData.checkInDate).toLocaleDateString()}</p>
          <p><strong>Original Check-out:</strong> ${new Date(bookingData.checkOutDate).toLocaleDateString()}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br>Hotel Management Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: guestEmail,
      subject,
      html
    });
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(paymentData: any, guestEmail: string): Promise<boolean> {
    const subject = `Payment Confirmation - ${paymentData.paymentReference}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Payment Confirmation</h2>
        <p>Dear Guest,</p>
        
        <p>Your payment has been processed successfully. Here are the details:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Payment Details</h3>
          <p><strong>Payment Reference:</strong> ${paymentData.paymentReference}</p>
          <p><strong>Booking Reference:</strong> ${paymentData.bookingReference}</p>
          <p><strong>Amount:</strong> ${paymentData.currency} ${paymentData.amount}</p>
          <p><strong>Payment Method:</strong> ${paymentData.paymentMethod}</p>
          <p><strong>Status:</strong> ${paymentData.paymentStatus}</p>
        </div>
        
        <p>Thank you for your payment!</p>
        <p>Best regards,<br>Hotel Management Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: guestEmail,
      subject,
      html
    });
  }

  // Send inventory alert email
  async sendInventoryAlert(alertData: any, userEmail: string): Promise<boolean> {
    const subject = `Inventory Alert - ${alertData.propertyName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f39c12;">Inventory Alert</h2>
        <p>Dear Hotel Manager,</p>
        
        <p>An inventory alert has been triggered for your property:</p>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12;">
          <h3>Alert Details</h3>
          <p><strong>Property:</strong> ${alertData.propertyName}</p>
          <p><strong>Room:</strong> ${alertData.roomName}</p>
          <p><strong>Date:</strong> ${new Date(alertData.date).toLocaleDateString()}</p>
          <p><strong>Alert Type:</strong> ${alertData.alertType}</p>
          <p><strong>Message:</strong> ${alertData.message}</p>
        </div>
        
        <p>Please review and take necessary action.</p>
        <p>Best regards,<br>Hotel Extranet System</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html
    });
  }

  // Send system notification email
  async sendSystemNotification(notificationData: any, userEmail: string): Promise<boolean> {
    const subject = `System Notification - ${notificationData.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">System Notification</h2>
        <p>Dear User,</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>${notificationData.title}</h3>
          <p>${notificationData.message}</p>
        </div>
        
        <p>Best regards,<br>Hotel Extranet System</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html
    });
  }
}
