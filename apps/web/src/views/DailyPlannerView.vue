<template>
  <div class="daily-planner-view">
    <header class="planner-header">
      <h1>Daily Planner</h1>
      <div class="date-selector">
        <input
          v-model="selectedDate"
          type="date"
          @change="loadDailyPlan"
          class="date-input"
        />
        <button @click="generateNewPlan" class="btn btn-primary">
          Generate Plan
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Loading your daily plan...</p>
    </div>

    <div v-else-if="currentPlan" class="planner-content">
      <!-- Metrics Section -->
      <section class="metrics-section">
        <div class="metric-card">
          <h3>Total Tasks</h3>
          <p class="metric-value">{{ currentPlan.metrics.totalTasks }}</p>
        </div>
        <div class="metric-card">
          <h3>Total Hours</h3>
          <p class="metric-value">{{ currentPlan.metrics.totalEstimatedHours }}</p>
        </div>
        <div class="metric-card">
          <h3>Completion Probability</h3>
          <p class="metric-value">{{ currentPlan.metrics.completionProbability }}%</p>
        </div>
        <div class="metric-card">
          <h3>High Priority</h3>
          <p class="metric-value">{{ currentPlan.metrics.highPriorityCount }}</p>
        </div>
      </section>

      <!-- Time Block Visualization -->
      <section class="time-blocks-section">
        <h2>Time Blocks</h2>
        <div class="time-blocks-container">
          <div
            v-for="block in currentPlan.timeBlocks"
            :key="block.taskId"
            :class="['time-block', block.priority.toLowerCase()]"
            :style="{ height: (block.estimatedDuration / 5) + 'px' }"
            draggable="true"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
          >
            <div class="block-header">
              <h4>{{ block.taskTitle }}</h4>
              <span class="duration">{{ block.estimatedDuration }}m</span>
            </div>
            <div class="block-time">
              {{ formatTime(block.startTime) }} - {{ formatTime(block.endTime) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Breaks Section -->
      <section class="breaks-section">
        <h2>Recommended Breaks</h2>
        <div class="breaks-list">
          <div
            v-for="(breakItem, index) in currentPlan.breaks"
            :key="index"
            class="break-card"
          >
            <span class="break-type" :class="breakItem.type">
              {{ breakItem.type }}
            </span>
            <p class="break-time">{{ formatTime(breakItem.time) }}</p>
            <p class="break-duration">{{ breakItem.duration }} minutes</p>
            <p class="break-reason">{{ breakItem.reason }}</p>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="planner-actions">
        <button @click="executePlan" class="btn btn-success">
          Mark as Executed
        </button>
        <button @click="downloadPlan" class="btn btn-secondary">
          Download
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No plan for this date. Create one to get started!</p>
      <button @click="generateNewPlan" class="btn btn-primary">
        Generate New Plan
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'DailyPlannerView',
  setup() {
    const selectedDate = ref(new Date().toISOString().split('T')[0]);
    const currentPlan = ref(null);
    const loading = ref(false);

    const loadDailyPlan = async () => {
      loading.value = true;
      try {
        // TODO: API call to load plan
        console.log('Loading plan for', selectedDate.value);
      } finally {
        loading.value = false;
      }
    };

    const generateNewPlan = async () => {
      loading.value = true;
      try {
        // TODO: API call to generate plan
        console.log('Generating new plan for', selectedDate.value);
      } finally {
        loading.value = false;
      }
    };

    const executePlan = async () => {
      if (!currentPlan.value) return;
      try {
        // TODO: API call to execute plan
        console.log('Executing plan', currentPlan.value.id);
      } catch (error) {
        console.error('Error executing plan:', error);
      }
    };

    const downloadPlan = () => {
      if (!currentPlan.value) return;
      // Generate and download JSON or PDF
      const dataStr = JSON.stringify(currentPlan.value, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plan-${selectedDate.value}.json`;
      link.click();
    };

    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const handleDragStart = (event) => {
      event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (event) => {
      console.log('Drag ended');
    };

    onMounted(() => {
      loadDailyPlan();
    });

    return {
      selectedDate,
      currentPlan,
      loading,
      loadDailyPlan,
      generateNewPlan,
      executePlan,
      downloadPlan,
      formatTime,
      handleDragStart,
      handleDragEnd,
    };
  },
};
</script>

<style scoped>
.daily-planner-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.planner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.date-selector {
  display: flex;
  gap: 12px;
  align-items: center;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
}

.metrics-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.metric-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  margin: 8px 0 0 0;
}

.time-blocks-section {
  margin-bottom: 32px;
}

.time-blocks-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  min-height: 400px;
}

.time-block {
  padding: 12px;
  border-radius: 4px;
  cursor: move;
  transition: transform 0.2s, box-shadow 0.2s;
}

.time-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.time-block.critical {
  background: #ef5350;
  color: white;
}

.time-block.high {
  background: #ff9800;
  color: white;
}

.time-block.medium {
  background: #42a5f5;
  color: white;
}

.time-block.low {
  background: #66bb6a;
  color: white;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.block-header h4 {
  margin: 0;
  font-size: 14px;
}

.duration {
  font-size: 12px;
  opacity: 0.9;
}

.block-time {
  font-size: 12px;
  opacity: 0.8;
}

.breaks-section {
  margin-bottom: 32px;
}

.breaks-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.break-card {
  background: white;
  border: 1px solid #e0e0e0;
  padding: 16px;
  border-radius: 8px;
}

.break-type {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.break-type.short {
  background: #e3f2fd;
  color: #1976d2;
}

.break-type.lunch {
  background: #fff3e0;
  color: #f57c00;
}

.break-type.exercise {
  background: #e8f5e9;
  color: #388e3c;
}

.break-time {
  font-weight: bold;
  margin: 8px 0 4px 0;
}

.break-duration {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.break-reason {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
  font-style: italic;
}

.planner-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

.empty-state,
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-success {
  background: #66bb6a;
  color: white;
}

.btn-success:hover {
  background: #55a85a;
}

.btn-secondary {
  background: #999;
  color: white;
}

.btn-secondary:hover {
  background: #888;
}
</style>
