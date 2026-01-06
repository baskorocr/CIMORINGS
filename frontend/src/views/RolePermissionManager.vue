<template>
  <el-dialog 
    :model-value="visible" 
    @update:model-value="$emit('close')"
    title="Manage User Roles & Permissions"
    width="600px"
  >
    <div v-if="user">
      <h4>User: {{ user.username }}</h4>
      
      <!-- Roles Section -->
      <el-divider content-position="left">Roles</el-divider>
      <div class="roles-section">
        <el-tag 
          v-for="role in user.roles" 
          :key="role"
          closable
          @close="removeRole(role)"
          class="mr-2 mb-2"
        >
          {{ getRoleName(role) }}
        </el-tag>
        
        <el-select 
          v-model="selectedRole" 
          placeholder="Add Role"
          @change="addRole"
          class="ml-2"
          style="width: 150px"
        >
          <el-option 
            v-for="role in availableRoles"
            :key="role.name"
            :label="role.display_name"
            :value="role.name"
            :disabled="user.roles?.includes(role.name)"
          />
        </el-select>
      </div>

      <!-- Direct Permissions Section -->
      <el-divider content-position="left">Direct Permissions</el-divider>
      <div class="permissions-section">
        <el-tag 
          v-for="permission in user.permissions || []"
          :key="permission"
          closable
          @close="removePermission(permission)"
          type="warning"
          class="mr-2 mb-2"
        >
          {{ getPermissionName(permission) }}
        </el-tag>
        
        <el-select 
          v-model="selectedPermission"
          placeholder="Add Permission"
          @change="addPermission"
          class="ml-2"
          style="width: 200px"
        >
          <el-option 
            v-for="permission in availablePermissions"
            :key="permission.name"
            :label="permission.description"
            :value="permission.name"
            :disabled="hasPermission(permission.name)"
          />
        </el-select>
      </div>

      <!-- Effective Permissions Preview -->
      <el-divider content-position="left">Effective Permissions</el-divider>
      <div class="effective-permissions">
        <el-tag 
          v-for="permission in effectivePermissions"
          :key="permission"
          size="small"
          type="info"
          class="mr-1 mb-1"
        >
          {{ getPermissionName(permission) }}
        </el-tag>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('close')">Close</el-button>
      <el-button type="primary" @click="saveChanges" :loading="saving">
        Save Changes
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { authAPI, roleAPI } from '@/services/api'
import { ElMessage } from 'element-plus'

export default {
  props: {
    visible: Boolean,
    user: Object
  },
  
  emits: ['close', 'updated'],
  
  data() {
    return {
      selectedRole: '',
      selectedPermission: '',
      saving: false,
      availableRoles: [],
      availablePermissions: [],
      originalUser: null
    }
  },
  
  computed: {
    effectivePermissions() {
      // Simple calculation of effective permissions
      const permissions = new Set()
      
      // Add direct permissions
      if (this.user?.permissions) {
        this.user.permissions.forEach(p => permissions.add(p))
      }
      
      return Array.from(permissions)
    }
  },
  
  watch: {
    user: {
      handler(newUser) {
        if (newUser) {
          this.originalUser = JSON.parse(JSON.stringify(newUser))
        }
      },
      immediate: true
    },
    
    visible: {
      handler(isVisible) {
        if (isVisible) {
          this.fetchRoles()
          this.fetchPermissions()
        }
      },
      immediate: true
    }
  },
  
  methods: {
    async fetchRoles() {
      try {
        const response = await roleAPI.getRoles()
        this.availableRoles = response.data
      } catch (error) {
        console.error('Failed to fetch roles:', error)
      }
    },
    
    async fetchPermissions() {
      try {
        const response = await roleAPI.getPermissions()
        this.availablePermissions = response.data
      } catch (error) {
        console.error('Failed to fetch permissions:', error)
      }
    },
    
    getRoleName(roleKey) {
      const role = this.availableRoles.find(r => r.name === roleKey)
      return role ? role.display_name : roleKey
    },
    
    getPermissionName(permissionKey) {
      const permission = this.availablePermissions.find(p => p.name === permissionKey)
      return permission ? permission.description : permissionKey
    },
    
    hasPermission(permission) {
      return this.effectivePermissions.includes(permission)
    },
    
    addRole() {
      if (this.selectedRole && !this.user.roles?.includes(this.selectedRole)) {
        if (!this.user.roles) this.user.roles = []
        this.user.roles.push(this.selectedRole)
        this.selectedRole = ''
      }
    },
    
    async removeRole(role) {
      try {
        if (this.user.roles) {
          const index = this.user.roles.indexOf(role)
          if (index > -1) {
            this.user.roles.splice(index, 1)
            // Save changes to server
            await this.saveChanges()
          }
        }
      } catch (error) {
        this.$message.error('Failed to remove role')
      }
    },
    
    addPermission() {
      if (this.selectedPermission && !this.hasPermission(this.selectedPermission)) {
        if (!this.user.permissions) this.user.permissions = []
        if (!this.user.permissions.includes(this.selectedPermission)) {
          this.user.permissions.push(this.selectedPermission)
        }
        this.selectedPermission = ''
      }
    },
    
    async removePermission(permission) {
      try {
        if (this.user.permissions) {
          const index = this.user.permissions.indexOf(permission)
          if (index > -1) {
            this.user.permissions.splice(index, 1)
            // Save changes to server
            await this.saveChanges()
          }
        }
      } catch (error) {
        this.$message.error('Failed to remove permission')
      }
    },
    
    async saveChanges() {
      try {
        this.saving = true
        
        console.log('Original user:', this.originalUser)
        console.log('Current user:', this.user)
        
        // Update roles if changed
        const originalRoles = this.originalUser?.roles || []
        const currentRoles = this.user.roles || []
        
        console.log('Original roles:', originalRoles)
        console.log('Current roles:', currentRoles)
        
        if (JSON.stringify(originalRoles.sort()) !== JSON.stringify(currentRoles.sort())) {
          console.log('Roles changed, calling assignRole API')
          await authAPI.assignRole(this.user.id, currentRoles)
        } else {
          console.log('No role changes detected')
        }
        
        // Update permissions if changed
        const originalPermissions = this.originalUser?.permissions || []
        const currentPermissions = this.user.permissions || []
        
        if (JSON.stringify(originalPermissions.sort()) !== JSON.stringify(currentPermissions.sort())) {
          console.log('Permissions changed, calling givePermission API')
          await authAPI.givePermission(this.user.id, currentPermissions)
        }
        
        ElMessage.success('User roles and permissions updated successfully')
        this.$emit('updated')
        this.$emit('close')
        
      } catch (error) {
        console.error('Save error:', error)
        ElMessage.error(error.response?.data?.message || 'Failed to update user')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.roles-section, .permissions-section {
  min-height: 60px;
  padding: 10px 0;
}

.effective-permissions {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.mr-2 {
  margin-right: 8px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mr-1 {
  margin-right: 4px;
}

.mb-1 {
  margin-bottom: 4px;
}

.ml-2 {
  margin-left: 8px;
}
</style>