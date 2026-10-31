import { ref } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { TeamsMessage } from '@/stores/integrationStore'

/**
 * Composable for managing Teams chat operations
 */
export function useTeamsChats() {
  const store = useIntegrationStore()
  const loadingMessages = ref(false)
  const selectedChannel = ref<string | null>(null)
  const selectedMessage = ref<TeamsMessage | null>(null)

  /**
   * Load Teams messages
   */
  const loadMessages = async (): Promise<void> => {
    loadingMessages.value = true
    try {
      const response = await fetch('/api/integrations/teams/messages')
      const data = await response.json()
      store.updateTeamsMessages(data)
      store.setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages'
      store.setError(message)
      console.error('Error loading Teams messages:', err)
    } finally {
      loadingMessages.value = false
    }
  }

  /**
   * Get all messages
   */
  const getAll = (): TeamsMessage[] => {
    return store.teamsMessages
  }

  /**
   * Get messages by channel
   */
  const getByChannel = (channel: string): TeamsMessage[] => {
    return store.getTeamsMessagesByChannel(channel)
  }

  /**
   * Get messages by sender
   */
  const getBySender = (sender: string): TeamsMessage[] => {
    return store.teamsMessages.filter(m => m.sender.toLowerCase().includes(sender.toLowerCase()))
  }

  /**
   * Search messages
   */
  const search = (query: string): TeamsMessage[] => {
    const lowerQuery = query.toLowerCase()
    return store.teamsMessages.filter(m =>
      m.sender.toLowerCase().includes(lowerQuery) ||
      m.content.toLowerCase().includes(lowerQuery) ||
      m.channel.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get message by id
   */
  const getById = (id: string): TeamsMessage | undefined => {
    return store.teamsMessages.find(m => m.id === id)
  }

  /**
   * Get channels list
   */
  const getChannels = (): string[] => {
    const channels = new Set(store.teamsMessages.map(m => m.channel))
    return Array.from(channels).sort()
  }

  /**
   * Get recent messages
   */
  const getRecent = (limit: number = 20): TeamsMessage[] => {
    return store.teamsMessages.slice(0, limit)
  }

  /**
   * Get messages with attachments
   */
  const getWithAttachments = (): TeamsMessage[] => {
    return store.teamsMessages.filter(m => m.attachments.length > 0)
  }

  /**
   * Get most liked messages
   */
  const getMostLiked = (limit: number = 10): TeamsMessage[] => {
    return store.teamsMessages
      .sort((a, b) => b.likes - a.likes)
      .slice(0, limit)
  }

  /**
   * Add message
   */
  const addMessage = async (message: Omit<TeamsMessage, 'id'>): Promise<boolean> => {
    try {
      const response = await fetch('/api/integrations/teams/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      store.addTeamsMessage({ ...message, id: data.id })
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      store.setError(message)
      console.error('Error sending message:', err)
      return false
    }
  }

  /**
   * Delete message
   */
  const deleteMessage = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/teams/messages/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      store.updateTeamsMessages(store.teamsMessages.filter(m => m.id !== id))
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete message'
      store.setError(message)
      console.error('Error deleting message:', err)
      return false
    }
  }

  /**
   * React to message (like)
   */
  const likeMessage = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/teams/messages/${id}/like`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to like message')
      }

      const message = store.teamsMessages.find(m => m.id === id)
      if (message) {
        message.likes++
      }

      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to like message'
      store.setError(message)
      console.error('Error liking message:', err)
      return false
    }
  }

  /**
   * Reply to message
   */
  const replyToMessage = async (messageId: string, replyText: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/teams/messages/${messageId}/reply`, {
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
   * Create task from message
   */
  const createTaskFromMessage = async (messageId: string, taskData: Record<string, any>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/teams/messages/${messageId}/create-task`, {
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
   * Get message count
   */
  const getCount = (): number => {
    return store.teamsMessages.length
  }

  /**
   * Get channel message count
   */
  const getChannelCount = (channel: string): number => {
    return store.getTeamsMessagesByChannel(channel).length
  }

  /**
   * Select channel
   */
  const selectChannel = (channel: string | null): void => {
    selectedChannel.value = channel
  }

  /**
   * Select message
   */
  const selectMessage = (message: TeamsMessage | null): void => {
    selectedMessage.value = message
  }

  /**
   * Get message statistics
   */
  const getStats = () => ({
    total: store.teamsMessages.length,
    channels: getChannels().length,
    withAttachments: getWithAttachments().length,
    totalLikes: store.teamsMessages.reduce((sum, m) => sum + m.likes, 0),
    totalReplies: store.teamsMessages.reduce((sum, m) => sum + m.replies, 0),
  })

  return {
    loadingMessages,
    selectedChannel,
    selectedMessage,
    loadMessages,
    getAll,
    getByChannel,
    getBySender,
    search,
    getById,
    getChannels,
    getRecent,
    getWithAttachments,
    getMostLiked,
    addMessage,
    deleteMessage,
    likeMessage,
    replyToMessage,
    createTaskFromMessage,
    getCount,
    getChannelCount,
    selectChannel,
    selectMessage,
    getStats,
  }
}
