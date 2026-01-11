<template>
  <div class="docs-container">
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <h2>Loading API Documentation...</h2>
    </div>
    
    <div v-else-if="error" class="error-message">
      <h2>🔐 Authentication Required</h2>
      <p>{{ error }}</p>
      <el-button type="primary" @click="$router.push('/')">
        ← Go to Dashboard
      </el-button>
    </div>
    
    <div v-else>
      <iframe 
        ref="swaggerFrame"
        :src="swaggerUrl" 
        class="swagger-iframe"
        frameborder="0"
        @load="onIframeLoad"
      ></iframe>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'ApiDocs',
  data() {
    return {
      loading: true,
      error: null,
      swaggerUrl: ''
    }
  },
  computed: {
    ...mapGetters(['token', 'isAuthenticated'])
  },
  async mounted() {
    // Get token from store or localStorage
    let authToken = this.token || localStorage.getItem('token')
    
    if (!authToken) {
      this.error = 'No authentication token found. Please login first.'
      this.loading = false
      return
    }

    try {
      // Validate token with server
      const response = await fetch('/docs/info', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`)
      }

      // Create Swagger UI URL with embedded HTML
      this.createSwaggerHTML(authToken)
      this.loading = false
    } catch (error) {
      console.error('Failed to load docs:', error)
      this.error = `Failed to load documentation: ${error.message}`
      this.loading = false
    }
  },
  methods: {
    createSwaggerHTML(authToken) {
      const baseUrl = window.location.origin;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>CIMORINGS API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    #swagger-ui { max-width: 1460px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="swagger-ui">Loading...</div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"><\/script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"><\/script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '${baseUrl}/docs/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        requestInterceptor: (request) => {
          request.headers['Authorization'] = 'Bearer ${authToken}';
          return request;
        }
      });
    };
  <\/script>
</body>
</html>`;
      
      const blob = new Blob([html], { type: 'text/html' })
      this.swaggerUrl = URL.createObjectURL(blob)
    },
    
    onIframeLoad() {
      console.log('Swagger UI loaded in iframe')
    }
  },
  
  beforeUnmount() {
    if (this.swaggerUrl) {
      URL.revokeObjectURL(this.swaggerUrl)
    }
  }
}
</script>

<style scoped>
.docs-container {
  min-height: 100vh;
  background: #fafafa;
}

.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 50vh;
  text-align: center;
  gap: 20px;
}

.error-message {
  text-align: center;
  padding: 50px;
  background: #f8f9fa;
  margin: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.error-message h2 {
  color: #dc3545;
  margin-bottom: 20px;
}

.swagger-iframe {
  width: 100%;
  height: calc(100vh - 60px);
  border: none;
}
</style>
