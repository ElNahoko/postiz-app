import {
  Body,
  Controller,
  Post,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('provision')
  async provision(
    @Headers('authorization') authHeader: string,
    @Body() body: { workspaceId?: string; workspaceName?: string }
  ) {
    // Validate admin secret
    const expectedSecret = process.env.POSTIZ_ADMIN_SECRET;
    if (!expectedSecret) {
      throw new HttpException(
        'Admin endpoint not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (
      !token ||
      token.length !== expectedSecret.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expectedSecret))
    ) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Validate body
    const { workspaceId, workspaceName } = body;
    if (!workspaceId || !workspaceName) {
      throw new HttpException(
        'workspaceId and workspaceName are required',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.adminService.provisionWorkspace(workspaceId, workspaceName);
  }
}
