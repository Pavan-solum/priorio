import { Module } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { EncryptionService } from './encryption.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  providers: [OAuthService, EncryptionService],
  controllers: [OAuthController],
  exports: [OAuthService, EncryptionService],
})
export class OAuthModule {}
