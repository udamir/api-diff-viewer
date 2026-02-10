export const samples = {
  openapi: {
    label: 'OpenAPI 3.x — Pet Store',
    before: {
      openapi: '3.0.1',
      info: { title: 'Pet Store', version: '1.0.0', description: 'A sample pet store API' },
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            parameters: [
              { name: 'limit', in: 'query', required: false, schema: { type: 'string' } },
            ],
            responses: {
              200: { description: 'A list of pets' },
              500: { description: 'Server error' },
            },
          },
          delete: {
            summary: 'Delete all pets',
            operationId: 'deleteAllPets',
            responses: {
              204: { description: 'All pets deleted' },
            },
          },
        },
        '/pets/{petId}': {
          get: {
            summary: 'Get a pet by ID',
            operationId: 'getPet',
            parameters: [
              { name: 'petId', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
              200: { description: 'A pet' },
              404: { description: 'Pet not found' },
            },
          },
        },
      },
    },
    after: {
      openapi: '3.0.1',
      info: { title: 'Pet Store', version: '2.0.0', description: 'An improved pet store API with pagination' },
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            parameters: [
              { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
              { name: 'offset', in: 'query', required: false, schema: { type: 'integer' } },
            ],
            responses: {
              200: { description: 'A paginated list of pets' },
              500: { description: 'Server error' },
            },
          },
          post: {
            summary: 'Create a pet',
            operationId: 'createPet',
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            responses: {
              201: { description: 'Pet created' },
            },
          },
        },
        '/pets/{petId}': {
          get: {
            summary: 'Get a pet by ID',
            operationId: 'getPet',
            parameters: [
              { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
            ],
            responses: {
              200: { description: 'A pet' },
              404: { description: 'Pet not found' },
            },
          },
        },
      },
    },
  },

  asyncapi: {
    label: 'AsyncAPI 2.x — Market Data',
    before: {
      asyncapi: '2.6.0',
      info: { title: 'Market Data Feed', version: '1.0.0', description: 'Real-time market data' },
      servers: {
        production: { url: 'wss://market.example.com', protocol: 'wss' },
      },
      channels: {
        'market/trades': {
          subscribe: {
            summary: 'Receive trade updates',
            message: {
              payload: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  price: { type: 'number' },
                  offers: { type: 'integer' },
                  bids: { type: 'string' },
                },
                required: ['symbol', 'price'],
              },
            },
          },
        },
        'market/heartbeat': {
          publish: {
            summary: 'Send heartbeat',
            message: {
              payload: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  interval: { type: 'integer', default: 30 },
                },
              },
            },
          },
        },
      },
    },
    after: {
      asyncapi: '2.6.0',
      info: { title: 'Market Data Feed', version: '2.0.0', description: 'Real-time market data with auctions' },
      servers: {
        live: { url: 'wss://feed.example.com', protocol: 'wss' },
      },
      channels: {
        'market/trades': {
          subscribe: {
            summary: 'Receive trade updates',
            message: {
              payload: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  price: { type: 'number' },
                  bids: { type: 'integer' },
                  auctions: { type: 'integer' },
                },
                required: ['symbol', 'price'],
              },
            },
          },
        },
        'market/heartbeat': {
          publish: {
            summary: 'Send heartbeat',
            message: {
              payload: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  interval: { type: 'integer', default: 15 },
                },
              },
            },
          },
        },
      },
    },
  },

  jsonschema: {
    label: 'JSON Schema — Person',
    before: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Person',
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0 },
        email: { type: 'string' },
      },
      $defs: {
        address: {
          type: 'object',
          required: ['street', 'city', 'zip'],
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            zip: { type: 'string', pattern: '^\\d{5}$' },
          },
        },
      },
    },
    after: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Person',
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'number', minimum: 0 },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
      },
      $defs: {
        address: {
          type: 'object',
          required: ['street', 'city', 'zip'],
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            zip: { type: 'integer' },
            country: { type: 'string', default: 'US' },
          },
        },
      },
    },
  },

  appconfig: {
    label: 'App Config — Deployment',
    before: {
      version: '1.2.0',
      app: { name: 'my-service', environment: 'production' },
      database: {
        host: 'db.internal.example.com',
        port: 5432,
        name: 'appdb',
        pool: { min: 2, max: 10 },
      },
      logging: {
        level: 'info',
        format: 'json',
        debug: true,
      },
      features: {
        notifications: true,
        analytics: true,
      },
      cors: {
        origins: ['https://app.example.com'],
        methods: ['GET', 'POST', 'PUT'],
        credentials: true,
      },
    },
    after: {
      version: '1.3.0',
      app: { name: 'my-service', environment: 'production' },
      database: {
        host: 'db-cluster.internal.example.com',
        port: 5433,
        name: 'appdb',
        pool: { min: 5, max: 20 },
      },
      logging: {
        level: 'warn',
        format: 'json',
      },
      features: {
        notifications: true,
        analytics: true,
        rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
      },
      redis: {
        host: 'redis.internal.example.com',
        port: 6379,
        ttl: 3600,
      },
      cors: {
        origins: ['https://app.example.com', 'https://admin.example.com'],
        methods: ['GET', 'POST', 'PUT'],
        credentials: true,
      },
    },
  },
}
