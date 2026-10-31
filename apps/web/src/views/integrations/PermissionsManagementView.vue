<template>
  <div class="permissions-management-view">
    <div class="view-header">
      <h1>Permissions Management</h1>
      <p class="subtitle">Control access permissions for your integrations</p>
    </div>

    <!-- Pending permissions alert -->
    <div v-if="pendingPermissions.length > 0" class="pending-alert">
      <span class="alert-icon">⚠</span>
      <div class="alert-content">
        <p><strong>{{ pendingPermissions.length }} pending permissions</strong></p>
        <p>Some integrations need additional permissions to function properly</p>
      </div>
    </div>

    <!-- Permissions matrix -->
    <div class="permissions-section">
      <h2>Provider Permissions</h2>
      <div class="permissions-table">
        <div class="table-header">
          <div class="col-provider">Provider</div>
          <div class="col-scope">Scope</div>
          <div class="col-granted">Granted</div>
          <div class="col-expiry">Expiry</div>
          <div class="col-actions">Actions</div>
        </div>

        <div
          v-for="provider in store.providers"
          :key="provider.provider"
          class="table-section"
        >
          <div class="provider-row">
            <span class="provider-name">{{ provider.provider }}</span>
            <span class="permission-count">{{ provider.permissions.length }} permissions</span>
          </div>

          <div
            v-for="perm in provider.permissions"
            :key="`${provider.provider}-${perm.id}`"
            class="permission-row"
            :class="{ required: perm.required, granted: perm.granted }"
          >
            <div class="col-provider"></div>
            <div class="col-scope">
              <div class="scope-info">
                <p class="scope-name">{{ perm.name }}</p>
                <p class="scope-description">{{ perm.description }}</p>
              </div>
            </div>
            <div class="col-granted">
              <span
                class="badge"
                :class="perm.granted ? 'badge-success' : 'badge-pending'"
              >
                {{ perm.granted ? 'Granted' : 'Pending' }}
              </span>
              <span v-if="perm.required" class="required-badge">Required</span>
            </div>
            <div class="col-expiry">
              <span v-if="perm.expiresAt" class="expiry-date">
                {{ formatDate(perm.expiresAt) }}
              </span>
              <span v-else class="no-expiry">No expiry</span>
            </div>
            <div class="col-actions">
              <button
                v-if="!perm.granted"
                @click="handleGrantPermission(provider.provider, perm.id)"
                class="btn btn-small btn-grant"
              >
                Grant
              </button>
              <button
                v-else
                @click="handleRevokePermission(provider.provider, perm.id)"
                class="btn btn-small btn-revoke"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expiring permissions -->
    <div v-if="expiringPermissions.length > 0" class="expiring-section">
      <h2>Expiring Soon (30 days)</h2>
      <div class="expiring-list">
        <div
          v-for="item in expiringPermissions"
          :key="`${item.provider}-${item.scope.id}`"
          class="expiring-item"
        >
          <div class="expiring-info">
            <p class="expiring-provider">{{ item.provider }}</p>
            <p class="expiring-scope">{{ item.scope.name }}</p>
            <p class="expiring-date">Expires: {{ formatDate(item.scope.expiresAt!) }}</p>
          </div>
          <button
            @click="handleGrantPermission(item.provider, item.scope.id)"
            class="btn btn-small btn-renew"
          >
            Renew
          </button>
        </div>
      </div>
    </div>

    <!-- Audit log -->
    <div class="audit-section">
      <div class="audit-header">
        <h2>Permission Audit Log</h2>
        <button @click="toggleAuditLog" class="toggle-btn">
          {{ showAuditLog ? '▼' : '▶' }}
        </button>
      </div>

      <div v-if="showAuditLog" class="audit-log">
        <div class="log-header">
          <div class="log-col-time">Time</div>
          <div class="log-col-action">Action</div>
          <div class="log-col-provider">Provider</div>
          <div class="log-col-status">Status</div>
        </div>

        <div
          v-for="entry in auditEntries"
          :key="entry.id"
          class="log-entry"
          :class="`status-${entry.status}`"
        >
          <div class="log-col-time">{{ formatTime(entry.timestamp) }}</div>
          <div class="log-col-action">{{ entry.action }}</div>
          <div class="log-col-provider">{{ entry.provider }}</div>
          <div class="log-col-status">
            <span class="status-badge" :class="entry.status">
              {{ entry.status === 'success' ? '✓' : '✕' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import { usePermissions } from '@/composables/usePermissions'
import type { ProviderType } from '@/stores/integrationStore'

const store = useIntegrationStore()
const {
  grantPermission,
  revokePermission,
  getExpiringPermissions,
} = usePermissions()

const showAuditLog = ref(false)

const pendingPermissions = computed(() => store.pendingPermissions)
const expiringPermissions = computed(() => getExpiringPermissions(30))
const auditEntries = computed(() => store.getAuditLog(undefined, 50))

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) return 'Expired'
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `${daysUntil} days`
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

const handleGrantPermission = async (provider: ProviderType, scopeId: string): Promise<void> => {
  const success = await grantPermission(provider, scopeId)
  if (success) {
    store.addAuditEntry({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `Granted permission`,
      provider,
      status: 'success',
    })
  }
}

const handleRevokePermission = async (provider: ProviderType, scopeId: string): Promise<void> => {
  if (!confirm('Are you sure you want to revoke this permission?')) return

  const success = await revokePermission(provider, scopeId)
  if (success) {
    store.addAuditEntry({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `Revoked permission`,
      provider,
      status: 'success',
    })
  }
}

const toggleAuditLog = (): void => {
  showAuditLog.value = !showAuditLog.value
}

onMounted(async () => {
  // Load permissions from API
  try {
    const response = await fetch('/api/integrations/permissions')
    const data = await response.json()
    // Process permissions data
  } catch (err) {
    console.error('Error loading permissions:', err)
  }
})
</script>

<style scoped>
.permissions-management-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  margin: 8px 0 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.pending-alert {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 24px;
  color: #ff9800;
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
}

.alert-content p {
  margin: 0;
  font-size: 0.95rem;
}

.alert-content p:first-child {
  font-weight: 600;
}

.permissions-section,
.expiring-section,
.audit-section {
  margin-bottom: 32px;
}

.permissions-section h2,
.expiring-section h2,
.audit-section h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.permissions-table {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 150px 1fr 120px 120px 100px;
  gap: 12px;
  padding: 12px;
  background: var(--header-bg);
  border-bottom: 2px solid var(--border-color);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.table-section {
  border-bottom: 1px solid var(--border-color);
}

.table-section:last-child {
  border-bottom: none;
}

.provider-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  padding: 12px;
  background: var(--section-bg);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.provider-name {
  text-transform: capitalize;
}

.permission-count {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.permission-row {
  display: grid;
  grid-template-columns: 150px 1fr 120px 120px 100px;
  gap: 12px;
  padding: 12px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s ease;
}

.permission-row:last-child {
  border-bottom: none;
}

.permission-row:hover {
  background: var(--row-hover);
}

.permission-row.required {
  background: rgba(255, 193, 7, 0.05);
}

.permission-row.granted {
  background: rgba(76, 175, 80, 0.05);
}

.scope-info {
  flex: 1;
}

.scope-name {
  margin: 0;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.scope-description {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.badge-success {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.badge-pending {
  background: rgba(255, 193, 7, 0.2);
  color: #ff9800;
}

.required-badge {
  display: block;
  margin-top: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #ffc107;
  color: #333;
  padding: 2px 4px;
  border-radius: 2px;
  text-transform: uppercase;
  width: fit-content;
}

.expiry-date {
  font-weight: 500;
  color: var(--text-primary);
}

.no-expiry {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-small {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.btn-grant {
  background: #4caf50;
  color: white;
}

.btn-grant:hover {
  background: #388e3c;
}

.btn-revoke {
  background: #f44336;
  color: white;
}

.btn-revoke:hover {
  background: #d32f2f;
}

.btn-renew {
  background: var(--primary-color);
  color: white;
}

.btn-renew:hover {
  opacity: 0.9;
}

.expiring-list {
  display: grid;
  gap: 12px;
}

.expiring-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 6px;
  background: rgba(255, 152, 0, 0.05);
}

.expiring-info {
  flex: 1;
}

.expiring-provider {
  margin: 0;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: capitalize;
}

.expiring-scope {
  margin: 4px 0 0;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.expiring-date {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #ff9800;
  font-weight: 500;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.audit-log {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-color);
  max-height: 400px;
  overflow-y: auto;
}

.log-header {
  display: grid;
  grid-template-columns: 80px 1fr 120px 80px;
  gap: 12px;
  padding: 12px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.log-entry {
  display: grid;
  grid-template-columns: 80px 1fr 120px 80px;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.status-failure {
  background: rgba(244, 67, 54, 0.05);
}

.status-badge {
  font-weight: 600;
}

.status-badge.success {
  color: #4caf50;
}

.status-badge.failure {
  color: #f44336;
}

/* CSS Variables */
:root {
  --primary-color: #2196f3;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --header-bg: #f5f5f5;
  --section-bg: #f0f0f0;
  --row-hover: #eeeeee;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #90caf9;
    --border-color: #424242;
    --surface-color: #303030;
    --header-bg: #424242;
    --section-bg: #505050;
    --row-hover: #555555;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}

@media (max-width: 1024px) {
  .table-header,
  .permission-row {
    grid-template-columns: 1fr;
  }

  .provider-row {
    grid-template-columns: 1fr;
  }
}
</style>
