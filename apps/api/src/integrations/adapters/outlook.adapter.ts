import { Injectable, Logger } from '@nestjs/common';

/**
 * OutlookAdapter: Formats Outlook emails and events to Priorio standard format
 * - Email formatting
 * - Calendar event adaptation
 * - Metadata extraction
 */
@Injectable()
export class OutlookAdapter {
  private readonly logger = new Logger(OutlookAdapter.name);

  /**
   * Format Outlook email to standard format
   */
  formatOutlookEmail(email: any): any {
    return {
      id: email.id,
      type: 'email',
      source: 'outlook',
      subject: email.subject,
      content: email.bodyPreview || '',
      from: {
        email: email.from?.emailAddress?.address,
        name: email.from?.emailAddress?.name,
      },
      to: email.toRecipients?.map((r) => ({
        email: r.emailAddress?.address,
        name: r.emailAddress?.name,
      })) || [],
      cc: email.ccRecipients?.map((r) => ({
        email: r.emailAddress?.address,
        name: r.emailAddress?.name,
      })) || [],
      bcc: email.bccRecipients?.map((r) => ({
        email: r.emailAddress?.address,
        name: r.emailAddress?.name,
      })) || [],
      receivedDateTime: new Date(email.receivedDateTime),
      sentDateTime: new Date(email.sentDateTime),
      isRead: email.isRead,
      isImportant: email.importance === 'high',
      hasAttachments: email.hasAttachments,
      categories: email.categories || [],
      attachments: email.attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        contentType: a.contentType,
      })) || [],
      metadata: {
        conversationId: email.conversationId,
        parentFolderId: email.parentFolderId,
        webLink: email.webLink,
        isAutoResponder: email.isAutoResponded,
      },
    };
  }

  /**
   * Extract actionable items from email
   */
  extractActionItems(email: any): any[] {
    const actions = [];
    const content = email.bodyPreview || '';

    // Simple pattern matching for action items
    const patterns = [
      /please\s+(?:send|provide|share|update)\s+(.+?)(?:\.|,|$)/gi,
      /can\s+you\s+(.+?)(?:\?|$)/gi,
      /action\s+item:\s*(.+?)(?:\.|,|$)/gi,
      /TODO:\s*(.+?)(?:\.|,|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        actions.push({
          type: 'action-item',
          description: match[1].trim(),
          priority: 'medium',
          source: 'email',
        });
      }
    }

    return actions;
  }

  /**
   * Categorize email by content
   */
  categorizeEmail(email: any): string {
    const subject = (email.subject || '').toLowerCase();
    const content = (email.bodyPreview || '').toLowerCase();
    const combined = subject + ' ' + content;

    const categories = {
      meeting: /meeting|appointment|calendar|schedule/,
      action: /action required|please review|please approve|to-do|todo|urgent/,
      reply: /re:|fwd:/,
      notification: /notification|alert|update|confirmed|scheduled/,
      spam: /unsubscribe|advertisement|promotional/,
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(combined)) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Extract attachments metadata
   */
  extractAttachmentMetadata(attachments: any[]): any[] {
    return attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      contentType: a.contentType,
      isImage: a.contentType?.startsWith('image/'),
      isDocument: /(?:pdf|doc|docx|xlsx|xls|ppt|pptx)$/i.test(a.name),
      ext: a.name?.split('.')?.pop()?.toLowerCase(),
    })) || [];
  }

  /**
   * Format email for task creation
   */
  formatEmailAsTask(email: any): any {
    const actionItems = this.extractActionItems(email);

    return {
      title: `Task: ${email.subject}`,
      description: `From: ${email.from?.emailAddress?.address}\n\n${email.bodyPreview}`,
      priority: email.importance === 'high' ? 'HIGH' : 'MEDIUM',
      source: 'outlook',
      sourceEmail: {
        id: email.id,
        from: email.from?.emailAddress?.address,
        subject: email.subject,
      },
      actionItems,
      dueDate: email.sentDateTime
        ? new Date(new Date(email.sentDateTime).getTime() + 24 * 60 * 60 * 1000)
        : null,
    };
  }

  /**
   * Extract email signatures
   */
  extractSignature(email: any): string | null {
    const content = email.bodyPreview || '';
    const lines = content.split('\n');

    // Look for signature delimiters
    const delimiterIndex = lines.findIndex(
      (line) =>
        line.includes('--') ||
        line.includes('___') ||
        line.includes('==='),
    );

    if (delimiterIndex !== -1) {
      return lines.slice(delimiterIndex).join('\n');
    }

    return null;
  }

  /**
   * Check if email requires response
   */
  requiresResponse(email: any): boolean {
    const content = (email.bodyPreview || '').toLowerCase();
    const responsePatterns = [
      /please\s+reply/,
      /can\s+you/,
      /do\s+you/,
      /would\s+you/,
      /need\s+your\s+feedback/,
      /let\s+me\s+know/,
      /your\s+thoughts/,
      /confirm.*receipt/,
    ];

    return responsePatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Format email for forwarding
   */
  formatForForwarding(email: any): any {
    return {
      subject: `Fwd: ${email.subject}`,
      body: `\n\n-----Original Message-----\nFrom: ${email.from?.emailAddress?.address}\nSent: ${email.sentDateTime}\nSubject: ${email.subject}\n\n${email.bodyPreview}`,
      attachments: email.attachments || [],
    };
  }

  /**
   * Extract email thread participants
   */
  extractParticipants(emails: any[]): any[] {
    const participants = new Map();

    for (const email of emails) {
      const from = email.from?.emailAddress?.address;
      if (from && !participants.has(from)) {
        participants.set(from, {
          email: from,
          name: email.from?.emailAddress?.name,
          messageCount: 0,
        });
      }

      const participant = participants.get(from);
      if (participant) participant.messageCount++;
    }

    return Array.from(participants.values()).sort(
      (a, b) => b.messageCount - a.messageCount,
    );
  }

  /**
   * Validate Outlook email format
   */
  validateOutlookEmail(email: any): boolean {
    return !!(
      email.id &&
      email.subject &&
      email.from?.emailAddress?.address
    );
  }
}
