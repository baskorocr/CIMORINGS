<template>
  <Layout>
    <div class="dashboard">
      <!-- Welcome Section -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1>Welcome back, {{ user?.username }}!</h1>
          <p class="mobile-hidden">Here's what's happening with your charging network today.</p>
        </div>
        <div class="welcome-actions">
          <el-button type="primary" :icon="Plus" @click="$router.push('/stations')" size="small">
            <span class="mobile-hidden">Add Station</span>
            <span class="mobile-only">Add</span>
          </el-button>
          <el-button :icon="Refresh" @click="refreshData" :loading="loading" size="small">
            <span class="mobile-hidden">Refresh</span>
          </el-button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card available" @click="$router.push('/stations')">
          <div class="stat-icon">
            <el-icon><Position /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ availableStations }}</div>
            <div class="stat-label">Available Stations</div>
            <div class="stat-change positive">
              <el-icon><ArrowUp /></el-icon>
              +2 from yesterday
            </div>
          </div>
          <div class="stat-chart">
            <div class="mini-chart available-chart"></div>
          </div>
        </div>

        <div class="stat-card occupied" @click="$router.push('/monitoring')">
          <div class="stat-icon">
            <el-icon><Lightning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ occupiedStations }}</div>
            <div class="stat-label">Charging Now</div>
            <div class="stat-change neutral">
              <el-icon><Minus /></el-icon>
              No change
            </div>
          </div>
          <div class="stat-chart">
            <div class="mini-chart occupied-chart"></div>
          </div>
        </div>

        <div class="stat-card transactions" @click="$router.push('/transactions')">
          <div class="stat-icon">
            <el-icon><List /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ totalTransactions }}</div>
            <div class="stat-label">Total Transactions</div>
            <div class="stat-change positive">
              <el-icon><ArrowUp /></el-icon>
              +15 today
            </div>
          </div>
          <div class="stat-chart">
            <div class="mini-chart transactions-chart"></div>
          </div>
        </div>

        <div class="stat-card energy">
          <div class="stat-icon">
            <el-icon><Odometer /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ totalEnergy }}</div>
            <div class="stat-label">kWh Delivered</div>
            <div class="stat-change positive">
              <el-icon><ArrowUp /></el-icon>
              +12% this week
            </div>
          </div>
          <div class="stat-chart">
            <div class="mini-chart energy-chart"></div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid">
        <!-- Recent Activity -->
        <div class="content-card recent-activity">
          <div class="card-header">
            <h3>Recent Activity</h3>
            <el-button text @click="$router.push('/transactions')">View All</el-button>
          </div>
          <div class="activity-list">
            <div 
              v-for="transaction in recentTransactions" 
              :key="transaction.id"
              class="activity-item"
            >
              <div class="activity-icon" :class="getActivityIconClass(transaction.status)">
                <el-icon><Lightning /></el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  {{ transaction.station_name }} - {{ transaction.id_tag }}
                </div>
                <div class="activity-subtitle">
                  {{ formatActivityTime(transaction.start_timestamp) }}
                </div>
              </div>
              <div class="activity-status">
                <el-tag 
                  :type="getStatusType(transaction.status)" 
                  size="small"
                  effect="light"
                >
                  {{ transaction.status }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- Station Status -->
        <div class="content-card station-status">
          <div class="card-header">
            <h3>Station Overview</h3>
            <el-button text @click="$router.push('/stations')">Manage</el-button>
          </div>
          <div class="station-grid">
            <div 
              v-for="station in topStations" 
              :key="station.id"
              class="station-item"
              :class="getStationClass(station.status)"
            >
              <div class="station-info">
                <div class="station-name">{{ station.name }}</div>
                <div class="station-location">{{ station.location || 'Location not set' }}</div>
              </div>
              <div class="station-status-indicator">
                <div class="status-dot" :class="station.status.toLowerCase()"></div>
                <span class="status-text">{{ station.status }}</span>
              </div>
              <div class="station-connectors">
                {{ station.connector_count }} connectors
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="content-card quick-actions">
          <div class="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div class="actions-grid">
            <div class="action-item" @click="$router.push('/stations')">
              <div class="action-icon">
                <el-icon><Plus /></el-icon>
              </div>
              <div class="action-text">Add Station</div>
            </div>
            <div class="action-item" @click="$router.push('/monitoring')">
              <div class="action-icon">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="action-text">Monitor</div>
            </div>
            <div class="action-item" @click="$router.push('/users')">
              <div class="action-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="action-text">Manage Users</div>
            </div>
            <div class="action-item" @click="exportData">
              <div class="action-icon">
                <el-icon><Download /></el-icon>
              </div>
              <div class="action-text">Export Data</div>
            </div>
          </div>
        </div>

        <!-- System Health -->
        <div class="content-card system-health">
          <div class="card-header">
            <h3>System Health</h3>
          </div>
          <div class="health-metrics">
            <div class="health-item">
              <div class="health-label">Server Status</div>
              <div class="health-value good">
                <div class="health-dot"></div>
                Online
              </div>
            </div>
            <div class="health-item">
              <div class="health-label">Database</div>
              <div class="health-value good">
                <div class="health-dot"></div>
                Connected
              </div>
            </div>
            <div class="health-item">
              <div class="health-label">WebSocket</div>
              <div class="health-value good">
                <div class="health-dot"></div>
                Active
              </div>
            </div>
            <div class="health-item">
              <div class="health-label">Last Backup</div>
              <div class="health-value">2 hours ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import Layout from '@/components/Layout.vue'

export default {
  name: 'Dashboard',
  components: {
    Layout
  },
  
  data() {
    return {
      loading: false
    }
  },

  computed: {
    ...mapState(['stations', 'transactions', 'user']),
    
    availableStations() {
      if (!this.stations || !Array.isArray(this.stations)) return 0
      return this.stations.filter(s => s.status === 'Available').length
    },
    
    occupiedStations() {
      if (!this.stations || !Array.isArray(this.stations)) return 0
      return this.stations.filter(s => s.status === 'Occupied').length
    },
    
    totalTransactions() {
      if (!this.transactions || !Array.isArray(this.transactions)) return 0
      return this.transactions.length
    },

    totalEnergy() {
      if (!this.transactions || !Array.isArray(this.transactions) || this.transactions.length === 0) {
        return '0.00'
      }
      const total = this.transactions.reduce((sum, t) => {
        const energy = parseFloat(t.energy_consumed) || 0
        return sum + energy
      }, 0)
      return (Math.round(total * 100) / 100).toFixed(2)
    },
    
    recentTransactions() {
      if (!this.transactions || !Array.isArray(this.transactions)) return []
      return this.transactions
        .sort((a, b) => new Date(b.start_timestamp) - new Date(a.start_timestamp))
        .slice(0, 6)
    },

    topStations() {
      if (!this.stations || !Array.isArray(this.stations)) return []
      return this.stations.slice(0, 4)
    }
  },
  
  async created() {
    await this.refreshData()
  },
  
  methods: {
    ...mapActions(['fetchStations', 'fetchTransactions']),
    
    async refreshData() {
      this.loading = true
      try {
        await Promise.all([
          this.fetchStations(),
          this.fetchTransactions()
        ])
        this.$message.success('Data refreshed successfully')
      } catch (error) {
        this.$message.error('Failed to refresh data')
      } finally {
        this.loading = false
      }
    },

    getStatusType(status) {
      const types = {
        'active': 'success',
        'completed': 'info',
        'stopped': 'warning'
      }
      return types[status] || 'info'
    },

    getActivityIconClass(status) {
      return {
        'activity-active': status === 'active',
        'activity-completed': status === 'completed',
        'activity-stopped': status === 'stopped'
      }
    },

    getStationClass(status) {
      return {
        'station-available': status === 'Available',
        'station-occupied': status === 'Occupied',
        'station-faulted': status === 'Faulted'
      }
    },

    formatActivityTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      
      if (minutes < 1) return 'Just now'
      if (minutes < 60) return `${minutes}m ago`
      if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
      return date.toLocaleDateString()
    },

    exportData() {
      this.$message.info('Export feature coming soon')
    }
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* Welcome Section */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 25px;
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.2);
}

.welcome-content h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.welcome-content p {
  margin: 0;
  color: #718096;
  font-size: 16px;
}

.welcome-actions {
  display: flex;
  gap: 12px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.stat-card.available::before {
  background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
}

.stat-card.occupied::before {
  background: linear-gradient(90deg, #ed8936 0%, #dd6b20 100%);
}

.stat-card.transactions::before {
  background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
}

.stat-card.energy::before {
  background: linear-gradient(90deg, #9f7aea 0%, #805ad5 100%);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.available .stat-icon {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.occupied .stat-icon {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.transactions .stat-icon {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
}

.energy .stat-icon {
  background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #718096;
  margin-bottom: 8px;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.stat-change.positive {
  color: #38a169;
}

.stat-change.neutral {
  color: #718096;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  grid-template-areas: 
    "activity status"
    "actions health";
}

.content-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.recent-activity {
  grid-area: activity;
}

.station-status {
  grid-area: status;
}

.quick-actions {
  grid-area: actions;
}

.system-health {
  grid-area: health;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.activity-item:hover {
  background-color: #f7fafc;
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
}

.activity-icon.activity-active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.activity-icon.activity-completed {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
}

.activity-icon.activity-stopped {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 2px;
}

.activity-subtitle {
  font-size: 12px;
  color: #718096;
}

/* Station Grid */
.station-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.station-item {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.station-item:hover {
  border-color: #cbd5e0;
  background-color: #f7fafc;
}

.station-info {
  margin-bottom: 8px;
}

.station-name {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 2px;
}

.station-location {
  font-size: 12px;
  color: #718096;
}

.station-status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.available {
  background-color: #38a169;
}

.status-dot.occupied {
  background-color: #ed8936;
}

.status-dot.faulted {
  background-color: #e53e3e;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #4a5568;
}

.station-connectors {
  font-size: 12px;
  color: #718096;
}

/* Quick Actions */
.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-item:hover {
  border-color: #667eea;
  background-color: #f7fafc;
  transform: translateY(-2px);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  margin-bottom: 8px;
}

.action-text {
  font-size: 12px;
  font-weight: 500;
  color: #4a5568;
  text-align: center;
}

/* System Health */
.health-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-label {
  font-size: 14px;
  color: #4a5568;
}

.health-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #2d3748;
}

.health-value.good {
  color: #38a169;
}

.health-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #38a169;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "activity"
      "status"
      "actions"
      "health";
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 0;
  }

  .welcome-section {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 20px 15px;
    margin-bottom: 20px;
  }

  .welcome-actions {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    margin-bottom: 20px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-number {
    font-size: 24px;
  }

  .content-grid {
    gap: 15px;
  }

  .content-card {
    padding: 16px;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .action-item {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .welcome-section {
    padding: 15px 10px;
  }

  .welcome-content h1 {
    font-size: 20px;
  }

  .welcome-content p {
    font-size: 14px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-number {
    font-size: 20px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .content-card {
    padding: 12px;
  }

  .card-header h3 {
    font-size: 16px;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .action-item {
    padding: 12px;
  }

  .action-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .activity-item {
    padding: 8px;
  }

  .station-item {
    padding: 12px;
  }
}
</style>