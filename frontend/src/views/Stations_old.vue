<template>
  <div class="stations-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header__content">
        <div class="page-header__info">
          <h1 class="page-header__title">Charging Stations</h1>
          <p class="page-header__subtitle">Manage and monitor your charging station network</p>
        </div>
        <div class="page-header__actions">
          <el-button @click="refreshStations" :loading="loading" class="action-btn action-btn--secondary">
            <el-icon><Refresh /></el-icon>
            <span class="desktop-only">Refresh</span>
          </el-button>
          <el-button type="primary" @click="showAddDialog = true" class="action-btn">
            <el-icon><Plus /></el-icon>
            <span>Add Station</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-overview">
      <div class="stat-item stat-item--available">
        <div class="stat-item__icon">
          <el-icon><Position /></el-icon>
        </div>
        <div class="stat-item__content">
          <div class="stat-item__number">{{ availableStations }}</div>
          <div class="stat-item__label">Available</div>
        </div>
      </div>
      
      <div class="stat-item stat-item--charging">
        <div class="stat-item__icon">
          <el-icon><Lightning /></el-icon>
        </div>
        <div class="stat-item__content">
          <div class="stat-item__number">{{ occupiedStations }}</div>
          <div class="stat-item__label">Charging</div>
        </div>
      </div>
      
      <div class="stat-item stat-item--total">
        <div class="stat-item__icon">
          <el-icon><Monitor /></el-icon>
        </div>
        <div class="stat-item__content">
          <div class="stat-item__number">{{ totalStations }}</div>
          <div class="stat-item__label">Total</div>
        </div>
      </div>
      
      <div class="stat-item stat-item--faulted">
        <div class="stat-item__icon">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-item__content">
          <div class="stat-item__number">{{ faultedStations }}</div>
          <div class="stat-item__label">Faulted</div>
        </div>
      </div>
    </div>

    <!-- Stations Grid -->
    <div class="stations-grid">
      <div 
        v-for="station in stations" 
        :key="station.id"
        class="station-card"
        :class="`station-card--${station.status?.toLowerCase() || 'unknown'}`"
        @click="viewStationDetails(station)"
      >
        <div class="station-card__header">
          <div class="station-card__status">
            <div class="status-indicator" :class="`status-indicator--${station.status?.toLowerCase() || 'unknown'}`"></div>
            <span class="status-text">{{ station.status || 'Unknown' }}</span>
          </div>
          <el-dropdown @command="(command) => handleStationAction(command, station)" trigger="click">
            <el-button circle size="small" class="station-card__menu">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon>
                  Edit
                </el-dropdown-item>
                <el-dropdown-item command="reset">
                  <el-icon><Refresh /></el-icon>
                  Reset
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon>
                  Delete
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="station-card__content">
          <h3 class="station-card__name">{{ station.name || station.id }}</h3>
          <p class="station-card__location">{{ station.location || 'Location not set' }}</p>
          
          <div class="station-card__info">
            <div class="info-item">
              <span class="info-label">Model:</span>
              <span class="info-value">{{ station.model || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Vendor:</span>
              <span class="info-value">{{ station.vendor || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Connectors:</span>
              <span class="info-value">{{ station.connector_count || 0 }}</span>
            </div>
          </div>

          <div class="station-card__footer">
            <div class="last-seen">
              <el-icon><Clock /></el-icon>
              <span>{{ formatLastSeen(station.last_heartbeat) }}</span>
            </div>
            <div class="connection-status" :class="{ 'connection-status--online': isOnline(station) }">
              <div class="connection-dot"></div>
              <span>{{ isOnline(station) ? 'Online' : 'Offline' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!stations || stations.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <el-icon><Position /></el-icon>
        </div>
        <h3 class="empty-state__title">No Stations Found</h3>
        <p class="empty-state__subtitle">Get started by adding your first charging station</p>
        <el-button type="primary" @click="showAddDialog = true" class="empty-state__action">
          <el-icon><Plus /></el-icon>
          Add Your First Station
        </el-button>
      </div>
    </div>

    <!-- Add Station Dialog -->
    <el-dialog
      v-model="showAddDialog"
      title="Add New Station"
      width="500px"
      :before-close="handleCloseDialog"
      class="station-dialog"
    >
      <el-form
        ref="stationForm"
        :model="newStation"
        :rules="stationRules"
        label-position="top"
        class="station-form"
      >
        <el-form-item label="Station ID" prop="id">
          <el-input
            v-model="newStation.id"
            placeholder="Enter unique station ID"
            :disabled="loading"
          />
        </el-form-item>

        <el-form-item label="Station Name" prop="name">
          <el-input
            v-model="newStation.name"
            placeholder="Enter station name"
            :disabled="loading"
          />
        </el-form-item>

        <el-form-item label="Location">
          <el-input
            v-model="newStation.location"
            placeholder="Enter station location"
            :disabled="loading"
          />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="Vendor" class="form-col">
            <el-input
              v-model="newStation.vendor"
              placeholder="e.g., ABB, Schneider"
              :disabled="loading"
            />
          </el-form-item>

          <el-form-item label="Model" class="form-col">
            <el-input
              v-model="newStation.model"
              placeholder="e.g., Terra 54"
              :disabled="loading"
            />
          </el-form-item>
        </div>

        <el-form-item label="Description">
          <el-input
            v-model="newStation.description"
            type="textarea"
            :rows="3"
            placeholder="Optional description"
            :disabled="loading"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAddDialog = false" :disabled="loading">
            Cancel
          </el-button>
          <el-button type="primary" @click="addStation" :loading="loading">
            Add Station
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Station Details Dialog -->
    <el-dialog
      v-model="showDetailsDialog"
      :title="selectedStation?.name || 'Station Details'"
      width="600px"
      class="details-dialog"
    >
      <div v-if="selectedStation" class="station-details">
        <div class="details-header">
          <div class="details-status">
            <div class="status-indicator" :class="`status-indicator--${selectedStation.status?.toLowerCase() || 'unknown'}`"></div>
            <span class="status-text">{{ selectedStation.status || 'Unknown' }}</span>
          </div>
          <div class="connection-status" :class="{ 'connection-status--online': isOnline(selectedStation) }">
            <div class="connection-dot"></div>
            <span>{{ isOnline(selectedStation) ? 'Online' : 'Offline' }}</span>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Station ID</span>
            <span class="detail-value">{{ selectedStation.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Name</span>
            <span class="detail-value">{{ selectedStation.name || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Location</span>
            <span class="detail-value">{{ selectedStation.location || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Vendor</span>
            <span class="detail-value">{{ selectedStation.vendor || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Model</span>
            <span class="detail-value">{{ selectedStation.model || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Connectors</span>
            <span class="detail-value">{{ selectedStation.connector_count || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Heartbeat</span>
            <span class="detail-value">{{ formatLastSeen(selectedStation.last_heartbeat) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">{{ formatDate(selectedStation.created_at) }}</span>
          </div>
        </div>

        <div v-if="selectedStation.description" class="details-description">
          <h4>Description</h4>
          <p>{{ selectedStation.description }}</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDetailsDialog = false">Close</el-button>
          <el-button type="primary" @click="editStation(selectedStation)">
            <el-icon><Edit /></el-icon>
            Edit Station
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
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

export default {
  name: 'Stations',
  
  data() {
    return {
      showAddDialog: false,
      showDetailsDialog: false,
      selectedStation: null,
      newStation: {
        id: '',
        name: '',
        location: '',
        vendor: '',
        model: '',
        description: ''
      },
      stationRules: {
        id: [
          { required: true, message: 'Station ID is required', trigger: 'blur' },
          { min: 3, message: 'Station ID must be at least 3 characters', trigger: 'blur' }
        ],
        name: [
          { required: true, message: 'Station name is required', trigger: 'blur' },
          { min: 2, message: 'Name must be at least 2 characters', trigger: 'blur' }
        ]
      }
    }
  },
  
  computed: {
    ...mapState(['stations', 'loading']),
    
    availableStations() {
      if (!this.stations || !Array.isArray(this.stations)) return 0
      return this.stations.filter(s => s.status === 'Available').length
    },
    
    occupiedStations() {
      if (!this.stations || !Array.isArray(this.stations)) return 0
      return this.stations.filter(s => s.status === 'Occupied').length
    },
    
    totalStations() {
      if (!this.stations || !Array.isArray(this.stations)) return 0
      return this.stations.length
    },
    
    faultedStations() {
      if (!this.stations || !Array.isArray(this.stations)) return 0
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
      this.$message.success('Stations refreshed')
    },
    
    async addStation() {
      try {
        await this.$refs.stationForm.validate()
        
        await stationAPI.createStation(this.newStation)
        
        this.$message.success('Station added successfully')
        this.showAddDialog = false
        this.resetForm()
        await this.fetchStations()
      } catch (error) {
        this.$message.error(error.response?.data?.message || 'Failed to add station')
      }
    },
    
    viewStationDetails(station) {
      this.selectedStation = station
      this.showDetailsDialog = true
    },
    
    editStation(station) {
      this.selectedStation = { ...station }
      // You can add edit dialog here
      this.$message.info('Edit functionality coming soon')
    },
    
    async handleStationAction(command, station) {
      switch (command) {
        case 'edit':
          this.editStation(station)
          break
        case 'reset':
          await this.resetStation(station)
          break
        case 'delete':
          await this.deleteStation(station)
          break
      }
    },
    
    async resetStation(station) {
      try {
        await this.$confirm(
          `Reset station "${station.name || station.id}"?`,
          'Reset Station',
          {
            confirmButtonText: 'Reset',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        )
        
        await remoteAPI.resetStation({
          chargePointId: station.id,
          type: 'Soft'
        })
        
        this.$message.success('Reset command sent')
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Failed to reset station')
        }
      }
    },
    
    async deleteStation(station) {
      try {
        await this.$confirm(
          `Delete station "${station.name || station.id}"?`,
          'Delete Station',
          {
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        )
        
        await stationAPI.deleteStation(station.id)
        this.$message.success('Station deleted successfully')
        await this.fetchStations()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Failed to delete station')
        }
      }
    },
    
    formatLastSeen(timestamp) {
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
    
    formatDate(timestamp) {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleDateString()
    },
    
    isOnline(station) {
      if (!station.last_heartbeat) return false
      const lastHeartbeat = new Date(station.last_heartbeat)
      const now = new Date()
      const diffMinutes = (now - lastHeartbeat) / (1000 * 60)
      return diffMinutes < 5 // Consider online if heartbeat within 5 minutes
    },
    
    handleCloseDialog() {
      this.showAddDialog = false
      this.resetForm()
    },
    
    resetForm() {
      this.newStation = {
        id: '',
        name: '',
        location: '',
        vendor: '',
        model: '',
        description: ''
      }
      this.$refs.stationForm?.resetFields()
    }
  }
}
</script>

<style scoped>
/* Stations Page Variables */
:root {
  --primary-color: #667eea;
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stations-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

/* Page Header */
.page-header {
  margin-bottom: 32px;
}

.page-header__content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.page-header__title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.page-header__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.5;
}

.page-header__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: var(--transition);
  border: none;
  cursor: pointer;
}

.action-btn--secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.action-btn--secondary:hover {
  background: var(--border-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-item {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-item--available {
  border-left: 4px solid var(--success-color);
}

.stat-item--charging {
  border-left: 4px solid var(--warning-color);
}

.stat-item--total {
  border-left: 4px solid var(--primary-color);
}

.stat-item--faulted {
  border-left: 4px solid var(--danger-color);
}

.stat-item__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  background: var(--primary-gradient);
}

.stat-item--available .stat-item__icon {
  background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
}

.stat-item--charging .stat-item__icon {
  background: linear-gradient(135deg, var(--warning-color) 0%, #d97706 100%);
}

.stat-item--faulted .stat-item__icon {
  background: linear-gradient(135deg, var(--danger-color) 0%, #dc2626 100%);
}

.stat-item__number {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1;
}

.stat-item__label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Utility Classes */
.desktop-only {
  display: inline;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-header__content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
    padding: 24px 20px;
  }

  .page-header__title {
    font-size: 24px;
  }

  .page-header__subtitle {
    display: none;
  }

  .desktop-only {
    display: none;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-item {
    padding: 20px;
  }

  .stat-item__number {
    font-size: 24px;
  }

  .stat-item__icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
}

/* Stations Grid */
.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.station-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.station-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.station-card--available {
  border-left: 4px solid var(--success-color);
}

.station-card--occupied,
.station-card--charging {
  border-left: 4px solid var(--warning-color);
}

.station-card--faulted {
  border-left: 4px solid var(--danger-color);
}

.station-card--unknown {
  border-left: 4px solid #6b7280;
}

.station-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.station-card__status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator--available {
  background-color: var(--success-color);
}

.status-indicator--occupied,
.status-indicator--charging {
  background-color: var(--warning-color);
}

.status-indicator--faulted {
  background-color: var(--danger-color);
}

.status-indicator--unknown {
  background-color: #6b7280;
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.station-card__menu {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.station-card__menu:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.station-card__name {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.station-card__location {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.station-card__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
}

.station-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.last-seen {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.connection-status--online {
  color: var(--success-color);
}

.connection-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #6b7280;
}

.connection-status--online .connection-dot {
  background-color: var(--success-color);
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.empty-state__icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.empty-state__title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state__subtitle {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: var(--text-secondary);
}

.empty-state__action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-weight: 600;
}

/* Dialog Styles */
.station-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.station-dialog :deep(.el-dialog__header) {
  background: var(--bg-secondary);
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-color);
}

.station-dialog :deep(.el-dialog__body) {
  padding: 32px;
}

.station-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-col {
  margin-bottom: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

/* Details Dialog */
.details-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.details-dialog :deep(.el-dialog__header) {
  background: var(--bg-secondary);
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-color);
}

.details-dialog :deep(.el-dialog__body) {
  padding: 32px;
}

.station-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.details-description {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.details-description h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.details-description p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Responsive Design Continued */
@media (max-width: 1024px) {
  .stations-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stations-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .station-card {
    padding: 20px;
  }

  .station-card__name {
    font-size: 18px;
  }

  .empty-state {
    padding: 60px 20px;
  }

  .empty-state__icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .empty-state__title {
    font-size: 20px;
  }

  .station-dialog :deep(.el-dialog__body),
  .details-dialog :deep(.el-dialog__body) {
    padding: 24px;
  }

  .station-dialog :deep(.el-dialog__header),
  .details-dialog :deep(.el-dialog__header) {
    padding: 20px 24px;
  }
}

@media (max-width: 480px) {
  .station-card {
    padding: 16px;
  }

  .station-card__name {
    font-size: 16px;
  }

  .station-card__info {
    gap: 6px;
  }

  .empty-state {
    padding: 40px 16px;
  }

  .empty-state__icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .empty-state__title {
    font-size: 18px;
  }

  .empty-state__subtitle {
    font-size: 14px;
  }

  .station-dialog :deep(.el-dialog__body),
  .details-dialog :deep(.el-dialog__body) {
    padding: 20px;
  }

  .station-dialog :deep(.el-dialog__header),
  .details-dialog :deep(.el-dialog__header) {
    padding: 16px 20px;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 8px;
  }

  .dialog-footer .el-button {
    width: 100%;
  }
}
</style>