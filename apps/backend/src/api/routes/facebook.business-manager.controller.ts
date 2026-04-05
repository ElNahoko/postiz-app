import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { FacebookProvider } from '@gitroom/nestjs-libraries/integrations/social/facebook.provider';

@ApiTags('Facebook Business Manager')
@Controller('/integrations/facebook/business-manager')
export class FacebookBusinessManagerController {
  constructor(
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService
  ) {}

  private async getFacebookProviderAndToken(
    orgId: string,
    integrationId: string
  ): Promise<{ provider: FacebookProvider; token: string }> {
    const integration = await this._integrationService.getIntegrationById(
      orgId,
      integrationId
    );
    if (!integration) {
      throw new Error('Integration not found');
    }

    const provider = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );
    if (provider.identifier !== 'facebook') {
      throw new Error('Integration is not a Facebook provider');
    }

    return { provider: provider as FacebookProvider, token: integration.token };
  }

  @Get('/businesses')
  @CheckPolicies([AuthorizationActions.Read, Sections.CHANNEL])
  async listBusinesses(
    @GetOrgFromRequest() org: Organization,
    @Query('integrationId') integrationId: string
  ) {
    const { provider, token } = await this.getFacebookProviderAndToken(
      org.id,
      integrationId
    );
    return provider.listBusinesses(token);
  }

  @Post('/invite-member')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async inviteMember(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      integrationId: string;
      businessId: string;
      email: string;
      role: string;
    }
  ) {
    const { provider, token } = await this.getFacebookProviderAndToken(
      org.id,
      body.integrationId
    );
    return provider.inviteMember(token, {
      businessId: body.businessId,
      email: body.email,
      role: body.role,
    });
  }

  @Post('/assign-asset')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async assignAsset(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      integrationId: string;
      businessId: string;
      userId: string;
      assetId: string;
      tasks: string[];
    }
  ) {
    const { provider, token } = await this.getFacebookProviderAndToken(
      org.id,
      body.integrationId
    );
    return provider.assignAsset(token, {
      businessId: body.businessId,
      userId: body.userId,
      assetId: body.assetId,
      tasks: body.tasks,
    });
  }

  @Post('/assign-asset-group')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async assignAssetGroup(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      integrationId: string;
      businessId: string;
      assetGroupId: string;
      assetId: string;
      assetType: string;
    }
  ) {
    const { provider, token } = await this.getFacebookProviderAndToken(
      org.id,
      body.integrationId
    );
    return provider.assignAssetGroup(token, {
      businessId: body.businessId,
      assetGroupId: body.assetGroupId,
      assetId: body.assetId,
      assetType: body.assetType,
    });
  }

  @Delete('/remove-access')
  @CheckPolicies([AuthorizationActions.Delete, Sections.CHANNEL])
  async removeAccess(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      integrationId: string;
      businessId: string;
      userId: string;
      assetId: string;
    }
  ) {
    const { provider, token } = await this.getFacebookProviderAndToken(
      org.id,
      body.integrationId
    );
    return provider.removeAccess(token, {
      businessId: body.businessId,
      userId: body.userId,
      assetId: body.assetId,
    });
  }
}
