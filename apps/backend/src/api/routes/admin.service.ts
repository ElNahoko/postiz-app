import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Role } from '@prisma/client';
import { sign } from 'jsonwebtoken';

@Injectable()
export class AdminService {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _user: PrismaRepository<'user'>,
    private _userOrganization: PrismaRepository<'userOrganization'>
  ) {}

  async provisionWorkspace(workspaceId: string, workspaceName: string) {
    // Check for existing provision via providerId prefix for idempotency
    const existingUser = await this._user.model.user.findFirst({
      where: { providerId: `articleops:${workspaceId}` },
    });

    if (existingUser) {
      const apiKey = this.generateLongLivedApiKey(existingUser);
      return { apiKey, alreadyProvisioned: true };
    }

    // Create organization with nested user (follows existing createOrgAndUser pattern)
    const org = await this._organization.model.organization.create({
      data: {
        name: workspaceName,
        apiKey: AuthChecker.fixedEncryption(makeId(20)),
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              create: {
                activated: true,
                email: `workspace-${workspaceId}@articleops.internal`,
                name: workspaceName,
                providerName: 'LOCAL',
                password: AuthChecker.hashPassword(makeId(64)),
                providerId: `articleops:${workspaceId}`,
                timezone: 0,
              },
            },
          },
        },
      },
      select: {
        id: true,
        users: {
          select: {
            user: true,
          },
        },
      },
    });

    const user = org.users[0].user;
    const apiKey = this.generateLongLivedApiKey(user);

    return { apiKey };
  }

  private generateLongLivedApiKey(user: { id: string }): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new HttpException(
        'JWT_SECRET not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Long-lived token (10 years) — effectively a permanent API key
    return sign({ id: user.id }, secret, { expiresIn: '3650d' });
  }
}
