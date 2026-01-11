<template>
  <Layout>
    <div class="transactions">
      <div class="page-header">
        <div class="header-content">
          <h2>Transactions</h2>
          <div class="header-actions">
            <el-button @click="refreshTransactions" :loading="loading" circle size="small">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- Mobile Cards View with Lazy Load -->
      <div class="mobile-cards mobile-only" ref="mobileContainer">
        <div 
          v-for="transaction in allTransactions" 
          :key="transaction.transaction_id"
          class="transaction-card"
        >
          <div class="card-header">
            <div class="transaction-id">ID: {{ transaction.transaction_id }}</div>
            <el-tag :type="getStatusType(transaction.status)" size="small">
              {{ transaction.status }}
            </el-tag>
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
              <span class="label">ID Tag:</span>
              <span class="value">{{ transaction.id_tag }}</span>
            </div>
            <div class="info-row">
              <span class="label">Energy:</span>
              <span class="value">{{ (transaction.meter_stop - transaction.meter_start).toFixed(2) }} kWh</span>
            </div>
            <div class="info-row">
              <span class="label">Started:</span>
              <span class="value">{{ formatDateTime(transaction.start_timestamp) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <el-button size="small" type="primary" @click="showDetails(transaction)">
              Details
            </el-button>
          </div>
        </div>
        
        <!-- Loading indicator for mobile -->
        <div v-if="loadingMore" class="loading-more">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>Loading more...</span>
        </div>
        
        <!-- End of data indicator -->
        <div v-if="hasReachedEnd && allTransactions.length > 0" class="end-indicator">
          <span>No more transactions</span>
        </div>
      </div>

      <!-- Desktop Table View -->
      <el-card class="mobile-hidden">
        <div class="table-responsive">
          <el-table :data="transactions" v-loading="loading" style="width: 100%">
          <el-table-column prop="transaction_id" label="Transaction ID" />
          <el-table-column prop="station_name" label="Station" />
          <el-table-column prop="connector_id" label="Connector" />
          <el-table-column prop="id_tag" label="ID Tag" />
          <el-table-column prop="meter_start" label="Start (kWh)" />
          <el-table-column prop="meter_stop" label="Stop (kWh)" />
          <el-table-column label="Energy (kWh)">
            <template #default="scope">
              {{ (scope.row.meter_stop - scope.row.meter_start).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="Status">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ scope.row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="start_timestamp" label="Started" />
          <el-table-column prop="stop_timestamp" label="Stopped" />
          <el-table-column label="Actions" width="120">
            <template #default="scope">
              <el-button size="small" @click="showDetails(scope.row)">
                Details
              </el-button>
            </template>
          </el-table-column>
          </el-table>
        </div>
        
        <!-- Desktop Pagination -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="transactionsPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            background
          />
        </div>
      </el-card>
      
      <!-- Transaction Details Modal -->
      <el-dialog v-model="detailsVisible" title="Transaction Details" width="600px">
        <div v-if="selectedTransaction" class="transaction-details">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">{{ selectedTransaction.id }}</el-descriptions-item>
            <el-descriptions-item label="Transaction ID">{{ selectedTransaction.transaction_id }}</el-descriptions-item>
            <el-descriptions-item label="Station ID">{{ selectedTransaction.charging_station_id }}</el-descriptions-item>
            <el-descriptions-item label="Station Name">{{ selectedTransaction.station_name }}</el-descriptions-item>
            <el-descriptions-item label="Connector ID">{{ selectedTransaction.connector_id }}</el-descriptions-item>
            <el-descriptions-item label="ID Tag">{{ selectedTransaction.id_tag }}</el-descriptions-item>
            <el-descriptions-item label="Meter Start">{{ selectedTransaction.meter_start }} kWh</el-descriptions-item>
            <el-descriptions-item label="Meter Stop">{{ selectedTransaction.meter_stop || 'N/A' }} kWh</el-descriptions-item>
            <el-descriptions-item label="Energy Consumed">{{ selectedTransaction.energy_consumed || '0.000' }} kWh</el-descriptions-item>
            <el-descriptions-item label="Max Power">{{ selectedTransaction.max_power || '0.00' }} kW</el-descriptions-item>
            <el-descriptions-item label="SOC">{{ selectedTransaction.soc || 'N/A' }}%</el-descriptions-item>
            <el-descriptions-item label="Status">
              <el-tag :type="getStatusType(selectedTransaction.status)">
                {{ selectedTransaction.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Start Time">{{ formatDateTime(selectedTransaction.start_timestamp) }}</el-descriptions-item>
            <el-descriptions-item label="Stop Time">{{ formatDateTime(selectedTransaction.stop_timestamp) || 'N/A' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-dialog>
    </div>
  </Layout>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import Layout from '@/components/Layout.vue'

export default {
  name: 'Transactions',
  components: {
    Layout
  },
  
  data() {
    return {
      currentPage: 1,
      pageSize: 10,
      detailsVisible: false,
      selectedTransaction: null,
      // Mobile lazy loading
      allTransactions: [], // For mobile lazy load
      loadingMore: false,
      hasReachedEnd: false,
      mobilePageSize: 20
    }
  },
  
  computed: {
    ...mapState(['transactions', 'transactionsPagination', 'loading', 'user']),
    
    isAdminOrSuperAdmin() {
      return this.user?.role === 'admin' || this.user?.role === 'super_admin'
    }
  },
  
  async created() {
    await this.loadTransactions()
    await this.loadMobileTransactions()
  },

  mounted() {
    // Setup scroll listener for mobile lazy loading
    this.setupScrollListener()
  },

  beforeUnmount() {
    this.removeScrollListener()
  },
  
  methods: {
    ...mapActions(['fetchTransactions']),
    
    async loadTransactions() {
      const params = { 
        page: this.currentPage, 
        limit: this.pageSize 
      }
      
      // Add user filter if not admin/super_admin
      if (!this.isAdminOrSuperAdmin) {
        params.user_id = this.user?.id
      }
      
      await this.fetchTransactions(params)
    },

    async loadMobileTransactions(reset = false) {
      if (this.loadingMore || this.hasReachedEnd) return
      
      try {
        this.loadingMore = true
        const page = reset ? 1 : Math.floor(this.allTransactions.length / this.mobilePageSize) + 1
        
        const params = { 
          page, 
          limit: this.mobilePageSize 
        }
        
        // Add user filter if not admin/super_admin
        if (!this.isAdminOrSuperAdmin) {
          params.user_id = this.user?.id
        }
        
        const response = await this.$store.dispatch('fetchTransactions', params)
        
        if (reset) {
          this.allTransactions = this.transactions
          this.hasReachedEnd = false
        } else {
          // Append new transactions, avoid duplicates
          const newTransactions = this.transactions.filter(newTx => 
            !this.allTransactions.some(existingTx => existingTx.transaction_id === newTx.transaction_id)
          )
          this.allTransactions.push(...newTransactions)
        }
        
        // Check if we've reached the end
        if (this.transactions.length < this.mobilePageSize) {
          this.hasReachedEnd = true
        }
        
      } catch (error) {
        console.error('Failed to load mobile transactions:', error)
      } finally {
        this.loadingMore = false
      }
    },

    async refreshTransactions() {
      // Reset mobile data
      this.allTransactions = []
      this.hasReachedEnd = false
      
      // Load both desktop and mobile data
      await this.loadTransactions()
      await this.loadMobileTransactions(true)
    },
    
    async handleCurrentChange(page) {
      this.currentPage = page
      await this.loadTransactions()
    },
    
    async handleSizeChange(size) {
      this.pageSize = size
      this.currentPage = 1
      await this.loadTransactions()
    },

    setupScrollListener() {
      this.scrollHandler = this.throttle(() => {
        if (window.innerWidth <= 768) { // Only on mobile
          const container = this.$refs.mobileContainer
          if (!container) return
          
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop
          const windowHeight = window.innerHeight
          const documentHeight = document.documentElement.scrollHeight
          
          // Load more when user is near bottom (100px threshold)
          if (scrollTop + windowHeight >= documentHeight - 100) {
            this.loadMobileTransactions()
          }
        }
      }, 200)
      
      window.addEventListener('scroll', this.scrollHandler)
    },

    removeScrollListener() {
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler)
      }
    },

    throttle(func, delay) {
      let timeoutId
      let lastExecTime = 0
      return function (...args) {
        const currentTime = Date.now()
        
        if (currentTime - lastExecTime > delay) {
          func.apply(this, args)
          lastExecTime = currentTime
        } else {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            func.apply(this, args)
            lastExecTime = Date.now()
          }, delay - (currentTime - lastExecTime))
        }
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
    
    showDetails(transaction) {
      this.selectedTransaction = transaction
      this.detailsVisible = true
    },
    
    formatDateTime(timestamp) {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleString()
    }
  }
}
</script>

<style scoped>
.transactions {
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
  gap: 12px;
  align-items: center;
}

/* Mobile Cards */
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.transaction-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.transaction-card:hover {
  border-color: #cbd5e0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
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
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

.card-actions {
  display: flex;
  justify-content: center;
}

.card-actions .el-button {
  flex: 1;
}

/* Desktop Table */
.mobile-hidden .el-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* Pagination */
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-top: 1px solid #f0f0f0;
}

.pagination-wrapper :deep(.el-pagination) {
  justify-content: center;
}

.pagination-wrapper :deep(.el-pagination.is-background .el-pager li) {
  margin: 0 2px;
  border-radius: 4px;
}

.pagination-wrapper :deep(.el-pagination.is-background .btn-prev),
.pagination-wrapper :deep(.el-pagination.is-background .btn-next) {
  border-radius: 4px;
}

/* Mobile Loading Indicators */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #909399;
  font-size: 14px;
  gap: 8px;
}

.loading-more .el-icon {
  font-size: 16px;
}

.end-indicator {
  text-align: center;
  padding: 20px;
  color: #c0c4cc;
  font-size: 13px;
  border-top: 1px solid #f0f0f0;
  margin-top: 10px;
}

/* Mobile Cards Enhancements */
.mobile-cards {
  min-height: 400px;
}

/* Transaction Details */
.transaction-details {
  margin-top: 10px;
}

.transaction-details :deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

.transaction-details :deep(.el-descriptions__label) {
  font-weight: 600;
  color: #4a5568;
}

.transaction-details :deep(.el-descriptions__content) {
  color: #2d3748;
}

/* Responsive Design */
@media (max-width: 768px) {
  .transactions {
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

  .mobile-cards {
    gap: 12px;
    margin-bottom: 15px;
  }

  .transaction-card {
    padding: 12px;
  }

  .card-header {
    margin-bottom: 10px;
  }

  .transaction-id {
    font-size: 13px;
  }

  .info-row {
    margin-bottom: 6px;
  }

  .info-row .label,
  .info-row .value {
    font-size: 12px;
  }

  .card-actions {
    margin-top: 12px;
  }

  .pagination-wrapper {
    margin-top: 15px;
    padding: 15px 0;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto !important;
  }

  .transaction-details :deep(.el-descriptions) {
    font-size: 14px;
  }

  .transaction-details :deep(.el-descriptions__label) {
    font-size: 13px;
  }

  .transaction-details :deep(.el-descriptions__content) {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 15px 10px;
  }

  .header-content h2 {
    font-size: 18px;
  }

  .mobile-cards {
    gap: 10px;
  }

  .transaction-card {
    padding: 10px;
  }

  .transaction-id {
    font-size: 12px;
  }

  .info-row .label,
  .info-row .value {
    font-size: 11px;
  }

  .card-actions .el-button {
    font-size: 12px;
    padding: 6px 12px;
  }

  .pagination-wrapper {
    padding: 10px 0;
  }

  :deep(.el-pagination.is-background .el-pager li) {
    min-width: 28px;
    height: 28px;
    line-height: 28px;
  }

  .transaction-details :deep(.el-descriptions) {
    font-size: 12px;
  }

  .transaction-details :deep(.el-descriptions__label) {
    font-size: 11px;
  }

  .transaction-details :deep(.el-descriptions__content) {
    font-size: 11px;
  }

  .transaction-details :deep(.el-descriptions-item__cell) {
    padding: 8px 12px;
  }
}

@media (max-width: 360px) {
  .header-content {
    padding: 12px 8px;
  }

  .mobile-cards {
    gap: 8px;
  }

  .transaction-card {
    padding: 8px;
  }

  .info-row {
    margin-bottom: 4px;
  }

  .card-actions .el-button {
    font-size: 11px;
    padding: 5px 10px;
  }
}

/* Loading states */
.el-table.is-loading {
  position: relative;
}

.mobile-cards.is-loading {
  opacity: 0.6;
  pointer-events: none;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #606266;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Status tags responsive */
@media (max-width: 480px) {
  :deep(.el-tag) {
    font-size: 11px;
    padding: 2px 6px;
    height: auto;
    line-height: 1.2;
  }
}
</style>