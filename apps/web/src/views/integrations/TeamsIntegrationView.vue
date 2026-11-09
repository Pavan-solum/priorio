<template>
  <div class="teams-integration-view">
    <!-- Header -->
    <div class="view-header">
      <h1>Microsoft Teams Integration</h1>
      <div class="header-actions">
        <button @click="loadMessages" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <SyncStatusIndicator
          :status="syncStatus"
          :progress="syncProgress"
          :lastSyncTime="lastSyncTime"
          @retry="loadMessages"
        />
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-banner">
      <span>⚠ {{ error }}</span>
      <button @click="error = null" class="close-btn">✕</button>
    </div>

    <!-- Main content -->
    <div class="content-grid">
      <!-- Channels sidebar -->
      <div class="channels-panel">
        <div class="panel-header">
          <h3>Channels</h3>
          <input
            v-model="channelFilter"
            type="search"
            placeholder="Search..."
            class="channel-search"
          />
        </div>
        <div class="channels-list">
          <button
            v-for="channel in filteredChannels"
            :key="channel"
            @click="selectChannel(channel)"
            :class="['channel-item', { active: selectedChannel === channel }]"
          >
            <span class="channel-icon">#</span>
            <span>{{ channel }}</span>
            <span class="message-count">{{ getChannelMessageCount(channel) }}</span>
          </button>
        </div>
      </div>

      <!-- Messages panel -->
      <div class="messages-panel">
        <div v-if="selectedChannel" class="panel-header">
          <h3>#{{ selectedChannel }}</h3>
          <span class="message-count-large">{{ getChannelMessageCount(selectedChannel) }} messages</span>
        </div>

        <div v-if="loading" class="loading-state">
          <p>Loading messages...</p>
        </div>

        <div v-else-if="channelMessages.length > 0" class="messages-list">
          <TeamsMessageCard
            v-for="message in channelMessages"
            :key="message.id"
            :message="message"
            @convertTask="handleConvertTask(message)"
            @reply="handleReply(message)"
          />
        </div>

        <div v-else class="empty-state">
          <p>No messages in this channel</p>
        </div>
      </div>

      <!-- Activity log -->
      <div class="activity-panel">
        <div class="panel-header">
          <h3>Recent Activity</h3>
        </div>
        <div class="activity-log">
          <div
            v-for="entry in activityLog"
            :key="entry.id"
            class="activity-item"
          >
            <span class="activity-time">{{ formatTime(entry.timestamp) }}</span>
            <span class="activity-text">{{ entry.action }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Task creation modal -->
    <div v-if="showTaskModal" class="modal-overlay" @click="showTaskModal = false">
      <div class="modal" @click.stop>
        <h3>Create Task from Message</h3>
        <div class="form-group">
          <label>Title</label>
          <input v-model="taskForm.title" type="text" placeholder="Task title" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="taskForm.description" placeholder="Task description"></textarea>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SyncStatusIndicator from '@/components/integrations/SyncStatusIndicator.vue'
import TeamsMessageCard from '@/components/integrations/TeamsMessageCard.vue'
import { useTeamsChats } from '@/composables/useTeamsChats'
import { useSync } from '@/composables/useSync'

const {
  loadingMessages: loading,
  selectedChannel,
  selectedMessage,
  loadMessages,
  getChannels,
  getByChannel,
  getBySender,
  selectChannel,
  createTaskFromMessage,
} = useTeamsChats()

const getChannelMessageCount = (channel: string) => getByChannel(channel).length

const { syncing: syncLoading, syncProgress, startSync } = useSync()

const error = ref<string | null>(null)
const channelFilter = ref('')
const showTaskModal = ref(false)
const lastSyncTime = ref<string | null>(null)

const taskForm = ref({
  title: '',
  description: '',
  priority: 'medium',
})

const syncStatus = computed(() => {
  if (syncLoading.value) return 'syncing'
  if (error.value) return 'error'
  if (lastSyncTime.value) return 'success'
  return 'idle'
})

const filteredChannels = computed(() => {
  const channels = getChannels()
  if (!channelFilter.value) return channels
  return channels.filter(c => c.toLowerCase().includes(channelFilter.value.toLowerCase()))
})

const channelMessages = computed(() => {
  if (!selectedChannel.value) return []
  return getByChannel(selectedChannel.value)
})

const activityLog = computed(() => [
  { id: '1', timestamp: new Date().toISOString(), action: 'Loaded channels' },
  { id: '2', timestamp: new Date(Date.now() - 60000).toISOString(), action: 'Synced messages' },
])

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  return `${Math.floor(diffMinutes / 60)}h ago`
}

const handleConvertTask = (message: any): void => {
  taskForm.value.title = message.content.slice(0, 100)
  taskForm.value.description = message.content
  showTaskModal.value = true
}

const handleReply = (message: any): void => {
  // TODO: Open reply modal
}

const saveTask = async (): Promise<void> => {
  if (!selectedMessage.value) return

  await createTaskFromMessage(selectedMessage.value.id, taskForm.value)
  showTaskModal.value = false
  taskForm.value = { title: '', description: '', priority: 'medium' }
}

onMounted(async () => {
  await loadMessages()
  const teams = await startSync('teams')
  if (teams) {
    lastSyncTime.value = new Date().toISOString()
  }
})
</script>

<style scoped>
.teams-integration-view {
  max-width: 1400px;
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

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
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
  cursor: not-allowed;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 1.2rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 250px 1fr 200px;
  gap: 16px;
  min-height: 600px;
}

.channels-panel,
.messages-panel,
.activity-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.channel-search {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.85rem;
  background: var(--input-bg);
  color: var(--text-primary);
}

.channels-list {
  flex: 1;
  overflow-y: auto;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.channel-item:hover {
  background: var(--item-hover);
}

.channel-item.active {
  background: var(--primary-color-light);
  border-left-color: var(--primary-color);
}

.channel-icon {
  font-weight: 600;
  color: var(--text-secondary);
}

.message-count {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--badge-bg);
  padding: 2px 6px;
  border-radius: 10px;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;
}

.activity-log {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-size: 0.85rem;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  background: var(--item-bg);
  border-radius: 4px;
  color: var(--text-secondary);
}

.activity-time {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
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
  font-size: 1.25rem;
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
  font-size: 0.95rem;
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
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
  --primary-color-light: rgba(0, 120, 212, 0.1);
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --item-bg: #f5f5f5;
  --item-hover: #f0f0f0;
  --badge-bg: rgba(0, 120, 212, 0.2);
  --input-bg: #ffffff;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #0099ff;
    --primary-color-light: rgba(0, 153, 255, 0.1);
    --border-color: #424242;
    --surface-color: #303030;
    --item-bg: #424242;
    --item-hover: #505050;
    --badge-bg: rgba(0, 153, 255, 0.2);
    --input-bg: #424242;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 200px 1fr;
  }

  .activity-panel {
    display: none;
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .channels-panel {
    max-height: 200px;
  }
}
</style>
