<template>
  <Layout>
    <div class="reservations-container">
      <!-- Header -->
      <div class="page-header">
        <h2>Station Booking</h2>
        <el-button @click="loadStations" :loading="loading">
          <el-icon><Refresh /></el-icon>
          Refresh
        </el-button>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-number">{{ availableStations }}</span>
          <span class="stat-label">Available</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ myReservations }}</span>
          <span class="stat-label">My Bookings</span>
        </div>
      </div>

      <!-- Search -->
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="Search stations..."
          clearable
        />
      </div>

      <!-- Stations -->
      <div class="stations-grid">
        <div 
          v-for="station in paginatedStations" 
          :key="station.id" 
          class="station-card"
        >
          <div class="station-header">
            <h3>{{ station.name }}</h3>
            <el-tag :type="getStationStatusType(station)">
              {{ getStationStatus(station) }}
            </el-tag>
          </div>
          
          <div class="station-info">
            <p><strong>ID:</strong> {{ station.charge_point_id }}</p>
            <p><strong>Location:</strong> {{ station.location || 'No location' }}</p>
          </div>

          <!-- Connectors -->
          <div class="connectors-section">
            <h4>Connectors</h4>
            <div 
              v-for="connector in getAvailableConnectors(station)" 
              :key="connector.connector_id"
              class="connector-item"
            >
              <span>Connector {{ connector.connector_id }} - {{ connector.status }}</span>
              <el-button 
                v-if="connector.status === 'Available'"
                type="primary" 
                size="small"
                @click="openBookingModal(station, connector)"
              >
                Book Now
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[6, 12, 24, 48]"
          :total="filteredStations.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- My Bookings -->
      <div class="my-bookings">
        <h3>My Active Bookings</h3>
        <div 
          v-for="booking in myActiveReservations" 
          :key="booking.reservation_id"
          class="booking-item"
        >
          <div>
            <strong>{{ booking.station_name }}</strong> - Connector {{ booking.connector_id }}
            <br>
            <small>Expires: {{ formatDateTime(booking.expiry_date) }}</small>
          </div>
          <el-button 
            type="danger" 
            size="small"
            @click="cancelBooking(booking.reservation_id)"
          >
            Cancel
          </el-button>
        </div>
      </div>
    </div>
  </Layout>

  <!-- Modal Outside Layout -->
  <teleport to="body">
    <div v-if="showModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 500px;">
        <h3>Book Station</h3>
        <p v-if="selectedStation"><strong>Station:</strong> {{ selectedStation.name }}</p>
        <p v-if="selectedConnector"><strong>Connector:</strong> {{ selectedConnector.connector_id }}</p>
        
        <div style="margin: 20px 0;">
          <label>RFID Card ID:</label><br>
          <input v-model="bookingForm.id_tag" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;" />
        </div>
        
        <div style="margin: 20px 0;">
          <label>Phone Number:</label><br>
          <input v-model="bookingForm.phone_number" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;" />
        </div>
        
        <div style="margin: 20px 0;">
          <label>Duration (minutes):</label><br>
          <input v-model="bookingForm.expiry_minutes" type="number" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;" />
        </div>
        
        <div style="text-align: right; margin-top: 20px;">
          <button @click="closeModal" style="padding: 10px 20px; margin-right: 10px; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
          <button @click="confirmBooking" :disabled="booking" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            {{ booking ? 'Booking...' : 'Book Now' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Layout from '../components/Layout.vue'
import api from '../services/api'

export default {
  name: 'Reservations',
  components: { Layout },
  setup() {
    const loading = ref(false)
    const booking = ref(false)
    const showModal = ref(false)
    const stations = ref([])
    const connectors = ref([])
    const myActiveReservations = ref([])
    const searchQuery = ref('')
    const currentPage = ref(1)
    const pageSize = ref(6)
    
    const selectedStation = ref(null)
    const selectedConnector = ref(null)
    
    const bookingForm = reactive({
      id_tag: '',
      phone_number: '',
      expiry_minutes: 60
    })

    const loadStations = async () => {
      loading.value = true
      try {
        const response = await api.get('/stations')
        stations.value = response.data
        await loadConnectors()
        await loadMyBookings()
      } catch (error) {
        ElMessage.error('Failed to load stations')
      } finally {
        loading.value = false
      }
    }

    const loadConnectors = async () => {
      try {
        connectors.value = []
        for (const station of stations.value) {
          const response = await api.get(`/stations/${station.id}/connectors`)
          const stationConnectors = response.data.map(connector => ({
            ...connector,
            station_id: station.id
          }))
          connectors.value.push(...stationConnectors)
        }
      } catch (error) {
        console.error('Failed to load connectors:', error)
      }
    }

    const loadMyBookings = async () => {
      try {
        const response = await api.get('/reservations', {
          params: { status: 'Active', limit: 100 }
        })
        myActiveReservations.value = response.data.reservations || []
      } catch (error) {
        console.error('Failed to load bookings:', error)
      }
    }

    const filteredStations = computed(() => {
      if (!searchQuery.value) return stations.value
      return stations.value.filter(station => 
        station.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        station.charge_point_id.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    })

    const paginatedStations = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredStations.value.slice(start, end)
    })

    const availableStations = computed(() => 
      stations.value.filter(station => hasAvailableConnectors(station)).length
    )

    const myReservations = computed(() => myActiveReservations.value.length)

    const hasAvailableConnectors = (station) => {
      return getStationConnectors(station).some(c => c.status === 'Available')
    }

    const getStationConnectors = (station) => {
      return connectors.value.filter(c => c.station_id === station.id)
    }

    const getAvailableConnectors = (station) => {
      return getStationConnectors(station)
    }

    const getStationStatus = (station) => {
      const stationConnectors = getStationConnectors(station)
      if (stationConnectors.length === 0) return 'Unknown'
      if (stationConnectors.some(c => c.status === 'Available')) return 'Available'
      return 'Occupied'
    }

    const getStationStatusType = (station) => {
      const status = getStationStatus(station)
      return status === 'Available' ? 'success' : 'info'
    }

    const openBookingModal = (station, connector) => {
      console.log('Opening modal...')
      selectedStation.value = station
      selectedConnector.value = connector
      showModal.value = true
      console.log('showModal is now:', showModal.value)
    }

    const closeModal = () => {
      showModal.value = false
      selectedStation.value = null
      selectedConnector.value = null
      Object.assign(bookingForm, {
        id_tag: '',
        phone_number: '',
        expiry_minutes: 60
      })
    }

    const confirmBooking = async () => {
      if (!bookingForm.id_tag || !bookingForm.phone_number) {
        ElMessage.error('Please fill all required fields')
        return
      }
      
      booking.value = true
      try {
        const data = {
          charging_station_id: selectedStation.value.id,
          connector_id: selectedConnector.value.connector_id,
          ...bookingForm
        }
        
        await api.post('/reservations', data)
        ElMessage.success('Station booked successfully!')
        closeModal()
        loadStations()
      } catch (error) {
        ElMessage.error(error.response?.data?.error || 'Failed to book station')
      } finally {
        booking.value = false
      }
    }

    const cancelBooking = async (reservationId) => {
      try {
        await ElMessageBox.confirm('Cancel this booking?', 'Confirm')
        await api.delete(`/reservations/${reservationId}`)
        ElMessage.success('Booking cancelled')
        loadStations()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('Failed to cancel booking')
        }
      }
    }

    const formatDateTime = (dateString) => {
      return new Date(dateString).toLocaleString()
    }

    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
    }

    onMounted(() => {
      loadStations()
    })

    return {
      loading,
      booking,
      showModal,
      stations,
      searchQuery,
      selectedStation,
      selectedConnector,
      bookingForm,
      myActiveReservations,
      filteredStations,
      paginatedStations,
      currentPage,
      pageSize,
      availableStations,
      myReservations,
      loadStations,
      getAvailableConnectors,
      getStationStatus,
      getStationStatusType,
      openBookingModal,
      closeModal,
      confirmBooking,
      cancelBooking,
      formatDateTime,
      handleSizeChange,
      handleCurrentChange,
      Refresh
    }
  }
}
</script>

<style scoped>
.reservations-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.page-header h2 {
  margin: 0;
  color: #2d3748;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #4299e1;
  margin-bottom: 8px;
}

.stat-label {
  color: #718096;
  font-size: 14px;
}

.search-section {
  margin-bottom: 30px;
}

.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.station-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.station-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.station-header h3 {
  margin: 0;
  color: #2d3748;
}

.station-info {
  margin-bottom: 20px;
}

.station-info p {
  margin: 5px 0;
  color: #4a5568;
  font-size: 14px;
}

.connectors-section h4 {
  margin: 0 0 15px 0;
  color: #2d3748;
  font-size: 16px;
}

.connector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.my-bookings {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.my-bookings h3 {
  margin: 0 0 20px 0;
  color: #2d3748;
}

.booking-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.pagination-section {
  margin: 40px 0 60px 0;
  display: flex;
  justify-content: center;
}

/* Modal Styles */
.modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: rgba(0, 0, 0, 0.8) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 99999 !important;
}

.modal-content {
  background: white !important;
  border-radius: 12px !important;
  width: 90% !important;
  max-width: 500px !important;
  max-height: 90vh !important;
  overflow-y: auto !important;
  position: relative !important;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #2d3748;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #718096;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f7fafc;
}

.modal-body {
  padding: 20px;
}

.booking-info {
  background: #f7fafc;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.booking-info p {
  margin: 5px 0;
  color: #2d3748;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2d3748;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel {
  background: #f7fafc;
  color: #4a5568;
}

.btn-cancel:hover {
  background: #edf2f7;
}

.btn-confirm {
  background: #4299e1;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #3182ce;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal Fixed Styles */
.modal-overlay-fixed {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: rgba(0,0,0,0.8) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 99999 !important;
  transition: opacity 0.3s ease !important;
}

.modal-hide {
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}

.modal-show {
  opacity: 1 !important;
  pointer-events: all !important;
  visibility: visible !important;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .stations-grid {
    grid-template-columns: 1fr;
  }
  
  .booking-item {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>
