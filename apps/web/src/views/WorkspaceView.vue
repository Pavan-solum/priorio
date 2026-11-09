<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  Archive, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Command, Filter, Inbox,
  LayoutDashboard, ListTodo, Mail, Menu, MessageCircle, MessageSquare, MoreHorizontal, Plus,
  Search, Send, Settings2, ShieldCheck, Sparkles, Star, Tag, X,
} from 'lucide-vue-next'
import { useWorkspaceStore, type InboxMessage, type Priority } from '../stores/workspace'
import CommunicationToolsView from './CommunicationToolsView.vue'

const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()
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
</script>

<template>
  <div class="workspace-shell">
    <aside class="sidebar" :class="{ 'sidebar-open': mobileMenuOpen }">
      <RouterLink class="brand-lockup" to="/" aria-label="Priorio home">
        <span class="brand-mark">p</span>
        <span class="brand-name">priorio</span>
      </RouterLink>

      <button class="workspace-switcher" type="button">
        <span class="workspace-avatar">A</span>
        <span class="workspace-name"><strong>Alex’s workspace</strong><small>Personal</small></span>
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
          <span class="profile-avatar">AM</span>
          <span class="profile-copy"><strong>Alex Morgan</strong><small>Personal account</small></span>
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
          <label class="global-search"><Search :size="16" /><input v-model="searchQuery" placeholder="Search anything" aria-label="Search tasks and messages" /><kbd>⌘ K</kbd></label>
          <button class="icon-button topbar-bell" type="button" aria-label="Notifications"><Bell :size="18" /><i></i></button>
          <span class="topbar-avatar">AM</span>
        </div>
      </header>

      <div class="page-content">
        <section v-if="activeSection === 'today'" class="dashboard-page">
          <div class="page-heading dashboard-heading">
            <div><p class="eyebrow">{{ todayLabel }}</p><h1>{{ greeting }}, Alex<span class="heading-period">.</span></h1><p class="heading-subtitle">Here’s what deserves your attention today.</p></div>
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

        <section v-else-if="activeSection === 'reminders'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">AT THE RIGHT MOMENT</p><h1>Reminders<span class="heading-period">.</span></h1><p class="heading-subtitle">Keep the small promises to yourself, too.</p></div><span class="connection-indicator"><i></i> Stored on this device</span></div>
          <section class="content-panel reminder-page-panel"><div class="panel-heading"><div><p class="panel-kicker">UP NEXT</p><h2>Your reminders</h2></div><span class="muted-count">{{ activeReminders.length }} upcoming</span></div><article v-for="reminder in workspace.reminders" :key="reminder.id" class="reminder-page-row" :class="{ 'reminder-done': reminder.completed }"><button class="task-check" :class="{ 'task-check-done': reminder.completed }" type="button" :aria-label="`Toggle ${reminder.title}`" @click="workspace.setReminderCompleted(reminder.id, !reminder.completed)"><Check v-if="reminder.completed" :size="14" /></button><span class="reminder-marker"><CalendarDays :size="16" /></span><div><strong>{{ reminder.title }}</strong><span>{{ reminder.time }}</span></div><span v-if="reminder.completed" class="completed-label">Completed</span><button v-else class="quiet-icon" type="button" title="Snooze reminder" @click="reminder.time = 'Tomorrow · 9:00 AM'; workspace.persist()"><Clock3 :size="17" /></button></article><div v-if="!workspace.reminders.length" class="empty-state"><Bell :size="24" /><strong>No reminders yet</strong><span>Reminders you create will be collected here.</span></div><div class="reminder-note"><ShieldCheck :size="16" /> Reminder delivery is not enabled in this preview.</div></section>
        </section>

        <section v-else-if="activeSection === 'followups'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">CLOSE THE LOOP</p><h1>Follow-ups<span class="heading-period">.</span></h1><p class="heading-subtitle">Conversations that may need a response from you.</p></div><span class="connection-indicator"><i></i> {{ pendingReplies.length }} waiting</span></div>
          <div class="followup-layout"><section class="content-panel followup-panel"><div class="panel-heading"><div><p class="panel-kicker">REPLY TRACKER</p><h2>Needs your attention</h2></div><span class="muted-count">{{ pendingReplies.length }} conversations</span></div><button v-for="message in pendingReplies" :key="message.id" class="followup-row" type="button" @click="navigateTo('inbox'); selectedMessageId = message.id"><span class="sender-avatar">{{ message.initials }}</span><span class="followup-copy"><strong>{{ message.sender }}</strong><b>{{ message.subject }}</b><span>{{ message.preview }}</span><small>{{ message.source }} · {{ relativeTime(message.receivedAt) }}</small></span><span class="followup-status"><span class="reply-needed">Needs reply</span><ChevronRight :size="17" /></span></button><div v-if="!pendingReplies.length" class="empty-state"><Send :size="22" /><strong>You’re all caught up</strong><span>Messages requiring a reply will appear here.</span></div></section><aside class="followup-aside"><span class="aside-icon"><ShieldCheck :size="19" /></span><h3>Your approval comes first</h3><p>Priorio can suggest follow-ups, but it never sends messages on your behalf.</p></aside></div>
        </section>

        <section v-else-if="activeSection === 'assistant'" class="inner-page assistant-page">
          <div class="page-heading"><div><p class="eyebrow">THINK CLEARLY</p><h1>AI assistant<span class="heading-period">.</span></h1><p class="heading-subtitle">A grounded assistant for your work and commitments.</p></div><span class="connection-indicator unavailable"><i></i> Not configured</span></div>
          <div class="assistant-shell"><div class="assistant-welcome"><span class="assistant-orb"><Sparkles :size="24" /></span><p class="panel-kicker">YOUR PERSONAL ASSISTANT</p><h2>What would you like to<br />get clear on?</h2><p>Answers will include references to the messages and tasks they came from.</p></div><div class="prompt-grid"><button v-for="prompt in ['What should I focus on today?', 'Which conversations need a reply?', 'What deadlines are coming up?', 'Summarize my important messages']" :key="prompt" type="button" disabled><span>{{ prompt }}</span><ArrowUpRight :size="15" /></button></div><div class="assistant-input"><input disabled placeholder="AI is unavailable in this preview" aria-label="Ask Priorio" /><button type="button" disabled aria-label="Send message"><Send :size="17" /></button></div><p class="assistant-disclaimer"><ShieldCheck :size="14" /> AI is not configured. No message content is sent to an AI provider.</p></div>
        </section>

        <section v-else-if="activeSection === 'knowledge'" class="inner-page">
          <div class="page-heading"><div><p class="eyebrow">KEEP THE IMPORTANT THINGS</p><h1>Knowledge hub<span class="heading-period">.</span></h1><p class="heading-subtitle">A home for notes, decisions, and things worth finding again.</p></div><span class="connection-indicator unavailable"><i></i> Local preview</span></div>
          <section class="content-panel knowledge-empty"><span class="knowledge-icon"><BookOpen :size="23" /></span><h2>Your knowledge, in one place</h2><p>Save a message or jot down a note to start building your personal reference space.</p><button class="button-outline" type="button" disabled><Plus :size="16" /> New note unavailable</button><span class="privacy-line"><ShieldCheck :size="14" /> Semantic search is not configured in this preview.</span></section>
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
          <section class="content-panel settings-panel"><div class="settings-section"><div><h2>Profile</h2><p>Personal workspace profile.</p></div><div class="settings-value"><span class="profile-avatar">AM</span><span><strong>Alex Morgan</strong><small>Local preview account</small></span></div></div><div class="settings-section"><div><h2>Timezone</h2><p>Dates are shown in your device timezone.</p></div><span class="settings-value plain-value">{{ Intl.DateTimeFormat().resolvedOptions().timeZone }}</span></div><div class="settings-section"><div><h2>Data and privacy</h2><p>Preview data is stored in this browser only.</p></div><span class="privacy-status"><ShieldCheck :size="15" /> On this device</span></div><div class="settings-section reset-section"><div><h2>Reset preview workspace</h2><p>Restore the example tasks, messages, and reminders.</p></div><button class="button-outline" type="button" @click="workspace.resetPreview">Reset preview data</button></div></section>
        </section>
      </div>
    </main>

    <nav class="mobile-bottom-nav" aria-label="Mobile navigation">
      <button v-for="item in primaryNavigation.slice(0, 4)" :key="item.name" type="button" :class="{ 'mobile-active': activeSection === item.name }" @click="navigateTo(item.name)"><component :is="item.icon" :size="19" /><span>{{ item.name === 'today' ? 'Home' : item.label.replace('Smart ', '') }}</span></button>
      <button type="button" :class="{ 'mobile-active': activeSection === 'assistant' }" @click="navigateTo('assistant')"><Sparkles :size="19" /><span>AI</span></button>
    </nav>

    <div v-if="taskDialogOpen" class="modal-backdrop" @click.self="taskDialogOpen = false">
      <form class="task-modal" @submit.prevent="createTask">
        <div class="modal-heading"><div><p class="panel-kicker">MAKE IT HAPPEN</p><h2>New task</h2></div><button class="quiet-icon" type="button" aria-label="Close" @click="taskDialogOpen = false"><X :size="19" /></button></div>
        <label class="form-label">What needs doing?<input v-model="taskTitle" autofocus maxlength="140" placeholder="e.g. Send the project update" required /></label>
        <label class="form-label">Details <span class="optional-label">Optional</span><textarea v-model="taskDetail" rows="3" placeholder="Add a little context"></textarea></label>
        <div class="form-row"><label class="form-label">Due date<input v-model="taskDueDate" type="date" /></label><label class="form-label">Priority<select v-model="taskPriority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div>
        <div class="modal-actions"><button class="button-outline" type="button" @click="taskDialogOpen = false">Cancel</button><button class="button-primary" type="submit"><Plus :size="16" /> Add task</button></div>
      </form>
    </div>
  </div>
</template>