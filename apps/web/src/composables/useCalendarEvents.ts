import { ref } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { CalendarEvent } from '@/stores/integrationStore'

/**
 * Composable for managing calendar operations
 */
export function useCalendarEvents() {
  const store = useIntegrationStore()
  const loadingEvents = ref(false)
  const filterCalendar = ref<string | null>(null)
  const filterDateRange = ref<{ start: Date; end: Date } | null>(null)

  /**
   * Load calendar events
   */
  const loadEvents = async (): Promise<void> => {
    loadingEvents.value = true
    try {
      const response = await fetch('/api/integrations/calendar/events')
      const data = await response.json()
      store.updateCalendarEvents(data)
      store.setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events'
      store.setError(message)
      console.error('Error loading calendar events:', err)
    } finally {
      loadingEvents.value = false
    }
  }

  /**
   * Get upcoming events
   */
  const getUpcoming = (limit: number = 10): CalendarEvent[] => {
    return store.getUpcomingEvents(limit)
  }

  /**
   * Get events by calendar
   */
  const getByCalendar = (calendar: string): CalendarEvent[] => {
    return store.calendarEvents.filter(e => e.calendar === calendar)
  }

  /**
   * Get events in date range
   */
  const getByDateRange = (start: Date, end: Date): CalendarEvent[] => {
    return store.calendarEvents.filter(e => {
      const eventStart = new Date(e.startTime)
      return eventStart >= start && eventStart <= end
    })
  }

  /**
   * Get today's events
   */
  const getTodayEvents = (): CalendarEvent[] => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return getByDateRange(start, end)
  }

  /**
   * Get free time slots in a day
   */
  const getFreeSlots = (date: Date, slotDuration: number = 30): Array<{ start: Date; end: Date }> => {
    const start = new Date(date)
    start.setHours(8, 0, 0, 0)
    const end = new Date(date)
    end.setHours(18, 0, 0, 0)

    const events = store.calendarEvents.filter(e => {
      const eventDate = new Date(e.startTime)
      return eventDate.toDateString() === date.toDateString()
    })

    const slots: Array<{ start: Date; end: Date }> = []
    let currentTime = new Date(start)

    while (currentTime < end) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000)
      const hasConflict = events.some(e => {
        const eventStart = new Date(e.startTime)
        const eventEnd = new Date(e.endTime)
        return eventStart < slotEnd && eventEnd > currentTime
      })

      if (!hasConflict) {
        slots.push({ start: new Date(currentTime), end: new Date(slotEnd) })
      }

      currentTime = slotEnd
    }

    return slots
  }

  /**
   * Check for conflicts
   */
  const hasConflicts = (event: CalendarEvent): boolean => {
    const eventStart = new Date(event.startTime)
    const eventEnd = new Date(event.endTime)

    return store.calendarEvents.some(e => {
      if (e.id === event.id) return false
      const eStart = new Date(e.startTime)
      const eEnd = new Date(e.endTime)
      return eStart < eventEnd && eEnd > eventStart
    })
  }

  /**
   * Get event by id
   */
  const getEventById = (id: string): CalendarEvent | undefined => {
    return store.calendarEvents.find(e => e.id === id)
  }

  /**
   * Add event
   */
  const addEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<boolean> => {
    try {
      const response = await fetch('/api/integrations/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const data = await response.json()
      store.addCalendarEvent({ ...event, id: data.id })
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event'
      store.setError(message)
      console.error('Error creating event:', err)
      return false
    }
  }

  /**
   * Delete event
   */
  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/calendar/events/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      store.removeCalendarEvent(id)
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event'
      store.setError(message)
      console.error('Error deleting event:', err)
      return false
    }
  }

  /**
   * Get available calendars
   */
  const getCalendars = (): string[] => {
    const calendars = new Set(store.calendarEvents.map(e => e.calendar))
    return Array.from(calendars)
  }

  /**
   * Get events count
   */
  const getCount = (): number => {
    return store.calendarEvents.length
  }

  /**
   * Set calendar filter
   */
  const setCalendarFilter = (calendar: string | null): void => {
    filterCalendar.value = calendar
  }

  /**
   * Set date range filter
   */
  const setDateRangeFilter = (start: Date, end: Date): void => {
    filterDateRange.value = { start, end }
  }

  /**
   * Get filtered events
   */
  const getFiltered = (): CalendarEvent[] => {
    let events = store.calendarEvents

    if (filterCalendar.value) {
      events = events.filter(e => e.calendar === filterCalendar.value)
    }

    if (filterDateRange.value) {
      events = events.filter(e => {
        const eventStart = new Date(e.startTime)
        return eventStart >= filterDateRange.value!.start && eventStart <= filterDateRange.value!.end
      })
    }

    return events
  }

  return {
    loadingEvents,
    filterCalendar,
    filterDateRange,
    loadEvents,
    getUpcoming,
    getByCalendar,
    getByDateRange,
    getTodayEvents,
    getFreeSlots,
    hasConflicts,
    getEventById,
    addEvent,
    deleteEvent,
    getCalendars,
    getCount,
    setCalendarFilter,
    setDateRangeFilter,
    getFiltered,
  }
}
