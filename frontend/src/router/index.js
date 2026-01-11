import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/stations',
    name: 'Stations',
    component: () => import('@/views/Stations.vue'),
    meta: { requiresAuth: true, permission: 'stations.view' }
  },
  {
    path: '/monitoring',
    name: 'Monitoring',
    component: () => import('@/views/Monitoring.vue'),
    meta: { requiresAuth: true, permission: 'monitoring.view' }
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/views/Transactions.vue'),
    meta: { requiresAuth: true, permission: 'transactions.view' }
  },
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('@/views/Reservations.vue'),
    meta: { requiresAuth: true, permission: 'view_reservations' }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/Users.vue'),
    meta: { requiresAuth: true, permission: 'users.view' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/docs',
    name: 'ApiDocs',
    component: () => import('@/views/ApiDocs.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = store.getters.isAuthenticated
  const token = localStorage.getItem('token')
  
  // Check if token exists and is valid
  if (token && isAuthenticated) {
    try {
      // Decode JWT to check expiry
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      
      if (payload.exp < currentTime) {
        // Token expired
        console.log('Token expired in router guard')
        store.dispatch('logout')
        if (to.path !== '/login') {
          return next('/login')
        }
      }
    } catch (error) {
      // Invalid token format
      console.log('Invalid token format')
      store.dispatch('logout')
      if (to.path !== '/login') {
        return next('/login')
      }
    }
  }
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/')
  } else if (to.meta.permission && isAuthenticated && !store.getters.can(to.meta.permission)) {
    console.log('Permission denied for:', to.meta.permission)
    next('/')
  } else {
    next()
  }
})

export default router