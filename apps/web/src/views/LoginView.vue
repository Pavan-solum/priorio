<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isRegister = ref(route.name === 'register')
const email = ref('')
const password = ref('')
const displayName = ref('')
const workspaceName = ref('')
const showPassword = ref(false)

const redirectPath = computed(() => {
  const queryRedirect = route.query.redirect
  return typeof queryRedirect === 'string' && queryRedirect.startsWith('/') ? queryRedirect : '/'
})

function switchMode(register: boolean) {
  isRegister.value = register
  authStore.error = null
}

async function handleSubmit() {
  if (isRegister.value) {
    if (!displayName.value.trim() || !email.value.trim() || !password.value.trim()) return
    const success = await authStore.register(
      email.value.trim(),
      password.value,
      displayName.value.trim(),
      workspaceName.value.trim() || undefined,
    )
    if (success) {
      router.push(redirectPath.value)
    }
  } else {
    if (!email.value.trim() || !password.value.trim()) return
    const success = await authStore.login(email.value.trim(), password.value)
    if (success) {
      router.push(redirectPath.value)
    }
  }
}

function handleDemoLogin() {
  authStore.loginAsDemo()
  router.push(redirectPath.value)
}
</script>

<template>
  <div class="auth-page-container">
    <div class="auth-card">
      <!-- Brand Lockup -->
      <div class="auth-brand-wrap">
        <div class="brand-lockup">
          <span class="brand-mark">p</span>
          <span class="brand-name">priorio</span>
        </div>
        <p class="auth-tagline">A calm operating system for your attention and commitments.</p>
      </div>

      <!-- Quick Demo Sign-in Banner -->
      <div class="demo-auth-banner">
        <div class="demo-banner-left">
          <div class="demo-spark-icon">
            <Sparkles :size="16" />
          </div>
          <div class="demo-copy">
            <strong>Preview Demo Access</strong>
            <span>Sign in instantly as Alex Morgan with sample communications & planner data.</span>
          </div>
        </div>
        <button class="button-primary demo-sign-in-btn" type="button" @click="handleDemoLogin">
          <span>Quick Demo Login</span>
          <ArrowRight :size="14" />
        </button>
      </div>

      <div class="auth-divider">
        <span>OR SIGN IN WITH CREDENTIALS</span>
      </div>

      <!-- Mode Switcher Tabs -->
      <div class="auth-mode-tabs">
        <button
          type="button"
          class="auth-tab"
          :class="{ 'auth-tab-active': !isRegister }"
          @click="switchMode(false)"
        >
          Sign In
        </button>
        <button
          type="button"
          class="auth-tab"
          :class="{ 'auth-tab-active': isRegister }"
          @click="switchMode(true)"
        >
          Create Account
        </button>
      </div>

      <!-- Error Alert -->
      <div v-if="authStore.error" class="auth-error-alert">
        <span>{{ authStore.error }}</span>
      </div>

      <!-- Auth Form -->
      <form class="auth-form" @submit.prevent="handleSubmit">
        <!-- Display Name (Register only) -->
        <label v-if="isRegister" class="auth-field">
          <span class="field-label">Your Name</span>
          <div class="field-input-wrap">
            <User :size="16" class="field-icon" />
            <input
              v-model="displayName"
              type="text"
              placeholder="e.g. Maya Chen"
              required
              autocomplete="name"
            />
          </div>
        </label>

        <!-- Email Field -->
        <label class="auth-field">
          <span class="field-label">Email Address</span>
          <div class="field-input-wrap">
            <Mail :size="16" class="field-icon" />
            <input
              v-model="email"
              type="email"
              placeholder="name@company.com"
              required
              autocomplete="email"
            />
          </div>
        </label>

        <!-- Workspace Name (Register only) -->
        <label v-if="isRegister" class="auth-field">
          <span class="field-label">Workspace Name <small>(Optional)</small></span>
          <div class="field-input-wrap">
            <input
              v-model="workspaceName"
              type="text"
              placeholder="e.g. Engineering Team"
            />
          </div>
        </label>

        <!-- Password Field -->
        <label class="auth-field">
          <div class="field-label-row">
            <span class="field-label">Password</span>
            <span v-if="!isRegister" class="demo-hint-text">Demo password: <code>Priorio2026!</code></span>
          </div>
          <div class="field-input-wrap">
            <Lock :size="16" class="field-icon" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              required
              :minlength="isRegister ? 8 : 1"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="eye-toggle-btn"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="15" />
              <Eye v-else :size="15" />
            </button>
          </div>
        </label>

        <button
          type="submit"
          class="button-primary submit-auth-btn"
          :disabled="authStore.loading"
        >
          <span v-if="authStore.loading">Authenticating...</span>
          <span v-else-if="isRegister">Create Priorio Account</span>
          <span v-else>Sign In to Workspace</span>
          <ArrowRight v-if="!authStore.loading" :size="15" />
        </button>
      </form>

      <!-- Security Guarantee Footer -->
      <div class="auth-security-footer">
        <ShieldCheck :size="15" />
        <span>End-to-end tenant isolation · AES-256 token encryption · Zero cloud leakage</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page-container {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f6f8f5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #202a27;
}

.auth-card {
  width: min(100%, 460px);
  background: #ffffff;
  border: 1px solid #e1e7e0;
  border-radius: 12px;
  padding: 36px 32px;
  box-shadow: 0 12px 36px rgba(32, 42, 39, 0.06);
}

.auth-brand-wrap {
  text-align: center;
  margin-bottom: 24px;
}

.auth-brand-wrap .brand-lockup {
  justify-content: center;
  margin-bottom: 8px;
}

.auth-tagline {
  margin: 0;
  font-size: 12px;
  color: #6a776f;
  line-height: 1.5;
}

.demo-auth-banner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f7faf7 0%, #eef5f0 100%);
  border: 1px solid #d4e3d7;
  border-radius: 8px;
  margin-bottom: 20px;
}

.demo-banner-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.demo-spark-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #20352f;
  color: #ffffff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.demo-copy strong {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #20352f;
}

.demo-copy span {
  display: block;
  font-size: 10px;
  color: #55665c;
  line-height: 1.4;
  margin-top: 2px;
}

.demo-sign-in-btn {
  width: 100%;
  height: 36px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e7ebe5;
}

.auth-divider span {
  padding: 0 10px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #8c9990;
}

.auth-mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: #f1f4f0;
  border-radius: 6px;
  margin-bottom: 20px;
}

.auth-tab {
  padding: 8px 12px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: #617066;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.auth-tab-active {
  background: #ffffff;
  color: #202a27;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.auth-error-alert {
  padding: 10px 14px;
  background: #fdf1ef;
  border: 1px solid #f9d4ce;
  border-radius: 6px;
  color: #b73229;
  font-size: 11px;
  margin-bottom: 16px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: #3b4941;
}

.field-label small {
  font-weight: 400;
  color: #859289;
}

.demo-hint-text {
  font-size: 9px;
  color: #7b887f;
}

.demo-hint-text code {
  background: #f0f4ef;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
  color: #20352f;
}

.field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 12px;
  color: #929e95;
  pointer-events: none;
}

.field-input-wrap input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 38px;
  border: 1px solid #d7ded5;
  border-radius: 6px;
  background: #ffffff;
  font-size: 12px;
  color: #202a27;
  outline: none;
  transition: border-color 0.15s;
}

.field-input-wrap input:focus {
  border-color: #20352f;
}

.eye-toggle-btn {
  position: absolute;
  right: 10px;
  border: none;
  background: transparent;
  color: #8f9c93;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 4px;
}

.submit-auth-btn {
  width: 100%;
  height: 42px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-auth-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-security-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  font-size: 9px;
  color: #7f8c83;
  text-align: center;
  line-height: 1.4;
}
</style>
