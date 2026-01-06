<template>
  <div id="app">
    <keep-alive include="Monitoring">
      <router-view />
    </keep-alive>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  width: 100%;
  height: 100%;
}

#app {
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Global responsive utilities */
.mobile-hidden {
  display: block;
}

.mobile-only {
  display: none;
}

/* Element Plus responsive overrides */
.el-table {
  font-size: 14px;
}

.el-card {
  margin-bottom: 15px;
}

.el-form-item {
  margin-bottom: 18px;
}

.el-button {
  min-width: auto;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Animation utilities */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .mobile-hidden {
    display: none !important;
  }
  
  .mobile-only {
    display: block !important;
  }
  
  .el-table {
    font-size: 12px;
  }
  
  .el-table .cell {
    padding: 5px 8px;
  }
  
  .el-card {
    margin-bottom: 10px;
  }
  
  .el-card .el-card__body {
    padding: 15px;
  }
  
  .el-form-item {
    margin-bottom: 15px;
  }
  
  .el-button {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .el-button--small {
    padding: 6px 10px;
    font-size: 11px;
  }
  
  .el-input {
    font-size: 14px;
  }
  
  .el-select {
    width: 100%;
  }
  
  .el-dialog {
    width: 95% !important;
    margin: 0 auto !important;
  }
  
  .el-message-box {
    width: 90% !important;
  }
}

@media (max-width: 480px) {
  .el-table {
    font-size: 11px;
  }
  
  .el-card .el-card__body {
    padding: 10px;
  }
  
  .el-button {
    padding: 6px 10px;
    font-size: 11px;
  }
  
  .el-form-item__label {
    font-size: 13px;
  }
  
  .el-input {
    font-size: 13px;
  }
}
</style>