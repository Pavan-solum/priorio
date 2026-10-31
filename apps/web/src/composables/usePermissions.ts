import { ref, computed } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { ProviderType, PermissionScope } from '@/stores/integrationStore'

/**
 * Composable for managing permissions
 */
export function usePermissions() {
  const store = useIntegrationStore()
  const grantingPermission = ref(false)
  const revokingPermission = ref(false)

  /**
   * Grant permission to provider
   */
  const grantPermission = async (
    provider: ProviderType,
    scopeId: string,
    expiryDays?: number
  ): Promise<boolean> => {
    grantingPermission.value = true
    try {
      const response = await fetch(`/api/integrations/${provider}/permissions/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId, expiryDays }),
      })

      if (!response.ok) {
        throw new Error(`Failed to grant permission`)
      }

      store.grantPermission(provider, scopeId)
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Permission grant failed'
      store.setError(message)
      console.error(`Error granting permission:`, err)
      return false
    } finally {
      grantingPermission.value = false
    }
  }

  /**
   * Revoke permission from provider
   */
  const revokePermission = async (provider: ProviderType, scopeId: string): Promise<boolean> => {
    revokingPermission.value = true
    try {
      const response = await fetch(`/api/integrations/${provider}/permissions/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to revoke permission`)
      }

      store.revokePermission(provider, scopeId)
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Permission revoke failed'
      store.setError(message)
      console.error(`Error revoking permission:`, err)
      return false
    } finally {
      revokingPermission.value = false
    }
  }

  /**
   * Get permissions for provider
   */
  const getPermissions = (provider: ProviderType): PermissionScope[] => {
    return store.getProviderPermissions(provider)
  }

  /**
   * Get granted permissions
   */
  const getGrantedPermissions = (provider: ProviderType): PermissionScope[] => {
    return store.getProviderPermissions(provider).filter(p => p.granted)
  }

  /**
   * Get ungranred permissions
   */
  const getUngrantedPermissions = (provider: ProviderType): PermissionScope[] => {
    return store.getProviderPermissions(provider).filter(p => !p.granted)
  }

  /**
   * Get required permissions
   */
  const getRequiredPermissions = (provider: ProviderType): PermissionScope[] => {
    return store.getProviderPermissions(provider).filter(p => p.required)
  }

  /**
   * Check if all required permissions are granted
   */
  const allRequiredGranted = (provider: ProviderType): boolean => {
    const permissions = store.getProviderPermissions(provider)
    return permissions
      .filter(p => p.required)
      .every(p => p.granted)
  }

  /**
   * Get permissions expiring soon (within X days)
   */
  const getExpiringPermissions = (days: number = 30): Array<{ provider: ProviderType; scope: PermissionScope }> => {
    const expiring: Array<{ provider: ProviderType; scope: PermissionScope }> = []
    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    store.providers.forEach(provider => {
      provider.permissions.forEach(scope => {
        if (scope.expiresAt) {
          const expiryDate = new Date(scope.expiresAt)
          if (expiryDate <= futureDate && expiryDate >= now) {
            expiring.push({ provider: provider.provider, scope })
          }
        }
      })
    })

    return expiring
  }

  /**
   * Get all pending permissions
   */
  const getPendingPermissions = () => {
    return store.pendingPermissions
  }

  /**
   * Get audit log for permissions
   */
  const getPermissionAuditLog = (limit: number = 50) => {
    return store.getAuditLog(undefined, limit)
      .filter(entry => entry.action.includes('permission'))
  }

  /**
   * Request multiple permissions at once
   */
  const requestPermissions = async (
    provider: ProviderType,
    scopeIds: string[]
  ): Promise<Map<string, boolean>> => {
    const results = new Map<string, boolean>()

    for (const scopeId of scopeIds) {
      const success = await grantPermission(provider, scopeId)
      results.set(scopeId, success)
    }

    return results
  }

  return {
    grantingPermission,
    revokingPermission,
    grantPermission,
    revokePermission,
    getPermissions,
    getGrantedPermissions,
    getUngrantedPermissions,
    getRequiredPermissions,
    allRequiredGranted,
    getExpiringPermissions,
    getPendingPermissions,
    getPermissionAuditLog,
    requestPermissions,
  }
}
