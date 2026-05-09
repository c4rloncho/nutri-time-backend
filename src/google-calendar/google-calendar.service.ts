import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly configService: ConfigService) {}

  private createClient(): OAuth2Client {
    const backendUrl = this.configService.get<string>('BACKEND_URL') ?? 'http://localhost:3000';
    return new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      `${backendUrl}/auth/google/calendar/callback`,
    );
  }

  getAuthUrl(state: string): string {
    const client = this.createClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiry: Date | null;
  }> {
    const client = this.createClient();
    const { tokens } = await client.getToken(code);
    return {
      accessToken: tokens.access_token ?? '',
      refreshToken: tokens.refresh_token ?? null,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
  }

  async createMeetEvent(
    accessToken: string,
    refreshToken: string | null,
    date: string,
    startTime: string,
    endTime: string,
    nutritionistName: string,
    patientName: string,
  ): Promise<string | null> {
    const client = this.createClient();
    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    const tz = this.configService.get<string>('APPOINTMENT_TIMEZONE') ?? 'America/Lima';
    const calendar = google.calendar({ version: 'v3', auth: client });

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: `Consulta nutricional: ${nutritionistName} - ${patientName}`,
          start: { dateTime: `${date}T${startTime}:00`, timeZone: tz },
          end: { dateTime: `${date}T${endTime}:00`, timeZone: tz },
          conferenceData: {
            createRequest: {
              requestId: `nutri-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
      });

      return (
        response.data.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === 'video',
        )?.uri ?? null
      );
    } catch (error) {
      this.logger.error(`Error creando evento Meet: ${error.message}`);
      return null;
    }
  }
}
