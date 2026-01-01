# CIMORINGS - Charging Integration Monitoring System

Sistem manajemen stasiun pengisian dengan protokol OCPP 1.6 lengkap, dibangun dengan Vue.js dan Node.js.

## Fitur

- **Protokol OCPP 1.6 Lengkap**: Mendukung semua message types sesuai standar OCPP
- **Dashboard Real-time**: Monitoring status stasiun dan transaksi
- **Manajemen Stasiun**: CRUD operations untuk charging stations
- **Tracking Transaksi**: Monitor semua transaksi pengisian dengan history
- **Authentication JWT**: Login system dengan role-based access dan auto-logout saat token expired
- **Dynamic Role Management**: Sistem role dan permission yang dinamis dari database
- **Permission Management**: Tambah/hapus permission untuk fitur baru
- **Real-time Monitoring**: WebSocket untuk update real-time status dan transaksi
- **UI Modern**: Interface yang menarik dengan Element Plus

## Teknologi

- **Backend**: Node.js, Express, WebSocket, MySQL
- **Frontend**: Vue.js 3, Element Plus, Vuex, Vue Router
- **Database**: MySQL dengan dynamic role system
- **Protocol**: OCPP 1.6 over WebSocket
- **Authentication**: JWT dengan expiry validation

## Setup

### 1. Database Setup
```sql
-- Buat database MySQL
CREATE DATABASE csms_db;
```

### 2. Backend Setup
```bash
cd backend
npm install
# Jalankan migrasi untuk dynamic role system
node migrate-to-dynamic-roles.js
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run serve
```

## Default Login
- Username: `admin`
- Password: `admin123`

## OCPP Endpoint
WebSocket server berjalan di: `ws://localhost:8080/{chargePointId}`

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login dengan JWT token
- POST `/api/auth/register` - Register user

### Stations
- GET `/api/stations` - Get all stations dengan connector count
- GET `/api/stations/:id` - Get station detail
- POST `/api/stations` - Create station

### Transactions
- GET `/api/transactions` - Get all transactions dengan pagination
- GET `/api/transactions/active` - Get active transactions
- GET `/api/transactions/completed` - Get completed transactions dengan pagination

### Users & Roles
- GET `/api/users` - Get users dengan dynamic roles
- POST `/api/users` - Create user
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user
- POST `/api/users/:id/roles` - Assign roles
- GET `/api/roles` - Get dynamic roles
- POST `/api/roles` - Create role
- GET `/api/roles/permissions` - Get permissions
- POST `/api/roles/permissions` - Create permission

### Monitoring
- GET `/api/dashboard/stats` - Dashboard statistics
- GET `/api/transactions/active` - Active transactions
- GET `/api/connected-stations` - Connected stations

## OCPP Messages Supported

### Core Profile
- BootNotification - Auto-create station dengan dynamic connectors
- Heartbeat - Update last heartbeat
- StatusNotification - Auto-create connectors berdasarkan station
- Authorize - ID tag authorization
- StartTransaction - Mulai transaksi dengan validation
- StopTransaction - Stop transaksi dengan energy calculation
- MeterValues - Real-time meter data dengan SoC support

### Remote Commands
- RemoteStartTransaction - Start charging dari CSMS
- RemoteStopTransaction - Stop charging dari CSMS
- UnlockConnector - Unlock connector
- Reset - Reset charging station

### Configuration Profile
- GetConfiguration - Get station configuration
- ChangeConfiguration - Change station settings

## Database Schema

### Dynamic Role System Tables
- `users` - User management
- `roles` - Dynamic roles
- `permissions` - Dynamic permissions
- `role_permissions` - Role-permission mapping
- `user_roles` - User-role mapping
- `user_permissions` - Direct user permissions

### OCPP Tables
- `charging_stations` - Station data dengan auto-creation
- `connectors` - Dynamic connector creation
- `transactions` - Transaction records dengan energy tracking
- `ocpp_messages` - Message logging

## Key Features Implemented

### 1. Dynamic Role Management
- Roles dan permissions disimpan di database
- Auto-migration dari static ke dynamic roles
- Permission-based UI dengan v-can directive
- Role assignment melalui UI

### 2. JWT Authentication dengan Auto-Logout
- Token expiry validation di router guard
- Axios interceptor untuk handle 401
- Auto-redirect ke login saat token expired

### 3. OCPP Auto-Station Management
- Auto-create station saat BootNotification
- Dynamic connector creation berdasarkan StatusNotification
- Connector count sesuai dengan station manufacturer

### 4. Real-time Monitoring
- WebSocket untuk update real-time
- Active transactions monitoring
- Transaction history dengan pagination
- Energy consumption tracking
- SoC (State of Charge) support

### 5. Transaction Management
- Stuck transaction cleanup
- Proper duration calculation
- Energy consumption calculation
- Transaction status management

## Development

### Backend Structure
```
backend/
├── config/         # Database configuration
├── controllers/    # Route controllers dengan dynamic roles
├── middleware/     # Auth & permission middleware
├── routes/         # API routes
├── ocpp/          # OCPP server dengan auto-station creation
└── server.js      # Main server file
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/ # Layout component saja
│   ├── views/      # Page components & role managers
│   ├── store/      # Vuex store dengan dynamic permissions
│   ├── router/     # Vue router dengan JWT validation
│   ├── services/   # API services dengan auto-logout
│   └── utils/      # Permission directive & utilities
```

## Testing OCPP

### Advanced Testing
```bash
cd testing
npm install
# Test dengan station ID dinamis
npm run advanced-test STATION_ID
```

### Manual WebSocket Testing
```bash
# Connect ke OCPP server
ws://localhost:8080/YOUR_STATION_ID

# BootNotification akan auto-create station
[2, "12345", "BootNotification", {
  "chargePointVendor": "Test Vendor",
  "chargePointModel": "Test Model"
}]

# StatusNotification akan auto-create connector
[2, "12346", "StatusNotification", {
  "connectorId": 1,
  "status": "Available",
  "errorCode": "NoError"
}]
```

## Migration Scripts

### Database Migration
```bash
# Migrate ke dynamic role system
node backend/migrate-to-dynamic-roles.js

# Fix stuck transactions
node backend/fix-stuck-transactions.js

# Assign permissions ke roles
node backend/assign-admin-permissions.js
```

## Troubleshooting

### Permission Issues
- Pastikan user memiliki role yang benar di tabel `user_roles`
- Check effective permissions di login response
- Logout dan login ulang setelah role changes

### OCPP Connection Issues
- Station akan auto-created saat BootNotification
- Connector akan auto-created saat StatusNotification
- Check OCPP server logs untuk debugging

### Token Expiry
- Token expired akan auto-redirect ke login
- Check browser console untuk JWT validation errors
- Default token expiry: 24 jam