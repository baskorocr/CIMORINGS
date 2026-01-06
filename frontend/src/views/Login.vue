<template>
  <div class="login-container">
    <!-- Background Animation -->
    <div class="background-animation">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
        <div class="shape shape-5"></div>
      </div>
    </div>

    <!-- Login Card -->
    <div class="login-card">
      <div class="login-header">
        <div class="logo-container">
          <div class="logo-icon">
            <el-icon><Lightning /></el-icon>
          </div>
          <div class="logo-text">
            <h1>CIMORINGS</h1>
            <p class="mobile-hidden">Charging Integration Monitoring System</p>
            <p class="mobile-only">CSMS</p>
          </div>
        </div>
      </div>
      
      <el-form
        ref="loginForm"
        :model="loginData"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <div class="form-group">
          <label class="form-label">Username</label>
          <el-form-item prop="username">
            <el-input
              v-model="loginData.username"
              placeholder="Enter your username"
              size="large"
              class="custom-input"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <el-form-item prop="password">
            <el-input
              v-model="loginData.password"
              type="password"
              placeholder="Enter your password"
              size="large"
              class="custom-input"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </div>
        
        <el-form-item class="login-button-container">
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            <span v-if="!loading">Sign In</span>
            <span v-else>Signing In...</span>
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <div class="demo-credentials">
          <div class="demo-title">Demo Credentials</div>
          <div class="demo-info">
            <span class="demo-label">Username:</span> admin
          </div>
          <div class="demo-info">
            <span class="demo-label">Password:</span> admin123
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="features-section mobile-hidden">
      <div class="feature-item">
        <div class="feature-icon">
          <el-icon><Monitor /></el-icon>
        </div>
        <div class="feature-text">
          <h3>Real-time Monitoring</h3>
          <p>Monitor your charging stations in real-time</p>
        </div>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">
          <el-icon><Position /></el-icon>
        </div>
        <div class="feature-text">
          <h3>Station Management</h3>
          <p>Manage all your charging stations from one place</p>
        </div>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">
          <el-icon><List /></el-icon>
        </div>
        <div class="feature-text">
          <h3>Transaction History</h3>
          <p>Track all charging transactions and analytics</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { ElMessage } from 'element-plus'

export default {
  name: 'Login',
  data() {
    return {
      loginData: {
        username: '',
        password: ''
      },
      rules: {
        username: [
          { required: true, message: 'Username is required', trigger: 'blur' },
          { min: 3, message: 'Username must be at least 3 characters', trigger: 'blur' }
        ],
        password: [
          { required: true, message: 'Password is required', trigger: 'blur' },
          { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
        ]
      }
    }
  },
  
  computed: {
    ...mapState(['loading'])
  },

  mounted() {
    // Auto-fill demo credentials for easier testing
    this.loginData.username = 'admin'
    this.loginData.password = 'admin123'
  },
  
  methods: {
    ...mapActions(['login']),
    
    async handleLogin() {
      try {
        await this.$refs.loginForm.validate()
        console.log('Attempting login with:', this.loginData.username)
        const result = await this.login(this.loginData)
        
        console.log('Login result:', result)
        
        if (result.success) {
          console.log('Login successful, user:', this.$store.state.user)
          ElMessage.success('Welcome back!')
          this.$router.push('/')
        } else {
          console.log('Login failed:', result.message)
          ElMessage.error(result.message || 'Invalid credentials')
        }
      } catch (error) {
        console.error('Login error:', error)
        if (error.response?.status === 401) {
          ElMessage.error('Invalid username or password')
        } else {
          ElMessage.error('Connection failed. Please try again.')
        }
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

/* Background Animation */
.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.floating-shapes {
  position: relative;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 60%;
  left: 80%;
  animation-delay: 2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  top: 80%;
  left: 20%;
  animation-delay: 4s;
}

.shape-4 {
  width: 100px;
  height: 100px;
  top: 10%;
  left: 70%;
  animation-delay: 1s;
}

.shape-5 {
  width: 40px;
  height: 40px;
  top: 40%;
  left: 5%;
  animation-delay: 3s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 1;
  }
}

/* Login Card */
.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  position: relative;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.logo-text h1 {
  color: #2d3748;
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.logo-text p {
  color: #718096;
  margin: 4px 0 0 0;
  font-size: 14px;
  font-weight: 500;
}

/* Form Styles */
.login-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: #4a5568;
  font-weight: 600;
  font-size: 14px;
}

.custom-input {
  --el-input-border-radius: 12px;
  --el-input-border-color: #e2e8f0;
  --el-input-focus-border-color: #667eea;
}

.custom-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.custom-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.custom-input :deep(.el-input__prefix) {
  color: #a0aec0;
}

.login-button-container {
  margin-bottom: 0;
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.login-button:active {
  transform: translateY(0);
}

/* Footer */
.login-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.demo-credentials {
  background: #f7fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.demo-title {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
  font-size: 14px;
}

.demo-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 13px;
}

.demo-label {
  color: #718096;
  font-weight: 500;
}

/* Features Section */
.features-section {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 40px;
  z-index: 5;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  opacity: 0.9;
}

.feature-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  backdrop-filter: blur(10px);
}

.feature-text h3 {
  margin: 0 0 2px 0;
  font-size: 14px;
  font-weight: 600;
}

.feature-text p {
  margin: 0;
  font-size: 12px;
  opacity: 0.8;
}

/* Responsive Design */
@media (max-width: 768px) {
  .login-container {
    padding: 10px;
  }

  .login-card {
    padding: 25px 20px;
    max-width: 100%;
    margin: 0 auto;
  }

  .logo-icon {
    width: 60px;
    height: 60px;
    font-size: 28px;
  }

  .logo-text h1 {
    font-size: 22px;
  }

  .logo-text p {
    font-size: 13px;
  }

  .features-section {
    display: none;
  }

  .shape {
    display: none;
  }

  .form-label {
    font-size: 13px;
  }

  .login-button {
    height: 44px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 5px;
  }

  .login-card {
    padding: 20px 15px;
    border-radius: 12px;
    margin: 10px auto;
  }

  .logo-icon {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }

  .logo-text h1 {
    font-size: 18px;
  }

  .logo-text p {
    font-size: 12px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .custom-input :deep(.el-input__wrapper) {
    padding: 10px 14px;
  }

  .login-button {
    height: 40px;
    font-size: 14px;
  }

  .demo-credentials {
    padding: 12px;
  }

  .demo-title {
    font-size: 13px;
  }

  .demo-info {
    font-size: 12px;
  }
}

@media (max-width: 360px) {
  .login-card {
    padding: 15px 10px;
  }

  .logo-text h1 {
    font-size: 16px;
  }

  .custom-input :deep(.el-input__wrapper) {
    padding: 8px 12px;
  }

  .login-button {
    height: 38px;
    font-size: 13px;
  }
}

/* Loading Animation */
.login-button.is-loading {
  pointer-events: none;
}

.login-button.is-loading :deep(.el-loading-spinner) {
  margin-top: -10px;
}

/* Form Validation Styles */
:deep(.el-form-item.is-error .el-input__wrapper) {
  border-color: #f56565 !important;
  box-shadow: 0 2px 8px rgba(245, 101, 101, 0.15) !important;
}

:deep(.el-form-item__error) {
  font-size: 12px;
  margin-top: 4px;
}
</style>