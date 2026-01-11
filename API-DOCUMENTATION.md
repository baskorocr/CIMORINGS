# CIMORINGS API Documentation

Dokumentasi lengkap untuk CIMORINGS - Charging Integration Monitoring System API.

## 📚 Dokumentasi Tersedia

### 1. OpenAPI Specification
- **File**: `openapi.yaml`
- **Format**: OpenAPI 3.0.3
- **Isi**: Semua REST API endpoints dengan schema lengkap

### 2. WebSocket API
- **File**: `websocket-api.md`
- **Format**: Markdown
- **Isi**: Real-time WebSocket events dan implementasi

## 🚀 Cara Menggunakan

### Melihat Dokumentasi OpenAPI

#### Option 1: Swagger UI Online
1. Buka [Swagger Editor](https://editor.swagger.io/)
2. Copy paste isi file `openapi.yaml`
3. Dokumentasi akan tampil dengan UI interaktif

#### Option 2: Local Swagger UI
```bash
# Install swagger-ui-serve
npm install -g swagger-ui-serve

# Serve dokumentasi
swagger-ui-serve openapi.yaml
```

#### Option 3: VS Code Extension
1. Install extension "OpenAPI (Swagger) Editor"
2. Buka file `openapi.yaml`
3. Klik "Preview" untuk melihat dokumentasi

### Testing API

#### Menggunakan curl
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Get stations (dengan token)
curl -X GET http://localhost:3000/api/stations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Menggunakan Postman
1. Import file `openapi.yaml` ke Postman
2. Semua endpoints akan tersedia sebagai collection
3. Set environment variable untuk base URL dan token

## 📋 API Overview

### Authentication
- **POST** `/api/auth/login` - Login dan dapatkan JWT token
- **POST** `/api/auth/register` - Register user baru

### Stations Management
- **GET** `/api/stations` - List semua stasiun
- **POST** `/api/stations` - Buat stasiun baru
- **GET** `/api/stations/{id}` - Detail stasiun
- **PUT** `/api/stations/{id}` - Update stasiun
- **DELETE** `/api/stations/{id}` - Hapus stasiun

### Transactions
- **GET** `/api/transactions` - List transaksi dengan pagination
- **GET** `/api/transactions/active` - Transaksi aktif
- **GET** `/api/transactions/completed` - Transaksi selesai

### Users & Roles
- **GET** `/api/users` - List users
- **POST** `/api/users` - Buat user baru
- **PUT** `/api/users/{id}` - Update user
- **DELETE** `/api/users/{id}` - Hapus user
- **POST** `/api/users/{id}/roles` - Assign roles

### OCPP Remote Commands
- **POST** `/api/ocpp/remote-start` - Start charging remote
- **POST** `/api/ocpp/remote-stop` - Stop charging remote
- **POST** `/api/ocpp/unlock-connector` - Unlock connector
- **POST** `/api/ocpp/reset` - Reset stasiun

### Dashboard & Monitoring
- **GET** `/api/dashboard/stats` - Statistik dashboard
- **GET** `/api/connected-stations` - Stasiun yang terhubung

## 🔌 WebSocket Events

### Real-time Updates
- `transaction_started` - Transaksi dimulai
- `transaction_stopped` - Transaksi berhenti
- `station_status_updated` - Status stasiun berubah
- `connector_status_updated` - Status connector berubah
- `meter_values_updated` - Update nilai meter real-time

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
```

## 🔐 Authentication

Semua API (kecuali login/register) memerlukan JWT token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token didapat dari endpoint `/api/auth/login` dan berlaku 24 jam.

## 📊 Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- PM2 (untuk production)

### Installation
```bash
# Clone repository
git clone <repository-url>

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env dengan konfigurasi database

# Database setup
mysql -u root -p < ../csmsDB.sql

# Start server
npm run dev
# atau untuk production
pm2 start server.js --name "cimorings-api"
```

### Environment Variables
```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=csms_db
DB_PASSWORD=your_password
DB_NAME=csms_db
JWT_SECRET=your_jwt_secret
OCPP_PORT=7865
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### API Testing
```bash
# Test dengan newman (Postman CLI)
newman run postman_collection.json -e environment.json
```

### OCPP Testing
```bash
cd testing
npm install
node advanced-test.js
```

## 📈 Rate Limiting

API menggunakan rate limiting:
- **Authentication**: 5 requests/minute
- **General API**: 100 requests/minute
- **WebSocket**: 50 events/minute

## 🔍 Monitoring

### Health Check
```bash
GET /api/health
```

### Logs
```bash
# PM2 logs
pm2 logs server

# Application logs
tail -f server.log
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

### Code Style
- ESLint configuration included
- Prettier for formatting
- Conventional commits

## 📞 Support

- **Email**: support@cimorings.com
- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy Coding! 🚀**
