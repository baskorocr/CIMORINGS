<template>
  <Layout>
    <div class="monitoring">
      <div class="page-header">
        <div class="header-content">
          <h2>Real-time Monitoring</h2>
          <div class="header-actions">
            <el-tag :type="isConnected ? 'success' : 'danger'" size="small">
              {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}
            </el-tag>
            <el-button 
              v-if="!isConnected" 
              type="primary" 
              size="small" 
              @click="reconnectSocket"
              :loading="reconnecting"
            >
              <span class="mobile-hidden">Reconnect</span>
              <span class="mobile-only">Retry</span>
            </el-button>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon active">
            <el-icon><Lightning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ activeTransactions.length }}</div>
            <div class="stat-label">Active Charging</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon stations">
            <el-icon><Position /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ activeStations.length }}</div>
            <div class="stat-label">Active Stations</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon energy">
            <el-icon><Odometer /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ totalEnergy }}</div>
            <div class="stat-label">kWh Total</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon power">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ averagePower }}</div>
            <div class="stat-label">kW Avg Power</div>
          </div>
        </div>
      </div>

      <div class="monitoring-content">
        <el-tabs v-model="activeTab" class="monitoring-tabs">
          <el-tab-pane label="Active Transactions" name="active">
            <div class="transactions-section">
              <!-- Mobile Cards View -->
              <div class="mobile-cards mobile-only">
                <div 
                  v-for="transaction in activeTransactions" 
                  :key="transaction.transaction_id"
                  class="transaction-card"
                >
                  <div class="card-header">
                    <div class="transaction-id">ID: {{ transaction.transaction_id }}</div>
                    <el-tag type="success" size="small">Active</el-tag>
                  </div>
                  <div class="card-content">
                    <div class="info-row">
                      <span class="label">Station:</span>
                      <span class="value">{{ transaction.station_name }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Connector:</span>
                      <span class="value">{{ transaction.connector_id }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Duration:</span>
                      <span class="value">{{ formatDuration(transaction.duration_seconds) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Energy:</span>
                      <span class="value">
                        {{ transaction.energy_consumed > 0 ? transaction.energy_consumed : calculateEnergy(transaction) }} kWh
                      </span>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button size="small" type="primary" @click="viewDetail(transaction)">
                      Detail
                    </el-button>
                    <el-button size="small" type="danger" @click="stopTransaction(transaction)">
                      Stop
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- Desktop Table View -->
              <div class="table-responsive mobile-hidden">
                <el-table :data="activeTransactions" style="width: 100%">
                  <el-table-column prop="transaction_id" label="Transaction ID" width="120" />
                  <el-table-column prop="station_name" label="Station" />
                  <el-table-column prop="connector_id" label="Connector" width="100" />
                  <el-table-column prop="id_tag" label="ID Tag" />
                  <el-table-column label="Duration" width="120">
                    <template #default="scope">
                      {{ formatDuration(scope.row.duration_seconds) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="Energy" width="120">
                    <template #default="scope">
                      <span v-if="scope.row.energy_consumed > 0">
                        {{ scope.row.energy_consumed }} kWh
                      </span>
                      <span v-else>
                        {{ calculateEnergy(scope.row) }} kWh
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Power" width="120">
                    <template #default="scope">
                      <span v-if="scope.row.max_power > 0">
                        {{ scope.row.max_power }} kW
                      </span>
                      <span v-else-if="meterData[scope.row.transaction_id]">
                        {{ meterData[scope.row.transaction_id].power }} kW
                      </span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Battery" width="120">
                    <template #default="scope">
                      <span v-if="meterData[scope.row.transaction_id]?.soc">
                        {{ meterData[scope.row.transaction_id].soc }}%
                      </span>
                      <span v-else-if="scope.row.soc">
                        {{ scope.row.soc }}%
                      </span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Actions" width="200">
                    <template #default="scope">
                      <div class="remote-actions">
                        <el-button 
                          size="small" 
                          type="primary"
                          @click="viewDetail(scope.row)"
                        >
                          Detail
                        </el-button>
                        <el-button 
                          size="small" 
                          type="danger"
                          @click="stopTransaction(scope.row)"
                        >
                          Stop
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="Transaction History" name="history">
            <div class="transactions-section">
              <!-- Mobile Cards View -->
              <div class="mobile-cards mobile-only">
                <div 
                  v-for="transaction in completedTransactions" 
                  :key="transaction.transaction_id"
                  class="transaction-card"
                >
                  <div class="card-header">
                    <div class="transaction-id">ID: {{ transaction.transaction_id }}</div>
                    <el-tag type="info" size="small">Completed</el-tag>
                  </div>
                  <div class="card-content">
                    <div class="info-row">
                      <span class="label">Station:</span>
                      <span class="value">{{ transaction.station_name }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Started:</span>
                      <span class="value">{{ formatDateTime(transaction.start_timestamp) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Duration:</span>
                      <span class="value">{{ formatDuration(transaction.duration_seconds) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Energy:</span>
                      <span class="value">{{ transaction.energy_consumed || 0 }} kWh</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Desktop Table View -->
              <div class="table-responsive mobile-hidden">
                <el-table :data="completedTransactions" style="width: 100%">
                  <el-table-column prop="transaction_id" label="Transaction ID" width="120" />
                  <el-table-column prop="station_name" label="Station" />
                  <el-table-column prop="connector_id" label="Connector" width="100" />
                  <el-table-column prop="id_tag" label="ID Tag" />
                  <el-table-column prop="start_timestamp" label="Started" width="150">
                    <template #default="scope">
                      {{ formatDateTime(scope.row.start_timestamp) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="stop_timestamp" label="Stopped" width="150">
                    <template #default="scope">
                      {{ formatDateTime(scope.row.stop_timestamp) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="Duration" width="120">
                    <template #default="scope">
                      {{ formatDuration(scope.row.duration_seconds) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="Energy" width="120">
                    <template #default="scope">
                      {{ scope.row.energy_consumed || 0 }} kWh
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Transaction Detail Dialog -->
      <el-dialog
        v-model="showDetailDialog"
        title="Transaction Details"
        width="600px"
      >
        <div v-if="selectedTransaction" class="transaction-details">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Transaction ID">
              {{ selectedTransaction.transaction_id }}
            </el-descriptions-item>
            <el-descriptions-item label="Station">
              {{ selectedTransaction.station_name }}
            </el-descriptions-item>
            <el-descriptions-item label="Connector">
              {{ selectedTransaction.connector_id }}
            </el-descriptions-item>
            <el-descriptions-item label="ID Tag">
              {{ selectedTransaction.id_tag }}
            </el-descriptions-item>
            <el-descriptions-item label="Status">
              <el-tag :type="selectedTransaction.status === 'active' ? 'success' : 'info'">
                {{ selectedTransaction.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Start Time">
              {{ formatDateTime(selectedTransaction.start_timestamp) }}
            </el-descriptions-item>
            <el-descriptions-item label="Duration">
              {{ formatDuration(selectedTransaction.duration_seconds) }}
            </el-descriptions-item>
            <el-descriptions-item label="Energy">
              {{ selectedTransaction.energy_consumed || calculateEnergy(selectedTransaction) }} kWh
            </el-descriptions-item>
          </el-descriptions>

          <!-- Real-time Meter Data -->
          <div v-if="meterData[selectedTransaction.transaction_id]" class="meter-display">
            <h4>Real-time Meter Data</h4>
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="meter-item">
                  <div class="meter-value">
                    {{ meterData[selectedTransaction.transaction_id].energy }} kWh
                  </div>
                  <div class="meter-label">Energy</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="meter-item">
                  <div class="meter-value">
                    {{ meterData[selectedTransaction.transaction_id].power }} kW
                  </div>
                  <div class="meter-label">Power</div>
                </div>
              </el-col>
              <el-col :span="8" v-if="meterData[selectedTransaction.transaction_id].soc">
                <div class="meter-item battery-meter">
                  <div class="meter-value">
                    {{ meterData[selectedTransaction.transaction_id].soc }}%
                  </div>
                  <div class="meter-label">Battery SoC</div>
                  <div class="battery-bar">
                    <div 
                      class="battery-fill" 
                      :style="{ width: meterData[selectedTransaction.transaction_id].soc + '%' }"
                    ></div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-dialog>
    </div>
  </Layout>
</template>


<script>
import Layout from '@/components/Layout.vue'
import { monitoringAPI, remoteAPI } from '@/services/api'
import socketService from '@/services/socket'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'Monitoring',
  components: {
    Layout
  },

  data() {
    return {
      isConnected: false,
      reconnecting: false,
      activeTab: 'active',
      activeTransactions: [],
      completedTransactions: [],
      historyPage: 1,
      historyLimit: 10,
      historyTotal: 0,
      meterData: {},
      showDetailDialog: false,
      selectedTransaction: null,
      refreshInterval: null
    }
  },

  computed: {
    totalEnergy() {
      if (!this.activeTransactions || this.activeTransactions.length === 0) {
        return '0.00'
      }
      return this.activeTransactions.reduce((sum, t) => {
        return sum + parseFloat(this.calculateEnergy(t))
      }, 0).toFixed(2)
    },
    
    activeStations() {
      const stationIds = new Set(this.activeTransactions.map(t => t.charge_point_id))
      return Array.from(stationIds)
    },
    
    averagePower() {
      if (!this.activeTransactions || this.activeTransactions.length === 0) {
        return '0.00'
      }
      const totalPower = this.activeTransactions.reduce((sum, t) => {
        const power = this.meterData[t.transaction_id]?.power || 0
        return sum + parseFloat(power)
      }, 0)
      return (totalPower / this.activeTransactions.length).toFixed(2)
    }
  },

  async mounted() {
    console.log('Monitoring component mounted');
    await this.loadData();
    await this.loadCompletedTransactions();
    this.setupRealtime();
    this.startAutoRefresh();
  },

  async activated() {
    // Called when component is activated (keep-alive)
    console.log('Monitoring component activated');
    if (!socketService.isConnected()) {
      console.log('Socket not connected, attempting reconnection...');
      socketService.forceReconnect();
      this.setupRealtime();
    } else {
      this.isConnected = true;
      console.log('Socket already connected');
    }
    await this.loadData();
  },

  beforeUnmount() {
    this.cleanup()
  },

  methods: {
    async loadData() {
      try {
        console.log('Loading monitoring data...')
        // Only load active transactions, no need for all connected stations
        const transactions = await monitoringAPI.getActiveTransactions()
        
        console.log('Active transactions:', transactions.data)
        
        this.activeTransactions = transactions.data
        // Remove connectedStations as we focus only on active charging
      } catch (error) {
        console.error('Failed to load data:', error)
        ElMessage.error('Failed to load monitoring data')
      }
    },

    setupRealtime() {
      console.log('Setting up real-time connection...')
      
      // Check if already connected
      if (socketService.isConnected()) {
        this.isConnected = true
        console.log('✅ Socket already connected')
      } else {
        socketService.connect()
      }
      
      socketService.on('connect', () => {
        console.log('✅ Socket connected')
        this.isConnected = true
      })

      socketService.on('disconnect', () => {
        console.log('❌ Socket disconnected')
        this.isConnected = false
      })

      socketService.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        this.isConnected = false
      })

      socketService.on('transaction_started', (data) => {
        console.log('Transaction started:', data)
        ElMessage.success(`Transaction ${data.transactionId} started`)
        this.loadData()
      })

      socketService.on('transaction_stopped', (data) => {
        console.log('Transaction stopped:', data)
        ElMessage.info(`Transaction ${data.transactionId} stopped`)
        this.loadData()
      })

      socketService.on('meter_values', (data) => {
        console.log('Meter values received:', data)
        this.meterData[data.transactionId] = {
          energy: data.energy,
          power: data.power,
          soc: data.soc,
          voltage: data.meterValue?.[0]?.sampledValue?.find(v => v.measurand === 'Voltage')?.value,
          current: data.meterValue?.[0]?.sampledValue?.find(v => v.measurand === 'Current.Import')?.value,
          timestamp: data.timestamp
        }
      })

      socketService.on('station_connected', (data) => {
        console.log('Station connected:', data)
        ElMessage.success(`Station ${data.chargePointId} connected`)
        this.loadData()
      })

      socketService.on('station_disconnected', (data) => {
        console.log('Station disconnected:', data)
        ElMessage.warning(`Station ${data.chargePointId} disconnected`)
        this.loadData()
      })
    },

    async reconnectSocket() {
      this.reconnecting = true
      try {
        console.log('Manual reconnection triggered')
        socketService.forceReconnect()
        this.setupRealtime()
        ElMessage.success('Reconnection successful')
      } catch (error) {
        console.error('Reconnection failed:', error)
        ElMessage.error('Reconnection failed')
      } finally {
        this.reconnecting = false
      }
    },

    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this.loadData()
      }, 30000) // Refresh every 30 seconds
    },

    cleanup() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
        this.refreshInterval = null
      }
      // Only remove listeners for this component
      // Keep socket connection alive for other components
      console.log('Cleaning up Monitoring component listeners')
      socketService.removeAllListeners()
    },

    formatDuration(seconds) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${hours}h ${minutes}m ${secs}s`
    },

    async loadCompletedTransactions() {
      try {
        const response = await monitoringAPI.getCompletedTransactions(this.historyPage, this.historyLimit)
        this.completedTransactions = response.data.data
        this.historyTotal = response.data.pagination.total
      } catch (error) {
        console.error('Failed to load completed transactions:', error)
      }
    },

    formatDateTime(dateString) {
      return new Date(dateString).toLocaleString()
    },

    calculateEnergy(transaction) {
      const meterCurrent = this.meterData[transaction.transaction_id]?.energy || transaction.meter_start
      return ((meterCurrent - transaction.meter_start) / 1000).toFixed(2)
    },

    viewDetail(transaction) {
      this.selectedTransaction = transaction
      this.showDetailDialog = true
    },

    async stopTransaction(transaction) {
      try {
        await ElMessageBox.confirm(
          `Stop transaction ${transaction.transaction_id}?`,
          'Confirm',
          {
            confirmButtonText: 'Stop',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        )

        console.log('Stopping transaction:', {
          chargePointId: transaction.charge_point_id,
          transactionId: transaction.transaction_id
        })

        const response = await remoteAPI.stopTransaction({
          chargePointId: transaction.charge_point_id,
          transactionId: transaction.transaction_id
        })

        console.log('Stop response:', response.data)
        ElMessage.success('Stop command sent successfully')
        
        // Refresh data after 2 seconds
        setTimeout(() => {
          this.loadData()
        }, 2000)
        
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Stop transaction error:', error)
          ElMessage.error(error.response?.data?.message || 'Failed to stop transaction')
        }
      }
    }
  }
}
</script>

<style scoped>
.monitoring {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header Section */
.page-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-content h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-icon.active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.stat-icon.stations {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
}

.stat-icon.energy {
  background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
}

.stat-icon.power {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 14px;
  color: #718096;
}

/* Monitoring Content */
.monitoring-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.monitoring-tabs {
  padding: 0;
}

.monitoring-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #f8fafc;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.monitoring-tabs :deep(.el-tabs__content) {
  padding: 24px;
}

/* Transactions Section */
.transactions-section {
  min-height: 400px;
}

/* Mobile Cards */
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transaction-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.transaction-card:hover {
  border-color: #cbd5e0;
  background: #f1f5f9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.transaction-id {
  font-weight: 600;
  color: #4a5568;
  font-size: 14px;
}

.card-content {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.info-row .label {
  font-size: 13px;
  color: #718096;
  font-weight: 500;
}

.info-row .value {
  font-size: 13px;
  color: #2d3748;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Table Responsive */
.table-responsive {
  overflow-x: auto;
}

.remote-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Detail Dialog */
.meter-display {
  margin-top: 15px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
}

.meter-item {
  text-align: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
}

.meter-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.meter-label {
  margin-top: 5px;
  color: #666;
  font-size: 12px;
}

.battery-meter {
  position: relative;
}

.battery-bar {
  width: 100%;
  height: 8px;
  background: #e4e7ed;
  border-radius: 4px;
  margin-top: 8px;
  overflow: hidden;
}

.battery-fill {
  height: 100%;
  background: linear-gradient(90deg, #67c23a 0%, #409eff 50%, #e6a23c 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .monitoring {
    padding: 0;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 20px 15px;
  }

  .header-content h2 {
    font-size: 20px;
  }

  .header-actions {
    gap: 8px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    margin-bottom: 20px;
  }

  .stat-card {
    padding: 16px;
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .stat-number {
    font-size: 20px;
  }

  .stat-label {
    font-size: 13px;
  }

  .monitoring-tabs :deep(.el-tabs__header) {
    padding: 0 16px;
  }

  .monitoring-tabs :deep(.el-tabs__content) {
    padding: 16px;
  }

  .monitoring-tabs :deep(.el-tabs__item) {
    padding: 0 12px;
    font-size: 14px;
  }

  .transaction-card {
    padding: 12px;
  }

  .card-actions {
    justify-content: center;
  }

  .card-actions .el-button {
    flex: 1;
  }

  .el-table {
    font-size: 14px;
  }

  .el-table :deep(.el-table__cell) {
    padding: 8px 5px;
  }

  .remote-actions {
    flex-direction: column;
    gap: 6px;
  }

  .remote-actions .el-button {
    width: 100%;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 15px 10px;
  }

  .header-content h2 {
    font-size: 18px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .stat-number {
    font-size: 18px;
  }

  .stat-label {
    font-size: 12px;
  }

  .monitoring-tabs :deep(.el-tabs__content) {
    padding: 12px;
  }

  .transaction-card {
    padding: 10px;
  }

  .info-row .label,
  .info-row .value {
    font-size: 12px;
  }

  .transaction-id {
    font-size: 13px;
  }

  .card-actions .el-button {
    font-size: 11px;
    padding: 6px 12px;
  }

  .el-table {
    font-size: 12px;
  }

  .el-table :deep(.el-table__cell) {
    padding: 6px 3px;
  }

  .el-table :deep(.cell) {
    word-break: break-all;
  }

  .meter-display {
    padding: 15px;
  }

  .meter-item {
    padding: 12px;
  }

  .meter-value {
    font-size: 20px;
  }
}

@media (max-width: 360px) {
  .header-content {
    padding: 12px 8px;
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-card {
    padding: 10px;
  }

  .monitoring-tabs :deep(.el-tabs__content) {
    padding: 10px;
  }

  .transaction-card {
    padding: 8px;
  }
}
</style>