import { createStore } from 'vuex'
import { authAPI, stationAPI } from '@/services/api'
import { PermissionChecker } from '@/utils/permissions'

export default createStore({
  state: {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    stations: [],
    transactions: [],
    transactionsPagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    users: [],
    usersPagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    loading: false
  },
  
  mutations: {
    SET_USER(state, user) {
      state.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },
    
    SET_TOKEN(state, token) {
      state.token = token
      localStorage.setItem('token', token)
    },
    
    CLEAR_AUTH(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },
    
    SET_STATIONS(state, stations) {
      state.stations = stations
    },
    
    SET_TRANSACTIONS(state, { data, pagination }) {
      state.transactions = data
      state.transactionsPagination = pagination
    },
    
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    
    SET_USERS(state, { data, pagination }) {
      state.users = data
      state.usersPagination = pagination
    }
  },
  
  actions: {
    async login({ commit }, credentials) {
      try {
        commit('SET_LOADING', true)
        const response = await authAPI.login(credentials)
        const { token, user } = response.data
        
        commit('SET_TOKEN', token)
        commit('SET_USER', user)
        
        return { success: true }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.message || 'Login failed' 
        }
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    logout({ commit }) {
      commit('CLEAR_AUTH')
    },

    async fetchUserProfile({ commit }) {
      try {
        // User profile is already stored in token, but we can refresh it if needed
        const token = localStorage.getItem('token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          commit('SET_USER', payload.user)
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    },
    
    async fetchStations({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await stationAPI.getStations()
        commit('SET_STATIONS', response.data)
      } catch (error) {
        console.error('Failed to fetch stations:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchTransactions({ commit }, { page = 1, limit = 10 } = {}) {
      try {
        commit('SET_LOADING', true)
        const response = await stationAPI.getTransactions(page, limit)
        commit('SET_TRANSACTIONS', response.data)
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchUsers({ commit }, { page = 1, limit = 10 } = {}) {
      try {
        commit('SET_LOADING', true)
        const response = await authAPI.getUsers(page, limit)
        commit('SET_USERS', response.data)
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => {
      if (!state.user || !state.user.roles) return false
      return state.user.roles.some(role => 
        (typeof role === 'string' && (role === 'admin' || role === 'super-admin')) ||
        (typeof role === 'object' && (role.name === 'admin' || role.name === 'super-admin'))
      )
    },
    
    permissionChecker: (state) => {
      return state.user ? new PermissionChecker(state.user) : null
    },
    
    can: (state, getters) => (permission) => {
      const checker = getters.permissionChecker
      if (!checker) return false
      
      // Check effective permissions from roles + direct permissions
      const user = state.user
      if (!user) return false
      
      // Use effectivePermissions if available (from login response)
      if (user.effectivePermissions && user.effectivePermissions.includes(permission)) {
        return true
      }
      
      // Fallback to permission checker
      return checker.can(permission)
    },
    
    hasRole: (state, getters) => (role) => {
      const checker = getters.permissionChecker
      return checker ? checker.hasRole(role) : false
    }
  }
})