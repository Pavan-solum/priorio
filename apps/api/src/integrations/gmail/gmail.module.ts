import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}
