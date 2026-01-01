<template>
  <Layout>
    <div class="monitoring">
      <div class="page-header">
        <h2>Real-time Monitoring</h2>
        <el-tag :type="isConnected ? 'success' : 'danger'">
          {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}
        </el-tag>
      </div>

      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <h3>{{ activeTransactions.length }}</h3>
              <p>Active Charging</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <h3>{{ activeStations.length }}</h3>
              <p>Active Stations</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <h3>{{ totalEnergy }} kWh</h3>
              <p>Total Energy</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <h3>{{ averagePower }} kW</h3>
              <p>Avg Power</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-tabs v-model="activeTab" class="monitoring-tabs">
        <el-tab-pane label="Active Transactions" name="active">
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
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="Transaction History" name="history">
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
                {{ ((scope.row.meter_stop - scope.row.meter_start) / 1000).toFixed(2) }} kWh
              </template>
            </el-table-column>
            <el-table-column prop="status" label="Status" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'completed' ? 'success' : 'info'">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          
          <el-pagination
            v-model:current-page="historyPage"
            :page-size="historyLimit"
            :total="historyTotal"
            @current-change="loadCompletedTransactions"
            layout="prev, pager, next, total"
            class="mt-4"
          />
        </el-tab-pane>
      </el-tabs>

      <!-- Transaction Detail Dialog -->
      <el-dialog
        v-model="showDetailDialog"
        title="Transaction Detail"
        width="800px"
      >
        <div v-if="selectedTransaction">
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
            <el-descriptions-item label="Start Time">
              {{ selectedTransaction.start_timestamp }}
            </el-descriptions-item>
            <el-descriptions-item label="Duration">
              {{ formatDuration(selectedTransaction.duration_seconds) }}
            </el-descriptions-item>
          </el-descriptions>

          <h3 style="margin-top: 20px;">Real-time Meter Values</h3>
          <div v-if="meterData[selectedTransaction.transaction_id]" class="meter-display">
            <el-row :gutter="20">
              <el-col :span="5">
                <div class="meter-item">
                  <div class="meter-value">{{ meterData[selectedTransaction.transaction_id].energy }}</div>
                  <div class="meter-label">Energy (Wh)</div>
                </div>
              </el-col>
              <el-col :span="5">
                <div class="meter-item">
                  <div class="meter-value">{{ meterData[selectedTransaction.transaction_id].power }}</div>
                  <div class="meter-label">Power (kW)</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="meter-item">
                  <div class="meter-value">{{ meterData[selectedTransaction.transaction_id].voltage || '-' }}</div>
                  <div class="meter-label">Voltage (V)</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="meter-item">
                  <div class="meter-value">{{ meterData[selectedTransaction.transaction_id].current || '-' }}</div>
                  <div class="meter-label">Current (A)</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="meter-item battery-meter">
                  <div class="meter-value">{{ meterData[selectedTransaction.transaction_id].soc || '-' }}%</div>
                  <div class="meter-label">Battery Level</div>
                  <div v-if="meterData[selectedTransaction.transaction_id].soc" class="battery-bar">
                    <div class="battery-fill" :style="{ width: meterData[selectedTransaction.transaction_id].soc + '%' }"></div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
          <div v-else class="no-data">
            <p>Waiting for meter values...</p>
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
      socketService.connect()
      
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

    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this.loadData()
      }, 30000) // Refresh every 30 seconds
    },

    cleanup() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
      }
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
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
}

.stat-item h3 {
  margin: 0;
  font-size: 32px;
  color: #409eff;
}

.stat-item p {
  margin: 10px 0 0 0;
  color: #666;
}

.transactions-card {
  margin-top: 20px;
}

.meter-display {
  margin-top: 15px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.meter-item {
  text-align: center;
  padding: 15px;
  background: white;
  border-radius: 4px;
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
</style>