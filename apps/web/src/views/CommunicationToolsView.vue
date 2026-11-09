<template>
  <div class="comm-tools-container">
    <!-- Top Header Banner -->
    <div class="comm-header">
      <div class="header-titles">
        <p class="eyebrow">CONNECTED PLATFORMS & CHANNELS</p>
        <h1>Communication Tools<span class="heading-period">.</span></h1>
        <p class="heading-subtitle">
          Manage your connected messaging apps, email inboxes, calendar synchronization, and channel notifications in one place.
        </p>
      </div>
      <div class="header-actions">
        <button 
          class="sync-all-btn" 
          :disabled="isSyncingAll"
          @click="syncAllTools"
        >
          <RefreshCw :size="16" :class="{ 'spin-icon': isSyncingAll }" />
          <span>{{ isSyncingAll ? 'Syncing all tools...' : 'Sync All Tools' }}</span>
        </button>
      </div>
    </div>

    <!-- Quick Stats Cards Bar -->
    <div class="stats-bar">
      <div class="stat-box">
        <div class="stat-icon-wrap stat-brand">
          <MessageSquare :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-number">7</span>
          <span class="stat-label">Available Tools</span>
        </div>
      </div>

      <div class="stat-box">
        <div class="stat-icon-wrap stat-success">
          <CheckCheck :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-number">{{ connectedToolsCount }} Active</span>
          <span class="stat-label">Connected Platforms</span>
        </div>
      </div>

      <div class="stat-box">
        <div class="stat-icon-wrap stat-blue">
          <RefreshCw :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-number">{{ lastSyncedTime }}</span>
          <span class="stat-label">Last Auto-Sync</span>
        </div>
      </div>

      <div class="stat-box">
        <div class="stat-icon-wrap stat-shield">
          <ShieldCheck :size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-number">Encrypted</span>
          <span class="stat-label">Token Security</span>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <transition name="fade">
      <div v-if="toastMessage" class="comm-toast">
        <CheckCircle2 :size="18" class="toast-check" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Navigation Tabs (Directory vs Live Feeds) -->
    <div class="view-tabs">
      <button 
        v-for="tab in viewTabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        <component :is="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- TAB 1: Platform Directory Grid -->
    <section v-if="currentTab === 'directory'" class="tab-content">
      <!-- Filter and Category Selector -->
      <div class="filter-row">
        <div class="category-pills">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="category-pill"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.label }} ({{ getCategoryCount(cat.id) }})
          </button>
        </div>

        <div class="search-box">
          <Search :size="15" />
          <input 
            v-model="searchFilter" 
            type="search" 
            placeholder="Search communication tool..."
          />
        </div>
      </div>

      <!-- Platforms Grid -->
      <div class="tools-grid">
        <article 
          v-for="tool in filteredTools" 
          :key="tool.id" 
          class="tool-card"
          :class="`tool-${tool.id}`"
        >
          <!-- Card Header -->
          <div class="card-head">
            <div class="brand-avatar" :style="{ backgroundColor: tool.brandBg, color: tool.brandColor }">
              <component :is="tool.iconComponent" :size="22" />
            </div>
            <div class="title-wrap">
              <div class="title-row">
                <h3>{{ tool.name }}</h3>
                <span class="type-pill">{{ tool.categoryLabel }}</span>
              </div>
              <span class="account-label">{{ tool.account }}</span>
            </div>
            <span 
              class="status-chip"
              :class="tool.statusClass"
            >
              <i class="status-dot"></i>
              {{ tool.statusLabel }}
            </span>
          </div>

          <!-- Description -->
          <p class="tool-desc">{{ tool.description }}</p>

          <!-- Capabilities Tags -->
          <div class="capabilities-row">
            <span 
              v-for="cap in tool.capabilities" 
              :key="cap" 
              class="cap-tag"
            >
              {{ cap }}
            </span>
          </div>

          <!-- Sync Progress and Details -->
          <div class="sync-info-box">
            <div class="sync-row">
              <span class="sync-label">
                <Clock3 :size="13" />
                {{ tool.syncNote }}
              </span>
              <span class="sync-percent">{{ tool.syncProgress }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" :style="{ width: `${tool.syncProgress}%`, backgroundColor: tool.brandColor }"></div>
            </div>
          </div>

          <!-- Card Actions -->
          <footer class="card-foot">
            <button 
              class="action-btn sync-btn" 
              :disabled="tool.isSyncing"
              @click="triggerSync(tool)"
            >
              <RefreshCw :size="14" :class="{ 'spin-icon': tool.isSyncing }" />
              <span>{{ tool.isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
            </button>

            <button 
              v-if="tool.detailTab"
              class="action-btn view-btn"
              @click="currentTab = tool.detailTab"
            >
              <ExternalLink :size="14" />
              <span>View Data</span>
            </button>

            <button 
              class="action-btn perm-btn"
              @click="openPermissionsModal(tool)"
            >
              <Key :size="14" />
              <span>Scopes</span>
            </button>
          </footer>
        </article>
      </div>
    </section>

    <!-- TAB 2: Teams Live Messages Preview -->
    <section v-else-if="currentTab === 'teams'" class="tab-content detail-tab-section">
      <div class="detail-header-panel">
        <div>
          <h2>Microsoft Teams Feed</h2>
          <p>Real-time channel discussions, team chats, and detected commitments.</p>
        </div>
        <button class="return-btn" @click="currentTab = 'directory'">
          ← Back to All Tools
        </button>
      </div>

      <div class="feed-container">
        <TeamsMessageCard
          v-for="msg in teamsMessagesList"
          :key="msg.id"
          :message="msg"
          @convert-task="handleTaskConverted"
          @reply="handleReply"
          @share="handleShare"
        />
      </div>
    </section>

    <!-- TAB 3: Outlook Live Emails Preview -->
    <section v-else-if="currentTab === 'outlook'" class="tab-content detail-tab-section">
      <div class="detail-header-panel">
        <div>
          <h2>Microsoft Outlook Inbox</h2>
          <p>Synchronized messages, follow-up proposals, and email thread details.</p>
        </div>
        <button class="return-btn" @click="currentTab = 'directory'">
          ← Back to All Tools
        </button>
      </div>

      <div class="feed-container">
        <OutlookEmailCard
          v-for="email in emailsList"
          :key="email.id"
          :email="email"
          @create-task="handleTaskConverted"
          @create-reminder="handleReminderConverted"
          @star="handleStarEmail"
          @archive="handleArchiveEmail"
        />
      </div>
    </section>

    <!-- TAB 4: Google Calendar Schedule Preview -->
    <section v-else-if="currentTab === 'calendar'" class="tab-content detail-tab-section">
      <div class="detail-header-panel">
        <div>
          <h2>Google & Outlook Calendar</h2>
          <p>Two-way calendar sync, schedule tracking, and conflict detection.</p>
        </div>
        <button class="return-btn" @click="currentTab = 'directory'">
          ← Back to All Tools
        </button>
      </div>

      <div class="feed-container">
        <CalendarEventCard
          v-for="evt in calendarEventsList"
          :key="evt.id"
          :event="evt"
          @create-prep-task="handleTaskConverted"
          @edit="handleEditEvent"
        />
      </div>
    </section>

    <!-- TAB 5: Permissions & Security Management -->
    <section v-else-if="currentTab === 'permissions'" class="tab-content detail-tab-section">
      <div class="detail-header-panel">
        <div>
          <h2>OAuth Permissions & Security Matrix</h2>
          <p>Review and toggle fine-grained scopes granted to your communication tools.</p>
        </div>
        <button class="return-btn" @click="currentTab = 'directory'">
          ← Back to All Tools
        </button>
      </div>

      <div class="permissions-wrap">
        <PermissionSelector
          :permissions="mockPermissions"
          @update:permissions="handleUpdatePermissions"
          @save="handleSavePermissions"
        />
      </div>
    </section>

    <!-- Modal for Tool Scopes -->
    <div v-if="activePermModalTool" class="modal-backdrop" @click.self="activePermModalTool = null">
      <div class="perm-modal">
        <div class="perm-modal-head">
          <div class="perm-modal-brand">
            <component :is="activePermModalTool.iconComponent" :size="24" :style="{ color: activePermModalTool.brandColor }" />
            <div>
              <h3>{{ activePermModalTool.name }} Scopes</h3>
              <p>Granted OAuth permissions and access levels</p>
            </div>
          </div>
          <button class="close-x" @click="activePermModalTool = null">✕</button>
        </div>

        <div class="scopes-list">
          <div v-for="scope in activePermModalTool.scopes" :key="scope.name" class="scope-item">
            <div class="scope-icon"><Key :size="14" /></div>
            <div class="scope-copy">
              <strong>{{ scope.name }}</strong>
              <p>{{ scope.desc }}</p>
            </div>
            <span class="granted-chip">Granted</span>
          </div>
        </div>

        <div class="perm-modal-foot">
          <button class="return-btn" @click="activePermModalTool = null">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  MessageSquare,
  Mail,
  CalendarDays,
  CheckCheck,
  RefreshCw,
  ShieldCheck,
  Search,
  ExternalLink,
  Key,
  Clock3,
  CheckCircle2,
  Smartphone,
  Radio,
  Hash,
} from 'lucide-vue-next'

import TeamsMessageCard from '@/components/integrations/TeamsMessageCard.vue'
import OutlookEmailCard from '@/components/integrations/OutlookEmailCard.vue'
import CalendarEventCard from '@/components/integrations/CalendarEventCard.vue'
import PermissionSelector from '@/components/integrations/PermissionSelector.vue'

import type { TeamsMessage, EmailMessage, CalendarEvent, PermissionScope } from '@/stores/integrationStore'

// Current active view tab
type TabId = 'directory' | 'teams' | 'outlook' | 'calendar' | 'permissions'
const currentTab = ref<TabId>('directory')

interface ViewTab {
  id: TabId
  label: string
  icon: any
  badge?: string
}

const viewTabs: ViewTab[] = [
  { id: 'directory', label: 'All Communication Tools', icon: MessageSquare, badge: '7' },
  { id: 'teams', label: 'Teams Live', icon: MessageSquare, badge: 'Live' },
  { id: 'outlook', label: 'Outlook Inbox', icon: Mail, badge: 'Live' },
  { id: 'calendar', label: 'Calendar Schedule', icon: CalendarDays, badge: 'Live' },
  { id: 'permissions', label: 'Security & Scopes', icon: Key },
]

// Category Filter
const selectedCategory = ref<string>('all')
const searchFilter = ref<string>('')
const isSyncingAll = ref(false)
const toastMessage = ref<string | null>(null)
const lastSyncedTime = ref<string>('Just now')
const activePermModalTool = ref<any | null>(null)

const categories = [
  { id: 'all', label: 'All Tools' },
  { id: 'chat', label: 'Chat & Collaboration' },
  { id: 'email-cal', label: 'Email & Calendar' },
  { id: 'mobile', label: 'Mobile Previews' },
]

interface ToolItem {
  id: string
  name: string
  account: string
  category: string
  categoryLabel: string
  brandColor: string
  brandBg: string
  iconComponent: any
  statusLabel: string
  statusClass: string
  description: string
  capabilities: string[]
  syncNote: string
  syncProgress: number
  isSyncing: boolean
  detailTab: TabId | null
  scopes: Array<{ name: string; desc: string }>
}

// Comprehensive List of 7 Communication Tools
const tools = ref<ToolItem[]>([
  {
    id: 'teams',
    name: 'Microsoft Teams',
    account: 'alex.morgan@company.com',
    category: 'chat',
    categoryLabel: 'Team Chat',
    brandColor: '#464eb8',
    brandBg: '#eeeffa',
    iconComponent: MessageSquare,
    statusLabel: 'Connected',
    statusClass: 'status-connected',
    description: 'Channels, team conversations, direct chats, and automatic commitment extraction.',
    capabilities: ['Channels', 'Direct Chats', 'Commitment Scanner', 'Bi-directional Sync'],
    syncNote: 'Synced 2m ago',
    syncProgress: 100,
    isSyncing: false,
    detailTab: 'teams',
    scopes: [
      { name: 'Chat.ReadWrite', desc: 'Read and send team channel messages' },
      { name: 'ChannelMessage.Read.All', desc: 'Read channel conversations for AI action suggestions' },
      { name: 'User.Read', desc: 'Display user profile and sender identification' },
    ],
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    account: 'alex.morgan@company.com',
    category: 'email-cal',
    categoryLabel: 'Corporate Email',
    brandColor: '#0078d4',
    brandBg: '#e6f2fb',
    iconComponent: Mail,
    statusLabel: 'Connected',
    statusClass: 'status-connected',
    description: 'Corporate email triage, thread parsing, follow-up detection, and priority flagging.',
    capabilities: ['Thread Parsing', 'Smart Follow-ups', 'Folders Sync', 'Priority Inbox'],
    syncNote: 'Synced 4m ago',
    syncProgress: 100,
    isSyncing: false,
    detailTab: 'outlook',
    scopes: [
      { name: 'Mail.ReadWrite', desc: 'Access mailbox items and manage read statuses' },
      { name: 'MailboxSettings.Read', desc: 'Read folder configurations and timezone' },
      { name: 'offline_access', desc: 'Maintain background refresh token security' },
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    account: 'alex.morgan@gmail.com',
    category: 'email-cal',
    categoryLabel: 'Calendar & Meetings',
    brandColor: '#4285f4',
    brandBg: '#ecf3fe',
    iconComponent: CalendarDays,
    statusLabel: 'Connected',
    statusClass: 'status-connected',
    description: 'Two-way calendar event sync, automatic conflict resolution, and meeting prep reminders.',
    capabilities: ['Schedule Sync', 'Conflict Resolution', 'Meeting Prep', 'Reminders'],
    syncNote: 'Synced 1m ago',
    syncProgress: 100,
    isSyncing: false,
    detailTab: 'calendar',
    scopes: [
      { name: 'https://www.googleapis.com/auth/calendar', desc: 'Manage calendar entries and attendees' },
      { name: 'https://www.googleapis.com/auth/calendar.events', desc: 'Create and update scheduled meetings' },
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    account: 'alex.morgan@gmail.com',
    category: 'email-cal',
    categoryLabel: 'Personal Email',
    brandColor: '#ea4335',
    brandBg: '#fdedeb',
    iconComponent: Mail,
    statusLabel: 'Connected',
    statusClass: 'status-connected',
    description: 'Smart inbox scanning for high-priority personal messages and bill/flight commitments.',
    capabilities: ['Inbox Triage', 'Urgent Alert Extraction', 'Encrypted OAuth', 'Read Tracker'],
    syncNote: 'Synced 6m ago',
    syncProgress: 100,
    isSyncing: false,
    detailTab: 'outlook', // Can share email viewer
    scopes: [
      { name: 'gmail.readonly', desc: 'Scan message headers and contents for commitments' },
      { name: 'gmail.modify', desc: 'Update read status and label synchronization' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    account: 'Solum Core Team (slack.com)',
    category: 'chat',
    categoryLabel: 'Team Chat',
    brandColor: '#4a154b',
    brandBg: '#f4edf5',
    iconComponent: Hash,
    statusLabel: 'Connected',
    statusClass: 'status-connected',
    description: 'Workspace catch-up, urgent @mention notifications, and unread channel digests.',
    capabilities: ['Channel Catch-up', 'Mentions Alert', 'Daily Digest', 'Bot Notifications'],
    syncNote: 'Synced 3m ago',
    syncProgress: 100,
    isSyncing: false,
    detailTab: null,
    scopes: [
      { name: 'channels:read', desc: 'List public channels in workspace' },
      { name: 'chat:write', desc: 'Send confirmed follow-up notes' },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    account: 'Solum Developers Community',
    category: 'chat',
    categoryLabel: 'Community & Dev',
    brandColor: '#5865f2',
    brandBg: '#eeeffe',
    iconComponent: Radio,
    statusLabel: 'Ready to Connect',
    statusClass: 'status-ready',
    description: 'Developer announcements, community server updates, and direct message alerts.',
    capabilities: ['Server Channels', 'Direct Messages', 'Webhook Alerts', 'Bot Dispatch'],
    syncNote: 'Standby',
    syncProgress: 0,
    isSyncing: false,
    detailTab: null,
    scopes: [
      { name: 'messages.read', desc: 'Read direct messages from servers' },
      { name: 'guilds', desc: 'Access connected community servers' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Previews',
    account: 'Android Device (Pixel 8 Pro)',
    category: 'mobile',
    categoryLabel: 'Mobile Listener',
    brandColor: '#25d366',
    brandBg: '#e9fbf0',
    iconComponent: Smartphone,
    statusLabel: 'Protected Active',
    statusClass: 'status-connected',
    description: 'Strict privacy Android notification listener. Never touches full history or web scraping.',
    capabilities: ['Notification Listener', 'Zero Web Scraping', 'Encrypted On-Device', 'Urgent Alerts'],
    syncNote: 'Listening locally',
    syncProgress: 100,
    isSyncing: false,
    detailTab: null,
    scopes: [
      { name: 'BIND_NOTIFICATION_LISTENER_SERVICE', desc: 'Android system notification capture' },
      { name: 'LOCAL_ENCRYPTION_ONLY', desc: 'No messages uploaded without user consent' },
    ],
  },
])

// Computed Connected Count
const connectedToolsCount = computed(() => {
  return tools.value.filter(t => t.statusClass === 'status-connected').length
})

// Filtered Tools
const filteredTools = computed(() => {
  return tools.value.filter(tool => {
    const matchesCat = selectedCategory.value === 'all' || tool.category === selectedCategory.value
    const query = searchFilter.value.trim().toLowerCase()
    const matchesSearch = !query || tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
    return matchesCat && matchesSearch
  })
})

const getCategoryCount = (catId: string) => {
  if (catId === 'all') return tools.value.length
  return tools.value.filter(t => t.category === catId).length
}

// Trigger Single Sync
const triggerSync = (tool: any) => {
  tool.isSyncing = true
  tool.syncProgress = 30
  setTimeout(() => {
    tool.syncProgress = 75
  }, 400)
  setTimeout(() => {
    tool.isSyncing = false
    tool.syncProgress = 100
    tool.syncNote = 'Synced just now'
    showToast(`Successfully synchronized ${tool.name}! All items are up to date.`)
  }, 900)
}

// Trigger Sync All
const syncAllTools = () => {
  isSyncingAll.value = true
  tools.value.forEach(t => {
    if (t.statusClass === 'status-connected') {
      t.isSyncing = true
    }
  })
  setTimeout(() => {
    tools.value.forEach(t => {
      t.isSyncing = false
      t.syncProgress = 100
      t.syncNote = 'Synced just now'
    })
    isSyncingAll.value = false
    lastSyncedTime.value = 'Just now'
    showToast('All 6 connected communication platforms synchronized successfully!')
  }, 1200)
}

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 3500)
}

const openPermissionsModal = (tool: any) => {
  activePermModalTool.value = tool
}

// Mock feeds for live preview tabs
const teamsMessagesList = ref<TeamsMessage[]>([
  {
    id: 't-1',
    sender: 'Sarah Chen',
    senderEmail: 'sarah.chen@company.com',
    avatar: '',
    channel: 'General',
    content: 'Can you please review the Q4 sprint roadmap before our sync tomorrow at 10 AM?',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    attachments: [{ id: 'att-1', name: 'Q4_Roadmap_Draft.pdf', type: 'application/pdf', size: 1024 * 450, url: '#' }],
    likes: 4,
    replies: 2,
  },
  {
    id: 't-2',
    sender: 'Michael Scott',
    senderEmail: 'michael.scott@company.com',
    avatar: '',
    channel: 'Product & Design',
    content: 'The new UI design system tokens have been merged into the repository. Let me know if you run into any issues.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    attachments: [],
    likes: 7,
    replies: 5,
  },
])

const emailsList = ref<EmailMessage[]>([
  {
    id: 'e-1',
    from: 'Devin Vance',
    fromEmail: 'devin@partner.io',
    subject: 'Partnership Agreement & Timeline',
    preview: 'Hi Alex, following up on our conversation from Friday, attached is the revised partnership schedule...',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    unread: true,
    starred: true,
    hasAttachments: true,
    attachmentCount: 1,
  },
  {
    id: 'e-2',
    from: 'Amazon Web Services',
    fromEmail: 'billing@aws.amazon.com',
    subject: 'Monthly Billing Statement: $142.50',
    preview: 'Your invoice for the period Oct 1 - Oct 31 is now ready for review in your AWS Console.',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    unread: false,
    starred: false,
    hasAttachments: false,
    attachmentCount: 0,
  },
])

const calendarEventsList = ref<CalendarEvent[]>([
  {
    id: 'cal-1',
    title: 'Product Strategy Review',
    description: 'Quarterly review of platform goals and team progress.',
    startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    calendar: 'Primary',
    organizer: 'Alex Morgan',
    location: 'Google Meet',
    attendees: [
      { name: 'Sarah Chen', email: 'sarah@company.com', status: 'accepted' },
      { name: 'Alex Morgan', email: 'alex@company.com', status: 'accepted' },
    ],
  },
  {
    id: 'cal-2',
    title: 'Engineering Architecture Sync',
    description: 'PostgreSQL pgvector performance benchmarks & schema migration discussion.',
    startTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    calendar: 'Primary',
    organizer: 'Alex Morgan',
    location: 'Teams Conference Room A',
    attendees: [
      { name: 'Alex Morgan', email: 'alex@company.com', status: 'accepted' },
    ],
  },
])

const mockPermissions = ref<PermissionScope[]>([
  { id: 'p1', name: 'chat.read', description: 'Read Teams and Slack chats for commitment detection', required: true, granted: true },
  { id: 'p2', name: 'mail.read', description: 'Scan Outlook and Gmail inboxes for action items', required: true, granted: true },
  { id: 'p3', name: 'calendars.readwrite', description: 'Synchronize Google Calendar events both ways', required: true, granted: true },
  { id: 'p4', name: 'offline_access', description: 'Secure background refresh token maintenance', required: true, granted: true },
])

const handleTaskConverted = () => {
  showToast('Created new task in Priorio workspace!')
}

const handleReminderConverted = () => {
  showToast('Created new reminder in Priorio workspace!')
}

const handleReply = () => {
  showToast('Opening conversation thread...')
}

const handleShare = () => {
  showToast('Shared commitment note.')
}

const handleStarEmail = (id: string) => {
  const em = emailsList.value.find(e => e.id === id)
  if (em) em.starred = !em.starred
  showToast(em?.starred ? 'Starred email' : 'Unstarred email')
}

const handleArchiveEmail = (id: string) => {
  emailsList.value = emailsList.value.filter(e => e.id !== id)
  showToast('Email archived from Priorio view.')
}

const handleEditEvent = () => {
  showToast('Opening event editor...')
}

const handleUpdatePermissions = (perms: PermissionScope[]) => {
  mockPermissions.value = perms
}

const handleSavePermissions = () => {
  showToast('Permission scopes saved and synchronized!')
}
</script>

<style scoped>
.comm-tools-container {
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
}

/* Header */
.comm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.header-titles .eyebrow {
  margin: 0 0 6px;
  color: var(--coral, #df684e);
  font: 700 10px 'Manrope', sans-serif;
  letter-spacing: 0.08em;
}

.header-titles h1 {
  margin: 0 0 6px;
  color: var(--ink, #202a27);
  font: 800 28px 'Manrope', sans-serif;
  letter-spacing: -0.02em;
}

.heading-period {
  color: var(--coral, #df684e);
}

.header-titles .heading-subtitle {
  margin: 0;
  max-width: 600px;
  color: var(--muted, #78817b);
  font-size: 13px;
  line-height: 1.5;
}

.sync-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #d2ded5;
  border-radius: 6px;
  color: #20352f;
  background: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sync-all-btn:hover:not(:disabled) {
  background: #f4f7f4;
  border-color: #bccbc0;
}

.sync-all-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  background: #ffffff;
}

.stat-icon-wrap {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex: 0 0 auto;
}

.stat-brand { background: #fbeee9; color: var(--coral, #df684e); }
.stat-success { background: #eaf5ee; color: #328156; }
.stat-blue { background: #e7f2fb; color: #1c7cd6; }
.stat-shield { background: #eef1ef; color: #495e54; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font: 800 17px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: var(--muted, #78817b);
  font-weight: 500;
}

/* Toast */
.comm-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-radius: 6px;
  background: #20352f;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-check {
  color: #5edb92;
}

/* View Tabs */
.view-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid var(--line, #e8ebe6);
  padding-bottom: 2px;
  overflow-x: auto;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted, #78817b);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--ink, #202a27);
}

.tab-btn.active {
  color: var(--coral, #df684e);
  border-bottom-color: var(--coral, #df684e);
}

.tab-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 10px;
  background: #edf0ec;
  font-size: 10px;
  font-weight: 700;
  color: #4b5850;
}

.tab-btn.active .tab-badge {
  background: #fbeee9;
  color: var(--coral, #df684e);
}

/* Directory Section */
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.category-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.category-pill {
  min-height: 31px;
  padding: 0 12px;
  border: 1px solid #dde3de;
  border-radius: 20px;
  background: #ffffff;
  color: #556259;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.category-pill.active {
  background: #20352f;
  color: #ffffff;
  border-color: #20352f;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  height: 33px;
  padding: 0 11px;
  border: 1px solid #d8dfd9;
  border-radius: 6px;
  background: #ffffff;
}

.search-box input {
  border: 0;
  background: transparent;
  outline: none;
  font-size: 12px;
  width: 100%;
}

/* Tools Grid */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 16px;
}

.tool-card {
  display: flex;
  flex-direction: column;
  padding: 18px;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
}

.card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.brand-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  flex: 0 0 auto;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.title-row h3 {
  margin: 0;
  font: 700 15px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
}

.type-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f3f0;
  color: #5e6b62;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.account-label {
  font-size: 11px;
  color: var(--muted, #78817b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-connected {
  background: #eaf5ee;
  color: #27794b;
}
.status-connected .status-dot {
  background: #32ab66;
}

.status-ready {
  background: #f4f4f4;
  color: #727774;
}
.status-ready .status-dot {
  background: #a0a6a2;
}

.tool-desc {
  margin: 0 0 14px;
  color: #59655e;
  font-size: 12px;
  line-height: 1.5;
  min-height: 36px;
}

.capabilities-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.cap-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 3px 7px;
  border-radius: 4px;
  background: #f5f7f5;
  color: #49544d;
}

.sync-info-box {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f0f3ef;
  margin-bottom: 14px;
}

.sync-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.sync-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted, #78817b);
}

.sync-percent {
  font-size: 10px;
  font-weight: 700;
  color: var(--ink, #202a27);
}

.progress-track {
  width: 100%;
  height: 4px;
  background: #edf0ec;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.card-foot {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #dbe2dc;
  border-radius: 5px;
  background: #ffffff;
  color: #3b463f;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: #f6f8f6;
  border-color: #bcc6bd;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sync-btn {
  flex: 1;
}

.view-btn {
  background: #fbf6f4;
  color: var(--coral, #df684e);
  border-color: #f1d5cd;
}
.view-btn:hover {
  background: #f8ece8;
}

/* Detail Section */
.detail-tab-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  background: #ffffff;
}

.detail-header-panel h2 {
  margin: 0 0 4px;
  font: 700 18px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
}

.detail-header-panel p {
  margin: 0;
  color: var(--muted, #78817b);
  font-size: 12px;
}

.return-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #dbe2dc;
  border-radius: 5px;
  background: #ffffff;
  color: #2b3932;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.return-btn:hover {
  background: #f5f8f5;
}

.feed-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.permissions-wrap {
  background: #ffffff;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  padding: 16px;
}

/* Permissions Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(18, 30, 26, 0.45);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 16px;
}

.perm-modal {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.perm-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.perm-modal-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.perm-modal-brand h3 {
  margin: 0 0 2px;
  font: 700 16px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
}

.perm-modal-brand p {
  margin: 0;
  color: var(--muted, #78817b);
  font-size: 11px;
}

.close-x {
  border: 0;
  background: transparent;
  color: var(--muted, #78817b);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.scopes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #eef1ed;
  border-radius: 6px;
  background: #fafbfa;
}

.scope-icon {
  color: var(--muted, #78817b);
  margin-top: 2px;
}

.scope-copy {
  flex: 1;
}

.scope-copy strong {
  display: block;
  font-size: 12px;
  color: #27342d;
  margin-bottom: 2px;
}

.scope-copy p {
  margin: 0;
  font-size: 10px;
  color: #69746c;
}

.granted-chip {
  font-size: 9px;
  font-weight: 700;
  color: #27794b;
  background: #eaf5ee;
  padding: 2px 7px;
  border-radius: 10px;
  align-self: center;
}

.perm-modal-foot {
  display: flex;
  justify-content: flex-end;
}

/* Animations */
.spin-icon {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 900px) {
  .stats-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .stats-bar {
    grid-template-columns: 1fr;
  }
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
