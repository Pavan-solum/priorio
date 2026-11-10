import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from './views/WorkspaceView.vue'
import LoginView from './views/LoginView.vue'
import { useAuthStore } from './stores/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'Sign In', public: true } },
    { path: '/register', name: 'register', component: LoginView, meta: { title: 'Create Account', public: true } },
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

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const isPublic = to.meta.public === true

  if (!isPublic && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    next({ name: 'today' })
  } else {
    next()
  }
})

export default router
