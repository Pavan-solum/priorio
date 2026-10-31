import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import router from './router'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './styles.css'
import App from './App.vue'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'priorioLight',
    themes: {
      priorioLight: {
        dark: false,
        colors: {
          primary: '#df684e',
          secondary: '#52786b',
          surface: '#ffffff',
          background: '#f6f7f4',
          error: '#bd4c49',
        },
      },
    },
  },
})

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')