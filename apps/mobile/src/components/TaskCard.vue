<template>
  <div class="task-card">
    <div class="task-header">
      <div class="task-title-section">
        <IonCheckbox
          :checked="task.status === 'COMPLETED'"
          @ionChange="$emit('toggle')"
        ></IonCheckbox>
        <h3 :class="{ completed: task.status === 'COMPLETED' }">{{ task.title }}</h3>
        <OfflineBadge v-if="!task.synced" />
      </div>
      <IonButton fill="clear" size="small" @click="$emit('delete')">
        <IonIcon slot="icon-only" :icon="trash"></IonIcon>
      </IonButton>
    </div>

    <div class="task-details">
      <p v-if="task.description">{{ task.description }}</p>

      <div class="task-meta">
        <span class="priority" :class="task.priority.toLowerCase()">
          {{ task.priority }}
        </span>
        <span v-if="task.dueAt" class="due-date">
          {{ formatDate(task.dueAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IonCheckbox,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import { trash } from 'ionicons/icons';
import { defineProps, defineEmits } from 'vue';
import OfflineBadge from './OfflineBadge.vue';

defineProps({
  task: {
    type: Object,
    required: true,
  },
});

defineEmits(['click', 'edit', 'delete', 'toggle']);

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.task-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  margin: 8px;
  background: white;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.task-title-section h3 {
  margin: 0;
}

.task-title-section h3.completed {
  text-decoration: line-through;
  color: #999;
}

.task-details {
  margin-left: 32px;
  margin-top: 8px;
}

.task-details p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

.task-meta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
}

.priority {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.priority.critical {
  background: #ffebee;
  color: #c62828;
}

.priority.high {
  background: #fff3e0;
  color: #e65100;
}

.priority.medium {
  background: #f3e5f5;
  color: #6a1b9a;
}

.priority.low {
  background: #e8f5e9;
  color: #1b5e20;
}

.due-date {
  color: #999;
}
</style>
