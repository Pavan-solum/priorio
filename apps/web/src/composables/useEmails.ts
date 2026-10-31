import { ref, computed } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { EmailMessage } from '@/stores/integrationStore'

/**
 * Composable for managing email operations
 */
export function useEmails() {
  const store = useIntegrationStore()
  const loadingEmails = ref(false)
  const searchQuery = ref('')
  const filterUnread = ref(false)
  const filterStarred = ref(false)
  const selectedEmail = ref<EmailMessage | null>(null)

  /**
   * Load emails
   */
  const loadEmails = async (): Promise<void> => {
    loadingEmails.value = true
    try {
      const response = await fetch('/api/integrations/outlook/emails')
      const data = await response.json()
      store.updateEmails(data)
      store.setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load emails'
      store.setError(message)
      console.error('Error loading emails:', err)
    } finally {
      loadingEmails.value = false
    }
  }

  /**
   * Get all emails
   */
  const getAll = (): EmailMessage[] => {
    return store.emails
  }

  /**
   * Get unread emails
   */
  const getUnread = (): EmailMessage[] => {
    return store.emails.filter(e => e.unread)
  }

  /**
   * Get starred emails
   */
  const getStarred = (): EmailMessage[] => {
    return store.emails.filter(e => e.starred)
  }

  /**
   * Get emails by sender
   */
  const getBySender = (sender: string): EmailMessage[] => {
    return store.emails.filter(e => e.from.toLowerCase().includes(sender.toLowerCase()))
  }

  /**
   * Get emails by subject
   */
  const getBySubject = (subject: string): EmailMessage[] => {
    return store.emails.filter(e => e.subject.toLowerCase().includes(subject.toLowerCase()))
  }

  /**
   * Search emails
   */
  const search = (query: string): EmailMessage[] => {
    const lowerQuery = query.toLowerCase()
    return store.emails.filter(e =>
      e.from.toLowerCase().includes(lowerQuery) ||
      e.subject.toLowerCase().includes(lowerQuery) ||
      e.preview.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get filtered emails
   */
  const getFiltered = computed(() => {
    let filtered = store.emails

    if (searchQuery.value) {
      filtered = search(searchQuery.value)
    }

    if (filterUnread.value) {
      filtered = filtered.filter(e => e.unread)
    }

    if (filterStarred.value) {
      filtered = filtered.filter(e => e.starred)
    }

    return filtered
  })

  /**
   * Get email by id
   */
  const getById = (id: string): EmailMessage | undefined => {
    return store.emails.find(e => e.id === id)
  }

  /**
   * Toggle star
   */
  const toggleStar = (id: string): void => {
    store.toggleEmailStar(id)
  }

  /**
   * Mark as read
   */
  const markAsRead = (id: string): void => {
    store.markEmailAsRead(id)
  }

  /**
   * Mark as unread
   */
  const markAsUnread = (id: string): void => {
    const email = store.emails.find(e => e.id === id)
    if (email) {
      email.unread = true
    }
  }

  /**
   * Get unread count
   */
  const getUnreadCount = (): number => {
    return store.getUnreadEmailsCount()
  }

  /**
   * Delete email
   */
  const deleteEmail = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/outlook/emails/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete email')
      }

      store.updateEmails(store.emails.filter(e => e.id !== id))
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete email'
      store.setError(message)
      console.error('Error deleting email:', err)
      return false
    }
  }

  /**
   * Send reply
   */
  const sendReply = async (emailId: string, replyText: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/outlook/emails/${emailId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      })

      if (!response.ok) {
        throw new Error('Failed to send reply')
      }

      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reply'
      store.setError(message)
      console.error('Error sending reply:', err)
      return false
    }
  }

  /**
   * Create task from email
   */
  const createTaskFromEmail = async (emailId: string, taskData: Record<string, any>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/outlook/emails/${emailId}/create-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task'
      store.setError(message)
      console.error('Error creating task:', err)
      return false
    }
  }

  /**
   * Get email threads
   */
  const getThreads = (): Map<string, EmailMessage[]> => {
    const threads = new Map<string, EmailMessage[]>()

    store.emails.forEach(email => {
      const threadId = email.threadId || email.id
      if (!threads.has(threadId)) {
        threads.set(threadId, [])
      }
      threads.get(threadId)!.push(email)
    })

    return threads
  }

  /**
   * Get thread by id
   */
  const getThreadById = (threadId: string): EmailMessage[] => {
    return store.emails.filter(e => e.threadId === threadId || e.id === threadId)
  }

  /**
   * Select email
   */
  const selectEmail = (email: EmailMessage | null): void => {
    selectedEmail.value = email
    if (email && email.unread) {
      markAsRead(email.id)
    }
  }

  /**
   * Get email count
   */
  const getCount = (): number => {
    return store.emails.length
  }

  return {
    loadingEmails,
    searchQuery,
    filterUnread,
    filterStarred,
    selectedEmail,
    loadEmails,
    getAll,
    getUnread,
    getStarred,
    getBySender,
    getBySubject,
    search,
    getFiltered,
    getById,
    toggleStar,
    markAsRead,
    markAsUnread,
    getUnreadCount,
    deleteEmail,
    sendReply,
    createTaskFromEmail,
    getThreads,
    getThreadById,
    selectEmail,
    getCount,
  }
}
