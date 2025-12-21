<template>
  <Layout>
    <div class="dashboard">
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon available">
                <el-icon><Position /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ availableStations }}</h3>
                <p>Available Stations</p>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon occupied">
                <el-icon><Position /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ occupiedStations }}</h3>
                <p>Occupied Stations</p>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><List /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ totalTransactions }}</h3>
                <p>Total Transactions</p>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon active">
                <el-icon><List /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ activeTransactions }}</h3>
                <p>Active Transactions</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" class="content-row">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>Recent Transactions</span>
            </template>
            <el-table :data="recentTransactions" style="width: 100%">
              <el-table-column prop="station_name" label="Station" />
              <el-table-column prop="id_tag" label="ID Tag" />
              <el-table-column prop="status" label="Status">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="start_timestamp" label="Started" />
            </el-table>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>Station Status</span>
            </template>
            <el-table :data="stations" style="width: 100%">
              <el-table-column prop="name" label="Station" />
              <el-table-column prop="status" label="Status">
                <template #default="scope">
                  <el-tag :type="getStationStatusType(scope.row.status)">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="connector_count" label="Connectors" />
              <el-table-column prop="last_heartbeat" label="Last Heartbeat" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
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
  
  computed: {
    ...mapState(['stations', 'transactions']),
    
    availableStations() {
      return this.stations.filter(s => s.status === 'Available').length
    },
    
    occupiedStations() {
      return this.stations.filter(s => s.status === 'Occupied').length
    },
    
    totalTransactions() {
      return this.transactions.length
    },
    
    activeTransactions() {
      return this.transactions.filter(t => t.status === 'active').length
    },
    
    recentTransactions() {
      return this.transactions.slice(0, 5)
    }
  },
  
  async created() {
    await this.fetchStations()
    await this.fetchTransactions()
  },
  
  methods: {
    ...mapActions(['fetchStations', 'fetchTransactions']),
    
    getStatusType(status) {
      const types = {
        'active': 'success',
        'completed': 'info',
        'stopped': 'warning'
      }
      return types[status] || 'info'
    },
    
    getStationStatusType(status) {
      const types = {
        'Available': 'success',
        'Occupied': 'warning',
        'Faulted': 'danger',
        'Unavailable': 'info'
      }
      return types[status] || 'info'
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stat-icon.available {
  background-color: #67c23a;
}

.stat-icon.occupied {
  background-color: #e6a23c;
}

.stat-icon.total {
  background-color: #409eff;
}

.stat-icon.active {
  background-color: #f56c6c;
}

.stat-info h3 {
  margin: 0 0 5px 0;
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.content-row {
  margin-top: 20px;
}
</style>