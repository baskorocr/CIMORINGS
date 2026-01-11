<template>
  <el-container class="layout-container">
    <!-- Mobile Menu Toggle -->
    <div class="mobile-menu-toggle" @click="toggleMobileMenu">
      <el-icon><Menu /></el-icon>
    </div>

    <!-- Sidebar -->
    <el-aside 
      :width="sidebarWidth" 
      class="sidebar"
      :class="{ 'mobile-open': mobileMenuOpen }"
    >
      <div class="logo">
        <div class="logo-icon">
          <el-icon><Lightning /></el-icon>
        </div>
        <h2 v-if="!isCollapsed">CIMORINGS</h2>
      </div>
      
      <el-menu
        :default-active="$route.path"
        router
        :collapse="isCollapsed"
        background-color="transparent"
        text-color="rgba(255,255,255,0.8)"
        active-text-color="#ffffff"
        class="sidebar-menu"
      >
        <el-menu-item index="/" class="menu-item">
          <el-icon><Odometer /></el-icon>
          <template #title>
            <span>Dashboard</span>
          </template>
        </el-menu-item>
        
        <el-menu-item index="/stations" v-can="'stations.view'" class="menu-item">
          <el-icon><Position /></el-icon>
          <template #title>
            <span>Stations</span>
          </template>
        </el-menu-item>
        
        <el-menu-item index="/monitoring" v-can="'monitoring.view'" class="menu-item">
          <el-icon><Monitor /></el-icon>
          <template #title>
            <span>Monitoring</span>
          </template>
        </el-menu-item>
        
        <el-menu-item index="/transactions" v-can="'transactions.view'" class="menu-item">
          <el-icon><List /></el-icon>
          <template #title>
            <span>Transactions</span>
          </template>
        </el-menu-item>
        
        <el-menu-item index="/reservations" v-can="'view_reservations'" class="menu-item">
          <el-icon><Timer /></el-icon>
          <template #title>
            <span>Reservations</span>
          </template>
        </el-menu-item>
        
        <el-menu-item index="/users" v-can="'users.view'" class="menu-item">
          <el-icon><User /></el-icon>
          <template #title>
            <span>Users</span>
          </template>
        </el-menu-item>
      </el-menu>

      <!-- Collapse Toggle -->
      <div class="sidebar-toggle" @click="toggleSidebar" v-if="!isMobile">
        <el-icon><ArrowLeft v-if="!isCollapsed" /><ArrowRight v-else /></el-icon>
      </div>
    </el-aside>

    <!-- Mobile Overlay -->
    <div 
      class="mobile-overlay" 
      v-if="mobileMenuOpen" 
      @click="closeMobileMenu"
    ></div>
    
    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <div class="breadcrumb">
            <h3>{{ pageTitle }}</h3>
            <p class="page-subtitle">{{ pageSubtitle }}</p>
          </div>
        </div>
        
        <div class="header-right">
          <!-- Notifications -->
          <el-badge :value="notificationCount" class="notification-badge" v-if="notificationCount > 0">
            <el-button circle class="header-btn">
              <el-icon><Bell /></el-icon>
            </el-button>
          </el-badge>
          <el-button circle class="header-btn" v-else>
            <el-icon><Bell /></el-icon>
          </el-button>

          <!-- User Dropdown -->
          <el-dropdown @command="handleCommand" class="user-dropdown">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="user-details" v-if="!isMobile">
                <span class="username">{{ user?.username }}</span>
                <span class="user-role">{{ user?.role || 'Admin' }}</span>
              </div>
              <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  Profile
                </el-dropdown-item>
                <el-dropdown-item command="docs">
                  <el-icon><Document /></el-icon>
                  API Docs
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>
                  Settings
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  Logout
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <transition name="fade" mode="out-in">
          <slot />
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'Layout',
  
  data() {
    return {
      isCollapsed: false,
      isMobile: false,
      mobileMenuOpen: false,
      notificationCount: 3
    }
  },

  computed: {
    ...mapState(['user']),
    
    sidebarWidth() {
      if (this.isMobile) {
        return '250px'
      }
      return this.isCollapsed ? '64px' : '250px'
    },
    
    pageTitle() {
      const routeNames = {
        '/': 'Dashboard',
        '/stations': 'Charging Stations',
        '/transactions': 'Transaction History',
        '/reservations': 'Reservations Management',
        '/monitoring': 'Real-time Monitoring',
        '/users': 'User Management'
      }
      return routeNames[this.$route.path] || 'CIMORINGS'
    },

    pageSubtitle() {
      const subtitles = {
        '/': 'Overview of your charging network',
        '/stations': 'Manage your charging stations',
        '/transactions': 'View all charging transactions',
        '/reservations': 'Manage station reservations',
        '/monitoring': 'Monitor stations in real-time',
        '/users': 'Manage system users and permissions'
      }
      return subtitles[this.$route.path] || 'Charging Integration Monitoring System'
    }
  },
  
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    // Force check after a short delay to ensure proper detection
    setTimeout(() => {
      this.checkMobile()
    }, 100)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  
  methods: {
    ...mapActions(['logout']),
    
    handleCommand(command) {
      if (command === 'logout') {
        this.logout()
        this.$router.push('/login')
      } else if (command === 'profile') {
        this.$router.push('/profile')
      } else if (command === 'docs') {
        this.$router.push('/docs')
      } else if (command === 'settings') {
        this.$router.push('/profile')
      }
    },

    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed
    },

    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen
    },

    closeMobileMenu() {
      this.mobileMenuOpen = false
    },

    checkMobile() {
      this.isMobile = window.innerWidth <= 768
      if (!this.isMobile) {
        this.mobileMenuOpen = false
      }
      console.log('Mobile check:', this.isMobile, 'Width:', window.innerWidth)
    }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* Sidebar Styles */
.sidebar {
  background: linear-gradient(180deg, #1a1d29 0%, #2d3748 100%);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1000;
}


.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
}

/* Collapsed logo state */
.sidebar-menu.el-menu--collapse ~ .logo,
.el-menu--collapse + .logo {
  padding: 20px 10px;
  gap: 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.logo h2 {
  color: #ffffff;
  margin: 0;
  font-weight: 600;
  font-size: 18px;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  border: none;
  padding: 20px 0;
}

.menu-item {
  margin: 5px 15px;
  border-radius: 10px;
  transition: all 0.3s ease;
}

/* Collapsed state adjustments */
.sidebar-menu.el-menu--collapse .menu-item {
  margin: 5px 0;
  text-align: center;
  padding: 0 !important;
}

.sidebar-menu.el-menu--collapse .menu-item .el-icon {
  margin-right: 0 !important;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: translateX(5px);
}

.sidebar-menu.el-menu--collapse .menu-item:hover {
  transform: none;
}

.menu-item.is-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.sidebar-toggle {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.8);
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Mobile Menu Toggle */
.mobile-menu-toggle {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 1002;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* Header Styles */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 100;
}

.header-left .breadcrumb h3 {
  margin: 0;
  color: #2d3748;
  font-size: 24px;
  font-weight: 600;
}

.page-subtitle {
  margin: 0;
  color: #718096;
  font-size: 14px;
  margin-top: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-btn {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #4a5568;
  transition: all 0.3s ease;
}

.header-btn:hover {
  background: #f7fafc;
  border-color: #667eea;
  color: #667eea;
}

.notification-badge {
  margin-right: 5px;
}

.user-dropdown {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border-radius: 25px;
  transition: all 0.3s ease;
}

.user-info:hover {
  background: rgba(102, 126, 234, 0.1);
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.username {
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
}

.user-role {
  font-size: 12px;
  color: #718096;
}

.dropdown-arrow {
  color: #a0aec0;
  transition: transform 0.3s ease;
}

/* Main Content */
.main-content {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  padding: 30px;
  overflow-y: auto;
  flex: 1;
}

/* Responsive Design */
@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: flex !important;
  }

  .sidebar {
    position: fixed !important;
    height: 100vh !important;
    left: -250px !important;
    transition: left 0.3s ease !important;
    z-index: 1001 !important;
    width: 250px !important;
    top: 0 !important;
  }

  .sidebar.mobile-open {
    left: 0 !important;
  }

  .main-container {
    width: 100% !important;
    margin-left: 0 !important;
  }

  .header {
    padding: 0 20px 0 60px !important;
  }
  
  .main-content {
    padding: 15px !important;
  }
  
  .user-details {
    display: none !important;
  }
  
  .page-subtitle {
    display: none !important;
  }
  
  .header-left .breadcrumb h3 {
    font-size: 18px !important;
  }

  /* Ensure mobile menu works properly */
  .sidebar-toggle {
    display: none !important;
  }

  .logo {
    padding: 15px;
  }

  .logo h2 {
    font-size: 16px !important;
  }

  .menu-item {
    margin: 3px 10px;
  }

  /* Fix mobile menu overlay */
  .mobile-overlay {
    display: block;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0 15px 0 50px !important;
  }
  
  .main-content {
    padding: 10px !important;
  }
  
  .header-left .breadcrumb h3 {
    font-size: 16px !important;
  }

  .logo h2 {
    font-size: 14px !important;
  }

  .logo {
    padding: 12px;
  }

  .mobile-menu-toggle {
    width: 36px;
    height: 36px;
  }

  .header-right {
    gap: 8px;
  }

  .user-avatar {
    width: 28px !important;
    height: 28px !important;
  }
}
</style>