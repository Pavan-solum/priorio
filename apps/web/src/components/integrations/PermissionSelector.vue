<template>
  <div class="permission-selector">
    <div class="selector-header">
      <h3>Select Permissions</h3>
      <p class="description">Choose what data and actions Priorio can access</p>
    </div>

    <div class="permissions-list">
      <div
        v-for="scope in permissions"
        :key="scope.id"
        class="permission-item"
        :class="{ required: scope.required }"
      >
        <div class="checkbox-container">
          <input
            type="checkbox"
            :id="`perm-${scope.id}`"
            v-model="selectedScopes"
            :value="scope.id"
            :disabled="scope.required"
            class="permission-checkbox"
          />
          <label :for="`perm-${scope.id}`" class="permission-label">
            <span class="permission-name">{{ scope.name }}</span>
            <span v-if="scope.required" class="required-badge">Required</span>
          </label>
        </div>

        <p class="permission-description">{{ scope.description }}</p>

        <div v-if="scope.expiresAt" class="expiry-info">
          <span class="expiry-label">Expires:</span>
          <span class="expiry-date">{{ formatDate(scope.expiresAt) }}</span>
        </div>
      </div>
    </div>

    <div class="expiry-options">
      <h4>Permission Expiry</h4>
      <div class="expiry-inputs">
        <label>
          <input type="radio" v-model="expiryOption" value="never" />
          Never expires
        </label>
        <label>
          <input type="radio" v-model="expiryOption" value="30days" />
          30 days
        </label>
        <label>
          <input type="radio" v-model="expiryOption" value="90days" />
          90 days
        </label>
        <label>
          <input type="radio" v-model="expiryOption" value="custom" />
          Custom
        </label>
        <input
          v-if="expiryOption === 'custom'"
          type="date"
          v-model="customExpiryDate"
          class="custom-date-input"
        />
      </div>
    </div>

    <div class="summary">
      <p><strong>Selected:</strong> {{ selectedScopes.length }} of {{ permissions.length }} permissions</p>
      <p v-if="requiredCount > 0">
        <strong>Required:</strong> {{ requiredCount }} permissions
      </p>
    </div>

    <div class="actions">
      <button @click="emitCancel" class="btn btn-secondary">Cancel</button>
      <button
        @click="emitConfirm"
        :disabled="!allRequiredSelected"
        class="btn btn-primary"
      >
        Grant Permissions
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PermissionScope } from '@/stores/integrationStore'

/**
 * Props for PermissionSelector
 */
interface Props {
  permissions: PermissionScope[]
}

defineProps<Props>()

/**
 * Events emitted by component
 */
defineEmits<{
  confirm: [selectedScopes: string[], expiryDate?: string]
  cancel: []
}>()

const emit = defineEmits<{
  confirm: [selectedScopes: string[], expiryDate?: string]
  cancel: []
}>()

const selectedScopes = ref<string[]>([])
const expiryOption = ref('never')
const customExpiryDate = ref('')

/**
 * Get required permissions count
 */
const requiredCount = computed(() => {
  return props.permissions.filter(p => p.required).length
})

/**
 * Check if all required permissions are selected
 */
const allRequiredSelected = computed(() => {
  return props.permissions
    .filter(p => p.required)
    .every(p => selectedScopes.value.includes(p.id))
})

/**
 * Get expiry date based on option
 */
const getExpiryDate = (): string | undefined => {
  const days = { '30days': 30, '90days': 90 }
  if (expiryOption.value === 'never') return undefined
  if (expiryOption.value === 'custom') return customExpiryDate.value
  const dayCount = days[expiryOption.value as keyof typeof days]
  if (dayCount) {
    const date = new Date()
    date.setDate(date.getDate() + dayCount)
    return date.toISOString()
  }
  return undefined
}

/**
 * Format date for display
 */
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString()
}

/**
 * Emit confirm event
 */
const emitConfirm = () => {
  emit('confirm', selectedScopes.value, getExpiryDate())
}

/**
 * Emit cancel event
 */
const emitCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.permission-selector {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  background: var(--surface-color);
}

.selector-header {
  margin-bottom: 24px;
}

.selector-header h3 {
  margin: 0 0 8px;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.permissions-list {
  margin-bottom: 24px;
  max-height: 400px;
  overflow-y: auto;
}

.permission-item {
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--item-bg);
  transition: all 0.2s ease;
}

.permission-item:hover {
  border-color: var(--primary-color);
  background: var(--item-hover-bg);
}

.permission-item.required {
  border-color: rgba(244, 193, 13, 0.5);
  background: rgba(244, 193, 13, 0.05);
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.permission-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.permission-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}

.permission-name {
  font-weight: 500;
  color: var(--text-primary);
}

.required-badge {
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  background: #ffc107;
  color: #333;
  border-radius: 3px;
  text-transform: uppercase;
}

.permission-description {
  margin: 0 0 8px 30px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.expiry-info {
  margin-left: 30px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.expiry-label {
  font-weight: 500;
}

.expiry-date {
  margin-left: 4px;
}

.expiry-options {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--item-bg);
  border-radius: 6px;
}

.expiry-options h4 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.expiry-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expiry-inputs label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.expiry-inputs input[type="radio"] {
  accent-color: var(--primary-color);
  cursor: pointer;
}

.custom-date-input {
  margin-top: 8px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--surface-color);
  color: var(--text-primary);
}

.summary {
  padding: 12px;
  background: var(--item-bg);
  border-radius: 6px;
  margin-bottom: 16px;
}

.summary p {
  margin: 4px 0;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.summary p:first-child {
  margin-top: 0;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

.btn-secondary {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover {
  opacity: 0.8;
}

/* CSS Variables */
:root {
  --primary-color: #2196f3;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --item-bg: #f5f5f5;
  --item-hover-bg: #eeeeee;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #90caf9;
    --border-color: #424242;
    --surface-color: #303030;
    --item-bg: #424242;
    --item-hover-bg: #505050;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}
</style>
