<template>
  <el-container class="layout-container">
    <el-aside width="250px" class="sidebar">
      <div class="logo">
        <h2>CSMS</h2>
      </div>
      
      <el-menu
        :default-active="$route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><Odometer /></el-icon>
          <span>Dashboard</span>
        </el-menu-item>
        
        <el-menu-item index="/stations" v-can="'stations.view'">
          <el-icon><Position /></el-icon>
          <span>Stations</span>
        </el-menu-item>
        
        <el-menu-item index="/monitoring" v-can="'monitoring.view'">
          <el-icon><Monitor /></el-icon>
          <span>Monitoring</span>
        </el-menu-item>
        
        <el-menu-item index="/transactions" v-can="'transactions.view'">
          <el-icon><List /></el-icon>
          <span>Transactions</span>
        </el-menu-item>
        
        <el-menu-item index="/users" v-can="'users.view'">
          <el-icon><User /></el-icon>
          <span>Users</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h3>{{ pageTitle }}</h3>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-icon><User /></el-icon>
              {{ user?.username }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'Layout',
  
  computed: {
    ...mapState(['user']),
    
    pageTitle() {
      const routeNames = {
        '/': 'Dashboard',
        '/stations': 'Stations',
        '/transactions': 'Transactions',
        '/monitoring': 'Monitoring',
        '/users': 'Users'
      }
      return routeNames[this.$route.path] || 'CSMS'
    }
  },
  
  methods: {
    ...mapActions(['logout']),
    
    handleCommand(command) {
      if (command === 'logout') {
        this.logout()
        this.$router.push('/login')
      }
    }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #434a50;
}

.logo h2 {
  color: #bfcbd9;
  margin: 0;
  font-weight: bold;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left h3 {
  margin: 0;
  color: #333;
}

.user-dropdown {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #333;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>