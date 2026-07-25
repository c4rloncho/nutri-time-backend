import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Paleta de los correos (independiente del sistema de diseño de la app:
// los clientes de correo no soportan backdrop-blur ni gradientes fiables)
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Arial,Helvetica,sans-serif';
const ALT = 'Verdana,Geneva,sans-serif';

const PLUM = '#6D3FA6'; // color base de la cabecera y de los botones
const PLUM_LIGHT = '#A78BFA'; // extremo claro del degradado
const GREY = '#8B8B96'; // cabecera de cancelaciones
const GREY_LIGHT = '#B9B9C4';
const CANVAS = '#EDE9F7';
const CARD = '#F6F2FC';
const LINE = '#E3D6F5';
const INK = '#332B45';
const LABEL = '#8B7BA8';
const BODY = '#5A5568';
const SUBTITLE = '#C9B3E8';
const ICON_PURPLE = '#EADCF8';
const ICON_GREEN = '#DDF2E4';
const ICON_GOLD = '#FBF0D9';
const TIP_BG = '#F1FAF4';
const TIP_INK = '#3E6B52';
const FOOT_BG = '#FAF8FD';
const FOOT_LINE = '#EDE4F9';
const FOOT_INK = '#A697BE';

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
      html: this.shell({
        preheader: 'Tu cuenta está lista: ya puedes agendar tu primera hora.',
        title: '¡Bienvenido a Alma Nutritiva!',
        subtitle: 'Tu cuenta ya está activa',
        greeting: `Hola ${data.fullname} 🎉`,
        intro:
          'Tu cuenta fue creada exitosamente. Ya puedes acceder a la plataforma y agendar horas con nuestros nutricionistas.',
        blocks: this.tip('🥑', 'Primer paso:', 'agenda tu hora y cuéntanos tus objetivos. Con eso armamos tu plan.'),
        footerNote: 'Si no creaste esta cuenta, ignora este correo.',
      }),
    });
  }

  async sendPasswordReset(data: { fullname: string; email: string; resetUrl: string }) {
    await this.send({
      to: data.email,
      subject: '🔑 Restablecer contraseña - Alma Nutritiva',
      html: this.shell({
        preheader: 'Enlace para crear una contraseña nueva (expira en 1 hora).',
        title: 'Restablecer tu contraseña',
        subtitle: 'El enlace expira en 1 hora',
        greeting: `Hola ${data.fullname} 🔐`,
        intro:
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el botón de abajo para crear una nueva.',
        blocks:
          this.button(data.resetUrl, '🔑 Restablecer contraseña') +
          `<tr>
            <td class="fluid-padding" align="center" style="padding:4px 40px 8px 40px;font-family:${SANS};font-size:12px;line-height:18px;color:${LABEL};word-break:break-all;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${data.resetUrl}" style="color:${PLUM};">${data.resetUrl}</a>
            </td>
          </tr>`,
        footerNote:
          'Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.',
      }),
    });
  }

  async sendAppointmentCreated(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';

    await this.send({
      to: data.patientEmail,
      subject: '✅ Cita agendada - Alma Nutritiva',
      html: this.shell({
        preheader: `Tu hora con ${data.nutritionistName} quedó registrada para el ${this.formatLongDate(data.date).toLowerCase()}.`,
        title: 'Tu hora quedó agendada',
        subtitle: 'Pendiente de confirmación',
        greeting: `Hola ${data.patientName} 🎉`,
        intro: `Registramos tu hora con <strong style="color:${INK};">${data.nutritionistName}</strong>. Te avisaremos apenas la confirme.`,
        blocks: this.appointmentBlocks(data, priceText),
        footerNote: 'Te avisaremos cuando el nutricionista confirme tu hora.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '📅 Nueva cita pendiente - Alma Nutritiva',
      html: this.shell({
        preheader: `${data.patientName} agendó una hora contigo. Está pendiente de confirmación.`,
        title: 'Nueva hora pendiente',
        subtitle: 'Requiere tu confirmación',
        greeting: `Hola ${data.nutritionistName} 📋`,
        intro: `<strong style="color:${INK};">${data.patientName}</strong> agendó una hora contigo y está esperando tu respuesta.`,
        blocks: this.appointmentBlocks(data, priceText),
        footerNote: 'Ingresa a Alma Nutritiva para confirmar o rechazar la hora.',
      }),
    });
  }

  async sendAppointmentConfirmed(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';
    const meet = {
      headline: 'Guarda este enlace',
      when: `Lo necesitarás el ${this.formatLongDate(data.date).toLowerCase()} a las ${data.startTime} hrs`,
    };

    await this.send({
      to: data.patientEmail,
      subject: '🎉 Cita confirmada - Alma Nutritiva',
      html: this.shell({
        preheader: `Tu hora con ${data.nutritionistName} quedó confirmada para el ${this.formatLongDate(data.date).toLowerCase()} a las ${data.startTime}.`,
        title: 'Tu hora quedó confirmada',
        subtitle: 'Todo listo para tu próxima consulta',
        greeting: `Hola ${data.patientName} 🎉`,
        intro: `Te confirmamos los datos de tu consulta con <strong style="color:${INK};">${data.nutritionistName}</strong>. Cualquier cambio, avísanos con anticipación.`,
        blocks:
          this.appointmentBlocks(data, priceText, meet) +
          this.tip(
            '🥝',
            'Tip antes de tu consulta:',
            'registra lo que has comido en los últimos 2 días, ¡ayuda mucho a tu nutricionista!',
          ),
        footerNote: 'Recuerda llegar a tiempo. Si necesitas cancelar, hazlo con anticipación.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '📅 Nueva cita confirmada - Alma Nutritiva',
      html: this.shell({
        preheader: `${data.patientName} tiene hora confirmada el ${this.formatLongDate(data.date).toLowerCase()} a las ${data.startTime}.`,
        title: 'Nueva hora en tu agenda',
        subtitle: 'Confirmada',
        greeting: `Hola ${data.nutritionistName} 📅`,
        intro: `<strong style="color:${INK};">${data.patientName}</strong> quedó agendado contigo. Ya está en tu calendario.`,
        blocks: this.appointmentBlocks(data, priceText, meet),
        footerNote: 'Si no puedes atenderla, cancélala desde Alma Nutritiva.',
      }),
    });
  }

  async sendAppointmentReminder(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : 'Por definir';
    const meet = {
      headline: 'Tu videollamada es mañana',
      when: `Entra por aquí a las ${data.startTime} hrs`,
    };

    await this.send({
      to: data.patientEmail,
      subject: '⏰ Recordatorio de cita - Alma Nutritiva',
      html: this.shell({
        preheader: `Mañana a las ${data.startTime} tienes hora con ${data.nutritionistName}.`,
        title: 'Recordatorio de tu hora',
        subtitle: 'Es mañana',
        greeting: `Hola ${data.patientName}, te recordamos tu hora ⏰`,
        intro: `Mañana tienes consulta con <strong style="color:${INK};">${data.nutritionistName}</strong>. Aquí van los datos otra vez.`,
        blocks:
          this.appointmentBlocks(data, priceText, meet) +
          this.tip(
            '🥝',
            'Tip antes de tu consulta:',
            'registra lo que has comido en los últimos 2 días, ¡ayuda mucho a tu nutricionista!',
          ),
        footerNote: 'Si necesitas cancelar, hazlo con anticipación desde la plataforma.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '⏰ Recordatorio de cita - Alma Nutritiva',
      html: this.shell({
        preheader: `Mañana a las ${data.startTime} atiendes a ${data.patientName}.`,
        title: 'Recordatorio de tu hora',
        subtitle: 'Es mañana',
        greeting: `Hola ${data.nutritionistName}, tienes consulta mañana ⏰`,
        intro: `Mañana atiendes a <strong style="color:${INK};">${data.patientName}</strong>.`,
        blocks: this.appointmentBlocks(data, priceText, meet),
        footerNote: 'Ingresa a Alma Nutritiva para ver los detalles.',
      }),
    });
  }

  async sendAppointmentCancelled(data: AppointmentEmailData, cancelledBy: 'patient' | 'nutritionist') {
    const cancelledByText = cancelledBy === 'patient' ? data.patientName : data.nutritionistName;

    await this.send({
      to: data.patientEmail,
      subject: '❌ Cita cancelada - Alma Nutritiva',
      html: this.shell({
        headerColor: GREY,
        headerLight: GREY_LIGHT,
        preheader: `Tu hora del ${this.formatLongDate(data.date).toLowerCase()} fue cancelada.`,
        title: 'Hora cancelada',
        subtitle: 'Ya no está en tu agenda',
        greeting: `Hola ${data.patientName}, tu hora fue cancelada`,
        intro: `La consulta con <strong style="color:${INK};">${data.nutritionistName}</strong> fue cancelada por <strong style="color:${INK};">${cancelledByText}</strong>.`,
        blocks: this.appointmentBlocks({ ...data, isOnline: false }, '-'),
        footerNote: 'Puedes agendar una nueva hora cuando gustes.',
      }),
    });

    await this.send({
      to: data.nutritionistEmail,
      subject: '❌ Cita cancelada - Alma Nutritiva',
      html: this.shell({
        headerColor: GREY,
        headerLight: GREY_LIGHT,
        preheader: `La hora del ${this.formatLongDate(data.date).toLowerCase()} con ${data.patientName} fue cancelada.`,
        title: 'Hora cancelada',
        subtitle: 'El horario quedó libre',
        greeting: `Hola ${data.nutritionistName}, se canceló una hora`,
        intro: `La consulta con <strong style="color:${INK};">${data.patientName}</strong> fue cancelada por <strong style="color:${INK};">${cancelledByText}</strong>.`,
        blocks: this.appointmentBlocks({ ...data, isOnline: false }, '-'),
        footerNote: 'El horario quedó libre automáticamente.',
      }),
    });
  }

  async sendAppointmentCompleted(data: AppointmentEmailData) {
    const priceText = data.price ? `$${data.price}` : '-';

    await this.send({
      to: data.patientEmail,
      subject: '✨ Sesión completada - Alma Nutritiva',
      html: this.shell({
        preheader: `Tu sesión con ${data.nutritionistName} quedó registrada como completada.`,
        title: '¡Sesión completada!',
        subtitle: 'Gracias por confiar en nosotros',
        greeting: `Hola ${data.patientName} ✨`,
        intro: `Tu sesión con <strong style="color:${INK};">${data.nutritionistName}</strong> fue marcada como completada.`,
        blocks:
          this.appointmentBlocks({ ...data, isOnline: false }, priceText) +
          this.tip('🍏', 'Para no perder el hilo:', 'registra tu progreso en Alma Nutritiva y llega con datos frescos a la próxima.'),
        footerNote: 'Puedes agendar tu siguiente sesión cuando quieras.',
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

  /** Ficha + personas + (si aplica) bloque de videollamada. Todos son <tr> del shell. */
  private appointmentBlocks(
    data: AppointmentEmailData,
    priceText: string,
    meet?: { headline: string; when: string },
  ): string {
    return (
      this.detailsCard([
        { icon: '📅', bg: ICON_PURPLE, label: 'Fecha', value: this.formatLongDate(data.date) },
        { icon: '🕒', bg: ICON_PURPLE, label: 'Horario', value: `${data.startTime} — ${data.endTime} hrs` },
        { icon: '⏱️', bg: ICON_PURPLE, label: 'Duración', value: `${data.duration} minutos` },
        {
          icon: data.isOnline ? '💻' : '📍',
          bg: ICON_GREEN,
          label: 'Modalidad',
          value: data.isOnline ? 'Videollamada' : 'Presencial',
        },
        { icon: '💲', bg: ICON_GOLD, label: 'Valor', value: priceText },
      ]) +
      this.people(data.patientName, data.nutritionistName) +
      (meet ? this.meetBlock(data, meet.headline, meet.when) : '')
    );
  }

  private detailsCard(rows: { icon: string; bg: string; label: string; value: string }[]): string {
    const cells = rows
      .map(
        (r, i) => `
        ${i ? `<tr><td colspan="2" style="border-bottom:1px solid ${LINE};font-size:1px;line-height:1px;">&nbsp;</td></tr>` : ''}
        <tr>
          <td width="40" valign="top" style="padding:10px 0;">
            <table cellpadding="0" cellspacing="0" border="0"><tr><td width="34" height="34" align="center" valign="middle" bgcolor="${r.bg}" style="background-color:${r.bg};border-radius:50%;font-size:16px;">${r.icon}</td></tr></table>
          </td>
          <td valign="middle" style="padding:10px 0 10px 14px;font-family:${SANS};">
            <span style="display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${LABEL};font-weight:bold;">${r.label}</span>
            <span style="display:block;font-size:15px;color:${INK};padding-top:2px;">${r.value}</span>
          </td>
        </tr>`,
      )
      .join('');

    return `
      <tr>
        <td class="fluid-padding" style="padding:20px 40px 8px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD};border-radius:14px;">
            <tr>
              <td style="padding:22px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  private people(patientName: string, nutritionistName: string): string {
    const col = (label: string, value: string, pad: string) => `
      <td class="stack-col" width="50%" valign="top" style="font-family:${SANS};${pad}">
        <span style="display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${LABEL};font-weight:bold;">${label}</span>
        <span style="display:block;font-size:15px;color:${INK};padding-top:3px;">${value}</span>
      </td>`;

    return `
      <tr>
        <td class="fluid-padding" style="padding:18px 40px 6px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${col('Paciente', patientName, 'padding-right:10px;')}
              ${col('Nutricionista', nutritionistName, 'padding-left:10px;')}
            </tr>
          </table>
        </td>
      </tr>`;
  }

  /**
   * Va SIEMPRE después de la ficha: primero cuándo es la hora, después el enlace,
   * para no invitar a entrar antes de tiempo. Si la cita es online pero aún no hay
   * link (nutricionista sin Google Calendar conectado) avisa en vez de callar.
   */
  private meetBlock(data: AppointmentEmailData, headline: string, when: string): string {
    if (!data.isOnline) return '';

    if (!data.meetLink) {
      return `
        <tr>
          <td class="fluid-padding" align="center" style="padding:22px 40px 4px 40px;font-family:${SANS};font-size:13px;line-height:20px;color:${LABEL};">
            El enlace de la videollamada te llegará a este correo antes de tu hora.
          </td>
        </tr>`;
    }

    return `
      <tr>
        <td class="fluid-padding" align="center" style="padding:24px 40px 0 40px;font-family:${SANS};">
          <span style="display:block;font-size:15px;font-weight:bold;color:${INK};">${headline}</span>
          <span style="display:block;font-size:13px;color:${LABEL};padding-top:4px;">${when}</span>
        </td>
      </tr>
      ${this.button(data.meetLink, '🎥 Unirse a la videollamada')}
      <tr>
        <td class="fluid-padding" align="center" style="padding:0 40px 4px 40px;font-family:${SANS};font-size:11px;color:${FOOT_INK};word-break:break-all;">
          ${data.meetLink}
        </td>
      </tr>`;
  }

  private tip(icon: string, strong: string, text: string): string {
    return `
      <tr>
        <td class="fluid-padding" style="padding:20px 40px 8px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${TIP_BG};border-radius:10px;">
            <tr>
              <td style="padding:14px 18px;font-family:${SANS};font-size:13px;line-height:19px;color:${TIP_INK};">
                ${icon} <strong>${strong}</strong> ${text}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  /** Botón "bulletproof": tabla + bgcolor para que Outlook lo respete */
  private button(href: string, label: string): string {
    return `
      <tr>
        <td class="fluid-padding" align="center" style="padding:22px 40px 8px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" bgcolor="${PLUM}" style="background-color:${PLUM};border-radius:10px;">
                <a href="${href}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${SANS};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:10px;">${label}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  /**
   * Marca de la cabecera. Con MAIL_LOGO_URL usa la imagen (PNG: los clientes de
   * correo no renderizan SVG); si no está configurada cae al nombre en texto.
   */
  private brand(): string {
    const logo = this.configService.get<string>('MAIL_LOGO_URL');

    if (!logo) {
      return `<span style="font-family:${SERIF};font-size:15px;letter-spacing:1px;color:#FFFFFF;">Alma Nutritiva</span>`;
    }

    // Pastilla blanca: el logo es verde/durazno y sobre la cabecera de color
    // pierde contraste. En Outlook el border-radius se ignora y queda cuadrada.
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="middle" bgcolor="#FFFFFF" width="72" height="72" style="background-color:#FFFFFF;border-radius:36px;">
            <img src="${logo}" width="46" alt="Alma Nutritiva" style="display:block;width:46px;max-width:46px;height:auto;border:0;margin:0 auto;">
          </td>
        </tr>
      </table>`;
  }

  /**
   * Estructura común de todos los correos. `blocks` son <tr> ya armados
   * (ficha, personas, botón, tip) que se insertan entre el saludo y el pie.
   */
  private shell({
    preheader,
    title,
    subtitle,
    greeting,
    intro,
    blocks = '',
    footerNote,
    headerColor = PLUM,
    headerLight = PLUM_LIGHT,
  }: {
    preheader: string;
    title: string;
    subtitle: string;
    greeting: string;
    intro: string;
    blocks?: string;
    footerNote: string;
    headerColor?: string;
    headerLight?: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }

  @media only screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .fluid-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .stack-col { display: block !important; width: 100% !important; text-align: left !important; padding-bottom: 12px !important; }
    .header-title { font-size: 22px !important; }
    .greeting-text { font-size: 19px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${CANVAS};">

<!-- Preheader: texto de vista previa en la bandeja, oculto en el cuerpo -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${preheader}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};">
  <tr>
    <td align="center" style="padding: 32px 16px;">

      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:16px; overflow:hidden;">

        <!-- Cabecera. bgcolor es el fallback: Outlook ignora el degradado CSS -->
        <tr>
          <td align="center" bgcolor="${headerColor}" style="background-color:${headerColor}; background-image:linear-gradient(135deg, ${headerColor} 0%, ${headerLight} 100%); padding: 36px 24px 34px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:16px;">
                  ${this.brand()}
                </td>
              </tr>
              <tr>
                <td align="center" class="header-title" style="font-family:${SERIF}; font-size:26px; color:#FFFFFF; font-weight:bold; padding-bottom:6px;">
                  ${title}
                </td>
              </tr>
              <tr>
                <td align="center" style="font-family:${ALT}; font-size:13px; color:${SUBTITLE};">
                  ${subtitle}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td class="fluid-padding" style="padding: 32px 40px 8px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" class="greeting-text" style="font-family:${SERIF}; font-size:21px; color:#4C1D95; font-weight:bold; padding-bottom:10px;">
                  ${greeting}
                </td>
              </tr>
              <tr>
                <td align="left" style="font-family:${SANS}; font-size:14px; line-height:22px; color:${BODY};">
                  ${intro}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${blocks}

        <!-- Nota final -->
        <tr>
          <td class="fluid-padding" style="padding: 18px 40px 32px 40px; font-family:${SANS}; font-size:13px; line-height:19px; color:${LABEL};">
            ${footerNote}
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td bgcolor="${FOOT_BG}" style="background-color:${FOOT_BG}; padding: 24px 40px; border-top:1px solid ${FOOT_LINE};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="font-family:${ALT}; font-size:12px; color:${FOOT_INK}; line-height:20px;">
                  © ${new Date().getFullYear()} Alma Nutritiva &nbsp;·&nbsp; Nutrición con acompañamiento<br>
                  Este es un correo automático, por favor no respondas directamente a este mensaje.
                </td>
              </tr>
            </table>
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
