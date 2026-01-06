<template>
  <Layout>
    <div class="profile-container">
      <div class="page-header">
        <div class="header-content">
          <h2>Profile Settings</h2>
          <p class="mobile-hidden">Manage your account information</p>
        </div>
      </div>

      <div class="profile-content">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>Personal Information</span>
            </div>
          </template>

          <el-form
            ref="profileForm"
            :model="profileForm"
            :rules="profileRules"
            label-width="120px"
            class="profile-form"
          >
            <el-form-item label="Username" prop="username">
              <el-input 
                v-model="profileForm.username" 
                placeholder="Enter username"
              />
            </el-form-item>

            <el-form-item label="Email" prop="email">
              <el-input 
                v-model="profileForm.email" 
                type="email"
                placeholder="Enter email address"
              />
            </el-form-item>

            <el-form-item label="Current Password" prop="currentPassword">
              <el-input 
                v-model="profileForm.currentPassword" 
                type="password"
                placeholder="Enter current password to confirm changes"
                show-password
              />
            </el-form-item>

            <el-divider>Change Password (Optional)</el-divider>

            <el-form-item label="New Password" prop="newPassword">
              <el-input 
                v-model="profileForm.newPassword" 
                type="password"
                placeholder="Leave empty to keep current password"
                show-password
              />
            </el-form-item>

            <el-form-item label="Confirm Password" prop="confirmPassword">
              <el-input 
                v-model="profileForm.confirmPassword" 
                type="password"
                placeholder="Confirm new password"
                show-password
              />
            </el-form-item>

            <el-form-item class="form-actions">
              <el-button type="primary" @click="updateProfile" :loading="loading">
                Update Profile
              </el-button>
              <el-button @click="resetForm">
                Reset
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Account Info Card -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>Account Information</span>
            </div>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="User ID">
              {{ user?.id }}
            </el-descriptions-item>
            <el-descriptions-item label="Current Username">
              {{ user?.username }}
            </el-descriptions-item>
            <el-descriptions-item label="Current Email">
              {{ user?.email }}
            </el-descriptions-item>
            <el-descriptions-item label="Roles">
              <el-tag 
                v-for="role in user?.roles" 
                :key="role" 
                size="small" 
                class="role-tag"
              >
                {{ role }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Account Created">
              {{ formatDate(user?.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>
  </Layout>
</template>

<script>
import { mapState } from 'vuex'
import Layout from '@/components/Layout.vue'
import { authAPI } from '@/services/api'
import { ElMessage } from 'element-plus'

export default {
  name: 'Profile',
  components: {
    Layout
  },

  data() {
    return {
      loading: false,
      profileForm: {
        username: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      profileRules: {
        username: [
          { required: true, message: 'Username is required', trigger: 'blur' },
          { min: 3, max: 50, message: 'Username must be 3-50 characters', trigger: 'blur' }
        ],
        email: [
          { required: true, message: 'Email is required', trigger: 'blur' },
          { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
        ],
        currentPassword: [
          { required: true, message: 'Current password is required to save changes', trigger: 'blur' }
        ],
        newPassword: [
          { min: 6, message: 'New password must be at least 6 characters', trigger: 'blur' }
        ],
        confirmPassword: [
          { 
            validator: (rule, value, callback) => {
              if (this.profileForm.newPassword && value !== this.profileForm.newPassword) {
                callback(new Error('Passwords do not match'))
              } else {
                callback()
              }
            }, 
            trigger: 'blur' 
          }
        ]
      }
    }
  },

  computed: {
    ...mapState(['user'])
  },

  mounted() {
    this.loadUserData()
  },

  methods: {
    loadUserData() {
      if (this.user) {
        this.profileForm.username = this.user.username
        this.profileForm.email = this.user.email
      }
    },

    async updateProfile() {
      try {
        await this.$refs.profileForm.validate()
        
        this.loading = true
        
        const updateData = {
          username: this.profileForm.username,
          email: this.profileForm.email,
          currentPassword: this.profileForm.currentPassword
        }

        // Only include new password if provided
        if (this.profileForm.newPassword) {
          updateData.newPassword = this.profileForm.newPassword
        }

        const response = await authAPI.updateProfile(updateData)
        
        // Update token and user data in store
        if (response.data.token) {
          localStorage.setItem('token', response.data.token)
          this.$store.commit('SET_TOKEN', response.data.token)
          this.$store.commit('SET_USER', response.data.user)
        }
        
        ElMessage.success('Profile updated successfully')
        
        // Clear password fields
        this.profileForm.currentPassword = ''
        this.profileForm.newPassword = ''
        this.profileForm.confirmPassword = ''
        
        // Reload user data
        this.loadUserData()
        
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Failed to update profile')
      } finally {
        this.loading = false
      }
    },

    resetForm() {
      this.loadUserData()
      this.profileForm.currentPassword = ''
      this.profileForm.newPassword = ''
      this.profileForm.confirmPassword = ''
      this.$refs.profileForm?.clearValidate()
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.header-content {
  padding: 25px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.header-content h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.header-content p {
  margin: 0;
  color: #718096;
  font-size: 16px;
}

.profile-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.profile-card, .info-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

.profile-form {
  padding: 20px 0;
}

.profile-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.profile-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #4a5568;
}

.profile-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.form-actions {
  margin-top: 30px;
  text-align: center;
}

.form-actions :deep(.el-form-item__content) {
  justify-content: center;
  gap: 12px;
}

.role-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

.info-card :deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

.info-card :deep(.el-descriptions__label) {
  font-weight: 600;
  color: #4a5568;
}

.info-card :deep(.el-descriptions__content) {
  color: #2d3748;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .profile-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .profile-container {
    padding: 0;
  }

  .header-content {
    padding: 20px 15px;
  }

  .header-content h2 {
    font-size: 20px;
  }

  .header-content p {
    font-size: 14px;
  }

  .profile-content {
    gap: 15px;
  }

  .profile-card :deep(.el-card__body),
  .info-card :deep(.el-card__body) {
    padding: 16px;
  }

  .profile-form {
    padding: 10px 0;
  }

  .profile-form :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  .profile-form :deep(.el-form-item__label) {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 15px 10px;
  }

  .header-content h2 {
    font-size: 18px;
  }

  .profile-card :deep(.el-card__body),
  .info-card :deep(.el-card__body) {
    padding: 12px;
  }

  .profile-form :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  .profile-form :deep(.el-form-item__label) {
    font-size: 13px;
  }

  .form-actions :deep(.el-form-item__content) {
    flex-direction: column;
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>
