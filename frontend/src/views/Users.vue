<template>
  <Layout>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="Users" name="users">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>User Management</span>
              <el-button 
                v-if="can('users.create')"
                type="primary" 
                @click="showCreateDialog = true"
              >
                Add User
              </el-button>
            </div>
          </template>

          <el-table :data="users" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="Username" />
            <el-table-column prop="email" label="Email" />
            <el-table-column label="Roles">
              <template #default="{ row }">
                <el-tag 
                  v-for="role in row.roles" 
                  :key="role" 
                  size="small" 
                  class="mr-1"
                >
                  {{ getRoleName(role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="Created" width="120">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="250">
              <template #default="{ row }">
                <el-button 
                  v-if="can('users.edit')"
                  size="small" 
                  @click="editUser(row)"
                >
                  Edit
                </el-button>
                <el-button 
                  v-if="can('users.edit')"
                  size="small" 
                  type="warning"
                  @click="manageRoles(row)"
                >
                  Roles
                </el-button>
                <el-button 
                  v-if="can('users.delete')"
                  size="small" 
                  type="danger" 
                  @click="deleteUser(row)"
                >
                  Delete
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="pagination.page"
            :page-size="pagination.limit"
            :total="pagination.total"
            @current-change="handlePageChange"
            layout="prev, pager, next, total"
            class="mt-4"
          />
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="Roles" name="roles" v-if="can('users.view')">
        <DynamicRoleManager />
      </el-tab-pane>
      <el-tab-pane label="Permissions" name="permissions" v-if="can('users.view')">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Permission Management</span>
              <el-button 
                type="primary" 
                @click="showPermissionDialog = true"
              >
                Add Permission
              </el-button>
            </div>
          </template>

          <el-table :data="permissions" v-loading="loadingPermissions">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="Permission Name" />
            <el-table-column prop="description" label="Description" />
            <el-table-column prop="created_at" label="Created" width="120">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="150">
              <template #default="{ row }">
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deletePermission(row)"
                >
                  Delete
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Permission Dialog -->
    <el-dialog 
      v-model="showPermissionDialog" 
      title="Add New Permission"
      width="500px"
    >
      <el-form :model="permissionForm" label-width="120px">
        <el-form-item label="Permission Name">
          <el-input v-model="permissionForm.name" placeholder="e.g., feature.view" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="permissionForm.description" placeholder="Description of the permission" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showPermissionDialog = false">Cancel</el-button>
        <el-button type="primary" @click="savePermission">
          Create
        </el-button>
      </template>
    </el-dialog>

    <!-- Create/Edit User Dialog -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingUser ? 'Edit User' : 'Create User'"
      width="500px"
    >
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="Username">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="userForm.email" type="email" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="Password">
          <el-input v-model="userForm.password" type="password" />
        </el-form-item>
        <el-form-item label="Roles">
          <el-select v-model="userForm.roles" multiple placeholder="Select roles">
            <el-option 
              v-for="role in availableRoles" 
              :key="role.name"
              :label="role.display_name" 
              :value="role.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Cancel</el-button>
        <el-button type="primary" @click="saveUser">
          {{ editingUser ? 'Update' : 'Create' }}
        </el-button>
      </template>
    </el-dialog>
    
    <!-- Role Permission Manager -->
    <RolePermissionManager 
      :visible="showRoleDialog"
      :user="selectedUser"
      @close="showRoleDialog = false"
      @updated="fetchUsers"
    />
  </Layout>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import { authAPI, roleAPI } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '@/components/Layout.vue'
import RolePermissionManager from '@/views/RolePermissionManager.vue'
import DynamicRoleManager from '@/views/DynamicRoleManager.vue'

export default {
  components: {
    Layout,
    RolePermissionManager,
    DynamicRoleManager
  },
  data() {
    return {
      activeTab: 'users',
      showCreateDialog: false,
      showRoleDialog: false,
      showPermissionDialog: false,
      editingUser: null,
      selectedUser: null,
      userForm: {
        username: '',
        email: '',
        password: '',
        roles: []
      },
      permissionForm: {
        name: '',
        description: ''
      },
      availableRoles: [],
      permissions: [],
      loadingPermissions: false
    }
  },
  
  computed: {
    ...mapState(['users', 'usersPagination', 'loading']),
    ...mapGetters(['can']),
    
    pagination() {
      return this.usersPagination
    }
  },
  
  mounted() {
    this.fetchUsers()
    this.fetchRoles()
    this.fetchPermissions()
  },
  
  methods: {
    ...mapActions(['fetchUsers']),
    
    handlePageChange(page) {
      this.fetchUsers({ page })
    },
    
    getRoleName(roleKey) {
      const role = this.availableRoles.find(r => r.name === roleKey)
      return role ? role.display_name : roleKey
    },
    
    async fetchRoles() {
      try {
        const response = await roleAPI.getRoles()
        this.availableRoles = response.data
      } catch (error) {
        console.error('Failed to fetch roles:', error)
        ElMessage.error('Failed to load roles')
      }
    },
    
    async fetchPermissions() {
      try {
        this.loadingPermissions = true
        const response = await roleAPI.getPermissions()
        this.permissions = response.data
      } catch (error) {
        console.error('Failed to fetch permissions:', error)
        ElMessage.error('Failed to load permissions')
      } finally {
        this.loadingPermissions = false
      }
    },
    
    async savePermission() {
      try {
        await roleAPI.createPermission(this.permissionForm)
        ElMessage.success('Permission created successfully')
        this.showPermissionDialog = false
        this.resetPermissionForm()
        this.fetchPermissions()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Failed to create permission')
      }
    },
    
    async deletePermission(permission) {
      try {
        await ElMessageBox.confirm(
          `Are you sure you want to delete permission "${permission.name}"?`,
          'Confirm Delete',
          { type: 'warning' }
        )
        
        await roleAPI.deletePermission(permission.id)
        ElMessage.success('Permission deleted successfully')
        this.fetchPermissions()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || 'Delete failed')
        }
      }
    },
    
    resetPermissionForm() {
      this.permissionForm = {
        name: '',
        description: ''
      }
    },
    
    formatDate(date) {
      return new Date(date).toLocaleDateString()
    },
    
    manageRoles(user) {
      this.selectedUser = { ...user }
      this.showRoleDialog = true
    },
    
    editUser(user) {
      this.editingUser = user
      this.userForm = {
        username: user.username,
        email: user.email,
        password: '',
        roles: user.roles || []
      }
      this.showCreateDialog = true
    },
    
    async saveUser() {
      try {
        if (this.editingUser) {
          // For edit, send all data including roles
          await authAPI.updateUser(this.editingUser.id, this.userForm)
          ElMessage.success('User updated successfully')
        } else {
          await authAPI.createUser(this.userForm)
          ElMessage.success('User created successfully')
        }
        
        this.showCreateDialog = false
        this.resetForm()
        this.fetchUsers()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Operation failed')
      }
    },
    
    async deleteUser(user) {
      try {
        await ElMessageBox.confirm(
          `Are you sure you want to delete user "${user.username}"?`,
          'Confirm Delete',
          { type: 'warning' }
        )
        
        await authAPI.deleteUser(user.id)
        ElMessage.success('User deleted successfully')
        this.fetchUsers()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || 'Delete failed')
        }
      }
    },
    
    resetForm() {
      this.editingUser = null
      this.userForm = {
        username: '',
        email: '',
        password: '',
        roles: []
      }
    }
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mr-1 {
  margin-right: 4px;
}

.mt-4 {
  margin-top: 16px;
}
</style>