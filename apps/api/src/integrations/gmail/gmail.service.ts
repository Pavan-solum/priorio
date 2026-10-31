import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GmailService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implement Gmail sync service
  // - Fetch emails from Gmail API
  // - Convert to tasks
  // - Handle deduplication
  // - Track sync checkpoints
}
