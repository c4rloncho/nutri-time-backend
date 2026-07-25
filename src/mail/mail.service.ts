import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Paleta alineada con el sistema de diseño de la app
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const PURPLE = '#7C3AED';
const VIOLET = '#8B5CF6';
const INK = '#1E293B';
const MUTED = '#64748B';
const FAINT = '#94A3B8';
const LINE = '#E8E5F5';
const CANVAS = '#F1EFF8';

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
  isOnline: boolean;
  meetLink?: string | null;
}

export interface WelcomeEmailData {
  fullname: string;
  email: string;
}

@Injectable()
export class MailService {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') ?? '';
    // Debe coincidir con un remitente verificado en Brevo
    this.from = this.configService.get<string>('MAIL_FROM') ?? '';

    if (!this.apiKey || !this.from) {
      this.logger.warn('BREVO_API_KEY o MAIL_FROM sin configurar: no se enviarán correos');
    }
  }

  async sendWelcome(data: WelcomeEmailData) {
    await this.send({
      to: data.email,
      subject: '¡Bienvenido a Alma Nutritiva! 🥗',
      html: this.appointmentTemplate({
        title: '¡Bienvenido a Alma Nutritiva!',
        greeting: `Hola ${data.fullname},`,
        body: 'Tu cuenta ha sido creada exitosamente. Ya puedes acceder a la plataforma y agendar citas con nuestros nutricionistas.',
        details: '',
        footer: 'Si no creaste esta cuenta, ignora este correo.',
      }),
    });
  }

  async sendPasswordReset(data: { fullname: string; email: string; resetUrl: string }) {
    await this.send({
      to: data.email,
      subject: '🔑 Restablecer contraseña - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: 'Restablecer tu contraseña',
        greeting: `Hola ${data.fullname},`,
        body: `Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el botón de abajo para crear una nueva. El enlace expira en <strong style="color:${INK};">1 hora</strong>.
          <div style="margin:32px 0 20px 0;">${this.button(data.resetUrl, 'Restablecer contraseña')}</div>
          <span style="font-size:13px;color:${FAINT};">O copia y pega este enlace en tu navegador:<br><a href="${data.resetUrl}" style="color:${PURPLE};word-break:break-all;">${data.resetUrl}</a></span>`,
        details: '',
        footer: 'Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.',
      }),
    });
  }

  async sendAppointmentReminder(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';
    const meetSection = this.meetSection(
      data,
      'Tu videollamada es mañana',
      `Entra por aquí a las ${data.startTime} hrs`,
    );

    await this.send({
      to: data.patientEmail,
      subject: '⏰ Recordatorio de cita - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: 'Recordatorio: tienes una cita mañana',
        greeting: `Hola ${data.patientName},`,
        body: `Te recordamos que mañana tienes una cita con <strong style="color:${INK};">${data.nutritionistName}</strong>.`,
        details: this.detailsTable(data, priceText) + meetSection,
        footer: 'Si necesitas cancelar, hazlo con anticipación desde la plataforma.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '⏰ Recordatorio de cita - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: 'Recordatorio: tienes una cita mañana',
        greeting: `Hola ${data.nutritionistName},`,
        body: `Te recordamos que mañana tienes una cita con <strong style="color:${INK};">${data.patientName}</strong>.`,
        details: this.detailsTable(data, priceText) + meetSection,
        footer: 'Ingresa a Alma Nutritiva para ver los detalles.',
      }),
    });
  }

  async sendAppointmentCreated(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';

    await this.send({
      to: data.patientEmail,
      subject: '✅ Cita agendada - Alma Nutritiva',
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
      subject: '📅 Nueva cita pendiente - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: 'Nueva cita pendiente',
        greeting: `Hola ${data.nutritionistName},`,
        body: `<strong>${data.patientName}</strong> ha agendado una cita contigo.`,
        details: this.detailsTable(data, priceText),
        footer: 'Ingresa a Alma Nutritiva para confirmar o rechazar la cita.',
      }),
    });
  }

  async sendAppointmentConfirmed(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';
    const meetSection = this.meetSection(
      data,
      'Guarda este enlace',
      `Lo necesitarás el ${this.formatLongDate(data.date).toLowerCase()} a las ${data.startTime} hrs`,
    );

    await this.send({
      to: data.patientEmail,
      subject: '🎉 Cita confirmada - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: '¡Tu cita ha sido confirmada!',
        greeting: `Hola ${data.patientName},`,
        body: `Tu cita con <strong style="color:${INK};">${data.nutritionistName}</strong> quedó confirmada. ¡Te esperamos!`,
        details: this.detailsTable(data, priceText) + meetSection,
        footer: 'Recuerda llegar a tiempo. Si necesitas cancelar, hazlo con anticipación.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '📅 Nueva cita confirmada - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: 'Nueva cita en tu agenda',
        greeting: `Hola ${data.nutritionistName},`,
        body: `<strong style="color:${INK};">${data.patientName}</strong> agendó una cita contigo.`,
        details: this.detailsTable(data, priceText) + meetSection,
        footer: 'Si no puedes atenderla, cancélala desde Alma Nutritiva.',
      }),
    });
  }

  async sendAppointmentCancelled(data: AppointmentEmailData, cancelledBy: 'patient' | 'nutritionist') {
    const cancelledByText = cancelledBy === 'patient' ? data.patientName : data.nutritionistName;

    await this.send({
      to: data.patientEmail,
      subject: '❌ Cita cancelada - Alma Nutritiva',
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
      subject: '❌ Cita cancelada - Alma Nutritiva',
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
      subject: '✨ Sesión completada - Alma Nutritiva',
      html: this.appointmentTemplate({
        title: '¡Sesión completada!',
        greeting: `Hola ${data.patientName},`,
        body: `Tu sesión con <strong>${data.nutritionistName}</strong> ha sido marcada como completada. ¡Gracias por confiar en nosotros!`,
        details: this.detailsTable(data, priceText),
        footer: 'Recuerda registrar tu progreso en Alma Nutritiva para seguir tu evolución.',
      }),
    });
  }

  private async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    // TEST_EMAIL redirige todo a una sola bandeja; déjalo vacío para entregar al destinatario real
    const recipient = this.configService.get<string>('TEST_EMAIL') || to;

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: this.from, name: 'Alma Nutritiva' },
          to: [{ email: recipient }],
          subject,
          htmlContent: html,
        }),
      });

      // fetch no lanza en 4xx/5xx: sin esto los rechazos de Brevo serían invisibles
      if (!res.ok) {
        this.logger.error(
          `Brevo rechazó el envío a ${recipient} (${res.status}): ${await res.text()}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipient}: ${error.message}`);
    }
  }

  /** 'YYYY-MM-DD' → 'Martes, 28 de julio de 2026' */
  private formatLongDate(date: string): string {
    // Mediodía UTC: inmune a corrimientos de zona que cambiarían el día
    const d = new Date(`${date}T12:00:00Z`);
    if (isNaN(d.getTime())) return date;

    const text = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Botón "bulletproof": tabla + bgcolor para que Outlook lo respete */
  private button(href: string, label: string): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td align="center" bgcolor="${PURPLE}" style="border-radius:10px;">
            <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Bloque del Meet. Va SIEMPRE después de los detalles: primero cuándo es la
   * cita, después el enlace, para no invitar a entrar antes de tiempo.
   * Si la cita es online pero aún no hay link (nutricionista sin Google Calendar
   * conectado) avisa en vez de callar: el paciente igual necesita saber que va por video.
   */
  private meetSection(data: AppointmentEmailData, headline: string, when: string): string {
    if (!data.isOnline) return '';

    const body = data.meetLink
      ? `<p style="margin:0 0 4px 0;font-family:${FONT};font-size:16px;font-weight:bold;color:${INK};">${headline}</p>
         <p style="margin:0 0 18px 0;font-family:${FONT};font-size:14px;color:${MUTED};">${when}</p>
         ${this.button(data.meetLink, 'Unirse a Google Meet')}
         <p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;color:${FAINT};word-break:break-all;">${data.meetLink}</p>`
      : `<p style="margin:0 0 4px 0;font-family:${FONT};font-size:16px;font-weight:bold;color:${INK};">El enlace está en camino</p>
         <p style="margin:0;font-family:${FONT};font-size:14px;color:${MUTED};">Te enviaremos el link de la videollamada por correo antes de la cita.</p>`;

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px 0;">
        <tr>
          <td style="background:${CANVAS};border:1px solid ${LINE};border-radius:14px;padding:24px;text-align:center;">
            <p style="margin:0 0 4px 0;font-family:${FONT};font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">Consulta online</p>
            ${body}
          </td>
        </tr>
      </table>`;
  }

  private detailsTable(data: AppointmentEmailData, priceText: string): string {
    const rows: [string, string][] = [
      ['Fecha', this.formatLongDate(data.date)],
      ['Horario', `${data.startTime} — ${data.endTime} hrs`],
      ['Duración', `${data.duration} minutos`],
      ['Modalidad', data.isOnline ? 'Videollamada' : 'Presencial'],
      ['Valor', priceText],
    ];

    const cells = rows
      .map(
        ([label, value], i) => `
        <tr>
          <td style="padding:14px 0;font-family:${FONT};font-size:14px;color:${MUTED};${i ? `border-top:1px solid ${LINE};` : ''}">${label}</td>
          <td align="right" style="padding:14px 0;font-family:${FONT};font-size:14px;font-weight:bold;color:${INK};${i ? `border-top:1px solid ${LINE};` : ''}">${value}</td>
        </tr>`,
      )
      .join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td style="background:#ffffff;border:1px solid ${LINE};border-radius:14px;padding:6px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${cells}
            </table>
          </td>
        </tr>
      </table>`;
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
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
  <!-- Preheader: texto de vista previa en la bandeja, oculto en el cuerpo -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

          <!-- Cabecera -->
          <tr>
            <td style="background:${PURPLE};background-image:linear-gradient(135deg,${PURPLE},${VIOLET});border-radius:18px 18px 0 0;padding:32px;text-align:center;">
              <p style="margin:0;font-family:${FONT};font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">
                Alma Nutritiva
              </p>
              <p style="margin:6px 0 0 0;font-family:${FONT};font-size:12px;color:#EDE9FE;letter-spacing:0.5px;">
                Nutrición con acompañamiento
              </p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="background:#ffffff;border:1px solid ${LINE};border-top:none;border-radius:0 0 18px 18px;padding:40px 32px 32px 32px;">
              <h1 style="margin:0 0 20px 0;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:bold;color:${INK};letter-spacing:-0.4px;">
                ${title}
              </h1>
              <p style="margin:0 0 12px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">
                ${greeting}
              </p>
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};">
                ${body}
              </p>
              ${details}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid ${LINE};padding-top:20px;">
                    <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${FAINT};">
                      ${footer}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${FAINT};">
                © ${new Date().getFullYear()} Alma Nutritiva<br>
                Correo automático — no es necesario responder.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
