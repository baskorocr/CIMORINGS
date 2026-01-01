// Permission system mirip Spatie Laravel
export const PERMISSIONS = {
  // User Management
  'users.view': 'View Users',
  'users.create': 'Create Users', 
  'users.edit': 'Edit Users',
  'users.delete': 'Delete Users',
  
  // Station Management
  'stations.view': 'View Stations',
  'stations.create': 'Create Stations',
  'stations.edit': 'Edit Stations', 
  'stations.delete': 'Delete Stations',
  
  // Transaction Management
  'transactions.view': 'View Transactions',
  'transactions.manage': 'Manage Transactions',
  
  // Monitoring
  'monitoring.view': 'View Monitoring',
  'monitoring.control': 'Control Stations',
  
  // System
  'system.admin': 'System Administration'
}

export const ROLES = {
  'super-admin': {
    name: 'Super Admin',
    permissions: Object.keys(PERMISSIONS)
  },
  'admin': {
    name: 'Admin', 
    permissions: [
      'users.view', 'users.create', 'users.edit',
      'stations.view', 'stations.create', 'stations.edit',
      'transactions.view', 'transactions.manage',
      'monitoring.view', 'monitoring.control'
    ]
  },
  'operator': {
    name: 'Operator',
    permissions: [
      'stations.view', 'transactions.view', 
      'monitoring.view', 'monitoring.control'
    ]
  },
  'viewer': {
    name: 'Viewer',
    permissions: ['stations.view', 'transactions.view', 'monitoring.view']
  }
}

export class PermissionChecker {
  constructor(user) {
    this.user = user
  }
  
  can(permission) {
    if (!this.user) return false
    
    // Use effectivePermissions from backend if available
    if (this.user.effectivePermissions) {
      return this.user.effectivePermissions.includes(permission)
    }
    
    // Fallback: check direct permissions
    if (this.user.permissions && this.user.permissions.includes(permission)) {
      return true
    }
    
    return false
  }
  
  hasRole(role) {
    if (!this.user || !this.user.roles) return false
    return this.user.roles.some(userRole => userRole.name === role || userRole === role)
  }
  
  hasAnyRole(roles) {
    return roles.some(role => this.hasRole(role))
  }
  
  hasAllRoles(roles) {
    return roles.every(role => this.hasRole(role))
  }
}