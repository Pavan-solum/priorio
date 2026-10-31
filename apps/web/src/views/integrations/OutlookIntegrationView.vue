<template>
  <div class="outlook-integration-view">
    <div class="view-header">
      <h1>Outlook Integration</h1>
      <div class="header-controls">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search emails..."
          class="search-input"
        />
        <button @click="loadEmails" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      <span>⚠ {{ error }}</span>
      <button @click="error = null" class="close-btn">✕</button>
    </div>

    <!-- Filters and stats -->
    <div class="controls-bar">
      <div class="filter-buttons">
        <button
          @click="filterUnread = !filterUnread"
          :class="['filter-btn', { active: filterUnread }]"
        >
          Unread ({{ unreadCount }})
        </button>
        <button
          @click="filterStarred = !filterStarred"
          :class="['filter-btn', { active: filterStarred }]"
        >
          Starred
        </button>
      </div>
      <div class="stats">
        <span>{{ filteredEmails.length }} emails</span>
      </div>
    </div>

    <!-- Emails list -->
    <div class="emails-container">
      <div v-if="loading" class="loading-state">Loading emails...</div>
      <div v-else-if="filteredEmails.length > 0" class="emails-list">
        <OutlookEmailCard
          v-for="email in filteredEmails"
          :key="email.id"
          :email="email"
          @toggleStar="handleToggleStar(email.id)"
          @convertTask="handleConvertTask(email)"
          @reply="handleReply(email)"
          @markRead="handleMarkRead(email.id)"
        />
      </div>
      <div v-else class="empty-state">
        <p>{{ getEmptyMessage() }}</p>
      </div>
    </div>

    <!-- Task modal -->
    <div v-if="showTaskModal" class="modal-overlay" @click="showTaskModal = false">
      <div class="modal" @click.stop>
        <h3>Create Task from Email</h3>
        <div class="form-group">
          <label>Title</label>
          <input v-model="taskForm.title" type="text" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="taskForm.description"></textarea>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select v-model="taskForm.priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="form-actions">
          <button @click="showTaskModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveTask" class="btn btn-primary">Create Task</button>
        </div>
      </div>
    </div>

    <!-- Reply modal -->
    <div v-if="showReplyModal" class="modal-overlay" @click="showReplyModal = false">
      <div class="modal" @click.stop>
        <h3>Reply to Email</h3>
        <div class="reply-preview">
          <p><strong>From:</strong> {{ replyToEmail?.from }}</p>
          <p><strong>Subject:</strong> {{ replyToEmail?.subject }}</p>
        </div>
        <div class="form-group">
          <label>Reply</label>
          <textarea v-model="replyText" placeholder="Type your reply..."></textarea>
        </div>
        <div class="form-actions">
          <button @click="showReplyModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="sendReply" class="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import OutlookEmailCard from '@/components/integrations/OutlookEmailCard.vue'
import { useEmails } from '@/composables/useEmails'
import type { EmailMessage } from '@/stores/integrationStore'

const {
  loadingEmails: loading,
  searchQuery,
  filterUnread,
  filterStarred,
  loadEmails,
  getFiltered,
  getUnreadCount,
  toggleStar,
  markAsRead,
  createTaskFromEmail,
  sendReply: apiSendReply,
} = useEmails()

const error = ref<string | null>(null)
const showTaskModal = ref(false)
const showReplyModal = ref(false)
const replyToEmail = ref<EmailMessage | null>(null)
const replyText = ref('')

const taskForm = ref({
  title: '',
  description: '',
  priority: 'medium',
})

const unreadCount = computed(() => getUnreadCount())
const filteredEmails = computed(() => getFiltered.value)

const getEmptyMessage = (): string => {
  if (searchQuery.value) return 'No emails match your search'
  if (filterUnread.value) return 'No unread emails'
  if (filterStarred.value) return 'No starred emails'
  return 'No emails to display'
}

const handleToggleStar = (id: string): void => {
  toggleStar(id)
}

const handleMarkRead = (id: string): void => {
  markAsRead(id)
}

const handleConvertTask = (email: EmailMessage): void => {
  taskForm.value.title = email.subject
  taskForm.value.description = email.preview
  showTaskModal.value = true
}

const handleReply = (email: EmailMessage): void => {
  replyToEmail.value = email
  showReplyModal.value = true
}

const saveTask = async (): Promise<void> => {
  if (!replyToEmail.value) return

  await createTaskFromEmail(replyToEmail.value.id, taskForm.value)
  showTaskModal.value = false
  taskForm.value = { title: '', description: '', priority: 'medium' }
}

const sendReply = async (): Promise<void> => {
  if (!replyToEmail.value || !replyText.value) return

  await apiSendReply(replyToEmail.value.id, replyText.value)
  showReplyModal.value = false
  replyText.value = ''
}

onMounted(async () => {
  await loadEmails()
})
</script>

<style scoped>
.outlook-integration-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.view-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header-controls {
  display: flex;
  gap: 12px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 200px;
  background: var(--surface-color);
  color: var(--text-primary);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  margin-bottom: 16px;
  color: #f44336;
}

.close-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--primary-color);
}

.filter-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.stats {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.emails-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.emails-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface-color);
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h3 {
  margin: 0 0 16px;
  color: var(--text-primary);
}

.reply-preview {
  background: var(--preview-bg);
  border-left: 3px solid var(--primary-color);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.reply-preview p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-secondary {
  background: var(--border-color);
  color: var(--text-primary);
}

/* CSS Variables */
:root {
  --primary-color: #0078d4;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --preview-bg: #f5f5f5;
  --input-bg: #ffffff;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #0099ff;
    --border-color: #424242;
    --surface-color: #303030;
    --preview-bg: #424242;
    --input-bg: #424242;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-controls {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }
}
</style>
