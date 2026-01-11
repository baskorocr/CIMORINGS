const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all docs routes
router.use(authenticateToken);

// Serve OpenAPI YAML file
router.get('/openapi.yaml', (req, res) => {
  const yamlPath = path.join(__dirname, '../../openapi.yaml');
  if (fs.existsSync(yamlPath)) {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(yamlPath);
  } else {
    res.status(404).json({ error: 'OpenAPI specification not found' });
  }
});

// Serve Swagger UI
router.get('/', (req, res) => {
  const swaggerUI = `
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
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function() {
      try {
        const ui = SwaggerUIBundle({
          url: '/docs/openapi.yaml',
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
          onComplete: function() {
            console.log('Swagger UI loaded successfully');
          },
          onFailure: function(error) {
            console.error('Swagger UI failed to load:', error);
            document.getElementById('swagger-ui').innerHTML = '<h1>Error loading API documentation</h1><p>' + error + '</p>';
          }
        });
      } catch (error) {
        console.error('Error initializing Swagger UI:', error);
        document.getElementById('swagger-ui').innerHTML = '<h1>Error initializing API documentation</h1><p>' + error.message + '</p>';
      }
    };
  </script>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerUI);
});

router.get('/docs', (req, res) => {
  res.redirect('/docs');
});

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'CIMORINGS API',
    version: '1.0.0',
    description: 'Charging Integration Monitoring System',
    user: {
      username: req.user.username,
      roles: req.user.roles
    },
    documentation: {
      swagger_ui: '/docs',
      openapi_spec: '/docs/openapi.yaml',
      websocket_docs: '/docs/websocket',
      postman_collection: '/docs/postman'
    },
    endpoints: {
      total: 30,
      categories: [
        'Authentication',
        'Stations',
        'Transactions', 
        'Users & Roles',
        'OCPP Commands',
        'Dashboard',
        'Reservations'
      ]
    }
  });
});

// WebSocket documentation
router.get('/websocket', (req, res) => {
  const wsDocsPath = path.join(__dirname, '../../websocket-api.md');
  if (fs.existsSync(wsDocsPath)) {
    const content = fs.readFileSync(wsDocsPath, 'utf8');
    res.setHeader('Content-Type', 'text/markdown');
    res.send(content);
  } else {
    res.status(404).json({ error: 'WebSocket documentation not found' });
  }
});

// Postman collection
router.get('/postman', (req, res) => {
  const postmanPath = path.join(__dirname, '../../postman-collection.json');
  if (fs.existsSync(postmanPath)) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="cimorings-api-collection.json"');
    res.sendFile(postmanPath);
  } else {
    res.status(404).json({ error: 'Postman collection not found' });
  }
});

module.exports = router;
