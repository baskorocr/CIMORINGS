<template>
  <Layout>
    <div class="stations">
      <div class="page-header">
        <h2>Charging Stations</h2>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          Add Station
        </el-button>
      </div>
      
      <el-card>
        <el-table :data="stations" v-loading="loading" style="width: 100%">
          <el-table-column prop="charge_point_id" label="Charge Point ID" />
          <el-table-column prop="name" label="Name" />
          <el-table-column prop="location" label="Location" />
          <el-table-column prop="status" label="Status">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ scope.row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="connector_count" label="Connectors" />
          <el-table-column prop="available_connectors" label="Available" />
          <el-table-column prop="last_heartbeat" label="Last Heartbeat" />
          <el-table-column label="Actions" width="120">
            <template #default="scope">
              <el-button size="small" @click="viewStation(scope.row)">
                View
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      
      <!-- Add Station Dialog -->
      <el-dialog
        v-model="showAddDialog"
        title="Add Charging Station"
        width="500px"
      >
        <el-form
          ref="stationForm"
          :model="newStation"
          :rules="stationRules"
          label-width="120px"
        >
          <el-form-item label="Charge Point ID" prop="charge_point_id">
            <el-input v-model="newStation.charge_point_id" />
          </el-form-item>
          
          <el-form-item label="Name" prop="name">
            <el-input v-model="newStation.name" />
          </el-form-item>
          
          <el-form-item label="Location" prop="location">
            <el-input v-model="newStation.location" />
          </el-form-item>
          
          <el-form-item label="Connectors" prop="connector_count">
            <el-input-number
              v-model="newStation.connector_count"
              :min="1"
              :max="10"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <el-button @click="showAddDialog = false">Cancel</el-button>
          <el-button type="primary" @click="addStation">Add</el-button>
        </template>
      </el-dialog>
      
      <!-- Station Detail Dialog -->
      <el-dialog
        v-model="showDetailDialog"
        title="Station Details"
        width="600px"
      >
        <div v-if="selectedStation">
          <el-descriptions :column="2" border>
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
          </el-descriptions>
          
          <h3 style="margin-top: 20px;">Connectors</h3>
          <el-table :data="selectedStation.connectors" style="width: 100%">
            <el-table-column prop="connector_id" label="Connector ID" />
            <el-table-column prop="status" label="Status">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-dialog>
    </div>
  </Layout>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { stationAPI } from '@/services/api'
import { ElMessage } from 'element-plus'
import Layout from '@/components/Layout.vue'

export default {
  name: 'Stations',
  components: {
    Layout
  },
  
  data() {
    return {
      showAddDialog: false,
      showDetailDialog: false,
      selectedStation: null,
      newStation: {
        charge_point_id: '',
        name: '',
        location: '',
        connector_count: 1
      },
      stationRules: {
        charge_point_id: [
          { required: true, message: 'Charge Point ID is required', trigger: 'blur' }
        ],
        name: [
          { required: true, message: 'Name is required', trigger: 'blur' }
        ],
        location: [
          { required: true, message: 'Location is required', trigger: 'blur' }
        ]
      }
    }
  },
  
  computed: {
    ...mapState(['stations', 'loading'])
  },
  
  async created() {
    await this.fetchStations()
  },
  
  methods: {
    ...mapActions(['fetchStations']),
    
    getStatusType(status) {
      const types = {
        'Available': 'success',
        'Occupied': 'warning',
        'Faulted': 'danger',
        'Unavailable': 'info'
      }
      return types[status] || 'info'
    },
    
    async addStation() {
      try {
        await this.$refs.stationForm.validate()
        await stationAPI.createStation(this.newStation)
        
        ElMessage.success('Station added successfully')
        this.showAddDialog = false
        this.resetForm()
        await this.fetchStations()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Failed to add station')
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
    
    resetForm() {
      this.newStation = {
        charge_point_id: '',
        name: '',
        location: '',
        connector_count: 1
      }
    }
  }
}
</script>

<style scoped>
.stations {
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
  color: #333;
}
</style>