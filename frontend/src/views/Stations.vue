<template>
  <Layout>
    <div class="stations-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-info">
            <h2>Charging Stations</h2>
            <p class="mobile-hidden">Manage and monitor your charging station network</p>
          </div>
          <div class="header-actions">
            <el-button @click="refreshStations" :loading="loading" circle size="small">
              <el-icon><Refresh /></el-icon>
            </el-button>
            <el-button type="primary" @click="showAddDialog = true" class="add-button" size="small">
              <el-icon><Plus /></el-icon>
              <span class="button-text mobile-hidden">Add Station</span>
              <span class="button-text mobile-only">Add</span>
            </el-button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid grid grid-1 grid-sm-2 grid-md-4">
        <div class="stat-card card">
          <div class="stat-icon available">
            <el-icon><Position /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ availableStations }}</div>
            <div class="stat-label">Available</div>
          </div>
        </div>
        
        <div class="stat-card card">
          <div class="stat-icon occupied">
            <el-icon><Lightning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ occupiedStations }}</div>
            <div class="stat-label">Charging</div>
          </div>
        </div>
        
        <div class="stat-card card">
          <div class="stat-icon total">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ totalStations }}</div>
            <div class="stat-label">Total Stations</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon faulted">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ faultedStations }}</div>
            <div class="stat-label">Faulted</div>
          </div>
        </div>
      </div>

      <!-- Stations Grid/Table -->
      <div class="stations-content">
        <div class="content-header">
          <div class="view-controls">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="grid">
                <el-icon><Grid /></el-icon>
              </el-radio-button>
              <el-radio-button label="table">
                <el-icon><List /></el-icon>
              </el-radio-button>
            </el-radio-group>
          </div>
          
          <div class="search-filter">
            <el-input
              v-model="searchQuery"
              placeholder="Search stations..."
              :prefix-icon="Search"
              clearable
              class="search-input"
            />
            <el-select v-model="statusFilter" placeholder="Filter by status" clearable>
              <el-option label="All" value="" />
              <el-option label="Available" value="Available" />
              <el-option label="Occupied" value="Occupied" />
              <el-option label="Faulted" value="Faulted" />
              <el-option label="Unavailable" value="Unavailable" />
            </el-select>
          </div>
        </div>

        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="stations-grid">
          <div 
            v-for="station in filteredStations" 
            :key="station.id"
            class="station-card"
            :class="getStationCardClass(station.status)"
            @click="viewStation(station)"
          >
            <div class="station-header">
              <div class="station-status">
                <div class="status-indicator" :class="station.status.toLowerCase()"></div>
                <span class="status-text">{{ station.status }}</span>
              </div>
              <el-dropdown @command="(command) => handleStationAction(command, station)">
                <el-button text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="view">View Details</el-dropdown-item>
                    <el-dropdown-item command="edit">Edit</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>Delete</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            
            <div class="station-info">
              <h3 class="station-name">{{ station.name }}</h3>
              <p class="station-id">{{ station.charge_point_id }}</p>
              <p class="station-location">
                <el-icon><Location /></el-icon>
                {{ station.location || 'Location not set' }}
              </p>
            </div>
            
            <div class="station-metrics">
              <div class="metric">
                <span class="metric-value">{{ station.connector_count }}</span>
                <span class="metric-label">Connectors</span>
              </div>
              <div class="metric">
                <span class="metric-value">{{ station.available_connectors || 0 }}</span>
                <span class="metric-label">Available</span>
              </div>
            </div>
            
            <div class="station-footer">
              <span class="last-seen">
                Last seen: {{ formatLastHeartbeat(station.last_heartbeat) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <el-card v-else class="table-card">
          <div class="table-responsive">
            <el-table 
              :data="filteredStations" 
              v-loading="loading" 
              class="stations-table"
              @row-click="viewStation"
            >
            <el-table-column prop="charge_point_id" label="Charge Point ID" min-width="150" />
            <el-table-column prop="name" label="Name" min-width="150" />
            <el-table-column prop="location" label="Location" min-width="200" />
            <el-table-column prop="status" label="Status" width="120">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)" effect="light">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="connector_count" label="Connectors" width="100" align="center" />
            <el-table-column prop="available_connectors" label="Available" width="100" align="center" />
            <el-table-column prop="last_heartbeat" label="Last Heartbeat" width="180">
              <template #default="scope">
                {{ formatLastHeartbeat(scope.row.last_heartbeat) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="120" fixed="right">
              <template #default="scope">
                <el-button size="small" text @click.stop="viewStation(scope.row)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button size="small" text @click.stop="editStation(scope.row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>
      
      <!-- Add Station Dialog -->
      <el-dialog
        v-model="showAddDialog"
        title="Add New Charging Station"
        width="600px"
        class="modern-dialog"
      >
        <el-form
          ref="stationForm"
          :model="newStation"
          :rules="stationRules"
          label-width="140px"
          class="station-form"
        >
          <el-form-item label="Charge Point ID" prop="charge_point_id">
            <el-input 
              v-model="newStation.charge_point_id" 
              placeholder="Enter unique charge point ID"
            />
          </el-form-item>
          
          <el-form-item label="Station Name" prop="name">
            <el-input 
              v-model="newStation.name" 
              placeholder="Enter station name"
            />
          </el-form-item>
          
          <el-form-item label="Location" prop="location">
            <el-input 
              v-model="newStation.location" 
              placeholder="Enter station location"
            />
          </el-form-item>
          
          <el-form-item label="Number of Connectors" prop="connector_count">
            <el-input-number
              v-model="newStation.connector_count"
              :min="1"
              :max="10"
              controls-position="right"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showAddDialog = false">Cancel</el-button>
            <el-button type="primary" @click="addStation" :loading="addingStation">
              Add Station
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Edit Station Dialog -->
      <el-dialog
        v-model="showEditDialog"
        title="Edit Charging Station"
        width="600px"
        class="modern-dialog"
      >
        <el-form
          ref="editStationForm"
          :model="selectedStation"
          :rules="stationRules"
          label-width="140px"
          class="station-form"
          v-if="selectedStation"
        >
          <el-form-item label="Charge Point ID" prop="charge_point_id">
            <el-input 
              v-model="selectedStation.charge_point_id" 
              placeholder="Enter unique charge point ID"
              disabled
            />
            <div class="form-tip">Charge Point ID cannot be changed</div>
          </el-form-item>
          
          <el-form-item label="Station Name" prop="name">
            <el-input 
              v-model="selectedStation.name" 
              placeholder="Enter station name"
            />
          </el-form-item>
          
          <el-form-item label="Location" prop="location">
            <el-input 
              v-model="selectedStation.location" 
              placeholder="Enter station location"
            />
          </el-form-item>
          
          <el-form-item label="Number of Connectors" prop="connector_count">
            <el-input-number
              v-model="selectedStation.connector_count"
              :min="1"
              :max="10"
              controls-position="right"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showEditDialog = false">Cancel</el-button>
            <el-button type="primary" @click="updateStation" :loading="editingStation">
              Update Station
            </el-button>
          </div>
        </template>
      </el-dialog>
      
      <!-- Station Detail Dialog -->
      <el-dialog
        v-model="showDetailDialog"
        title="Station Details"
        width="800px"
        class="modern-dialog"
      >
        <div v-if="selectedStation" class="station-details">
          <div class="detail-header">
            <div class="station-title">
              <h3>{{ selectedStation.name }}</h3>
              <el-tag :type="getStatusType(selectedStation.status)" size="large">
                {{ selectedStation.status }}
              </el-tag>
            </div>
          </div>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card class="info-card">
                <template #header>
                  <span>Basic Information</span>
                </template>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="Charge Point ID">
                    {{ selectedStation.charge_point_id }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Name">
                    {{ selectedStation.name }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Location">
                    {{ selectedStation.location }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Status">
                    <el-tag :type="getStatusType(selectedStation.status)">
                      {{ selectedStation.status }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="Last Heartbeat">
                    {{ formatLastHeartbeat(selectedStation.last_heartbeat) }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </el-col>
            
            <el-col :span="12">
              <el-card class="connectors-card">
                <template #header>
                  <span>Connectors ({{ selectedStation.connectors?.length || 0 }})</span>
                </template>
                <div v-if="selectedStation.connectors && selectedStation.connectors.length > 0">
                  <div 
                    v-for="connector in selectedStation.connectors" 
                    :key="connector.connector_id"
                    class="connector-item"
                  >
                    <div class="connector-info">
                      <span class="connector-id">Connector {{ connector.connector_id }}</span>
                      <el-tag :type="getStatusType(connector.status)" size="small">
                        {{ connector.status }}
                      </el-tag>
                    </div>
                    <div class="connector-actions">
                      <el-button 
                        v-if="connector.status === 'Available'"
                        size="small" 
                        type="success"
                        @click="showStartTransactionDialog(connector)"
                        :loading="startingTransaction"
                      >
                        Start
                      </el-button>
                      <el-button 
                        v-if="connector.status === 'Occupied' || connector.status === 'Charging'"
                        size="small" 
                        type="warning"
                        @click="stopTransaction(connector)"
                        :loading="stoppingTransaction"
                      >
                        Stop
                      </el-button>
                      <el-button 
                        size="small" 
                        type="info"
                        @click="unlockConnector(connector)"
                        :loading="unlockingConnector"
                      >
                        Unlock
                      </el-button>
                    </div>
                  </div>
                </div>
                <div v-else class="no-connectors">
                  <el-empty description="No connectors found" :image-size="60" />
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-dialog>

      <!-- Start Transaction Dialog -->
      <el-dialog
        v-model="showStartDialog"
        title="Start Transaction"
        width="400px"
        class="modern-dialog"
      >
        <el-form
          ref="startTransactionForm"
          :model="startTransactionForm"
          :rules="startTransactionRules"
          label-width="100px"
        >
          <el-form-item label="Station">
            <el-input :value="selectedStation?.name" disabled />
          </el-form-item>
          
          <el-form-item label="Connector">
            <el-input :value="`Connector ${selectedConnector?.connector_id}`" disabled />
          </el-form-item>
          
          <el-form-item label="ID Tag" prop="idTag">
            <el-input 
              v-model="startTransactionForm.idTag" 
              placeholder="Enter ID Tag (e.g., RFID card)"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showStartDialog = false">Cancel</el-button>
            <el-button 
              type="primary" 
              @click="startTransaction" 
              :loading="startingTransaction"
            >
              Start Transaction
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </Layout>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { stationAPI, remoteAPI } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '@/components/Layout.vue'

export default {
  name: 'Stations',
  components: {
    Layout
  },
  
  data() {
    return {
      viewMode: 'grid',
      searchQuery: '',
      statusFilter: '',
      showAddDialog: false,
      showEditDialog: false,
      showDetailDialog: false,
      showStartDialog: false,
      addingStation: false,
      editingStation: false,
      startingTransaction: false,
      stoppingTransaction: false,
      unlockingConnector: false,
      selectedStation: null,
      selectedConnector: null,
      startTransactionForm: {
        idTag: ''
      },
      startTransactionRules: {
        idTag: [
          { required: true, message: 'ID Tag is required', trigger: 'blur' },
          { min: 1, max: 20, message: 'ID Tag must be 1-20 characters', trigger: 'blur' }
        ]
      },
      newStation: {
        charge_point_id: '',
        name: '',
        location: '',
        connector_count: 1
      },
      stationRules: {
        charge_point_id: [
          { required: true, message: 'Charge Point ID is required', trigger: 'blur' },
          { min: 3, message: 'Charge Point ID must be at least 3 characters', trigger: 'blur' }
        ],
        name: [
          { required: true, message: 'Station name is required', trigger: 'blur' },
          { min: 2, message: 'Name must be at least 2 characters', trigger: 'blur' }
        ],
        location: [
          { required: true, message: 'Location is required', trigger: 'blur' }
        ],
        connector_count: [
          { required: true, message: 'Number of connectors is required', trigger: 'blur' }
        ]
      }
    }
  },
  
  computed: {
    ...mapState(['stations', 'loading']),
    
    filteredStations() {
      let filtered = this.stations
      
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(station => 
          station.name.toLowerCase().includes(query) ||
          station.charge_point_id.toLowerCase().includes(query) ||
          (station.location && station.location.toLowerCase().includes(query))
        )
      }
      
      if (this.statusFilter) {
        filtered = filtered.filter(station => station.status === this.statusFilter)
      }
      
      return filtered
    },
    
    availableStations() {
      return this.stations.filter(s => s.status === 'Available').length
    },
    
    occupiedStations() {
      return this.stations.filter(s => s.status === 'Occupied').length
    },
    
    totalStations() {
      return this.stations.length
    },
    
    faultedStations() {
      return this.stations.filter(s => s.status === 'Faulted').length
    }
  },
  
  async created() {
    await this.fetchStations()
  },
  
  methods: {
    ...mapActions(['fetchStations']),
    
    async refreshStations() {
      await this.fetchStations()
      ElMessage.success('Stations refreshed')
    },
    
    getStatusType(status) {
      const types = {
        'Available': 'success',
        'Occupied': 'warning',
        'Faulted': 'danger',
        'Unavailable': 'info'
      }
      return types[status] || 'info'
    },
    
    getStationCardClass(status) {
      return {
        'station-available': status === 'Available',
        'station-occupied': status === 'Occupied',
        'station-faulted': status === 'Faulted',
        'station-unavailable': status === 'Unavailable'
      }
    },
    
    async addStation() {
      try {
        await this.$refs.stationForm.validate()
        this.addingStation = true
        
        await stationAPI.createStation(this.newStation)
        
        ElMessage.success('Station added successfully')
        this.showAddDialog = false
        this.resetForm()
        await this.fetchStations()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Failed to add station')
      } finally {
        this.addingStation = false
      }
    },
    
    async viewStation(station) {
      try {
        const response = await stationAPI.getStation(station.id)
        this.selectedStation = response.data
        this.showDetailDialog = true
      } catch (error) {
        ElMessage.error('Failed to load station details')
      }
    },
    
    editStation(station) {
      this.selectedStation = { ...station }
      this.showEditDialog = true
    },

    async updateStation() {
      try {
        await this.$refs.editStationForm.validate()
        
        this.editingStation = true
        
        const response = await stationAPI.updateStation(this.selectedStation.id, {
          name: this.selectedStation.name,
          location: this.selectedStation.location,
          connector_count: this.selectedStation.connector_count
        })
        
        ElMessage.success('Station updated successfully')
        this.showEditDialog = false
        await this.fetchStations()
        
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Failed to update station')
      } finally {
        this.editingStation = false
      }
    },
    
    handleStationAction(command, station) {
      switch (command) {
        case 'view':
          this.viewStation(station)
          break
        case 'edit':
          this.editStation(station)
          break
        case 'delete':
          this.deleteStation(station)
          break
      }
    },
    
    async deleteStation(station) {
      try {
        await ElMessageBox.confirm(
          `Are you sure you want to delete station "${station.name}"?`,
          'Delete Station',
          {
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        )
        
        await stationAPI.deleteStation(station.id)
        ElMessage.success('Station deleted successfully')
        await this.fetchStations()
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || 'Failed to delete station')
        }
      }
    },
    
    formatLastHeartbeat(timestamp) {
      if (!timestamp) return 'Never'
      
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      
      if (minutes < 1) return 'Just now'
      if (minutes < 60) return `${minutes}m ago`
      if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
      return date.toLocaleDateString()
    },

    showStartTransactionDialog(connector) {
      this.selectedConnector = connector
      this.startTransactionForm.idTag = ''
      this.showStartDialog = true
    },

    async startTransaction() {
      try {
        await this.$refs.startTransactionForm.validate()
        
        this.startingTransaction = true
        
        const response = await remoteAPI.startTransaction({
          chargePointId: this.selectedStation.charge_point_id,
          connectorId: this.selectedConnector.connector_id,
          idTag: this.startTransactionForm.idTag
        })
        
        if (response.data.success) {
          ElMessage.success(response.data.message)
          this.showStartDialog = false
          // Refresh station details
          setTimeout(() => {
            this.viewStation(this.selectedStation)
          }, 2000)
        } else {
          ElMessage.error(response.data.message)
        }
        
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Failed to start transaction')
      } finally {
        this.startingTransaction = false
      }
    },

    async stopTransaction(connector) {
      try {
        await ElMessageBox.confirm(
          `Stop transaction on Connector ${connector.connector_id}?`,
          'Stop Transaction',
          {
            confirmButtonText: 'Stop',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        )
        
        this.stoppingTransaction = true
        
        // Get active transaction for this connector
        const response = await remoteAPI.stopTransaction({
          chargePointId: this.selectedStation.charge_point_id,
          transactionId: connector.transaction_id || 0 // Use 0 if no specific transaction ID
        })
        
        if (response.data.success) {
          ElMessage.success(response.data.message)
          // Refresh station details
          setTimeout(() => {
            this.viewStation(this.selectedStation)
          }, 2000)
        } else {
          ElMessage.error(response.data.message)
        }
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || 'Failed to stop transaction')
        }
      } finally {
        this.stoppingTransaction = false
      }
    },

    async unlockConnector(connector) {
      try {
        await ElMessageBox.confirm(
          `Unlock Connector ${connector.connector_id}?`,
          'Unlock Connector',
          {
            confirmButtonText: 'Unlock',
            cancelButtonText: 'Cancel',
            type: 'info'
          }
        )
        
        this.unlockingConnector = true
        
        const response = await remoteAPI.unlockConnector({
          chargePointId: this.selectedStation.charge_point_id,
          connectorId: connector.connector_id
        })
        
        if (response.data.success) {
          ElMessage.success(response.data.message)
        } else {
          ElMessage.error(response.data.message)
        }
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || 'Failed to unlock connector')
        }
      } finally {
        this.unlockingConnector = false
      }
    },
    
    resetForm() {
      this.newStation = {
        charge_point_id: '',
        name: '',
        location: '',
        connector_count: 1
      }
      this.$refs.stationForm?.resetFields()
    }
  }
}
</script>

<style scoped>
.stations-container {
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

.header-info h2 {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.header-info p {
  margin: 0;
  color: #718096;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.add-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* Stats Grid */
.stats-grid {
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

.stat-icon.available {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.stat-icon.occupied {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.stat-icon.total {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
}

.stat-icon.faulted {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
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

/* Content Section */
.stations-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.search-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 250px;
}

/* Stations Grid */
.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 24px;
}

.station-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.station-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #e2e8f0;
  transition: all 0.3s ease;
}

.station-card.station-available::before {
  background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
}

.station-card.station-occupied::before {
  background: linear-gradient(90deg, #ed8936 0%, #dd6b20 100%);
}

.station-card.station-faulted::before {
  background: linear-gradient(90deg, #f56565 0%, #e53e3e 100%);
}

.station-card.station-unavailable::before {
  background: linear-gradient(90deg, #a0aec0 0%, #718096 100%);
}

.station-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border-color: #cbd5e0;
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.station-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.available {
  background-color: #38a169;
}

.status-indicator.occupied {
  background-color: #ed8936;
}

.status-indicator.faulted {
  background-color: #f56565;
}

.status-indicator.unavailable {
  background-color: #a0aec0;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #4a5568;
}

.station-info {
  margin-bottom: 16px;
}

.station-name {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

.station-id {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #a0aec0;
  font-family: monospace;
}

.station-location {
  margin: 0;
  font-size: 14px;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 4px;
}

.station-metrics {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
}

.metric-label {
  font-size: 12px;
  color: #718096;
}

.station-footer {
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.last-seen {
  font-size: 12px;
  color: #a0aec0;
}

/* Table Card */
.table-card {
  border: none;
  box-shadow: none;
}

.stations-table {
  border-radius: 0;
}

/* Dialog Styles */
.modern-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.modern-dialog :deep(.el-dialog__header) {
  background: #f8fafc;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modern-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.station-form {
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* Station Details */
.station-details {
  padding: 0;
}

.detail-header {
  margin-bottom: 24px;
}

.station-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.station-title h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2d3748;
}

.info-card, .connectors-card {
  height: 100%;
}

.connector-item {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connector-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  margin-right: 12px;
}

.connector-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.connector-id {
  font-weight: 500;
  color: #4a5568;
}

.no-connectors {
  text-align: center;
  padding: 20px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .stations-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  
  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-filter {
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .stations-container {
    padding: 0;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 20px 15px;
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
    font-size: 20px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .stations-grid {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 15px;
  }

  .station-card {
    padding: 16px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .search-filter {
    flex-direction: column;
    gap: 12px;
  }
  
  .button-text {
    display: none;
  }

  .content-header {
    padding: 16px;
  }

  .view-controls {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .header-content {
    padding: 15px 10px;
  }
  
  .header-info h2 {
    font-size: 20px;
  }

  .header-info p {
    font-size: 14px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-number {
    font-size: 18px;
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .station-metrics {
    justify-content: space-around;
  }

  .station-card {
    padding: 12px;
  }

  .station-name {
    font-size: 16px;
  }
  
  .modern-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto;
  }

  .modern-dialog :deep(.el-dialog__body) {
    padding: 16px;
  }

  .stations-grid {
    padding: 12px;
  }

  .content-header {
    padding: 12px;
  }

  .connector-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }

  .connector-info {
    margin-right: 0;
  }

  .connector-actions {
    justify-content: center;
  }

  .connector-actions .el-button {
    flex: 1;
    font-size: 12px;
  }
}
</style>