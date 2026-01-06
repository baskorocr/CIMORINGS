import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.isConnecting = false
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    if (this.isConnecting) {
      return this.socket
    }

    this.isConnecting = true
    console.log('🔌 Connecting to Socket.IO server...')
    
    this.socket = io('https://cgs-csms.dharmap.com', {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket'],
      withCredentials: true,
      forceNew: false
    })

    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time server')
      this.isConnecting = false
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time server')
      this.isConnecting = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.isConnecting = false
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.isConnecting = false
    }
  }

  on(event, callback) {
    if (!this.socket || !this.socket.connected) {
      this.connect()
    }
    
    this.socket.on(event, callback)
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

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

  isConnected() {
    return this.socket?.connected || false
  }

  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnecting = false
    return this.connect()
  }
}

export default new SocketService()