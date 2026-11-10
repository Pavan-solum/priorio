import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from './views/WorkspaceView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: WorkspaceView, meta: { title: 'Today' } },
    { path: '/inbox', name: 'inbox', component: WorkspaceView, meta: { title: 'Smart inbox' } },
    { path: '/tasks', name: 'tasks', component: WorkspaceView, meta: { title: 'My tasks' } },
    { path: '/daily-planner', name: 'daily-planner', component: WorkspaceView, meta: { title: 'Daily Planner' } },
    { path: '/reminders', name: 'reminders', component: WorkspaceView, meta: { title: 'Reminders' } },
    { path: '/follow-ups', name: 'followups', component: WorkspaceView, meta: { title: 'Follow-ups' } },
    { path: '/communication-tools', name: 'communication-tools', component: WorkspaceView, meta: { title: 'Communication Tools' } },
    { path: '/assistant', name: 'assistant', component: WorkspaceView, meta: { title: 'AI assistant' } },
    { path: '/knowledge', name: 'knowledge', component: WorkspaceView, meta: { title: 'Knowledge hub' } },
    { path: '/integrations', name: 'integrations', component: WorkspaceView, meta: { title: 'Integrations' } },
    { path: '/settings', name: 'settings', component: WorkspaceView, meta: { title: 'Settings' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router