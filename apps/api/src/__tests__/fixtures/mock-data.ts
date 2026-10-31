/**
 * Test Fixtures and Mocks for Integration Tests
 */

export const mockTeamsTokens = {
  accessToken:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3N0cy5taWNyb3NvZnQuY29tLzkxODgwNDBkLTZjNjktNGZmNS1iNmQ2LTNjODdkODk2ZDU3OS8iLCJhY2MiOiIwIiwic3RzX3NzcmlkIjoiNmZlZWI4ZWItZDlkMS00YjBhLWE0MDEtYWU5Y2Q2Njk1YzI2In0.fake',
  refreshToken: 'fake_refresh_token_teams',
  expiresIn: 3600,
};

export const mockOutlookTokens = {
  accessToken:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3N0cy5taWNyb3NvZnQuY29tLzkxODgwNDBkLTZjNjktNGZmNS1iNmQ2LTNjODdkODk2ZDU3OS8iLCJhY2MiOiIwIiwic3RzX3NzcmlkIjoiNmZlZWI4ZWItZDlkMS00YjBhLWE0MDEtYWU5Y2Q2Njk1YzI2In0.fake',
  refreshToken: 'fake_refresh_token_outlook',
  expiresIn: 3600,
};

export const mockGitHubTokens = {
  accessToken: 'ghu_fake_github_token_1234567890abcdef',
  tokenType: 'bearer',
  expiresIn: 28800,
};

export const mockCalendarTokens = {
  accessToken:
    'ya29.fake_google_calendar_token_abcdefghijklmnopqrstuvwxyz1234567890',
  refreshToken: 'fake_google_refresh_token',
  expiresIn: 3599,
  tokenType: 'Bearer',
};

export const mockTeamsUser = {
  id: 'user123-teams',
  displayName: 'John Smith',
  mail: 'john.smith@company.com',
  userPrincipalName: 'john.smith@company.com',
  mobilePhone: '+1-555-0123',
};

export const mockTeamsChat = {
  id: 'chat123',
  topic: 'Project Discussion',
  chatType: 'group',
  isDeleted: false,
  createdDateTime: '2024-01-15T10:00:00Z',
};

export const mockTeamsMessage = {
  id: 'msg123',
  body: {
    contentType: 'html',
    content: '<div>This is a Teams message</div>',
  },
  from: {
    user: {
      id: 'user123-teams',
      displayName: 'John Smith',
      userPrincipalName: 'john.smith@company.com',
    },
  },
  createdDateTime: '2024-01-15T10:30:00Z',
  subject: 'Important Update',
  attachments: [
    {
      id: 'att123',
      name: 'document.pdf',
      size: 102400,
    },
  ],
};

export const mockOutlookEmail = {
  id: 'email123',
  subject: 'Project Status Report',
  bodyPreview: 'This is the preview of the email body',
  body: {
    contentType: 'HTML',
    content: '<html><body>This is the full email body</body></html>',
  },
  from: {
    emailAddress: {
      name: 'Jane Doe',
      address: 'jane.doe@company.com',
    },
  },
  toRecipients: [
    {
      emailAddress: {
        name: 'John Smith',
        address: 'john.smith@company.com',
      },
    },
  ],
  receivedDateTime: '2024-01-15T11:00:00Z',
  categories: ['Work', 'Important'],
  hasAttachments: true,
  attachments: [
    {
      id: 'att456',
      name: 'report.xlsx',
      size: 204800,
    },
  ],
};

export const mockOutlookEvent = {
  id: 'event123',
  subject: 'Team Standup',
  bodyPreview: 'Daily team standup meeting',
  start: {
    dateTime: '2024-01-16T09:00:00',
    timeZone: 'Eastern Standard Time',
  },
  end: {
    dateTime: '2024-01-16T09:30:00',
    timeZone: 'Eastern Standard Time',
  },
  attendees: [
    {
      emailAddress: {
        name: 'John Smith',
        address: 'john.smith@company.com',
      },
      status: {
        response: 'accepted',
        time: '2024-01-10T08:00:00Z',
      },
      type: 'required',
    },
  ],
  isReminderOn: true,
  reminderMinutesBeforeStart: 15,
  categories: ['Work'],
  isOnlineMeeting: true,
  onlineMeetingUrl: 'https://teams.microsoft.com/l/meetup-join/19%3a...',
};

export const mockGoogleCalendarEvent = {
  id: 'event456',
  summary: 'Product Planning',
  description: 'Quarterly product planning session',
  start: {
    dateTime: '2024-01-17T14:00:00+05:30',
    timeZone: 'Asia/Kolkata',
  },
  end: {
    dateTime: '2024-01-17T15:30:00+05:30',
    timeZone: 'Asia/Kolkata',
  },
  attendees: [
    {
      email: 'john.smith@company.com',
      displayName: 'John Smith',
      responseStatus: 'accepted',
      optional: false,
    },
  ],
  reminders: {
    useDefault: false,
    overrides: [
      {
        method: 'email',
        minutes: 30,
      },
    ],
  },
  recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=10'],
};

export const mockTask = {
  id: 'task123',
  workspaceId: 'workspace123',
  userId: 'user123',
  title: 'Complete project proposal',
  description: 'Finish the Q1 project proposal',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  dueDate: new Date('2024-02-01'),
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-15'),
};

export const mockIntegration = {
  id: 'integration123',
  workspaceId: 'workspace123',
  userId: 'user123',
  provider: 'teams',
  status: 'CONNECTED',
  displayName: 'My Teams Account',
  externalAccountId: 'user123-teams',
  externalEmail: 'john.smith@company.com',
  metadata: {
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
  },
  syncFrequency: 600,
  lastSyncAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const mockProviderEvent = {
  id: 'prov_event123',
  integrationId: 'integration123',
  externalEventId: 'msg123',
  type: 'chat-message',
  title: 'Important Update',
  description: 'This is a Teams message',
  startTime: new Date('2024-01-15T10:30:00Z'),
  metadata: {
    chatId: 'chat123',
    senderId: 'user123-teams',
    senderName: 'John Smith',
  },
  createdAt: new Date('2024-01-15T10:30:00Z'),
};

export const mockPermissionRequest = {
  id: 'perm_req123',
  integrationId: 'integration123',
  permission: 'READ_CALENDAR',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  requestedAt: new Date(),
};

export const mockSyncLog = {
  id: 'sync_log123',
  integrationId: 'integration123',
  syncType: 'chats',
  status: 'COMPLETED',
  itemsProcessed: 50,
  itemsSucceeded: 50,
  itemsFailed: 0,
  startedAt: new Date('2024-01-15T10:00:00Z'),
  completedAt: new Date('2024-01-15T10:05:00Z'),
  errorLog: null,
};

export const mockWorkspace = {
  id: 'workspace123',
  name: 'Acme Corp',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const mockUser = {
  id: 'user123',
  workspaceId: 'workspace123',
  email: 'john.smith@company.com',
  name: 'John Smith',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const mockOAuthConfig = {
  provider: 'github',
  clientId: 'fake_client_id_github_12345',
  clientSecret: 'fake_client_secret_github_67890',
  redirectUri: 'http://localhost:3000/oauth/callback/github',
  scopes: ['repo', 'read:user', 'user:email'],
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
};

export const mockConflict = {
  id: 'conflict123',
  eventId1: 'prov_event123',
  eventId2: 'prov_event456',
  type: 'DUPLICATE_DETECTION',
  similarity: 0.95,
  status: 'UNRESOLVED',
  createdAt: new Date(),
};

export const mockSyncQueue = {
  id: 'queue123',
  integrationId: 'integration123',
  operation: 'sync-chats',
  status: 'PENDING',
  priority: 1,
  retryCount: 0,
  maxRetries: 3,
  createdAt: new Date(),
  scheduledFor: new Date(Date.now() + 5000),
};
