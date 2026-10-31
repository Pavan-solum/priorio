<template>
  <div class="quick-create-task">
    <!-- Input Section -->
    <div class="input-section">
      <IonInput
        v-model="taskTitle"
        placeholder="Quick add a task..."
        clearInput
        debounce="300"
        @keydown="handleKeydown"
        @ionInput="handleInput"
      ></IonInput>
      <IonButton
        fill="clear"
        size="small"
        @click="expandOptions"
        :disabled="!taskTitle.trim()"
      >
        <IonIcon slot="icon-only" :icon="chevronDownOutline"></IonIcon>
      </IonButton>
    </div>

    <!-- Expanded Options (conditional) -->
    <div v-if="showOptions" class="options-section">
      <!-- Priority Selector -->
      <div class="option-group">
        <label>Priority</label>
        <div class="priority-selector">
          <IonButton
            v-for="p in priorities"
            :key="p"
            fill="outline"
            :color="taskPriority === p ? 'primary' : 'medium'"
            size="small"
            @click="taskPriority = p as any"
          >
            {{ p }}
          </IonButton>
        </div>
      </div>

      <!-- Due Date Selector -->
      <div class="option-group">
        <label>Due Date (optional)</label>
        <div class="due-date-selector">
          <IonButton
            v-for="preset in datePresets"
            :key="preset.value"
            fill="outline"
            :color="selectedDatePreset === preset.value ? 'primary' : 'medium'"
            size="small"
            @click="selectDatePreset(preset)"
          >
            {{ preset.label }}
          </IonButton>
        </div>
        <IonDatetime
          v-if="showCustomDate"
          v-model="customDueDate"
          presentation="date"
        ></IonDatetime>
      </div>

      <!-- Tags/Categories -->
      <div class="option-group">
        <label>Category (optional)</label>
        <IonSelect v-model="selectedCategory" interface="popover">
          <IonSelectOption value="">None</IonSelectOption>
          <IonSelectOption v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </IonSelectOption>
        </IonSelect>
      </div>

      <!-- Description -->
      <div class="option-group">
        <label>Description (optional)</label>
        <IonTextarea
          v-model="taskDescription"
          placeholder="Add details..."
          rows="2"
        ></IonTextarea>
      </div>

      <!-- Auto-save Toggle -->
      <div class="option-group checkbox">
        <IonCheckbox v-model="autoSave"></IonCheckbox>
        <IonLabel>Auto-save while typing</IonLabel>
      </div>

      <!-- Keyboard Shortcuts Help -->
      <div class="shortcuts-help">
        <p class="help-title">⌨️ Shortcuts</p>
        <ul>
          <li><kbd>Enter</kbd> - Create task</li>
          <li><kbd>Tab</kbd> - Toggle options</li>
          <li><kbd>Esc</kbd> - Cancel</li>
          <li><kbd>Ctrl+1-5</kbd> - Set priority</li>
        </ul>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <IonButton
        expand="block"
        color="success"
        @click="createTask"
        :disabled="!taskTitle.trim() || isCreating"
      >
        <IonSpinner v-if="isCreating" name="crescent"></IonSpinner>
        {{ isCreating ? 'Creating...' : 'Create Task' }}
      </IonButton>
      <IonButton
        expand="block"
        fill="outline"
        @click="resetForm"
        :disabled="isCreating"
      >
        Cancel
      </IonButton>
    </div>

    <!-- Auto-save Status -->
    <div v-if="autoSaveStatus" :class="['auto-save-status', autoSaveStatus]">
      <IonIcon
        :icon="autoSaveStatus === 'saved' ? checkmarkOutline : hourglass"
      ></IonIcon>
      {{ autoSaveStatus === 'saved' ? 'Auto-saved' : 'Auto-saving...' }}
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IonInput,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonCheckbox,
  IonLabel,
  IonDatetime,
  IonSpinner,
} from '@ionic/vue';
import {
  chevronDownOutline,
  checkmarkOutline,
  hourglass,
} from 'ionicons/icons';
import { ref, computed } from 'vue';
import { useTaskStore } from '../stores/task';

interface DatePreset {
  label: string;
  value: string;
  fn: () => Date;
}

const taskStore = useTaskStore();

const taskTitle = ref('');
const taskDescription = ref('');
const taskPriority = ref('MEDIUM');
const selectedCategory = ref('');
const customDueDate = ref<string>('');
const selectedDatePreset = ref<string>('');
const showOptions = ref(false);
const showCustomDate = ref(false);
const autoSave = ref(false);
const autoSaveStatus = ref<'saved' | 'saving' | null>(null);
const isCreating = ref(false);
const error = ref<string | null>(null);

const priorities = ['HIGH', 'MEDIUM', 'LOW'];
const categories = ['Work', 'Personal', 'Shopping', 'Health', 'Finance'];

/**
 * Date presets for quick selection
 */
const datePresets: DatePreset[] = [
  {
    label: 'Today',
    value: 'today',
    fn: () => {
      const d = new Date();
      d.setHours(23, 59, 59, 0);
      return d;
    },
  },
  {
    label: 'Tomorrow',
    value: 'tomorrow',
    fn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 0);
      return d;
    },
  },
  {
    label: 'This Week',
    value: 'this-week',
    fn: () => {
      const d = new Date();
      d.setDate(d.getDate() + (5 - d.getDay()));
      d.setHours(23, 59, 59, 0);
      return d;
    },
  },
  {
    label: 'Next Week',
    value: 'next-week',
    fn: () => {
      const d = new Date();
      d.setDate(d.getDate() + (12 - d.getDay()));
      d.setHours(23, 59, 59, 0);
      return d;
    },
  },
];

/**
 * Expand/collapse options
 */
const expandOptions = () => {
  showOptions.value = !showOptions.value;
};

/**
 * Handle keyboard shortcuts
 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    createTask();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    expandOptions();
  } else if (event.key === 'Escape') {
    resetForm();
  } else if (event.ctrlKey && event.key >= '1' && event.key <= '5') {
    event.preventDefault();
    const priorityIndex = parseInt(event.key) - 1;
    if (priorityIndex < priorities.length) {
      taskPriority.value = priorities[priorityIndex];
    }
  }
};

/**
 * Handle input with auto-save
 */
const handleInput = async (event: any) => {
  taskTitle.value = event.detail.value || '';

  if (autoSave.value && taskTitle.value.trim()) {
    await autoSaveTask();
  }
};

/**
 * Auto-save draft task
 */
const autoSaveTask = async () => {
  try {
    autoSaveStatus.value = 'saving';
    // Simulate auto-save to storage
    const draft = {
      title: taskTitle.value,
      description: taskDescription.value,
      priority: taskPriority.value,
      category: selectedCategory.value,
      dueDate: customDueDate.value || selectedDatePreset.value,
      timestamp: Date.now(),
    };
    localStorage.setItem('task-draft', JSON.stringify(draft));
    autoSaveStatus.value = 'saved';
    setTimeout(() => {
      autoSaveStatus.value = null;
    }, 2000);
  } catch (err) {
    console.error('Auto-save error:', err);
  }
};

/**
 * Select date preset
 */
const selectDatePreset = (preset: DatePreset) => {
  selectedDatePreset.value = preset.value;
  customDueDate.value = preset.fn().toISOString();
  showCustomDate.value = false;
};

/**
 * Create task
 */
const createTask = async () => {
  if (!taskTitle.value.trim()) {
    error.value = 'Task title is required';
    return;
  }

  isCreating.value = true;
  error.value = null;

  try {
    const dueAt = customDueDate.value
      ? new Date(customDueDate.value)
      : selectedDatePreset.value
        ? datePresets.find(p => p.value === selectedDatePreset.value)?.fn()
        : undefined;

    await taskStore.createTask({
      title: taskTitle.value,
      description: taskDescription.value || undefined,
      priority: taskPriority.value as any,
      category: selectedCategory.value || undefined,
      dueAt,
      status: 'TODO',
    });

    // Clear draft on success
    localStorage.removeItem('task-draft');

    // Reset form
    resetForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create task';
    console.error('Create task error:', err);
  } finally {
    isCreating.value = false;
  }
};

/**
 * Reset form
 */
const resetForm = () => {
  taskTitle.value = '';
  taskDescription.value = '';
  taskPriority.value = 'MEDIUM';
  selectedCategory.value = '';
  customDueDate.value = '';
  selectedDatePreset.value = '';
  showOptions.value = false;
  showCustomDate.value = false;
  error.value = null;
};

/**
 * Load draft on component mount
 */
const loadDraft = () => {
  const draft = localStorage.getItem('task-draft');
  if (draft) {
    try {
      const data = JSON.parse(draft);
      taskTitle.value = data.title || '';
      taskDescription.value = data.description || '';
      taskPriority.value = data.priority || 'MEDIUM';
      selectedCategory.value = data.category || '';
      customDueDate.value = data.dueDate || '';
    } catch (e) {
      console.error('Error loading draft:', e);
    }
  }
};

// Load draft on mount
loadDraft();
</script>

<style scoped>
.quick-create-task {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--ion-color-light);
  border-radius: 8px;
  border: 1px solid var(--ion-color-light-shade);
}

.input-section {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-section ion-input {
  flex: 1;
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid var(--ion-color-light-shade);
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-group.checkbox {
  flex-direction: row;
  align-items: center;
}

.option-group label {
  font-weight: 600;
  font-size: 12px;
  color: var(--ion-color-dark);
  text-transform: uppercase;
}

.priority-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.due-date-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.shortcuts-help {
  padding: 12px;
  background: var(--ion-color-step-50);
  border-radius: 6px;
  border-left: 3px solid var(--ion-color-primary);
}

.help-title {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: bold;
}

.shortcuts-help ul {
  margin: 0;
  padding-left: 20px;
  font-size: 11px;
}

.shortcuts-help li {
  margin: 4px 0;
}

.shortcuts-help kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--ion-color-step-100);
  border: 1px solid var(--ion-color-step-150);
  border-radius: 3px;
  font-family: monospace;
  font-size: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.auto-save-status.saving {
  background: var(--ion-color-warning-tint);
  color: var(--ion-color-warning);
}

.auto-save-status.saved {
  background: var(--ion-color-success-tint);
  color: var(--ion-color-success);
}

.error-message {
  padding: 12px;
  background: var(--ion-color-danger-tint);
  color: var(--ion-color-danger);
  border-radius: 4px;
  font-size: 12px;
}
</style>
