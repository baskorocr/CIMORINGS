import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }

  connect() {
    if (!this.socket) {
      console.log('🔌 Attempting to connect to Socket.IO server...');
      this.socket = io('http://192.168.0.109:3000', {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      })

      this.socket.on('connect', () => {
        console.log('✅ Connected to real-time server')
      })

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from real-time server')
      })

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
      })
    }
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect()
    }
    
    this.socket.on(event, callback)
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
    
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  // Cleanup all listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback)
        })
      })
      this.listeners.clear()
    }
  }
}

export default new SocketService()