import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface AppointmentEmailData {
  patientName: string;
  patientEmail: string;
  nutritionistName: string;
  nutritionistEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number | null;
}

export interface WelcomeEmailData {
  fullname: string;
  email: string;
}

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('MAIL_FROM') ?? 'onboarding@resend.dev';
  }

  async sendWelcome(data: WelcomeEmailData) {
    await this.send({
      to: data.email,
      subject: '¡Bienvenido a Nutri Time! 🥗',
      html: this.appointmentTemplate({
        title: '¡Bienvenido a Nutri Time!',
        greeting: `Hola ${data.fullname},`,
        body: 'Tu cuenta ha sido creada exitosamente. Ya puedes acceder a la plataforma y agendar citas con nuestros nutricionistas.',
        details: '',
        footer: 'Si no creaste esta cuenta, ignora este correo.',
      }),
    });
  }

  async sendAppointmentReminder(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';

    await this.send({
      to: data.patientEmail,
      subject: '⏰ Recordatorio de cita - Nutri Time',
      html: this.appointmentTemplate({
        title: 'Recordatorio: tienes una cita mañana',
        greeting: `Hola ${data.patientName},`,
        body: `Te recordamos que mañana tienes una cita con <strong>${data.nutritionistName}</strong>.`,
        details: this.detailsTable(data, priceText),
        footer: 'Si necesitas cancelar, hazlo con anticipación desde la plataforma.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '⏰ Recordatorio de cita - Nutri Time',
      html: this.appointmentTemplate({
        title: 'Recordatorio: tienes una cita mañana',
        greeting: `Hola ${data.nutritionistName},`,
        body: `Te recordamos que mañana tienes una cita con <strong>${data.patientName}</strong>.`,
        details: this.detailsTable(data, priceText),
        footer: 'Ingresa a Nutri Time para ver los detalles.',
      }),
    });
  }

  async sendAppointmentCreated(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';

    await this.send({
      to: data.patientEmail,
      subject: '✅ Cita agendada - Nutri Time',
      html: this.appointmentTemplate({
        title: '¡Cita agendada exitosamente!',
        greeting: `Hola ${data.patientName},`,
        body: `Tu cita con <strong>${data.nutritionistName}</strong> ha sido registrada y está pendiente de confirmación.`,
        details: this.detailsTable(data, priceText),
        footer: 'Te avisaremos cuando el nutricionista confirme tu cita.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '📅 Nueva cita pendiente - Nutri Time',
      html: this.appointmentTemplate({
        title: 'Nueva cita pendiente',
        greeting: `Hola ${data.nutritionistName},`,
        body: `<strong>${data.patientName}</strong> ha agendado una cita contigo.`,
        details: this.detailsTable(data, priceText),
        footer: 'Ingresa a Nutri Time para confirmar o rechazar la cita.',
      }),
    });
  }

  async sendAppointmentConfirmed(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';

    await this.send({
      to: data.patientEmail,
      subject: '🎉 Cita confirmada - Nutri Time',
      html: this.appointmentTemplate({
        title: '¡Tu cita ha sido confirmada!',
        greeting: `Hola ${data.patientName},`,
        body: `<strong>${data.nutritionistName}</strong> ha confirmado tu cita. ¡Te esperamos!`,
        details: this.detailsTable(data, priceText),
        footer: 'Recuerda llegar a tiempo. Si necesitas cancelar, hazlo con anticipación.',
      }),
    });
  }

  async sendAppointmentCancelled(data: AppointmentEmailData, cancelledBy: 'patient' | 'nutritionist') {
    const cancelledByText = cancelledBy === 'patient' ? data.patientName : data.nutritionistName;

    await this.send({
      to: data.patientEmail,
      subject: '❌ Cita cancelada - Nutri Time',
      html: this.appointmentTemplate({
        title: 'Cita cancelada',
        greeting: `Hola ${data.patientName},`,
        body: `La cita con <strong>${data.nutritionistName}</strong> fue cancelada por <strong>${cancelledByText}</strong>.`,
        details: this.detailsTable(data, '-'),
        footer: 'Puedes agendar una nueva cita cuando gustes.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '❌ Cita cancelada - Nutri Time',
      html: this.appointmentTemplate({
        title: 'Cita cancelada',
        greeting: `Hola ${data.nutritionistName},`,
        body: `La cita con <strong>${data.patientName}</strong> fue cancelada por <strong>${cancelledByText}</strong>.`,
        details: this.detailsTable(data, '-'),
        footer: 'El horario quedó libre automáticamente.',
      }),
    });
  }

  async sendAppointmentCompleted(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : '-';

    await this.send({
      to: data.patientEmail,
      subject: '✨ Sesión completada - Nutri Time',
      html: this.appointmentTemplate({
        title: '¡Sesión completada!',
        greeting: `Hola ${data.patientName},`,
        body: `Tu sesión con <strong>${data.nutritionistName}</strong> ha sido marcada como completada. ¡Gracias por confiar en nosotros!`,
        details: this.detailsTable(data, priceText),
        footer: 'Recuerda registrar tu progreso en Nutri Time para seguir tu evolución.',
      }),
    });
  }

  private async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const recipient = isProduction
      ? to
      : (this.configService.get<string>('TEST_EMAIL') ?? to);

    try {
      await this.resend.emails.send({ from: this.from, to: recipient, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipient}: ${error.message}`);
    }
  }

  private detailsTable(data: AppointmentEmailData, priceText: string): string {
    return `
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px;border:1px solid #d1fae5;font-weight:bold;width:40%;">📅 Fecha</td>
          <td style="padding:10px;border:1px solid #d1fae5;">${data.date}</td>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #d1fae5;font-weight:bold;">🕐 Horario</td>
          <td style="padding:10px;border:1px solid #d1fae5;">${data.startTime} - ${data.endTime}</td>
        </tr>
        <tr style="background:#f0fdf4;">
          <td style="padding:10px;border:1px solid #d1fae5;font-weight:bold;">⏱ Duración</td>
          <td style="padding:10px;border:1px solid #d1fae5;">${data.duration} minutos</td>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #d1fae5;font-weight:bold;">💰 Precio</td>
          <td style="padding:10px;border:1px solid #d1fae5;">${priceText}</td>
        </tr>
      </table>
    `;
  }

  private appointmentTemplate({
    title,
    greeting,
    body,
    details,
    footer,
  }: {
    title: string;
    greeting: string;
    body: string;
    details: string;
    footer: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937;">
        <div style="background:#16a34a;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">🥗 Nutri Time</h1>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <h2 style="color:#15803d;margin-top:0;">${title}</h2>
          <p>${greeting}</p>
          <p>${body}</p>
          ${details}
          <p style="color:#6b7280;font-size:14px;">${footer}</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
          © ${new Date().getFullYear()} Nutri Time. Este es un correo automático, no respondas a este mensaje.
        </p>
      </body>
      </html>
    `;
  }
}
