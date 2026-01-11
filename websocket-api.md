# CIMORINGS WebSocket API Documentation

## Connection
```javascript
const socket = io('http://localhost:3000');
```

## Authentication
WebSocket menggunakan JWT token yang sama dengan REST API:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

## Events yang Diterima (Server → Client)

### 1. transaction_started
Dipancarkan ketika transaksi pengisian dimulai.

**Payload:**
```javascript
{
  chargePointId: "CS001",
  transactionId: 12345,
  connectorId: 1,
  idTag: "USER123",
  meterStart: 1000,
  timestamp: "2026-01-11T14:30:00.000Z"
}
```

**Contoh Listener:**
```javascript
socket.on('transaction_started', (data) => {
  console.log('Transaksi dimulai:', data);
  // Update UI untuk menampilkan transaksi aktif
});
```

### 2. transaction_stopped
Dipancarkan ketika transaksi pengisian berhenti.

**Payload:**
```javascript
{
  chargePointId: "CS001",
  transactionId: 12345,
  meterStop: 1500,
  reason: "Remote", // atau "Local", "EmergencyStop", dll
  timestamp: "2026-01-11T15:30:00.000Z"
}
```

**Contoh Listener:**
```javascript
socket.on('transaction_stopped', (data) => {
  console.log('Transaksi berhenti:', data);
  // Update UI untuk menghapus dari daftar transaksi aktif
});
```

### 3. station_status_updated
Dipancarkan ketika status stasiun berubah.

**Payload:**
```javascript
{
  chargePointId: "CS001",
  status: "Available", // Available, Occupied, Reserved, Unavailable, Faulted
  timestamp: "2026-01-11T14:30:00.000Z"
}
```

**Contoh Listener:**
```javascript
socket.on('station_status_updated', (data) => {
  console.log('Status stasiun berubah:', data);
  // Update status stasiun di dashboard
});
```

### 4. connector_status_updated
Dipancarkan ketika status connector berubah.

**Payload:**
```javascript
{
  chargePointId: "CS001",
  connectorId: 1,
  status: "Charging", // Available, Occupied, Reserved, Preparing, Charging, dll
  errorCode: "NoError",
  timestamp: "2026-01-11T14:30:00.000Z"
}
```

**Contoh Listener:**
```javascript
socket.on('connector_status_updated', (data) => {
  console.log('Status connector berubah:', data);
  // Update status connector di UI
});
```

### 5. meter_values_updated
Dipancarkan ketika ada update nilai meter selama pengisian.

**Payload:**
```javascript
{
  chargePointId: "CS001",
  transactionId: 12345,
  connectorId: 1,
  energy: 1250, // Wh
  power: 22.5,  // kW
  soc: 75,      // State of Charge (%)
  timestamp: "2026-01-11T14:30:00.000Z"
}
```

**Contoh Listener:**
```javascript
socket.on('meter_values_updated', (data) => {
  console.log('Meter values update:', data);
  // Update real-time charging data di UI
});
```

### 6. reservation_created
Dipancarkan ketika reservasi baru dibuat.

**Payload:**
```javascript
{
  reservationId: 123456,
  chargePointId: "CS001",
  connectorId: 1,
  idTag: "USER123",
  expiryDate: "2026-01-11T16:00:00.000Z",
  userName: "John Doe",
  phoneNumber: "+6281234567890"
}
```

### 7. reservation_cancelled
Dipancarkan ketika reservasi dibatalkan.

**Payload:**
```javascript
{
  reservationId: 123456,
  chargePointId: "CS001",
  connectorId: 1,
  reason: "User cancelled" // atau "Expired", "Used", dll
}
```

## Events yang Dikirim (Client → Server)

### 1. join_room
Bergabung ke room tertentu untuk mendapat update spesifik.

**Payload:**
```javascript
socket.emit('join_room', {
  room: 'station_CS001' // atau 'transactions', 'dashboard'
});
```

### 2. leave_room
Keluar dari room tertentu.

**Payload:**
```javascript
socket.emit('leave_room', {
  room: 'station_CS001'
});
```

## Contoh Implementasi Lengkap

### Frontend Vue.js
```javascript
// services/socketService.js
import { io } from 'socket.io-client';
import store from '@/store';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    const token = store.getters.token;
    
    this.socket = io(process.env.VUE_APP_SOCKET_URL || 'http://localhost:3000', {
      auth: { token }
    });

    // Setup event listeners
    this.setupListeners();
  }

  setupListeners() {
    // Transaksi events
    this.socket.on('transaction_started', (data) => {
      store.dispatch('transactions/addActiveTransaction', data);
      this.showNotification('Transaksi dimulai', `Station ${data.chargePointId}`);
    });

    this.socket.on('transaction_stopped', (data) => {
      store.dispatch('transactions/removeActiveTransaction', data.transactionId);
      this.showNotification('Transaksi selesai', `Station ${data.chargePointId}`);
    });

    // Status events
    this.socket.on('station_status_updated', (data) => {
      store.dispatch('stations/updateStationStatus', data);
    });

    this.socket.on('connector_status_updated', (data) => {
      store.dispatch('stations/updateConnectorStatus', data);
    });

    // Real-time meter values
    this.socket.on('meter_values_updated', (data) => {
      store.dispatch('transactions/updateMeterValues', data);
    });

    // Reservasi events
    this.socket.on('reservation_created', (data) => {
      store.dispatch('reservations/addReservation', data);
    });

    this.socket.on('reservation_cancelled', (data) => {
      store.dispatch('reservations/removeReservation', data.reservationId);
    });
  }

  joinRoom(room) {
    if (this.socket) {
      this.socket.emit('join_room', { room });
    }
  }

  leaveRoom(room) {
    if (this.socket) {
      this.socket.emit('leave_room', { room });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  showNotification(title, message) {
    // Implementasi notifikasi (toast, dll)
    console.log(`${title}: ${message}`);
  }
}

export default new SocketService();
```

### Penggunaan di Component
```javascript
// components/Dashboard.vue
<template>
  <div class="dashboard">
    <div class="active-transactions">
      <h3>Transaksi Aktif ({{ activeTransactions.length }})</h3>
      <div v-for="tx in activeTransactions" :key="tx.transactionId">
        <div class="transaction-card">
          <h4>{{ tx.chargePointId }} - Connector {{ tx.connectorId }}</h4>
          <p>ID Tag: {{ tx.idTag }}</p>
          <p>Energy: {{ tx.energy }}Wh</p>
          <p>Power: {{ tx.power }}kW</p>
          <p>SoC: {{ tx.soc }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import SocketService from '@/services/socketService';

export default {
  name: 'Dashboard',
  computed: {
    ...mapGetters('transactions', ['activeTransactions'])
  },
  mounted() {
    // Join dashboard room untuk mendapat semua update
    SocketService.joinRoom('dashboard');
  },
  beforeUnmount() {
    SocketService.leaveRoom('dashboard');
  }
};
</script>
```

## Error Handling
```javascript
socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  // Handle reconnection atau redirect ke login
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  // Handle reconnection logic
});
```

## Rooms Available
- `dashboard` - Semua update sistem
- `station_{chargePointId}` - Update spesifik stasiun
- `transactions` - Update transaksi saja
- `reservations` - Update reservasi saja

## Security Notes
- WebSocket menggunakan JWT authentication yang sama dengan REST API
- Token harus valid dan tidak expired
- Setiap client hanya mendapat update sesuai permission mereka
- Rate limiting diterapkan untuk mencegah spam
