<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Inbox</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="toggleFilter">
            <IonIcon slot="icon-only" :icon="filterOutline"></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent></IonRefresherContent>
      </IonRefresher>

      <!-- Filter Bar -->
      <div v-if="showFilter" class="filter-bar">
        <IonSegment v-model="filterType" @ionChange="applyFilter">
          <IonSegmentButton value="all">All</IonSegmentButton>
          <IonSegmentButton value="unread">Unread</IonSegmentButton>
          <IonSegmentButton value="messages">Messages</IonSegmentButton>
          <IonSegmentButton value="threads">Threads</IonSegmentButton>
        </IonSegment>
        <IonSearchbar
          v-model="searchQuery"
          placeholder="Search inbox..."
          @ionInput="performSearch"
        ></IonSearchbar>
      </div>

      <!-- Empty State -->
      <div v-if="filteredInboxItems.length === 0" class="empty-state">
        <IonIcon :icon="mailOutline" size="large"></IonIcon>
        <h2>Inbox Empty</h2>
        <p>No messages yet</p>
      </div>

      <!-- Inbox List -->
      <IonList v-else>
        <IonListHeader>
          <IonLabel>{{ filteredInboxItems.length }} items</IonLabel>
        </IonListHeader>

        <IonItemGroup v-for="group in groupedItems" :key="group.date">
          <IonListHeader>
            <IonLabel>{{ formatGroupDate(group.date) }}</IonLabel>
          </IonListHeader>

          <IonItemSliding v-for="item in group.items" :key="item.id">
            <IonItem
              :class="{ unread: !item.read }"
              button
              @click="openItem(item)"
            >
              <div class="item-content">
                <div class="item-header">
                  <h3 class="item-title">{{ item.title }}</h3>
                  <span v-if="item.threadCount > 1" class="thread-count">
                    +{{ item.threadCount - 1 }}
                  </span>
                </div>
                <p class="item-preview">{{ item.preview }}</p>
                <div class="item-meta">
                  <span v-if="item.from" class="sender">From: {{ item.from }}</span>
                  <span class="time">{{ formatTime(item.createdAt) }}</span>
                </div>
              </div>
              <IonBadge v-if="!item.read" slot="end" color="primary">New</IonBadge>
            </IonItem>

            <!-- Item Actions -->
            <IonItemOptions side="start">
              <IonItemOption color="primary" @click="markAsRead(item)">
                {{ item.read ? 'Unread' : 'Read' }}
              </IonItemOption>
            </IonItemOptions>

            <IonItemOptions side="end">
              <IonItemOption color="success" @click="convertToTask(item)">
                <IonIcon slot="icon-only" :icon="checkmarkDoneOutline"></IonIcon>
              </IonItemOption>
              <IonItemOption color="danger" @click="deleteItem(item.id)">
                <IonIcon slot="icon-only" :icon="trash"></IonIcon>
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        </IonItemGroup>
      </IonList>

      <!-- Infinite Scroll -->
      <IonInfiniteScroll @ionInfinite="loadMore">
        <IonInfiniteScrollContent
          loadingSpinner="crescent"
          loadingText="Loading more..."
        ></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </IonContent>

    <!-- Item Detail Modal -->
    <IonModal
      :is-open="detailOpen"
      @didDismiss="closeDetail"
      css-class="inbox-detail-modal"
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton @click="closeDetail">
              <IonIcon slot="icon-only" :icon="chevronBackOutline"></IonIcon>
            </IonButton>
          </IonButtons>
          <IonTitle>{{ selectedItem?.title }}</IonTitle>
          <IonButtons slot="end">
            <IonButton @click="convertToTask(selectedItem)">
              <IonIcon slot="icon-only" :icon="checkmarkDoneOutline"></IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div v-if="selectedItem" class="detail-content">
          <!-- Message Content -->
          <IonCard>
            <IonCardHeader>
              <div class="message-header">
                <div>
                  <IonCardTitle>{{ selectedItem.title }}</IonCardTitle>
                  <p class="sender-info">From: {{ selectedItem.from }}</p>
                </div>
                <span class="time">{{ formatDate(selectedItem.createdAt) }}</span>
              </div>
            </IonCardHeader>
            <IonCardContent>
              <div class="message-body">
                {{ selectedItem.content }}
              </div>
            </IonCardContent>
          </IonCard>

          <!-- Thread Messages -->
          <div v-if="selectedItem.thread && selectedItem.thread.length > 0" class="thread-section">
            <h3>Thread ({{ selectedItem.thread.length }} messages)</h3>
            <div v-for="msg in selectedItem.thread" :key="msg.id" class="thread-message">
              <div class="thread-header">
                <strong>{{ msg.from }}</strong>
                <span class="time">{{ formatDate(msg.createdAt) }}</span>
              </div>
              <p>{{ msg.content }}</p>
            </div>
          </div>

          <!-- Reply Section -->
          <IonCard class="reply-section">
            <IonCardHeader>
              <IonCardTitle>Reply</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonTextarea
                v-model="replyContent"
                placeholder="Type your reply..."
                rows="4"
              ></IonTextarea>
              <IonButton expand="block" @click="sendReply">
                Send Reply
              </IonButton>
            </IonCardContent>
          </IonCard>

          <!-- Convert to Task -->
          <div class="convert-task-section">
            <h3>Convert to Task</h3>
            <p>Quickly create a task from this message</p>
            <div class="task-preview">
              <IonInput
                v-model="taskTitle"
                placeholder="Task title"
                label="Title"
                label-placement="floating"
              ></IonInput>
              <IonTextarea
                v-model="taskDescription"
                placeholder="Task description"
                label="Description"
                label-placement="floating"
              ></IonTextarea>
              <IonSelect
                v-model="taskPriority"
                label="Priority"
                label-placement="floating"
              >
                <IonSelectOption value="HIGH">High</IonSelectOption>
                <IonSelectOption value="MEDIUM">Medium</IonSelectOption>
                <IonSelectOption value="LOW">Low</IonSelectOption>
              </IonSelect>
              <IonButton expand="block" color="success" @click="confirmConvertToTask">
                Create Task
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonModal>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonListHeader,
  IonLabel,
  IonItemGroup,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonBadge,
  IonModal,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonTextarea,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  RefresherEventDetail,
  InfiniteScrollCustomEvent,
} from '@ionic/vue';
import {
  filterOutline,
  mailOutline,
  checkmarkDoneOutline,
  trash,
  chevronBackOutline,
} from 'ionicons/icons';
import { ref, computed } from 'vue';
import axios from 'axios';

interface InboxItem {
  id: string;
  title: string;
  preview: string;
  content: string;
  from: string;
  createdAt: Date;
  read: boolean;
  threadCount: number;
  thread?: Array<{ id: string; from: string; content: string; createdAt: Date }>;
}

const inboxItems = ref<InboxItem[]>([]);
const showFilter = ref(false);
const filterType = ref('all');
const searchQuery = ref('');
const detailOpen = ref(false);
const selectedItem = ref<InboxItem | null>(null);
const replyContent = ref('');
const taskTitle = ref('');
const taskDescription = ref('');
const taskPriority = ref('MEDIUM');
const isLoading = ref(false);
const page = ref(1);

/**
 * Load inbox items
 */
const loadInboxItems = async () => {
  try {
    isLoading.value = true;
    const response = await axios.get('/api/inbox?page=1&limit=20');
    inboxItems.value = response.data.items.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    }));
  } catch (error) {
    console.error('Error loading inbox:', error);
  } finally {
    isLoading.value = false;
  }
};

/**
 * Filtered items based on current filter
 */
const filteredInboxItems = computed(() => {
  let items = inboxItems.value;

  // Apply filter
  if (filterType.value === 'unread') {
    items = items.filter(i => !i.read);
  } else if (filterType.value === 'messages') {
    items = items.filter(i => !i.from); // Messages without from = internal
  } else if (filterType.value === 'threads') {
    items = items.filter(i => i.threadCount > 1);
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      i =>
        i.title.toLowerCase().includes(query) ||
        i.preview.toLowerCase().includes(query) ||
        i.from.toLowerCase().includes(query)
    );
  }

  return items;
});

/**
 * Group items by date
 */
const groupedItems = computed(() => {
  const groups: Record<string, { date: string; items: InboxItem[] }> = {};

  filteredInboxItems.value.forEach(item => {
    const date = item.createdAt.toLocaleDateString();
    if (!groups[date]) {
      groups[date] = { date, items: [] };
    }
    groups[date].items.push(item);
  });

  return Object.values(groups);
});

/**
 * Toggle filter
 */
const toggleFilter = () => {
  showFilter.value = !showFilter.value;
};

/**
 * Apply filter
 */
const applyFilter = () => {
  // Filtered items are automatically computed
};

/**
 * Perform search
 */
const performSearch = () => {
  // Search is automatically applied via computed property
};

/**
 * Open item details
 */
const openItem = async (item: InboxItem) => {
  try {
    const response = await axios.get(`/api/inbox/${item.id}`);
    selectedItem.value = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      thread: response.data.thread?.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })),
    };
    await markAsRead(item);
    detailOpen.value = true;
  } catch (error) {
    console.error('Error loading item details:', error);
  }
};

/**
 * Close detail modal
 */
const closeDetail = () => {
  detailOpen.value = false;
  selectedItem.value = null;
  replyContent.value = '';
  taskTitle.value = '';
  taskDescription.value = '';
};

/**
 * Mark as read/unread
 */
const markAsRead = async (item: InboxItem) => {
  try {
    await axios.patch(`/api/inbox/${item.id}`, { read: true });
    item.read = true;
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

/**
 * Delete item
 */
const deleteItem = async (id: string) => {
  try {
    await axios.delete(`/api/inbox/${id}`);
    inboxItems.value = inboxItems.value.filter(i => i.id !== id);
  } catch (error) {
    console.error('Error deleting item:', error);
  }
};

/**
 * Send reply
 */
const sendReply = async () => {
  if (!selectedItem.value || !replyContent.value.trim()) return;

  try {
    await axios.post(`/api/inbox/${selectedItem.value.id}/reply`, {
      content: replyContent.value,
    });
    replyContent.value = '';
    // Reload item
    const item = inboxItems.value.find(i => i.id === selectedItem.value?.id);
    if (item) {
      await openItem(item);
    }
  } catch (error) {
    console.error('Error sending reply:', error);
  }
};

/**
 * Convert to task
 */
const convertToTask = (item: InboxItem | null) => {
  if (!item) return;
  taskTitle.value = item.title;
  taskDescription.value = item.preview;
};

/**
 * Confirm convert to task
 */
const confirmConvertToTask = async () => {
  if (!selectedItem.value) return;

  try {
    await axios.post('/api/tasks', {
      title: taskTitle.value || selectedItem.value.title,
      description: taskDescription.value || selectedItem.value.preview,
      priority: taskPriority.value,
      status: 'TODO',
    });
    closeDetail();
  } catch (error) {
    console.error('Error converting to task:', error);
  }
};

/**
 * Handle refresh
 */
const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
  try {
    await loadInboxItems();
  } finally {
    event.detail.complete();
  }
};

/**
 * Load more items
 */
const loadMore = async (event: InfiniteScrollCustomEvent) => {
  try {
    page.value++;
    const response = await axios.get(`/api/inbox?page=${page.value}&limit=20`);
    inboxItems.value.push(
      ...response.data.items.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }))
    );
  } catch (error) {
    console.error('Error loading more items:', error);
  } finally {
    event.target.complete();
  }
};

/**
 * Format time
 */
const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
};

/**
 * Format full date
 */
const formatDate = (date: Date): string => {
  return date.toLocaleString();
};

/**
 * Format group date
 */
const formatGroupDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

  if (date.toLocaleDateString() === today) return 'Today';
  if (date.toLocaleDateString() === yesterday) return 'Yesterday';

  return date.toLocaleDateString();
};

// Load inbox on mount
loadInboxItems();
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 150px);
  color: var(--ion-color-medium);
  text-align: center;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
  width: 100%;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-title {
  margin: 0;
  font-weight: 600;
}

.thread-count {
  display: inline-block;
  background: var(--ion-color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
}

.item-preview {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.sender {
  font-weight: 500;
}

.unread {
  background-color: rgba(var(--ion-color-primary-rgb), 0.05);
  border-left: 3px solid var(--ion-color-primary);
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.sender-info {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 4px 0 0 0;
}

.message-body {
  line-height: 1.6;
}

.thread-section {
  margin-top: 16px;
}

.thread-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.thread-message {
  padding: 12px;
  background: var(--ion-color-step-50);
  border-radius: 4px;
  margin-bottom: 8px;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.thread-message p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.reply-section {
  margin-top: 16px;
}

.convert-task-section {
  margin-top: 16px;
}

.convert-task-section h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.convert-task-section p {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--ion-color-medium);
}

.task-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

::v-deep(.inbox-detail-modal) {
  --width: 100%;
  --height: 90%;
  --border-radius: 16px 16px 0 0;
}

@media (min-width: 768px) {
  ::v-deep(.inbox-detail-modal) {
    --width: 600px;
    --height: 90%;
    --border-radius: 12px;
  }
}
</style>
