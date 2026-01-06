<template>
  <div class="role-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Dynamic Role Management</span>
          <el-button type="primary" @click="showCreateDialog = true">
            Create Role
          </el-button>
        </div>
      </template>

      <el-table :data="roles" v-loading="loading">
        <el-table-column prop="name" label="Role Name" width="150" />
        <el-table-column prop="display_name" label="Display Name" width="200" />
        <el-table-column prop="description" label="Description" />
        <el-table-column label="Permissions" width="300">
          <template #default="{ row }">
            <el-tag 
              v-for="permission in row.permissions.slice(0, 3)" 
              :key="permission"
              size="small" 
              class="mr-1"
            >
              {{ getPermissionDisplay(permission) }}
            </el-tag>
            <el-tag 
              v-if="row.permissions.length > 3"
              size="small"
              type="info"
            >
              +{{ row.permissions.length - 3 }} more
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)">Edit</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteRole(row)"
              :disabled="row.user_count > 0 || isProtectedRole(row.name)"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Role Dialog -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingRole ? 'Edit Role' : 'Create Role'"
      width="600px"
    >
      <el-form :model="roleForm" label-width="120px">
        <el-form-item label="Role Name">
          <el-input 
            v-model="roleForm.name" 
            :disabled="!!editingRole"
            placeholder="e.g., manager"
          />
        </el-form-item>
        <el-form-item label="Display Name">
          <el-input 
            v-model="roleForm.display_name" 
            placeholder="e.g., Manager"
          />
        </el-form-item>
        <el-form-item label="Description">
          <el-input 
            v-model="roleForm.description" 
            type="textarea"
            placeholder="Role description"
          />
        </el-form-item>
        <el-form-item label="Permissions">
          <div v-for="(groupPerms, groupName) in groupedPermissions" :key="groupName">
            <h4>{{ groupName }}</h4>
            <el-checkbox-group v-model="roleForm.permissions">
              <el-checkbox 
                v-for="permission in groupPerms" 
                :key="permission.name"
                :label="permission.name"
              >
                {{ permission.display_name }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Cancel</el-button>
        <el-button type="primary" @click="saveRole" :loading="saving">
          {{ editingRole ? 'Update' : 'Create' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { roleAPI } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  data() {
    return {
      roles: [],
      permissions: {},
      groupedPermissions: {},
      loading: false,
      saving: false,
      showCreateDialog: false,
      editingRole: null,
      roleForm: {
        name: '',
        display_name: '',
        description: '',
        permissions: []
      }
    }
  },
  
  mounted() {
    this.fetchRoles()
    this.fetchPermissions()
  },
  
  methods: {
    isProtectedRole(roleName) {
      const protectedRoles = ['admin', 'super_admin'];
      return protectedRoles.includes(roleName);
    },
    
    async fetchRoles() {
      try {
        this.loading = true
        const response = await roleAPI.getRoles()
        this.roles = response.data
      } catch (error) {
        ElMessage.error('Failed to fetch roles')
      } finally {
        this.loading = false
      }
    },
    
    async fetchPermissions() {
      try {
        const response = await roleAPI.getPermissions()
        // Group permissions by category
        const permissions = response.data
        this.groupedPermissions = permissions.reduce((groups, perm) => {
          const category = perm.name.split('.')[0] // e.g., 'users' from 'users.view'
          if (!groups[category]) groups[category] = []
          groups[category].push({
            name: perm.name,
            display_name: perm.description || perm.name
          })
          return groups
        }, {})
      } catch (error) {
        ElMessage.error('Failed to fetch permissions')
      }
    },
    
    getPermissionDisplay(permissionName) {
      for (const group of Object.values(this.groupedPermissions)) {
        if (Array.isArray(group)) {
          const perm = group.find(p => p.name === permissionName)
          if (perm) return perm.display_name
        }
      }
      return permissionName
    },
    
    editRole(role) {
      this.editingRole = role
      this.roleForm = {
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        permissions: [...role.permissions]
      }
      this.showCreateDialog = true
    },
    
    async saveRole() {
      try {
        this.saving = true
        
        if (this.editingRole) {
          await roleAPI.updateRole(this.editingRole.id, this.roleForm)
          ElMessage.success('Role updated successfully')
        } else {
          await roleAPI.createRole(this.roleForm)
          ElMessage.success('Role created successfully')
        }
        
        this.showCreateDialog = false
        this.resetForm()
        this.fetchRoles()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Operation failed')
      } finally {
        this.saving = false
      }
    },
    
    async deleteRole(role) {
      try {
        await ElMessageBox.confirm(
          `Are you sure you want to delete role "${role.display_name}"?`,
          'Confirm Delete',
          { type: 'warning' }
        )
        
        await roleAPI.deleteRole(role.id)
        ElMessage.success('Role deleted successfully')
        this.fetchRoles()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || 'Delete failed')
        }
      }
    },
    
    resetForm() {
      this.editingRole = null
      this.roleForm = {
        name: '',
        display_name: '',
        description: '',
        permissions: []
      }
    }
  }
}
</script>

<style scoped>
.role-manager {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mr-1 {
  margin-right: 4px;
}

h4 {
  margin: 15px 0 10px 0;
  color: #333;
}
</style>