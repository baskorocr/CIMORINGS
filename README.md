# CSMS - Charging Station Management System

Sistem manajemen stasiun pengisian dengan protokol OCPP 1.6 lengkap, dibangun dengan Vue.js dan Node.js.

## Fitur

- **Protokol OCPP 1.6 Lengkap**: Mendukung semua message types sesuai standar OCPP
- **Dashboard Real-time**: Monitoring status stasiun dan transaksi
- **Manajemen Stasiun**: CRUD operations untuk charging stations
- **Tracking Transaksi**: Monitor semua transaksi pengisian
- **Authentication JWT**: Login system dengan role-based access
- **UI Modern**: Interface yang menarik dengan Element Plus

## Teknologi

- **Backend**: Node.js, Express, WebSocket, MySQL
- **Frontend**: Vue.js 3, Element Plus, Vuex, Vue Router
- **Database**: MySQL
- **Protocol**: OCPP 1.6 over WebSocket

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
WebSocket server berjalan di: `ws://localhost:8082/{chargePointId}`

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register user

### Stations
- GET `/api/stations` - Get all stations
- GET `/api/stations/:id` - Get station detail
- POST `/api/stations` - Create station

### Transactions
- GET `/api/transactions` - Get all transactions

## OCPP Messages Supported

### Core Profile
- BootNotification
- Heartbeat
- StatusNotification
- Authorize
- StartTransaction
- StopTransaction
- MeterValues

### Firmware Management Profile
- FirmwareStatusNotification

### Local Auth List Management Profile
- SendLocalList

### Remote Trigger Profile
- TriggerMessage

### Smart Charging Profile
- SetChargingProfile
- ClearChargingProfile
- GetCompositeSchedule

## Database Schema

### Tables
- `users` - User management
- `charging_stations` - Station data
- `connectors` - Connector information
- `transactions` - Transaction records
- `ocpp_messages` - Message logging

## Development

### Backend Structure
```
backend/
├── config/         # Database configuration
├── controllers/    # Route controllers
├── middleware/     # Authentication middleware
├── routes/         # API routes
├── ocpp/          # OCPP server implementation
└── server.js      # Main server file
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/ # Reusable components
│   ├── views/      # Page components
│   ├── store/      # Vuex store
│   ├── router/     # Vue router
│   └── services/   # API services
```

## Testing OCPP

Untuk testing OCPP connection dan API, gunakan tools di folder `testing/`:

### API Testing
```bash
cd testing
npm install
npm run api-test
```

### OCPP Message Testing
```bash
cd testing
node ocpp-test.js TEST_STATION_01
```

### Charging Station Simulator
```bash
cd testing
npm run test-station TEST_STATION_01
```

Contoh manual WebSocket connection:
`ws://localhost:8080/TEST_STATION_01`

Contoh message BootNotification:
```json
[2, "12345", "BootNotification", {
  "chargePointVendor": "Test Vendor",
  "chargePointModel": "Test Model"
}]
```