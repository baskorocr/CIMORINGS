<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>CSMS</h1>
        <p>Charging Station Management System</p>
      </div>
      
      <el-form
        ref="loginForm"
        :model="loginData"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginData.username"
            placeholder="Username"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginData.password"
            type="password"
            placeholder="Password"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            Login
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>Default: admin / admin123</p>
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
          { required: true, message: 'Username is required', trigger: 'blur' }
        ],
        password: [
          { required: true, message: 'Password is required', trigger: 'blur' }
        ]
      }
    }
  },
  
  computed: {
    ...mapState(['loading'])
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
          ElMessage.success('Login successful')
          this.$router.push('/')
        } else {
          console.log('Login failed:', result.message)
          ElMessage.error(result.message)
        }
      } catch (error) {
        console.error('Login error:', error)
        ElMessage.error('Login failed')
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
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 2.5em;
  font-weight: bold;
}

.login-header p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
}

.login-footer {
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>