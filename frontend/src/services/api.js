import axios from 'axios'
import router from '@/router'
import store from '@/store'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
})

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor untuk handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired atau invalid
      console.log('Token expired, redirecting to login')
      store.dispatch('logout')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getUsers: (page = 1, limit = 10) => api.get(`/users?page=${page}&limit=${limit}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  assignRole: (userId, roles) => api.post(`/users/${userId}/roles`, { roles }),
  revokeRole: (userId, roles) => api.delete(`/users/${userId}/roles`, { data: { roles } }),
  givePermission: (userId, permissions) => api.post(`/users/${userId}/permissions`, { permissions }),
  revokePermission: (userId, permissions) => api.delete(`/users/${userId}/permissions`, { data: { permissions } })
}

export const roleAPI = {
  getRoles: () => api.get('/roles'),
  createRole: (roleData) => api.post('/roles', roleData),
  updateRole: (id, roleData) => api.put(`/roles/${id}`, roleData),
  deleteRole: (id) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
  createPermission: (permissionData) => api.post('/roles/permissions', permissionData),
  deletePermission: (id) => api.delete(`/roles/permissions/${id}`)
}

export const stationAPI = {
  getStations: () => api.get('/stations'),
  getStation: (id) => api.get(`/stations/${id}`),
  createStation: (data) => api.post('/stations', data),
  getTransactions: (page = 1, limit = 10) => api.get(`/transactions?page=${page}&limit=${limit}`)
}

export const monitoringAPI = {
  getDashboardStats: () => api.get('/dashboard/stats'),
  getActiveTransactions: () => api.get('/transactions/active'),
  getCompletedTransactions: (page = 1, limit = 10) => api.get(`/transactions/completed?page=${page}&limit=${limit}`),
  getTransactionDetail: (id) => api.get(`/transactions/${id}/detail`),
  getStationConnectors: (chargePointId) => api.get(`/stations/${chargePointId}/connectors`),
  getOCPPMessages: (chargePointId, limit = 50) => api.get(`/stations/${chargePointId}/messages?limit=${limit}`),
  getConnectedStations: () => api.get('/connected-stations')
}

export const remoteAPI = {
  startTransaction: (data) => api.post('/remote/start', data),
  stopTransaction: (data) => api.post('/remote/stop', data),
  unlockConnector: (data) => api.post('/remote/unlock', data),
  resetStation: (data) => api.post('/remote/reset', data)
}

export default api