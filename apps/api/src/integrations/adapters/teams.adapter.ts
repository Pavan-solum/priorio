import { Injectable, Logger } from '@nestjs/common';

/**
 * TeamsAdapter: Formats Teams messages and events to Priorio standard format
 * - Message formatting
 * - Event conversion
 * - User mapping
 */
@Injectable()
export class TeamsAdapter {
  private readonly logger = new Logger(TeamsAdapter.name);

  /**
   * Format Teams message to standard format
   */
  formatTeamsMessage(teamsMessage: any): any {
    return {
      id: teamsMessage.id,
      type: 'chat-message',
      source: 'teams',
      content: teamsMessage.body?.content || '',
      sender: {
        id: teamsMessage.from?.user?.id,
        name: teamsMessage.from?.user?.displayName,
        email: teamsMessage.from?.user?.userPrincipalName,
      },
      timestamp: new Date(teamsMessage.createdDateTime),
      reactions: teamsMessage.reactions || [],
      metadata: {
        webUrl: teamsMessage.webUrl,
        chatId: teamsMessage.chatId,
      },
    };
  }

  /**
   * Format Teams event to standard format
   */
  formatTeamsEvent(teamsEvent: any): any {
    return {
      id: teamsEvent.id,
      type: 'meeting',
      source: 'teams',
      title: teamsEvent.subject,
      description: teamsEvent.bodyPreview,
      startTime: new Date(teamsEvent.start.dateTime),
      endTime: new Date(teamsEvent.end.dateTime),
      organizer: {
        email: teamsEvent.organizer?.emailAddress?.address,
        name: teamsEvent.organizer?.emailAddress?.name,
      },
      attendees: teamsEvent.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        status: a.status?.response,
      })) || [],
      location: teamsEvent.location?.displayName,
      isOnlineMeeting: teamsEvent.isOnlineMeeting,
      onlineMeetingUrl: teamsEvent.onlineMeeting?.joinUrl,
      metadata: {
        teamsEventId: teamsEvent.id,
        isRecurring: teamsEvent.recurrence !== null,
      },
    };
  }

  /**
   * Convert Priorio task to Teams message format
   */
  convertTaskToTeamsMessage(task: any): any {
    return {
      body: {
        contentType: 'html',
        content: `
          <div>
            <strong>${task.title}</strong>
            <p>${task.description || ''}</p>
            <p>Priority: ${task.priority}</p>
            ${task.dueDate ? `<p>Due: ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
          </div>
        `,
      },
      subject: task.title,
    };
  }

  /**
   * Map Teams user to Priorio user
   */
  mapTeamsUser(teamsUser: any): any {
    return {
      id: teamsUser.id,
      email: teamsUser.userPrincipalName,
      name: teamsUser.displayName,
      avatar: teamsUser.picture ? `data:image/jpeg;base64,${teamsUser.picture}` : null,
      timezone: teamsUser.mailboxSettings?.timeZone,
      locale: teamsUser.preferredLanguage,
    };
  }

  /**
   * Extract action URLs from Teams adaptive cards
   */
  extractActionUrl(teamsCard: any): string | null {
    if (teamsCard?.actions?.length > 0) {
      return teamsCard.actions[0].url;
    }
    return null;
  }

  /**
   * Format team/channel reference
   */
  formatTeamReference(team: any): any {
    return {
      id: team.id,
      name: team.displayName,
      description: team.description,
      owner: team.owners?.[0]?.email,
      memberCount: team.memberCount,
    };
  }

  /**
   * Validate Teams message format
   */
  validateTeamsMessage(message: any): boolean {
    return !!(
      message.id &&
      message.body?.content &&
      message.from?.user?.id
    );
  }
}
