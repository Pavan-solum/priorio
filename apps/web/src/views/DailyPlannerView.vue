<template>
  <div class="daily-planner-view">
    <!-- Planner Header -->
    <header class="planner-header">
      <div class="header-titles">
        <p class="eyebrow">AI FOCUS OPTIMIZER</p>
        <h1>Daily Planner<span class="heading-period">.</span></h1>
        <p class="heading-subtitle">
          Smart time-blocking, task sequencing, and scheduled breaks tailored to your circadian rhythm.
        </p>
      </div>

      <div class="date-selector">
        <label class="date-input-wrap">
          <CalendarDays :size="15" />
          <input
            v-model="selectedDate"
            type="date"
            @change="loadDailyPlan"
            class="date-input"
          />
        </label>
        <button @click="generateNewPlan" class="button-primary generate-btn" :disabled="loading">
          <Sparkles :size="15" />
          <span>{{ loading ? 'Generating...' : 'Regenerate Plan' }}</span>
        </button>
      </div>
    </header>

    <!-- Toast Notification -->
    <div v-if="toastMsg" class="planner-toast">
      <CheckCircle2 :size="16" />
      <span>{{ toastMsg }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing priorities and optimizing schedule...</p>
    </div>

    <!-- Planner Content -->
    <div v-else-if="currentPlan" class="planner-content">
      <!-- Metrics Section -->
      <section class="metrics-grid">
        <div class="metric-card">
          <div class="metric-head">
            <span class="metric-label">Scheduled Tasks</span>
            <span class="metric-badge">{{ currentPlan.metrics.totalTasks }} total</span>
          </div>
          <p class="metric-value">{{ currentPlan.metrics.totalTasks }}</p>
          <span class="metric-sub">Optimized for focus</span>
        </div>

        <div class="metric-card">
          <div class="metric-head">
            <span class="metric-label">Estimated Time</span>
            <span class="metric-badge">Work load</span>
          </div>
          <p class="metric-value">{{ currentPlan.metrics.totalEstimatedHours }}h</p>
          <span class="metric-sub">Includes 90m buffer</span>
        </div>

        <div class="metric-card highlight-card">
          <div class="metric-head">
            <span class="metric-label">Completion Likelihood</span>
            <span class="metric-badge">High</span>
          </div>
          <p class="metric-value">{{ currentPlan.metrics.completionProbability }}%</p>
          <span class="metric-sub">Based on previous pace</span>
        </div>

        <div class="metric-card">
          <div class="metric-head">
            <span class="metric-label">Critical / High</span>
            <span class="metric-badge warning">Needs Attention</span>
          </div>
          <p class="metric-value">{{ currentPlan.metrics.highPriorityCount }}</p>
          <span class="metric-sub">Scheduled before noon</span>
        </div>
      </section>

      <!-- Main Layout: Time Blocks & Breaks Side by Side -->
      <div class="planner-main-layout">
        <!-- Time Blocks Section -->
        <section class="time-blocks-section">
          <div class="section-heading">
            <h2>Time Blocks Schedule</h2>
            <span class="section-hint">Drag blocks to re-order priority</span>
          </div>

          <div class="time-blocks-container">
            <article
              v-for="block in currentPlan.timeBlocks"
              :key="block.taskId"
              class="time-block"
              :class="`priority-${block.priority.toLowerCase()}`"
              draggable="true"
              @dragstart="handleDragStart"
              @dragend="handleDragEnd"
            >
              <div class="block-time-col">
                <span class="time-start">{{ formatTime(block.startTime) }}</span>
                <span class="time-divider"></span>
                <span class="time-end">{{ formatTime(block.endTime) }}</span>
              </div>

              <div class="block-body">
                <div class="block-header">
                  <h4>{{ block.taskTitle }}</h4>
                  <span class="duration-badge"><Clock3 :size="12" /> {{ block.estimatedDuration }}m</span>
                </div>
                <div class="block-footer">
                  <span class="block-priority-tag">{{ block.priority }} Priority</span>
                  <span class="block-focus-tag">Deep Work</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Recommended Breaks & Action Aside -->
        <aside class="planner-aside">
          <div class="aside-panel">
            <div class="section-heading">
              <h2>Smart Breaks</h2>
              <span class="section-hint">Avoid fatigue</span>
            </div>

            <div class="breaks-list">
              <div
                v-for="(breakItem, index) in currentPlan.breaks"
                :key="index"
                class="break-card"
              >
                <div class="break-head">
                  <span class="break-type-tag" :class="breakItem.type">
                    <Coffee :size="13" />
                    {{ breakItem.type.toUpperCase() }}
                  </span>
                  <span class="break-time">{{ formatTime(breakItem.time) }}</span>
                </div>
                <p class="break-reason">{{ breakItem.reason }}</p>
                <span class="break-duration">{{ breakItem.duration }} minutes duration</span>
              </div>
            </div>
          </div>

          <!-- Optimization Actions -->
          <div class="aside-actions-panel">
            <h3>Plan Actions</h3>
            <p>Lock your schedule to your calendar or export for offline review.</p>
            <div class="action-buttons-stack">
              <button @click="executePlan" class="button-primary">
                <CheckCircle2 :size="15" />
                <span>Execute & Lock Schedule</span>
              </button>
              <button @click="downloadPlan" class="button-outline">
                <Download :size="15" />
                <span>Export Plan (JSON)</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <CalendarDays :size="32" class="empty-icon" />
      <h3>No plan for this date</h3>
      <p>Click below to let AI construct an optimal daily schedule based on your tasks.</p>
      <button @click="generateNewPlan" class="button-primary">
        <Sparkles :size="16" />
        <span>Generate Daily Plan</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Sparkles,
  CalendarDays,
  Clock3,
  Coffee,
  Download,
  CheckCircle2,
} from 'lucide-vue-next'

interface TimeBlock {
  taskId: string
  taskTitle: string
  priority: string
  estimatedDuration: number
  startTime: string
  endTime: string
}

interface BreakItem {
  type: 'coffee' | 'lunch' | 'walk' | 'rest'
  time: string
  duration: number
  reason: string
}

interface DailyPlan {
  id: string
  date: string
  metrics: {
    totalTasks: number
    totalEstimatedHours: number
    completionProbability: number
    highPriorityCount: number
  }
  timeBlocks: TimeBlock[]
  breaks: BreakItem[]
}

const selectedDate = ref(new Date().toISOString().split('T')[0])
const currentPlan = ref<DailyPlan | null>(null)
const loading = ref(false)
const toastMsg = ref<string | null>(null)

const showToast = (msg: string) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = null
  }, 3000)
}

const buildPlanData = (date: string): DailyPlan => {
  return {
    id: `plan-${date}`,
    date,
    metrics: {
      totalTasks: 4,
      totalEstimatedHours: 3.5,
      completionProbability: 94,
      highPriorityCount: 2,
    },
    timeBlocks: [
      {
        taskId: 't-1',
        taskTitle: 'Share the Q4 hiring plan with leadership',
        priority: 'High',
        estimatedDuration: 60,
        startTime: `${date}T09:00:00`,
        endTime: `${date}T10:00:00`,
      },
      {
        taskId: 't-2',
        taskTitle: 'Product Strategy Review with Sarah Chen',
        priority: 'High',
        estimatedDuration: 60,
        startTime: `${date}T10:30:00`,
        endTime: `${date}T11:30:00`,
      },
      {
        taskId: 't-3',
        taskTitle: 'Review Maya’s proposal & leave feedback',
        priority: 'Medium',
        estimatedDuration: 45,
        startTime: `${date}T13:30:00`,
        endTime: `${date}T14:15:00`,
      },
      {
        taskId: 't-4',
        taskTitle: 'Send revised invoice & project hours',
        priority: 'Critical',
        estimatedDuration: 30,
        startTime: `${date}T15:00:00`,
        endTime: `${date}T15:30:00`,
      },
    ],
    breaks: [
      {
        type: 'coffee',
        time: `${date}T10:00:00`,
        duration: 15,
        reason: 'Mental reset after morning hiring plan review',
      },
      {
        type: 'lunch',
        time: `${date}T12:00:00`,
        duration: 60,
        reason: 'Rest and midday recovery',
      },
      {
        type: 'walk',
        time: `${date}T14:30:00`,
        duration: 15,
        reason: 'Light movement before invoice completion',
      },
    ],
  }
}

const loadDailyPlan = async () => {
  loading.value = true
  try {
    const saved = localStorage.getItem(`priorio-plan-${selectedDate.value}`)
    if (saved) {
      currentPlan.value = JSON.parse(saved)
    } else {
      currentPlan.value = buildPlanData(selectedDate.value)
      localStorage.setItem(`priorio-plan-${selectedDate.value}`, JSON.stringify(currentPlan.value))
    }
  } finally {
    loading.value = false
  }
}

const generateNewPlan = async () => {
  loading.value = true
  try {
    await new Promise((r) => setTimeout(r, 450))
    currentPlan.value = buildPlanData(selectedDate.value)
    localStorage.setItem(`priorio-plan-${selectedDate.value}`, JSON.stringify(currentPlan.value))
    showToast('AI Plan generated with 94% completion probability!')
  } finally {
    loading.value = false
  }
}

const executePlan = () => {
  showToast('Plan executed! Time blocks synchronized with your workspace.')
}

const downloadPlan = () => {
  if (!currentPlan.value) return
  const dataStr = JSON.stringify(currentPlan.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `priorio-plan-${selectedDate.value}.json`
  link.click()
  showToast('Plan downloaded successfully.')
}

const formatTime = (timeStr: string): string => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) {
    // If simple time format or ISO
    return timeStr.slice(11, 16) || timeStr
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const handleDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragEnd = () => {
  showToast('Schedule order adjusted.')
}

onMounted(() => {
  loadDailyPlan()
})
</script>

<style scoped>
.daily-planner-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

/* Header */
.planner-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.header-titles .eyebrow {
  margin: 0 0 6px;
  color: var(--coral, #df684e);
  font: 700 10px 'Manrope', sans-serif;
  letter-spacing: 0.08em;
}

.header-titles h1 {
  margin: 0 0 6px;
  color: var(--ink, #202a27);
  font: 800 28px 'Manrope', sans-serif;
  letter-spacing: -0.02em;
}

.heading-period {
  color: var(--coral, #df684e);
}

.heading-subtitle {
  margin: 0;
  max-width: 580px;
  color: var(--muted, #78817b);
  font-size: 13px;
  line-height: 1.5;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.date-input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 38px;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 6px;
  background: #ffffff;
  color: var(--muted, #78817b);
}

.date-input {
  border: 0;
  outline: none;
  font-size: 13px;
  color: var(--ink, #202a27);
  background: transparent;
  font-family: inherit;
}

.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* Toast */
.planner-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #20352f;
  color: #ffffff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 16px 18px;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.highlight-card {
  border-color: #f1d5cd;
  background: linear-gradient(135deg, #ffffff 0%, #fdf8f6 100%);
}

.metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted, #78817b);
}

.metric-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  background: #f1f3f0;
  color: #556259;
}

.metric-badge.warning {
  background: #fbeee9;
  color: var(--coral, #df684e);
}

.metric-value {
  margin: 0 0 4px;
  font: 800 24px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
}

.metric-sub {
  font-size: 10px;
  color: var(--muted, #78817b);
}

/* Main Layout */
.planner-main-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-heading h2 {
  margin: 0;
  font: 700 16px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
}

.section-hint {
  font-size: 11px;
  color: var(--muted, #78817b);
}

/* Time Blocks */
.time-blocks-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-block {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  cursor: grab;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.time-block:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.block-time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
  background: #f9faf9;
  border-right: 1px solid var(--line, #e8ebe6);
  min-width: 90px;
}

.time-start {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink, #202a27);
}

.time-divider {
  width: 1px;
  height: 8px;
  background: #d4dad6;
  margin: 3px 0;
}

.time-end {
  font-size: 11px;
  color: var(--muted, #78817b);
}

.block-body {
  flex: 1;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.block-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.block-header h4 {
  margin: 0;
  font: 600 14px 'DM Sans', sans-serif;
  color: var(--ink, #202a27);
}

.duration-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: #f1f3f0;
  color: #4b5850;
  white-space: nowrap;
}

.block-footer {
  display: flex;
  gap: 8px;
}

.block-priority-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.priority-critical .block-priority-tag { background: #fde8e7; color: #b73229; }
.priority-high .block-priority-tag { background: #fbeee9; color: var(--coral, #df684e); }
.priority-medium .block-priority-tag { background: #fdf5e6; color: #a46d12; }
.priority-low .block-priority-tag { background: #eaf5ee; color: #2c774d; }

.block-focus-tag {
  font-size: 10px;
  color: var(--muted, #78817b);
}

/* Aside */
.planner-aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aside-panel, .aside-actions-panel {
  padding: 18px;
  border: 1px solid var(--line, #e8ebe6);
  border-radius: 8px;
  background: #ffffff;
}

.aside-actions-panel h3 {
  margin: 0 0 4px;
  font: 700 14px 'Manrope', sans-serif;
  color: var(--ink, #202a27);
}

.aside-actions-panel p {
  margin: 0 0 14px;
  font-size: 11px;
  color: var(--muted, #78817b);
  line-height: 1.4;
}

.action-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons-stack button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  font-size: 12px;
  font-weight: 600;
}

.breaks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.break-card {
  padding: 12px 14px;
  border: 1px solid #edf1ee;
  border-radius: 6px;
  background: #fbfcfa;
}

.break-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.break-type-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.break-type-tag.coffee { background: #fdf5e6; color: #a46d12; }
.break-type-tag.lunch { background: #eaf5ee; color: #2c774d; }
.break-type-tag.walk { background: #eef1fe; color: #4b61d1; }

.break-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink, #202a27);
}

.break-reason {
  margin: 0 0 4px;
  font-size: 11px;
  color: #4b5850;
  line-height: 1.4;
}

.break-duration {
  font-size: 10px;
  color: var(--muted, #78817b);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: var(--muted, #78817b);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8e4;
  border-top-color: var(--coral, #df684e);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .planner-main-layout {
    grid-template-columns: 1fr;
  }
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
