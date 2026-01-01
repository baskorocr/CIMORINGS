import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/fix.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import permissionDirective from '@/utils/permission-directive'

// Suppress ResizeObserver warnings
const resizeObserverErrorHandler = (e) => {
  if (e && e.message && 
      (e.message === 'ResizeObserver loop completed with undelivered notifications.' || 
       e.message.includes('ResizeObserver'))) {
    e.preventDefault()
    e.stopPropagation()
    return false
  }
}
window.addEventListener('error', resizeObserverErrorHandler)
window.addEventListener('unhandledrejection', resizeObserverErrorHandler)

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.directive('can', permissionDirective)

app.use(store)
app.use(router)
app.use(ElementPlus)

app.mount('#app')