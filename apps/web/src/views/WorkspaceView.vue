<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  AlertCircle, Archive, ArrowUpRight, Bell, BookOpen, Calendar, CalendarDays,
  Check, CheckCircle2, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3,
  Command, ExternalLink, FileText, Filter, Inbox, LayoutDashboard, ListTodo,
  Mail, Menu, MessageCircle, MessageSquare, MoreHorizontal, Plus, RotateCcw,
  Search, Send, Settings2, ShieldCheck, Sparkles, Star, Tag, Trash2, X, LogOut,
} from 'lucide-vue-next'
import { useWorkspaceStore, type InboxMessage, type Priority, type AssistantChatMessage } from '../stores/workspace'
import { useAuthStore } from '../stores/authStore'
import CommunicationToolsView from './CommunicationToolsView.vue'
import DailyPlannerView from './DailyPlannerView.vue'

const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()
const authStore = useAuthStore()
const activeSection = computed(() => String(route.name ?? 'today'))
const searchQuery = ref('')
const inboxFilter = ref('All')
const taskView = ref<'List' | 'Board'>('List')
const selectedMessageId = ref<string | null>(null)
const taskDialogOpen = ref(false)
const taskTitle = ref('')
const taskDetail = ref('')
const taskDueDate = ref(new Date().toISOString().slice(0, 10))
const taskPriority = ref<Priority>('medium')
const mobileMenuOpen = ref(false)

const primaryNavigation = [
  { name: 'today', label: 'Today', icon: LayoutDashboard },
  { name: 'inbox', label: 'Smart inbox', icon: Inbox, count: computed(() => workspace.messages.filter((message) => !message.archived && !message.read).length) },
  { name: 'tasks', label: 'My tasks', icon: ListTodo, count: computed(() => workspace.tasks.filter((task) => task.status !== 'completed').length) },
  { name: 'daily-planner', label: 'Daily planner', icon: CalendarDays },
  { name: 'reminders', label: 'Reminders', icon: Bell },
  { name: 'followups', label: 'Follow-ups', icon: Send },
]
const secondaryNavigation = [
  { name: 'assistant', label: 'AI assistant', icon: Sparkles },
  { name: 'knowledge', label: 'Knowledge hub', icon: BookOpen },
  { name: 'integrations', label: 'Integrations', icon: Command },
  { name: 'settings', label: 'Settings', icon: Settings2 },
]
const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
const greeting = computed(() => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
})
const openTasks = computed(() => workspace.tasks.filter((task) => task.status !== 'completed'))
const todayTasks = computed(() => openTasks.value.filter((task) => task.dueDate <= new Date().toISOString().slice(0, 10)))
const importantMessages = computed(() => workspace.messages.filter((message) => !message.archived && (message.starred || message.priority === 'critical' || message.priority === 'high')).slice(0, 3))
const inboxMessages = computed(() => workspace.messages.filter((message) => {
  if (message.archived) return false
  const query = searchQuery.value.trim().toLowerCase()
  const matchesQuery = !query || `${message.sender} ${message.subject} ${message.preview}`.toLowerCase().includes(query)
  const matchesFilter = inboxFilter.value === 'All'
    || (inboxFilter.value === 'Important' && message.starred)
    || (inboxFilter.value === 'Urgent' && (message.priority === 'critical' || message.priority === 'high'))
    || (inboxFilter.value === 'Needs reply' && message.requiresReply)
    || message.category === inboxFilter.value
  return matchesQuery && matchesFilter
}))
const visibleTasks = computed(() => workspace.tasks.filter((task) => {
  const query = searchQuery.value.trim().toLowerCase()
  return !query || `${task.title} ${task.detail} ${task.category}`.toLowerCase().includes(query)
}))
const selectedMessage = computed(() => workspace.messages.find((message) => message.id === selectedMessageId.value) ?? null)
const pendingReplies = computed(() => workspace.messages.filter((message) => !message.archived && message.requiresReply))
const activeReminders = computed(() => workspace.reminders.filter((reminder) => !reminder.completed))
const pageTitle = computed(() => String(route.meta.title ?? 'Today'))

watch(selectedMessage, (message) => {
  if (message && !message.read) workspace.markRead(message.id)
})

function openTaskDialog() {
  taskTitle.value = ''
  taskDetail.value = ''
  taskDueDate.value = new Date().toISOString().slice(0, 10)
  taskPriority.value = 'medium'
  taskDialogOpen.value = true
}

function createTask() {
  if (!taskTitle.value.trim()) return
  workspace.addTask({ title: taskTitle.value.trim(), detail: taskDetail.value.trim(), dueDate: taskDueDate.value, priority: taskPriority.value, category: 'Work' })
  taskDialogOpen.value = false
}

function openMessage(message: InboxMessage) {
  selectedMessageId.value = message.id
}

function archiveSelectedMessage() {
  if (!selectedMessageId.value) return
  workspace.archiveMessage(selectedMessageId.value)
  selectedMessageId.value = null
}

function sourceIcon(source: InboxMessage['source']) {
  return source === 'Teams' ? MessageCircle : source === 'WhatsApp preview' ? MessageCircle : Mail
}

function sourceClass(source: InboxMessage['source']) {
  return source === 'Teams' ? 'source-teams' : source === 'WhatsApp preview' ? 'source-whatsapp' : 'source-gmail'
}

function priorityLabel(priority: Priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

function relativeTime(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}h ago`
  return `${Math.floor(elapsedMinutes / 1440)}d ago`
}

function formatDueDate(value: string) {
  const todayDate = new Date().toISOString().slice(0, 10)
  if (value === todayDate) return 'Today'
  if (value < todayDate) return 'Overdue'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function navigateTo(name: string) {
  router.push({ name })
  mobileMenuOpen.value = false
}

function handleSignOut() {
  authStore.logout()
  router.push({ name: 'login' })
}

// -------------------------------------------------------------
// AI Assistant State & Methods
// -------------------------------------------------------------
const assistantInput = ref('')
const isAssistantThinking = ref(false)
const assistantChatEnd = ref<HTMLElement | null>(null)

function scrollToAssistantChat() {
  setTimeout(() => {
    assistantChatEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }, 50)
}

function askPrompt(prompt: string) {
  assistantInput.value = prompt
  sendAssistantMessage()
}

function sendAssistantMessage() {
  const query = assistantInput.value.trim()
  if (!query || isAssistantThinking.value) return

  workspace.addAssistantMessage({
    role: 'user',
    content: query,
  })
  assistantInput.value = ''
  isAssistantThinking.value = true
  scrollToAssistantChat()

  setTimeout(() => {
    isAssistantThinking.value = false
    const qLower = query.toLowerCase()

    let responseContent = ''
    let citations: string[] = []
    let suggestedAction: AssistantChatMessage['suggestedAction'] | undefined = undefined

    if (qLower.includes('focus') || qLower.includes('today') || qLower.includes('plan')) {
      const openTodayCount = todayTasks.value.length
      const urgentReplyCount = pendingReplies.value.length
      responseContent = `Based on your schedule and communications, here is your high-impact focus plan for today:\n\n1. **Critical Response**: You have ${urgentReplyCount} conversation(s) requiring a reply, notably from Maya Chen regarding product milestones.\n2. **Immediate Task**: You have ${openTodayCount} task(s) scheduled for today, led by "${todayTasks.value[0]?.title || 'Review team roadmap'}".\n3. **Circadian Rhythm**: Schedule deep focus blocks in the morning and reserve administrative syncs for late afternoon.`
      citations = [
        ...todayTasks.value.slice(0, 2).map((t) => `Task: ${t.title}`),
        ...pendingReplies.value.slice(0, 1).map((m) => `${m.sender}: ${m.subject}`),
      ]
      suggestedAction = {
        label: 'Block 90m Focus Time in Planner',
        type: 'create_task',
        payload: { title: 'Deep Work: Product Roadmap & Maya Reply', detail: 'Protected focus block without Slack/Teams interruptions' },
      }
    } else if (qLower.includes('reply') || qLower.includes('conversation') || qLower.includes('message')) {
      if (pendingReplies.value.length > 0) {
        const topReply = pendingReplies.value[0]
        responseContent = `You currently have **${pendingReplies.value.length} conversation(s)** requiring your response:\n\n- **${topReply.sender}** (${topReply.source}): "${topReply.subject}"\n  *Excerpt*: "${topReply.preview}"\n\nWould you like me to create an action item to draft a reply?`
        citations = pendingReplies.value.map((m) => `${m.sender} (${m.source}): ${m.subject}`)
        suggestedAction = {
          label: `Draft reply to ${topReply.sender}`,
          type: 'create_task',
          payload: { title: `Send reply to ${topReply.sender}`, detail: `Follow up on "${topReply.subject}"` },
        }
      } else {
        responseContent = 'Great news! You have no outstanding conversations waiting for a reply right now. Your inbox queue is clear.'
      }
    } else if (qLower.includes('deadline') || qLower.includes('due') || qLower.includes('task')) {
      const dueTasks = openTasks.value.slice(0, 3)
      responseContent = `Here are your most urgent upcoming deadlines:\n\n` +
        dueTasks.map((t) => `- **${t.title}** (Priority: ${t.priority.toUpperCase()}) — Due ${formatDueDate(t.dueDate)}`).join('\n') +
        `\n\nTotal open tasks across your workspace: **${openTasks.value.length}**.`
      citations = dueTasks.map((t) => `Task: ${t.title}`)
      suggestedAction = {
        label: 'Add high-priority task',
        type: 'create_task',
        payload: { title: 'Review upcoming milestone deliverables', detail: 'Audit task completion probability' },
      }
    } else if (qLower.includes('summar') || qLower.includes('important')) {
      const msgs = workspace.messages.filter((m) => !m.archived).slice(0, 3)
      responseContent = `**Executive Summary of Important Communications**:\n\n` +
        msgs.map((m) => `• **${m.sender}** on *${m.subject}*: ${m.summary || m.preview}`).join('\n\n') +
        `\n\n*Overall Assessment*: Communications are aligned. The primary bottleneck is finalizing the Q4 launch dates.`
      citations = msgs.map((m) => `${m.sender}: ${m.subject}`)
    } else {
      const matchedKnowledge = workspace.knowledge.filter((k) =>
        k.title.toLowerCase().includes(qLower) || k.content.toLowerCase().includes(qLower) || k.tags.some((t) => t.toLowerCase().includes(qLower))
      )
      const matchedTasks = workspace.tasks.filter((t) => t.title.toLowerCase().includes(qLower) || t.detail.toLowerCase().includes(qLower))
      const matchedMsgs = workspace.messages.filter((m) => m.subject.toLowerCase().includes(qLower) || m.preview.toLowerCase().includes(qLower))

      if (matchedKnowledge.length > 0 || matchedTasks.length > 0 || matchedMsgs.length > 0) {
        responseContent = `I found related entries in your workspace:\n\n`
        if (matchedKnowledge.length > 0) {
          responseContent += `**Knowledge Base**: ${matchedKnowledge[0].title} — "${matchedKnowledge[0].content}"\n\n`
          citations.push(`Doc: ${matchedKnowledge[0].title}`)
        }
        if (matchedTasks.length > 0) {
          responseContent += `**Task**: ${matchedTasks[0].title} (${matchedTasks[0].status})\n\n`
          citations.push(`Task: ${matchedTasks[0].title}`)
        }
        if (matchedMsgs.length > 0) {
          responseContent += `**Message**: From ${matchedMsgs[0].sender}: "${matchedMsgs[0].subject}"\n\n`
          citations.push(`${matchedMsgs[0].sender}: ${matchedMsgs[0].subject}`)
        }
      } else {
        responseContent = `I searched your messages, tasks, and knowledge repository for "${query}". I'm grounded to your local workspace data and recommend scheduling this into your daily plan or creating a knowledge note.`
        suggestedAction = {
          label: `Create task: ${query.slice(0, 35)}`,
          type: 'create_task',
          payload: { title: query.slice(0, 60), detail: 'Created from AI assistant session' },
        }
      }
    }

    workspace.addAssistantMessage({
      role: 'assistant',
      content: responseContent,
      citations: citations.length ? citations : undefined,
      suggestedAction,
    })
    scrollToAssistantChat()
  }, 450)
}

function executeAssistantAction(action: NonNullable<AssistantChatMessage['suggestedAction']>) {
  if (action.type === 'create_task') {
    workspace.addTask({
      title: action.payload.title,
      detail: action.payload.detail || '',
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'high',
      category: 'Work',
    })
    workspace.addAssistantMessage({
      role: 'assistant',
      content: `✓ Task **"${action.payload.title}"** has been added to your tasks and daily planner.`,
    })
  } else if (action.type === 'create_reminder') {
    workspace.reminders.push({
      id: crypto.randomUUID(),
      title: action.payload.title,
      time: 'Today · 3:00 PM',
      completed: false,
    })
    workspace.persist()
    workspace.addAssistantMessage({
      role: 'assistant',
      content: `✓ Reminder **"${action.payload.title}"** has been set.`,
    })
  }
  scrollToAssistantChat()
}

// -------------------------------------------------------------
// Knowledge Hub State & Methods
// -------------------------------------------------------------
const knowledgeSearch = ref('')
const selectedKnowledgeCategory = ref<string>('All')
const knowledgeModalOpen = ref(false)
const newNoteTitle = ref('')
const newNoteCategory = ref<'Architecture' | 'Guidelines' | 'Decisions' | 'Reference'>('Architecture')
const newNoteTags = ref('')
const newNoteContent = ref('')

const filteredKnowledge = computed(() => {
  return workspace.knowledge.filter((note) => {
    const query = knowledgeSearch.value.trim().toLowerCase()
    const matchesQuery = !query ||
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some((tag) => tag.toLowerCase().includes(query))
    const matchesCategory = selectedKnowledgeCategory.value === 'All' || note.category === selectedKnowledgeCategory.value
    return matchesQuery && matchesCategory
  })
})

function openKnowledgeModal() {
  newNoteTitle.value = ''
  newNoteCategory.value = 'Architecture'
  newNoteTags.value = ''
  newNoteContent.value = ''
  knowledgeModalOpen.value = true
}

function saveKnowledgeNote() {
  if (!newNoteTitle.value.trim() || !newNoteContent.value.trim()) return
  const tagList = newNoteTags.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  workspace.addKnowledge({
    title: newNoteTitle.value.trim(),
    category: newNoteCategory.value,
    content: newNoteContent.value.trim(),
    tags: tagList.length ? tagList : ['General'],
  })
  knowledgeModalOpen.value = false
}

function deleteKnowledgeNote(id: string) {
  workspace.deleteKnowledge(id)
}

// -------------------------------------------------------------
// Spotlight Search & Notifications Popover
// -------------------------------------------------------------
const spotlightOpen = ref(false)
const notificationsOpen = ref(false)

const spotlightResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return { tasks: [], messages: [], knowledge: [] }

  const matchedTasks = workspace.tasks
    .filter((t) => t.title.toLowerCase().includes(query) || t.detail.toLowerCase().includes(query))
    .slice(0, 3)

  const matchedMessages = workspace.messages
    .filter((m) => !m.archived && (m.sender.toLowerCase().includes(query) || m.subject.toLowerCase().includes(query) || m.preview.toLowerCase().includes(query)))
    .slice(0, 3)

  const matchedKnowledge = workspace.knowledge
    .filter((k) => k.title.toLowerCase().includes(query) || k.content.toLowerCase().includes(query) || k.tags.some((t) => t.toLowerCase().includes(query)))
    .slice(0, 3)

  return { tasks: matchedTasks, messages: matchedMessages, knowledge: matchedKnowledge }
})

const hasSpotlightResults = computed(() => {
  return searchQuery.value.trim().length > 0 &&
    (spotlightResults.value.tasks.length > 0 ||
     spotlightResults.value.messages.length > 0 ||
     spotlightResults.value.knowledge.length > 0)
})

function selectSpotlightTask(task: (typeof workspace.tasks)[0]) {
  searchQuery.value = ''
  spotlightOpen.value = false
  navigateTo('tasks')
}

function selectSpotlightMessage(message: (typeof workspace.messages)[0]) {
  searchQuery.value = ''
  spotlightOpen.value = false
  openMessage(message)
  navigateTo('inbox')
}

function selectSpotlightKnowledge(note: (typeof workspace.knowledge)[0]) {
  searchQuery.value = ''
  spotlightOpen.value = false
  selectedKnowledgeCategory.value = 'All'
  knowledgeSearch.value = note.title
  navigateTo('knowledge')
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
}

function closeNotifications() {
  notificationsOpen.value = false
}
</script>

<template>
  <div class="workspace-shell">
    <aside class="sidebar" :class="{ 'sidebar-open': mobileMenuOpen }">
      <RouterLink class="brand-lockup" to="/" aria-label="Priorio home">
        <span class="brand-mark">p</span>
        <span class="brand-name">priorio</span>
      </RouterLink>

      <button class="workspace-switcher" type="button">
        <span class="workspace-avatar">{{ authStore.userInitials[0] }}</span>
        <span class="workspace-name"><strong>{{ authStore.currentWorkspaceName }}</strong><small>Personal</small></span>
        <ChevronDown :size="15" />
      </button>

      <div class="nav-label">WORKSPACE</div>
      <nav class="primary-nav" aria-label="Workspace navigation">
        <RouterLink v-for="item in primaryNavigation" :key="item.name" :to="{ name: item.name }" class="nav-link" :class="{ 'nav-link-active': activeSection === item.name }">
          <component :is="item.icon" :size="18" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
          <span v-if="item.count?.value" class="nav-count">{{ item.count.value }}</span>
        </RouterLink>
      </nav>

      <div class="nav-label nav-label-spaced">COMMUNICATION</div>
      <nav class="primary-nav" aria-label="Communication channels">
        <RouterLink :to="{ name: 'communication-tools' }" class="nav-link" :class="{ 'nav-link-active': activeSection === 'communication-tools' }">
          <MessageSquare :size="18" :stroke-width="1.8" />
          <span>Communication Tools</span>
          <span class="nav-count">7</span>
        </RouterLink>
      </nav>

      <div class="nav-label nav-label-spaced">YOUR SPACE</div>
      <nav class="primary-nav" aria-label="Personal tools">
        <RouterLink v-for="item in secondaryNavigation" :key="item.name" :to="{ name: item.name }" class="nav-link" :class="{ 'nav-link-active': activeSection === item.name }">
          <component :is="item.icon" :size="18" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
          <span v-if="item.name === 'integrations'" class="nav-dot"></span>
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <div class="preview-note"><span class="preview-dot"></span><span>Preview workspace</span></div>
        <button class="profile-button" type="button" @click="navigateTo('settings')">
          <span class="profile-avatar">{{ authStore.userInitials }}</span>
          <span class="profile-copy"><strong>{{ authStore.user?.displayName || 'Alex Morgan' }}</strong><small>{{ authStore.user?.email || 'Personal account' }}</small></span>
          <MoreHorizontal :size="18" />
        </button>
      </div>
    </aside>

    <div v-if="mobileMenuOpen" class="mobile-scrim" @click="mobileMenuOpen = false"></div>

    <main class="main-area">
      <header class="topbar">
        <button class="icon-button mobile-menu-button" type="button" aria-label="Open navigation" @click="mobileMenuOpen = !mobileMenuOpen"><Menu :size="19" /></button>
        <div class="breadcrumb"><span>Workspace</span><ChevronRight :size="14" /><strong>{{ pageTitle }}</strong></div>
        <div class="topbar-actions">
          <div class="global-search-container">
            <label class="global-search">
              <Search :size="16" />
              <input
                v-model="searchQuery"
                @focus="spotlightOpen = true"
                placeholder="Search anything (tasks, messages, notes)..."
                aria-label="Search tasks, messages, and knowledge"
              />
              <kbd>⌘ K</kbd>
            </label>

            <!-- Spotlight Dropdown -->
            <div v-if="spotlightOpen && searchQuery.trim()" class="spotlight-dropdown" @mousedown.prevent>
              <div v-if="hasSpotlightResults">
                <div v-if="spotlightResults.tasks.length" class="spotlight-group">
                  <div class="spotlight-group-title">TASKS</div>
                  <button v-for="t in spotlightResults.tasks" :key="t.id" class="spotlight-item" type="button" @click="selectSpotlightTask(t)">
                    <ListTodo :size="14" class="spotlight-icon-task" />
                    <div class="spotlight-item-text">
                      <strong>{{ t.title }}</strong>
                      <span>{{ t.category }} · {{ priorityLabel(t.priority) }}</span>
                    </div>
                  </button>
                </div>

                <div v-if="spotlightResults.messages.length" class="spotlight-group">
                  <div class="spotlight-group-title">MESSAGES</div>
                  <button v-for="m in spotlightResults.messages" :key="m.id" class="spotlight-item" type="button" @click="selectSpotlightMessage(m)">
                    <Mail :size="14" class="spotlight-icon-msg" />
                    <div class="spotlight-item-text">
                      <strong>{{ m.sender }}: {{ m.subject }}</strong>
                      <span>{{ m.source }} · {{ relativeTime(m.receivedAt) }}</span>
                    </div>
                  </button>
                </div>

                <div v-if="spotlightResults.knowledge.length" class="spotlight-group">
                  <div class="spotlight-group-title">KNOWLEDGE</div>
                  <button v-for="k in spotlightResults.knowledge" :key="k.id" class="spotlight-item" type="button" @click="selectSpotlightKnowledge(k)">
                    <BookOpen :size="14" class="spotlight-icon-doc" />
                    <div class="spotlight-item-text">
                      <strong>{{ k.title }}</strong>
                      <span>{{ k.category }}</span>
                    </div>
                  </button>
                </div>
              </div>
              <div v-else class="spotlight-empty">
                No matching tasks, messages, or notes found.
              </div>
            </div>
          </div>

          <div class="notifications-container">
            <button class="icon-button topbar-bell" type="button" aria-label="Notifications" @click="toggleNotifications">
              <Bell :size="18" />
              <i v-if="pendingReplies.length + todayTasks.length > 0"></i>
            </button>

            <!-- Notifications Popover -->
            <div v-if="notificationsOpen" class="notifications-popover" @mousedown.prevent>
              <div class="notif-header">
                <strong>Notifications</strong>
                <span class="notif-count">{{ pendingReplies.length + todayTasks.length }} pending</span>
              </div>
              <div class="notif-body">
                <div v-if="pendingReplies.length" class="notif-section">
                  <div class="notif-section-title">REPLIES NEEDED</div>
                  <div v-for="m in pendingReplies" :key="m.id" class="notif-item" @click="openMessage(m); navigateTo('inbox'); closeNotifications()">
                    <span class="sender-avatar small-avatar">{{ m.initials }}</span>
                    <div class="notif-copy">
                      <strong>{{ m.sender }}</strong>
                      <p>{{ m.subject }}</p>
                      <small>{{ m.source }} · {{ relativeTime(m.receivedAt) }}</small>
                    </div>
                  </div>
                </div>

                <div v-if="todayTasks.length" class="notif-section">
                  <div class="notif-section-title">DUE TODAY</div>
                  <div v-for="t in todayTasks" :key="t.id" class="notif-item" @click="navigateTo('tasks'); closeNotifications()">
                    <span class="notif-task-dot"></span>
                    <div class="notif-copy">
                      <strong>{{ t.title }}</strong>
                      <p>{{ t.detail || 'Scheduled for today' }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="!pendingReplies.length && !todayTasks.length" class="notif-empty">
                  <CheckCircle2 :size="20" />
                  <p>All caught up! No urgent alerts.</p>
                </div>
              </div>
            </div>
          </div>

          <span class="topbar-avatar" @click="navigateTo('settings')">{{ authStore.userInitials }}</span>
        </div>
      </header>

      <div class="page-content">
        <section v-if="activeSection === 'today'" class="dashboard-page">
          <div class="page-heading dashboard-heading">
            <div><p class="eyebrow">{{ todayLabel }}</p><h1>{{ greeting }}, {{ authStore.user?.displayName?.split(' ')[0] || 'Alex' }}<span class="heading-period">.</span></h1><p class="heading-subtitle">Here’s what deserves your attention today.</p></div>
            <button class="button-primary" type="button" @click="openTaskDialog"><Plus :size="17" /> New task</button>
          </div>

          <div class="briefing-banner">
            <div class="briefing-icon"><Sparkles :size="19" /></div>
            <div class="briefing-copy"><div class="briefing-title">Your day at a glance <span class="preview-tag">Preview</span></div><p>{{ openTasks.length }} tasks to focus on, {{ pendingReplies.length }} conversations waiting on you, and {{ activeReminders.length }} reminders ahead.</p></div>
            <button class="text-action" type="button" @click="navigateTo('assistant')">Open assistant <ArrowUpRight :size="15" /></button>
          </div>

          <div class="stat-grid">
            <article class="stat-card"><span class="stat-icon coral-icon"><ListTodo :size="18" /></span><span class="stat-label">Open tasks</span><strong>{{ openTasks.length }}</strong><span class="stat-foot">{{ todayTasks.length }} due today or overdue</span></article>
            <article class="stat-card"><span class="stat-icon green-icon"><Inbox :size="18" /></span><span class="stat-label">Unread messages</span><strong>{{ workspace.messages.filter((message) => !message.archived && !message.read).length }}</strong><span class="stat-foot">Across sample sources</span></article>
            <article class="stat-card"><span class="stat-icon yellow-icon"><Send :size="18" /></span><span class="stat-label">Waiting on a reply</span><strong>{{ pendingReplies.length }}</strong><span class="stat-foot">Messages that need your response</span></article>
            <article class="stat-card"><span class="stat-icon blue-icon"><Clock3 :size="18" /></span><span class="stat-label">Upcoming reminders</span><strong>{{ activeReminders.length }}</strong><span class="stat-foot">Next: {{ activeReminders[0]?.time ?? 'Nothing scheduled' }}</span></article>
          </div>

          <div class="dashboard-columns">
            <section class="content-panel focus-panel">
              <div class="panel-heading"><div><p class="panel-kicker">MAKE IT COUNT</p><h2>Today’s focus</h2></div><RouterLink class="panel-link" to="/tasks">All tasks <ChevronRight :size="15" /></RouterLink></div>
              <div v-if="todayTasks.length" class="task-list">
                <article v-for="task in todayTasks.slice(0, 4)" :key="task.id" class="task-row">
                  <button class="task-check" :class="{ 'task-check-active': task.status === 'in_progress' }" type="button" :aria-label="`Complete ${task.title}`" @click="workspace.setTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')"><Check v-if="task.status === 'completed'" :size="14" /></button>
                  <div class="task-row-copy"><strong>{{ task.title }}</strong><span>{{ task.detail }}</span></div>
                  <span class="priority-pill" :class="`priority-${task.priority}`"><i></i>{{ priorityLabel(task.priority) }}</span>
                  <span class="task-due" :class="{ 'task-overdue': task.dueDate < new Date().toISOString().slice(0, 10) }">{{ formatDueDate(task.dueDate) }}</span>
                </article>
              </div>
              <div v-else class="empty-state compact-empty"><CheckCircle2 :size="22" /><strong>You’re clear for today</strong><span>Add a task whenever something comes up.</span></div>
              <button class="add-task-inline" type="button" @click="openTaskDialog"><Plus :size="16" /> Add a task</button>
            </section>

            <section class="content-panel reminders-panel">
              <div class="panel-heading"><div><p class="panel-kicker">DON’T FORGET</p><h2>Coming up</h2></div><RouterLink class="panel-link" to="/reminders">View all <ChevronRight :size="15" /></RouterLink></div>
              <div v-if="activeReminders.length" class="reminder-list">
                <article v-for="reminder in activeReminders.slice(0, 3)" :key="reminder.id" class="reminder-row"><span class="reminder-marker"><CalendarDays :size="16" /></span><div><strong>{{ reminder.title }}</strong><span>{{ reminder.time }}</span></div><button class="quiet-icon" type="button" :aria-label="`Complete ${reminder.title}`" @click="workspace.setReminderCompleted(reminder.id, true)"><Check :size="16" /></button></article>
              </div>
              <div v-else class="empty-state compact-empty"><Bell :size="21" /><strong>No reminders coming up</strong><span>Your schedule has breathing room.</span></div>
              <RouterLink class="add-task-inline" to="/reminders"><Plus :size="16" /> Create reminder</RouterLink>
            </section>
          </div>

          <section class="content-panel messages-panel">
            <div class="panel-heading"><div><p class="panel-kicker">FROM YOUR INBOX</p><h2>Worth a look</h2></div><RouterLink class="panel-link" to="/inbox">Open inbox <ChevronRight :size="15" /></RouterLink></div>
            <div v-if="importantMessages.length" class="message-preview-grid">
              <button v-for="message in importantMessages" :key="message.id" class="message-preview" type="button" @click="openMessage(message)">
                <span class="message-source" :class="sourceClass(message.source)"><component :is="sourceIcon(message.source)" :size="14" />{{ message.source }}</span><span class="message-preview-time">{{ relativeTime(message.receivedAt) }}</span>
                <span class="message-sender"><span class="sender-avatar">{{ message.initials }}</span><strong>{{ message.sender }}</strong><Star v-if="message.starred" :size="14" class="star-fill" /></span>
                <strong class="message-subject">{{ message.subject }}</strong><span class="message-excerpt">{{ message.preview }}</span>
                <span class="message-bottom"><span class="priority-pill" :class="`priority-${message.priority}`"><i></i>{{ priorityLabel(message.priority) }}</span><span v-if="message.requiresReply" class="reply-needed">Needs reply</span></span>
              </button>
            </div>
            <div v-else class="empty-state"><Inbox :size="24" /><strong>Your important messages will show up here</strong><span>Connect an inbox to start bringing conversations together.</span><RouterLink class="text-action" to="/integrations">View integrations <ArrowUpRight :size="15" /></RouterLink></div>
          </section>
        </section>

        <section v-else-if="activeSection === 'inbox'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">YOUR CONVERSATIONS</p><h1>Smart inbox<span class="heading-period">.</span></h1><p class="heading-subtitle">One clear view of the messages that matter.</p></div><span class="connection-indicator"><i></i> Preview data</span></div>
          <div class="inbox-toolbar"><div class="filter-tabs"><button v-for="filter in ['All', 'Important', 'Urgent', 'Needs reply', 'Work', 'Personal', 'Financial']" :key="filter" type="button" :class="{ 'filter-active': inboxFilter === filter }" @click="inboxFilter = filter">{{ filter }}</button></div><button class="icon-button filter-button" type="button" title="Filters"><Filter :size="17" /></button></div>
          <div class="inbox-layout">
            <div class="inbox-list">
              <article v-for="message in inboxMessages" :key="message.id" class="inbox-row" :class="{ 'inbox-row-selected': selectedMessageId === message.id, 'inbox-row-unread': !message.read }">
                <button class="inbox-row-open" type="button" @click="openMessage(message)"><span class="sender-avatar">{{ message.initials }}</span><span class="inbox-row-main"><span class="inbox-row-top"><strong>{{ message.sender }}</strong><time>{{ relativeTime(message.receivedAt) }}</time></span><strong class="inbox-row-subject">{{ message.subject }}</strong><span class="inbox-row-preview">{{ message.preview }}</span><span class="inbox-row-tags"><span class="source-tag" :class="sourceClass(message.source)"><component :is="sourceIcon(message.source)" :size="12" />{{ message.source }}</span><span v-if="message.requiresReply" class="reply-needed">Needs reply</span><span class="category-tag">{{ message.category }}</span></span></span></button><button class="row-star" type="button" :aria-label="message.starred ? 'Remove important' : 'Mark important'" @click="workspace.toggleStar(message.id)"><Star :size="16" :class="{ 'star-fill': message.starred }" /></button>
              </article>
              <div v-if="!inboxMessages.length" class="empty-state list-empty"><Inbox :size="23" /><strong>No messages match this view</strong><span>Try a different filter or search term.</span></div>
              <div class="list-footer">{{ inboxMessages.length }} messages in preview workspace</div>
            </div>
            <aside class="message-detail">
              <template v-if="selectedMessage">
                <div class="detail-toolbar"><span class="detail-source" :class="sourceClass(selectedMessage.source)"><component :is="sourceIcon(selectedMessage.source)" :size="14" />{{ selectedMessage.source }}</span><div><button class="quiet-icon" type="button" aria-label="Mark important" @click="workspace.toggleStar(selectedMessage.id)"><Star :size="17" :class="{ 'star-fill': selectedMessage.starred }" /></button><button class="quiet-icon" type="button" aria-label="Archive" @click="archiveSelectedMessage"><Archive :size="17" /></button></div></div>
                <div class="detail-message"><span class="detail-category">{{ selectedMessage.category }} · {{ priorityLabel(selectedMessage.priority) }} priority</span><h2>{{ selectedMessage.subject }}</h2><div class="detail-sender"><span class="sender-avatar large-avatar">{{ selectedMessage.initials }}</span><div><strong>{{ selectedMessage.sender }}</strong><span>{{ relativeTime(selectedMessage.receivedAt) }}</span></div></div><p>{{ selectedMessage.preview }}</p><div class="ai-summary"><span class="summary-label"><Sparkles :size="14" /> Message summary <span class="preview-tag">Preview</span></span><p>{{ selectedMessage.summary }}</p></div><div v-if="selectedMessage.requiresReply" class="suggested-action"><span class="action-dot"></span><div><strong>Reply needed</strong><span>This conversation may need a response.</span></div><button class="text-action" type="button" disabled>Draft reply</button></div><div class="detail-footer"><span><ShieldCheck :size="14" /> No external actions are taken</span><button type="button" class="button-outline" @click="selectedMessageId = null">Close</button></div></div>
              </template>
              <div v-else class="detail-placeholder"><div class="detail-placeholder-icon"><Mail :size="22" /></div><strong>Select a message</strong><span>Choose a conversation to see its preview and summary.</span></div>
            </aside>
          </div>
        </section>

        <section v-else-if="activeSection === 'tasks'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h1>My tasks<span class="heading-period">.</span></h1><p class="heading-subtitle">A focused list of your commitments.</p></div><button class="button-primary" type="button" @click="openTaskDialog"><Plus :size="17" /> New task</button></div>
          <div class="tasks-toolbar"><div class="task-summary"><strong>{{ openTasks.length }}</strong> open <span></span><strong>{{ workspace.tasks.filter((task) => task.status === 'completed').length }}</strong> completed</div><div class="view-switch"><button v-for="view in ['List', 'Board'] as const" :key="view" type="button" :class="{ 'view-active': taskView === view }" @click="taskView = view">{{ view }}</button></div><button class="filter-button text-filter" type="button"><Filter :size="15" /> Filter</button></div>
          <div v-if="taskView === 'List'" class="content-panel task-table-panel">
            <div class="task-table-head"><span>TASK</span><span>PRIORITY</span><span>DUE DATE</span><span>STATUS</span></div>
            <article v-for="task in visibleTasks" :key="task.id" class="task-table-row"><button class="task-check" :class="{ 'task-check-done': task.status === 'completed' }" type="button" :aria-label="`Toggle ${task.title}`" @click="workspace.setTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')"><Check v-if="task.status === 'completed'" :size="14" /></button><div class="task-cell-title"><strong :class="{ 'completed-title': task.status === 'completed' }">{{ task.title }}</strong><span>{{ task.detail || task.category }}</span></div><span class="priority-pill" :class="`priority-${task.priority}`"><i></i>{{ priorityLabel(task.priority) }}</span><span class="task-due" :class="{ 'task-overdue': task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'completed' }">{{ formatDueDate(task.dueDate) }}</span><select class="status-select" :value="task.status" aria-label="Task status" @change="workspace.setTaskStatus(task.id, ($event.target as HTMLSelectElement).value as 'pending' | 'in_progress' | 'completed')"><option value="pending">To do</option><option value="in_progress">In progress</option><option value="completed">Done</option></select></article>
            <div v-if="!visibleTasks.length" class="empty-state"><ListTodo :size="23" /><strong>No tasks found</strong><span>Change your search or add your next task.</span><button class="text-action" type="button" @click="openTaskDialog">Add a task <Plus :size="15" /></button></div>
          </div>
          <div v-else class="kanban-grid"><section v-for="column in [{ key: 'pending', label: 'To do' }, { key: 'in_progress', label: 'In progress' }, { key: 'completed', label: 'Done' }] as const" :key="column.key" class="kanban-column"><div class="kanban-heading"><span>{{ column.label }}</span><span>{{ visibleTasks.filter((task) => task.status === column.key).length }}</span></div><article v-for="task in visibleTasks.filter((item) => item.status === column.key)" :key="task.id" class="kanban-card"><span class="priority-pill" :class="`priority-${task.priority}`"><i></i>{{ priorityLabel(task.priority) }}</span><strong>{{ task.title }}</strong><span>{{ task.detail }}</span><footer><span>{{ formatDueDate(task.dueDate) }}</span><select :value="task.status" :aria-label="`Move ${task.title}`" @change="workspace.setTaskStatus(task.id, ($event.target as HTMLSelectElement).value as 'pending' | 'in_progress' | 'completed')"><option value="pending">To do</option><option value="in_progress">In progress</option><option value="completed">Done</option></select></footer></article><button class="add-task-inline" type="button" @click="openTaskDialog"><Plus :size="15" /> Add task</button></section></div>
        </section>

        <!-- Daily Planner Section -->
        <section v-else-if="activeSection === 'daily-planner'" class="inner-page">
          <DailyPlannerView />
        </section>

        <section v-else-if="activeSection === 'reminders'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">AT THE RIGHT MOMENT</p><h1>Reminders<span class="heading-period">.</span></h1><p class="heading-subtitle">Keep the small promises to yourself, too.</p></div><span class="connection-indicator"><i></i> Stored on this device</span></div>
          <section class="content-panel reminder-page-panel"><div class="panel-heading"><div><p class="panel-kicker">UP NEXT</p><h2>Your reminders</h2></div><span class="muted-count">{{ activeReminders.length }} upcoming</span></div><article v-for="reminder in workspace.reminders" :key="reminder.id" class="reminder-page-row" :class="{ 'reminder-done': reminder.completed }"><button class="task-check" :class="{ 'task-check-done': reminder.completed }" type="button" :aria-label="`Toggle ${reminder.title}`" @click="workspace.setReminderCompleted(reminder.id, !reminder.completed)"><Check v-if="reminder.completed" :size="14" /></button><span class="reminder-marker"><CalendarDays :size="16" /></span><div><strong>{{ reminder.title }}</strong><span>{{ reminder.time }}</span></div><span v-if="reminder.completed" class="completed-label">Completed</span><button v-else class="quiet-icon" type="button" title="Snooze reminder" @click="reminder.time = 'Tomorrow · 9:00 AM'; workspace.persist()"><Clock3 :size="17" /></button></article><div v-if="!workspace.reminders.length" class="empty-state"><Bell :size="24" /><strong>No reminders yet</strong><span>Reminders you create will be collected here.</span></div><div class="reminder-note"><ShieldCheck :size="16" /> Reminder delivery is not enabled in this preview.</div></section>
        </section>

        <section v-else-if="activeSection === 'followups'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">CLOSE THE LOOP</p><h1>Follow-ups<span class="heading-period">.</span></h1><p class="heading-subtitle">Conversations that may need a response from you.</p></div><span class="connection-indicator"><i></i> {{ pendingReplies.length }} waiting</span></div>
          <div class="followup-layout"><section class="content-panel followup-panel"><div class="panel-heading"><div><p class="panel-kicker">REPLY TRACKER</p><h2>Needs your attention</h2></div><span class="muted-count">{{ pendingReplies.length }} conversations</span></div><button v-for="message in pendingReplies" :key="message.id" class="followup-row" type="button" @click="navigateTo('inbox'); selectedMessageId = message.id"><span class="sender-avatar">{{ message.initials }}</span><span class="followup-copy"><strong>{{ message.sender }}</strong><b>{{ message.subject }}</b><span>{{ message.preview }}</span><small>{{ message.source }} · {{ relativeTime(message.receivedAt) }}</small></span><span class="followup-status"><span class="reply-needed">Needs reply</span><ChevronRight :size="17" /></span></button><div v-if="!pendingReplies.length" class="empty-state"><Send :size="22" /><strong>You’re all caught up</strong><span>Messages requiring a reply will appear here.</span></div></section><aside class="followup-aside"><span class="aside-icon"><ShieldCheck :size="19" /></span><h3>Your approval comes first</h3><p>Priorio can suggest follow-ups, but it never sends messages on your behalf.</p></aside></div>
        </section>

        <!-- AI Assistant Section -->
        <section v-else-if="activeSection === 'assistant'" class="inner-page assistant-page">
          <div class="page-heading">
            <div>
              <p class="eyebrow">THINK CLEARLY</p>
              <h1>AI assistant<span class="heading-period">.</span></h1>
              <p class="heading-subtitle">A grounded assistant connected to your tasks, inbox, and knowledge notes.</p>
            </div>
            <div class="heading-actions">
              <span class="connection-indicator live-indicator"><i></i> Grounded Engine Active</span>
              <button class="button-outline clear-chat-btn" type="button" @click="workspace.clearAssistantChat">
                <RotateCcw :size="13" /> Reset Chat
              </button>
            </div>
          </div>

          <!-- Quick Suggestion Prompts -->
          <div class="assistant-prompts-bar">
            <span class="prompts-bar-title"><Sparkles :size="14" /> Suggested Prompts:</span>
            <div class="prompts-bar-list">
              <button
                v-for="prompt in [
                  'What should I focus on today?',
                  'Which conversations need a reply?',
                  'What deadlines are coming up?',
                  'Summarize my important messages',
                  'Plan my deep focus time'
                ]"
                :key="prompt"
                type="button"
                class="prompt-bar-chip"
                @click="askPrompt(prompt)"
              >
                {{ prompt }}
              </button>
            </div>
          </div>

          <!-- Chat Stream Shell -->
          <div class="assistant-conversation-container">
            <div class="chat-stream">
              <div
                v-for="msg in workspace.assistantMessages"
                :key="msg.id"
                class="chat-bubble-row"
                :class="{ 'user-row': msg.role === 'user', 'assistant-row': msg.role === 'assistant' }"
              >
                <div class="chat-avatar">
                  <span v-if="msg.role === 'user'">AM</span>
                  <Sparkles v-else :size="16" />
                </div>
                <div class="chat-bubble-content">
                  <div class="bubble-meta">
                    <span class="bubble-sender">{{ msg.role === 'user' ? 'You' : 'Priorio Assistant' }}</span>
                    <span class="bubble-time">{{ msg.timestamp }}</span>
                  </div>
                  <div class="bubble-text" style="white-space: pre-wrap;">{{ msg.content }}</div>

                  <!-- Citations Badge List -->
                  <div v-if="msg.citations && msg.citations.length" class="bubble-citations">
                    <span class="citations-label">Sources:</span>
                    <span v-for="(cit, idx) in msg.citations" :key="idx" class="citation-pill">
                      <FileText :size="11" />
                      {{ cit }}
                    </span>
                  </div>

                  <!-- Executable Action Button -->
                  <div v-if="msg.suggestedAction" class="bubble-action-box">
                    <div class="action-info">
                      <span class="action-tag">RECOMMENDED ACTION</span>
                      <strong>{{ msg.suggestedAction.label }}</strong>
                    </div>
                    <button class="button-primary action-btn" type="button" @click="executeAssistantAction(msg.suggestedAction)">
                      <Plus :size="13" /> Execute Now
                    </button>
                  </div>
                </div>
              </div>

              <!-- Thinking Animation -->
              <div v-if="isAssistantThinking" class="chat-bubble-row assistant-row">
                <div class="chat-avatar"><Sparkles :size="16" /></div>
                <div class="chat-bubble-content">
                  <div class="bubble-meta"><span class="bubble-sender">Priorio Assistant</span></div>
                  <div class="thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>

              <div ref="assistantChatEnd"></div>
            </div>

            <!-- Chat Input Form -->
            <form class="assistant-chat-input-form" @submit.prevent="sendAssistantMessage">
              <input
                v-model="assistantInput"
                placeholder="Ask about tasks, priorities, messages, or strategy..."
                aria-label="Ask Priorio Assistant"
                :disabled="isAssistantThinking"
              />
              <button
                type="submit"
                class="chat-send-btn"
                :disabled="!assistantInput.trim() || isAssistantThinking"
                aria-label="Send query"
              >
                <Send :size="16" />
              </button>
            </form>
            <p class="assistant-privacy-footer">
              <ShieldCheck :size="13" /> Grounded locally in your active tasks, communications, and knowledge base. Zero external LLM leaks.
            </p>
          </div>
        </section>

        <!-- Knowledge Hub Section -->
        <section v-else-if="activeSection === 'knowledge'" class="inner-page knowledge-page">
          <div class="page-heading">
            <div>
              <p class="eyebrow">PERSISTENT MEMORY</p>
              <h1>Knowledge hub<span class="heading-period">.</span></h1>
              <p class="heading-subtitle">Decisions, architecture notes, and guidelines grounded into your daily assistant.</p>
            </div>
            <button class="button-primary" type="button" @click="openKnowledgeModal">
              <Plus :size="16" /> New note
            </button>
          </div>

          <!-- Knowledge Toolbar: Categories & Search -->
          <div class="knowledge-toolbar">
            <div class="filter-tabs">
              <button
                v-for="cat in ['All', 'Architecture', 'Guidelines', 'Decisions', 'Reference']"
                :key="cat"
                type="button"
                :class="{ 'filter-active': selectedKnowledgeCategory === cat }"
                @click="selectedKnowledgeCategory = cat"
              >
                {{ cat }}
              </button>
            </div>
            <div class="knowledge-search-wrap">
              <Search :size="15" />
              <input v-model="knowledgeSearch" placeholder="Filter notes or tags..." />
            </div>
          </div>

          <!-- Knowledge Cards Grid -->
          <div v-if="filteredKnowledge.length" class="knowledge-cards-grid">
            <article v-for="note in filteredKnowledge" :key="note.id" class="knowledge-card">
              <div class="k-card-header">
                <span class="k-cat-badge" :class="`k-cat-${note.category.toLowerCase()}`">{{ note.category }}</span>
                <button class="quiet-icon k-del-btn" type="button" aria-label="Delete note" @click="deleteKnowledgeNote(note.id)">
                  <Trash2 :size="15" />
                </button>
              </div>
              <h3 class="k-card-title">{{ note.title }}</h3>
              <p class="k-card-content">{{ note.content }}</p>
              <div class="k-card-footer">
                <div class="k-tags">
                  <span v-for="tag in note.tags" :key="tag" class="k-tag">#{{ tag }}</span>
                </div>
                <span class="k-date">{{ note.updatedAt }}</span>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <BookOpen :size="24" />
            <strong>No notes match this filter</strong>
            <span>Create a new note or adjust your search keywords.</span>
            <button class="button-outline" type="button" @click="openKnowledgeModal">
              <Plus :size="15" /> Create a note
            </button>
          </div>
        </section>

        <section v-else-if="activeSection === 'communication-tools'" class="inner-page">
          <CommunicationToolsView />
        </section>

        <section v-else-if="activeSection === 'integrations'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">BRING YOUR DAY TOGETHER</p><h1>Integrations<span class="heading-period">.</span></h1><p class="heading-subtitle">Manage the services that keep Priorio up to date.</p></div></div>
          
          <div class="comm-banner-card" @click="navigateTo('communication-tools')">
            <div class="comm-banner-left">
              <span class="comm-banner-icon"><MessageSquare :size="20" /></span>
              <div>
                <strong>Communication Tools Hub</strong>
                <p>View all 7 communication channels, messaging services, and mail integrations.</p>
              </div>
            </div>
            <button class="button-primary banner-action-btn" type="button">Open Communication Tools →</button>
          </div>

          <div class="integration-notice"><ShieldCheck :size="18" /><p><strong>Connections are not enabled in this build.</strong><span>No credentials are requested or stored by this preview.</span></p></div>
          <div class="integration-grid"><article v-for="integration in [{ name: 'Gmail', detail: 'Email, requests, and important updates', icon: Mail, className: 'gmail-brand' }, { name: 'Microsoft Teams', detail: 'Messages and team commitments', icon: MessageCircle, className: 'teams-brand' }, { name: 'WhatsApp previews', detail: 'Android notification previews only', icon: MessageCircle, className: 'whatsapp-brand' }]" :key="integration.name" class="integration-card"><span class="integration-brand" :class="integration.className"><component :is="integration.icon" :size="19" /></span><span class="integration-status">Not connected</span><h2>{{ integration.name }}</h2><p>{{ integration.detail }}</p><button class="button-outline" type="button" disabled>Unavailable in preview</button></article></div>
          <div class="whatsapp-note"><ShieldCheck :size="17" /><p><strong>WhatsApp privacy</strong><span>Personal WhatsApp support can only use notification previews explicitly enabled on Android. Priorio does not access complete chat history or use WhatsApp Web scraping.</span></p></div>
        </section>

        <section v-else class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">YOUR PREFERENCES</p><h1>Settings<span class="heading-period">.</span></h1><p class="heading-subtitle">Your account and privacy controls.</p></div></div>
          <section class="content-panel settings-panel">
            <div class="settings-section">
              <div><h2>Profile</h2><p>Personal workspace profile.</p></div>
              <div class="settings-value">
                <span class="profile-avatar">{{ authStore.userInitials }}</span>
                <span><strong>{{ authStore.user?.displayName || 'Alex Morgan' }}</strong><small>{{ authStore.user?.email || 'Local preview account' }}</small></span>
              </div>
            </div>
            <div class="settings-section">
              <div><h2>Timezone</h2><p>Dates are shown in your device timezone.</p></div>
              <span class="settings-value plain-value">{{ Intl.DateTimeFormat().resolvedOptions().timeZone }}</span>
            </div>
            <div class="settings-section">
              <div><h2>Data and privacy</h2><p>Preview data is stored in this browser only.</p></div>
              <span class="privacy-status"><ShieldCheck :size="15" /> On this device</span>
            </div>
            <div class="settings-section">
              <div><h2>Account Session</h2><p>Sign out of this session or switch accounts.</p></div>
              <button class="button-outline" type="button" @click="handleSignOut">
                <LogOut :size="15" /> Sign Out
              </button>
            </div>
            <div class="settings-section reset-section">
              <div><h2>Reset preview workspace</h2><p>Restore the example tasks, messages, and reminders.</p></div>
              <button class="button-outline" type="button" @click="workspace.resetPreview">Reset preview data</button>
            </div>
          </section>
        </section>
      </div>
    </main>

    <nav class="mobile-bottom-nav" aria-label="Mobile navigation">
      <button v-for="item in primaryNavigation.slice(0, 4)" :key="item.name" type="button" :class="{ 'mobile-active': activeSection === item.name }" @click="navigateTo(item.name)"><component :is="item.icon" :size="19" /><span>{{ item.name === 'today' ? 'Home' : item.label.replace('Smart ', '') }}</span></button>
      <button type="button" :class="{ 'mobile-active': activeSection === 'assistant' }" @click="navigateTo('assistant')"><Sparkles :size="19" /><span>AI</span></button>
    </nav>

    <!-- Task Creation Modal -->
    <div v-if="taskDialogOpen" class="modal-backdrop" @click.self="taskDialogOpen = false">
      <form class="task-modal" @submit.prevent="createTask">
        <div class="modal-heading"><div><p class="panel-kicker">MAKE IT HAPPEN</p><h2>New task</h2></div><button class="quiet-icon" type="button" aria-label="Close" @click="taskDialogOpen = false"><X :size="19" /></button></div>
        <label class="form-label">What needs doing?<input v-model="taskTitle" autofocus maxlength="140" placeholder="e.g. Send the project update" required /></label>
        <label class="form-label">Details <span class="optional-label">Optional</span><textarea v-model="taskDetail" rows="3" placeholder="Add a little context"></textarea></label>
        <div class="form-row"><label class="form-label">Due date<input v-model="taskDueDate" type="date" /></label><label class="form-label">Priority<select v-model="taskPriority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div>
        <div class="modal-actions"><button class="button-outline" type="button" @click="taskDialogOpen = false">Cancel</button><button class="button-primary" type="submit"><Plus :size="16" /> Add task</button></div>
      </form>
    </div>

    <!-- Knowledge Note Modal -->
    <div v-if="knowledgeModalOpen" class="modal-backdrop" @click.self="knowledgeModalOpen = false">
      <form class="task-modal" @submit.prevent="saveKnowledgeNote">
        <div class="modal-heading">
          <div><p class="panel-kicker">PRESERVE CONTEXT</p><h2>New knowledge note</h2></div>
          <button class="quiet-icon" type="button" aria-label="Close" @click="knowledgeModalOpen = false"><X :size="19" /></button>
        </div>
        <label class="form-label">Note Title<input v-model="newNoteTitle" autofocus maxlength="120" placeholder="e.g. Q4 Infrastructure Architecture" required /></label>
        <div class="form-row">
          <label class="form-label">Category
            <select v-model="newNoteCategory">
              <option value="Architecture">Architecture</option>
              <option value="Guidelines">Guidelines</option>
              <option value="Decisions">Decisions</option>
              <option value="Reference">Reference</option>
            </select>
          </label>
          <label class="form-label">Tags (comma separated)<input v-model="newNoteTags" placeholder="e.g. Security, OAuth, AWS" /></label>
        </div>
        <label class="form-label">Note Content<textarea v-model="newNoteContent" rows="4" placeholder="Write key decisions, architecture rules, or protocols..." required></textarea></label>
        <div class="modal-actions">
          <button class="button-outline" type="button" @click="knowledgeModalOpen = false">Cancel</button>
          <button class="button-primary" type="submit"><Plus :size="16" /> Save Note</button>
        </div>
      </form>
    </div>
  </div>
</template>
