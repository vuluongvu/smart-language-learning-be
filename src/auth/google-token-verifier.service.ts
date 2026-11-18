import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleTokenVerifierService {
  private readonly oauthClient = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  getClientConfig(): { enabled: boolean; clientId: string | null } {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim();
    return {
      enabled: Boolean(clientId),
      clientId: clientId || null,
    };
  }

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Google Sign-In is not configured on the server',
      );
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID token payload');
      }

      if (!payload.email_verified) {
        throw new UnauthorizedException(
          'Google account email must be verified',
        );
      }

      return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        emailVerified: payload.email_verified,
        displayName:
          payload.name?.trim() || payload.email.split('@')[0] || 'Learner',
        avatarUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired Google ID token');
    }
  }
}
