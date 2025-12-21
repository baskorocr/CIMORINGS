<template>
  <Layout>
    <div class="transactions">
      <div class="page-header">
        <h2>Transactions</h2>
      </div>
      
      <el-card>
        <el-table :data="transactions" v-loading="loading" style="width: 100%">
          <el-table-column prop="transaction_id" label="Transaction ID" />
          <el-table-column prop="station_name" label="Station" />
          <el-table-column prop="connector_id" label="Connector" />
          <el-table-column prop="id_tag" label="ID Tag" />
          <el-table-column prop="meter_start" label="Start (kWh)" />
          <el-table-column prop="meter_stop" label="Stop (kWh)" />
          <el-table-column label="Energy (kWh)">
            <template #default="scope">
              {{ scope.row.meter_stop - scope.row.meter_start }}
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
        
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="transactionsPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
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
      selectedTransaction: null
    }
  },
  
  computed: {
    ...mapState(['transactions', 'transactionsPagination', 'loading'])
  },
  
  async created() {
    await this.loadTransactions()
  },
  
  methods: {
    ...mapActions(['fetchTransactions']),
    
    async loadTransactions() {
      await this.fetchTransactions({ 
        page: this.currentPage, 
        limit: this.pageSize 
      })
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
      if (!timestamp) return null
      return new Date(timestamp).toLocaleString()
    }
  }
}
</script>

<style scoped>
.transactions {
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

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.transaction-details {
  margin-top: 10px;
}
</style>