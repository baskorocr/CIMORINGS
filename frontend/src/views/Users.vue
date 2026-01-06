<template>
  <Layout>
    <div class="users-container">
      <div class="page-header">
        <div class="header-content">
          <h2>User Management</h2>
          <div class="header-actions">
            <el-button 
              v-if="can('users.create')"
              type="primary" 
              @click="showCreateDialog = true"
              size="small"
            >
              <el-icon><Plus /></el-icon>
              <span class="mobile-hidden">Add User</span>
              <span class="mobile-only">Add</span>
            </el-button>
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="management-tabs">
        <el-tab-pane label="Users" name="users">
          <!-- Mobile Cards View -->
          <div class="mobile-cards mobile-only">
            <div 
              v-for="user in users" 
              :key="user.id"
              class="user-card"
            >
              <div class="card-header">
                <div class="user-info">
                  <div class="username">{{ user.username }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
                <div class="user-id">#{{ user.id }}</div>
              </div>
              <div class="card-content">
                <div class="roles-section">
                  <div class="section-label">Roles:</div>
                  <div class="roles-list">
                    <el-tag 
                      v-for="role in user.roles" 
                      :key="role" 
                      size="small" 
                      class="role-tag"
                    >
                      {{ getRoleName(role) }}
                    </el-tag>
                  </div>
                </div>
                <div class="created-date">
                  Created: {{ formatDate(user.created_at) }}
                </div>
              </div>
              <div class="card-actions">
                <el-button 
                  v-if="can('users.edit')"
                  size="small" 
                  @click="editUser(user)"
                >
                  Edit
                </el-button>
                <el-button 
                  v-if="can('users.edit')"
                  size="small" 
                  @click="manageRoles(user)"
                >
                  Roles
                </el-button>
                <el-button 
                  v-if="can('users.delete')"
                  size="small" 
                  type="danger"
                  @click="deleteUser(user)"
                >
                  Delete
                </el-button>
              </div>
            </div>
          </div>

          <!-- Desktop Table View -->
          <el-card class="mobile-hidden">
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

            <div v-loading="loadingPermissions">
              <div 
                v-for="permission in permissions" 
                :key="permission.id"
                class="permission-item"
              >
                <div class="permission-info">
                  <h4>{{ permission.name }}</h4>
                  <p>{{ permission.description }}</p>
                </div>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deletePermission(permission)"
                >
                  Delete
                </el-button>
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>

      <!-- Create/Edit User Dialog -->
      <el-dialog
        v-model="showCreateDialog"
        :title="editingUser ? 'Edit User' : 'Create User'"
        width="500px"
      >
        <el-form
          ref="userForm"
          :model="userForm"
          label-width="120px"
          class="user-form"
        >
          <el-form-item label="Username" required>
            <el-input v-model="userForm.username" />
          </el-form-item>
          
          <el-form-item label="Email" required>
            <el-input v-model="userForm.email" type="email" />
          </el-form-item>
          
          <el-form-item label="Password" :required="!editingUser">
            <el-input 
              v-model="userForm.password" 
              type="password" 
              :placeholder="editingUser ? 'Leave empty to keep current password' : 'Enter password'"
            />
          </el-form-item>
          
          <el-form-item label="Roles">
            <el-select 
              v-model="userForm.roles" 
              multiple 
              placeholder="Select roles"
            >
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
          <div class="dialog-footer">
            <el-button @click="showCreateDialog = false">Cancel</el-button>
            <el-button type="primary" @click="saveUser">
              {{ editingUser ? 'Update' : 'Create' }}
            </el-button>
          </div>
        </template>
      </el-dialog>

      <!-- Add Permission Dialog -->
      <el-dialog
        v-model="showPermissionDialog"
        title="Add Permission"
        width="400px"
      >
        <el-form
          :model="permissionForm"
          label-width="120px"
        >
          <el-form-item label="Name" required>
            <el-input v-model="permissionForm.name" />
          </el-form-item>
          
          <el-form-item label="Description">
            <el-input 
              v-model="permissionForm.description" 
              type="textarea" 
              rows="3"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showPermissionDialog = false">Cancel</el-button>
            <el-button type="primary" @click="savePermission">Create</el-button>
          </div>
        </template>
      </el-dialog>

      <!-- Role Management Dialog -->
      <RolePermissionManager
        v-if="showRoleDialog"
        :visible="showRoleDialog"
        :user="selectedUser"
        @close="showRoleDialog = false"
        @updated="fetchUsers"
      />
    </div>
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
.users-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header Section */
.page-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-content h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Management Tabs */
.management-tabs {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.management-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #f8fafc;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.management-tabs :deep(.el-tabs__content) {
  padding: 24px;
}

/* Mobile Cards */
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.user-card:hover {
  border-color: #cbd5e0;
  background: #f1f5f9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.user-info {
  flex: 1;
}

.username {
  font-weight: 600;
  color: #2d3748;
  font-size: 16px;
  margin-bottom: 4px;
}

.user-email {
  font-size: 13px;
  color: #718096;
}

.user-id {
  font-size: 12px;
  color: #a0aec0;
  font-weight: 500;
}

.card-content {
  margin-bottom: 16px;
}

.roles-section {
  margin-bottom: 12px;
}

.section-label {
  font-size: 13px;
  color: #4a5568;
  font-weight: 500;
  margin-bottom: 6px;
}

.roles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  font-size: 11px;
}

.created-date {
  font-size: 12px;
  color: #718096;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Desktop Table */
.mobile-hidden .el-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

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

/* Form Styles */
.user-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.user-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #4a5568;
}

.user-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.user-form :deep(.el-select) {
  width: 100%;
}

/* Dialog Styles */
:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: #f8fafc;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .users-container {
    padding: 0;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 20px 15px;
  }

  .header-content h2 {
    font-size: 20px;
  }

  .management-tabs :deep(.el-tabs__header) {
    padding: 0 16px;
  }

  .management-tabs :deep(.el-tabs__content) {
    padding: 16px;
  }

  .management-tabs :deep(.el-tabs__item) {
    padding: 0 12px;
    font-size: 14px;
  }

  .mobile-cards {
    gap: 12px;
  }

  .user-card {
    padding: 12px;
  }

  .username {
    font-size: 15px;
  }

  .user-email {
    font-size: 12px;
  }

  .card-actions {
    flex-wrap: wrap;
    gap: 6px;
  }

  .card-actions .el-button {
    flex: 1;
    min-width: 60px;
    font-size: 12px;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto !important;
  }

  :deep(.el-dialog__body) {
    padding: 16px;
  }

  .user-form :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  .user-form :deep(.el-form-item__label) {
    font-size: 14px;
  }

  /* Table responsive */
  .el-table {
    font-size: 14px;
  }

  .el-table :deep(.el-table__cell) {
    padding: 8px 5px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 15px 10px;
  }

  .header-content h2 {
    font-size: 18px;
  }

  .management-tabs :deep(.el-tabs__content) {
    padding: 12px;
  }

  .mobile-cards {
    gap: 10px;
  }

  .user-card {
    padding: 10px;
  }

  .username {
    font-size: 14px;
  }

  .user-email {
    font-size: 11px;
  }

  .user-id {
    font-size: 11px;
  }

  .section-label {
    font-size: 12px;
  }

  .created-date {
    font-size: 11px;
  }

  .card-actions {
    flex-direction: column;
    gap: 8px;
  }

  .card-actions .el-button {
    width: 100%;
    font-size: 11px;
    padding: 6px 12px;
  }

  .role-tag {
    font-size: 10px;
    padding: 2px 6px;
  }

  :deep(.el-dialog__header) {
    padding: 16px 20px;
  }

  :deep(.el-dialog__body) {
    padding: 12px;
  }

  .user-form :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  .user-form :deep(.el-form-item__label) {
    font-size: 13px;
  }

  .user-form :deep(.el-input) {
    font-size: 14px;
  }

  .el-table {
    font-size: 12px;
  }

  .el-table :deep(.el-table__cell) {
    padding: 6px 3px;
  }

  .el-table :deep(.cell) {
    word-break: break-all;
  }
}

@media (max-width: 360px) {
  .header-content {
    padding: 12px 8px;
  }

  .mobile-cards {
    gap: 8px;
  }

  .user-card {
    padding: 8px;
  }

  .card-header {
    margin-bottom: 8px;
  }

  .card-content {
    margin-bottom: 12px;
  }

  .roles-section {
    margin-bottom: 8px;
  }
}

/* Loading states */
.mobile-cards.is-loading {
  opacity: 0.6;
  pointer-events: none;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #606266;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Permission management styles */
.permission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #f8fafc;
}

.permission-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #2d3748;
}

.permission-info p {
  margin: 0;
  font-size: 12px;
  color: #718096;
}

@media (max-width: 480px) {
  .permission-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .permission-item .el-button {
    align-self: flex-end;
  }
}
</style>