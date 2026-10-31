import { defineStore } from 'pinia';
import { ref } from 'vue';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const token = ref<string | null>(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  function setUser(newUser: AuthUser | null) {
    user.value = newUser;
  }

  function setToken(newToken: string | null) {
    token.value = newToken;
    isAuthenticated.value = !!newToken;
  }

  function setLoading(isLoading: boolean) {
    loading.value = isLoading;
  }

  function setError(errorMsg: string | null) {
    error.value = errorMsg;
  }

  function logout() {
    user.value = null;
    token.value = null;
    isAuthenticated.value = false;
    error.value = null;
  }

  function updateUser(updates: Partial<AuthUser>) {
    if (user.value) {
      user.value = { ...user.value, ...updates };
    }
  }

  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,
    error,

    // Actions
    setUser,
    setToken,
    setLoading,
    setError,
    logout,
    updateUser,
  };
});
