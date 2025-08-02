const express = require('express');
const Redis = require('ioredis');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, cache_hits: 0, cache_misses: 0 },
      response_times: [],
      cache_strategies: { none: 0, memory: 0, redis: 0, http: 0 },
      errors: 0,
      start_time: Date.now()
    };
    this.intervalId = setInterval(() => this.logSystemMetrics(), 5000);
  }

  recordRequest(strategy, responseTime, cacheHit) {
    this.metrics.requests.total++;
    this.metrics.cache_strategies[strategy]++;
    
    if (cacheHit) {
      this.metrics.requests.cache_hits++;
    } else {
      this.metrics.requests.cache_misses++;
    }
    
    this.metrics.response_times.push(responseTime);
    
    // Keep only last 1000 response times to prevent memory bloat
    if (this.metrics.response_times.length > 1000) {
      this.metrics.response_times = this.metrics.response_times.slice(-1000);
    }
  }

  recordError() {
    this.metrics.errors++;
  }

  getStats() {
    const responseTimes = this.metrics.response_times.sort((a, b) => a - b);
    const len = responseTimes.length;
    
    return {
      uptime: Date.now() - this.metrics.start_time,
      requests: this.metrics.requests,
      cache_hit_rate: this.metrics.requests.total > 0 
        ? (this.metrics.requests.cache_hits / this.metrics.requests.total * 100).toFixed(2) + '%'
        : '0%',
      response_times: len > 0 ? {
        avg: (responseTimes.reduce((a, b) => a + b, 0) / len).toFixed(2),
        min: responseTimes[0],
        max: responseTimes[len - 1],
        p50: responseTimes[Math.floor(len * 0.5)],
        p95: responseTimes[Math.floor(len * 0.95)],
        p99: responseTimes[Math.floor(len * 0.99)]
      } : null,
      strategies: this.metrics.cache_strategies,
      errors: this.metrics.errors,
      system: this.getSystemMetrics()
    };
  }

  getSystemMetrics() {
    const usage = process.memoryUsage();
    return {
      cpu_usage: process.cpuUsage(),
      memory: {
        rss: (usage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heap_used: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heap_total: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        external: (usage.external / 1024 / 1024).toFixed(2) + ' MB'
      },
      system: {
        free_memory: (os.freemem() / 1024 / 1024).toFixed(2) + ' MB',
        total_memory: (os.totalmem() / 1024 / 1024).toFixed(2) + ' MB',
        load_avg: os.loadavg(),
        uptime: os.uptime()
      }
    };
  }

  logSystemMetrics() {
    const metrics = this.getSystemMetrics();
    console.log(`📊 System Metrics - Memory: ${metrics.memory.heap_used}, Load: ${metrics.system.load_avg[0].toFixed(2)}`);
  }

  reset() {
    this.metrics = {
      requests: { total: 0, cache_hits: 0, cache_misses: 0 },
      response_times: [],
      cache_strategies: { none: 0, memory: 0, redis: 0, http: 0 },
      errors: 0,
      start_time: Date.now()
    };
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

const metrics = new MetricsCollector();

// Enhanced Simulated Database with more realistic data
class SimulatedDB {
  constructor() {
    this.users = this.generateUsers(1000);
    this.products = this.generateProducts(500);
    this.weatherData = this.generateWeatherData();
  }
  
  generateUsers(count) {
    const users = {};
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
    const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const surnames = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
    
    for (let i = 1; i <= count; i++) {
      users[i] = {
        id: i,
        name: `${names[i % names.length]} ${surnames[i % surnames.length]}`,
        email: `user${i}@example.com`,
        city: cities[i % cities.length],
        premium: Math.random() > 0.7,
        last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        profile_views: Math.floor(Math.random() * 1000),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
    return users;
  }
  
  generateProducts(count) {
    const products = {};
    const categories = ['Electronics', 'Appliances', 'Sports', 'Books', 'Clothing', 'Home', 'Garden', 'Toys'];
    const adjectives = ['Pro', 'Ultra', 'Premium', 'Essential', 'Smart', 'Advanced', 'Basic', 'Elite'];
    const items = ['Laptop', 'Phone', 'Tablet', 'Watch', 'Camera', 'Speaker', 'Headphones', 'Monitor'];
    
    for (let i = 1; i <= count; i++) {
      products[i] = {
        id: i,
        name: `${adjectives[i % adjectives.length]} ${items[i % items.length]}`,
        price: Math.floor(Math.random() * 2000) + 50,
        category: categories[i % categories.length],
        stock: Math.floor(Math.random() * 200),
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviews: Math.floor(Math.random() * 500),
        updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
    return products;
  }
  
  generateWeatherData() {
    return {
      'new-york': { city: 'New York', temp: 22, condition: 'Sunny', humidity: 65, wind: 8 },
      'los-angeles': { city: 'Los Angeles', temp: 28, condition: 'Partly Cloudy', humidity: 72, wind: 12 },
      'chicago': { city: 'Chicago', temp: 18, condition: 'Cloudy', humidity: 80, wind: 15 },
      'houston': { city: 'Houston', temp: 32, condition: 'Hot', humidity: 85, wind: 6 },
      'miami': { city: 'Miami', temp: 30, condition: 'Humid', humidity: 90, wind: 10 }
    };
  }
  
  // Simulate variable database latency based on load
  async delay(baseMs = 150) {
    const loadFactor = Math.min(metrics.metrics.requests.total / 1000, 2); // Increase latency with load
    const latency = baseMs + (Math.random() * 200) + (loadFactor * 50);
    return new Promise(resolve => setTimeout(resolve, latency));
  }
  
  async getUser(id) {
    await this.delay();
    return this.users[id] || null;
  }
  
  async getProduct(id) {
    await this.delay();
    return this.products[id] || null;
  }
  
  async getWeather(city) {
    await this.delay(50); // Weather data is faster
    const baseWeather = this.weatherData[city.toLowerCase()];
    if (!baseWeather) return null;
    
    return {
      ...baseWeather,
      temp: baseWeather.temp + Math.floor(Math.random() * 6) - 3,
      timestamp: new Date().toISOString(),
      cache_id: crypto.randomBytes(4).toString('hex') // For cache validation
    };
  }

  async getUsers(limit = 10, offset = 0) {
    await this.delay(200); // Longer delay for batch operations
    const userList = Object.values(this.users).slice(offset, offset + limit);
    return {
      users: userList,
      total: Object.keys(this.users).length,
      limit,
      offset
    };
  }
}

const db = new SimulatedDB();

// Enhanced Redis setup with connection pooling
let redisClient;
const initRedis = async () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: 'cache:',
    });
    
    redisClient.on('error', (err) => {
      console.log('Redis error:', err.message);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis');
    });
    
    redisClient.on('close', () => {
      console.log('Redis connection closed');
    });
    
    await redisClient.ping();
  } catch (error) {
    console.log('❌ Redis unavailable, using in-memory cache only');
    redisClient = null;
  }
};

// Enhanced in-memory cache with node-cache
const nodeCache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance
  deleteOnExpire: true,
  maxKeys: 10000 // Prevent memory bloat
});

// ETag and Last-Modified support
const generateETag = (data) => {
  return `"${crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')}"`;
};

const parseIfNoneMatch = (ifNoneMatch) => {
  if (!ifNoneMatch) return [];
  return ifNoneMatch.split(',').map(etag => etag.trim());
};

// Enhanced caching middleware
const createCacheMiddleware = (strategy, ttl = 300, options = {}) => {
  return async (req, res, next) => {
    const key = `${req.method}:${req.originalUrl}`;
    const startTime = Date.now();
    
    try {
      let cachedData = null;
      let cacheHit = false;
      
      // Handle conditional requests for HTTP caching
      if (strategy === 'http') {
        const ifNoneMatch = req.headers['if-none-match'];
        const ifModifiedSince = req.headers['if-modified-since'];
        
        if (ifNoneMatch || ifModifiedSince) {
          // Check if we have cached ETag/Last-Modified data
          const cacheKey = `meta:${key}`;
          let metaData = null;
          
          if (redisClient) {
            const cached = await redisClient.get(cacheKey);
            metaData = cached ? JSON.parse(cached) : null;
          } else {
            metaData = nodeCache.get(cacheKey);
          }
          
          if (metaData) {
            const etags = parseIfNoneMatch(ifNoneMatch);
            if (etags.includes(metaData.etag) || 
                (ifModifiedSince && new Date(ifModifiedSince) >= new Date(metaData.lastModified))) {
              res.status(304).end();
              metrics.recordRequest(strategy, Date.now() - startTime, true);
              return;
            }
          }
        }
      }
      
      // Try to get from cache
      switch (strategy) {
        case 'memory':
          cachedData = nodeCache.get(key);
          cacheHit = !!cachedData;
          break;
          
        case 'redis':
          if (redisClient) {
            const cached = await redisClient.get(key);
            cachedData = cached ? JSON.parse(cached) : null;
            cacheHit = !!cachedData;
          }
          break;
          
        case 'http':
          // HTTP caching doesn't return cached data here
          break;
      }
      
      if (cachedData && strategy !== 'http') {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Strategy', strategy);
        res.set('X-Cache-TTL', nodeCache.getTtl(key) || 'N/A');
        
        const responseTime = Date.now() - startTime;
        metrics.recordRequest(strategy, responseTime, true);
        
        return res.json(cachedData);
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = async function(data) {
        const responseTime = Date.now() - startTime;
        
        if (strategy !== 'none') {
          try {
            const etag = generateETag(data);
            const lastModified = new Date().toUTCString();
            
            switch (strategy) {
              case 'memory':
                nodeCache.set(key, data, ttl);
                break;
                
              case 'redis':
                if (redisClient) {
                  await redisClient.setex(key, ttl, JSON.stringify(data));
                }
                break;
                
              case 'http':
                res.set({
                  'Cache-Control': `public, max-age=${ttl}, must-revalidate`,
                  'ETag': etag,
                  'Last-Modified': lastModified,
                  'Vary': 'Accept-Encoding'
                });
                
                // Store metadata for conditional requests
                const metaData = { etag, lastModified };
                const metaKey = `meta:${key}`;
                
                if (redisClient) {
                  await redisClient.setex(metaKey, ttl, JSON.stringify(metaData));
                } else {
                  nodeCache.set(metaKey, metaData, ttl);
                }
                break;
            }
          } catch (error) {
            console.error('Cache write error:', error);
            metrics.recordError();
          }
        }
        
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Strategy', strategy);
        res.set('X-Response-Time', `${responseTime}ms`);
        
        metrics.recordRequest(strategy, responseTime, false);
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      metrics.recordError();
      next();
    }
  };
};

// Middleware
app.use(express.json());
app.use(express.static('public')); // For serving test results

// Request logging middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (req.path !== '/metrics' && !req.path.startsWith('/health')) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Cache: ${res.get('X-Cache') || 'NONE'}`);
    }
  });
  next();
});

// Enhanced API Routes

// User endpoints with all caching strategies
app.get('/api/user/:id/no-cache', createCacheMiddleware('none'), async (req, res) => {
  const user = await db.getUser(parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user, timestamp: new Date().toISOString() });
});

app.get('/api/user/:id/memory-cache', createCacheMiddleware('memory', 60), async (req, res) => {
  const user = await db.getUser(parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user, timestamp: new Date().toISOString() });
});

app.get('/api/user/:id/redis-cache', createCacheMiddleware('redis', 120), async (req, res) => {
  const user = await db.getUser(parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user, timestamp: new Date().toISOString() });
});

app.get('/api/user/:id/http-cache', createCacheMiddleware('http', 180), async (req, res) => {
  const user = await db.getUser(parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user, timestamp: new Date().toISOString() });
});

// Batch user endpoint for testing
app.get('/api/users', createCacheMiddleware('memory', 300), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const result = await db.getUsers(limit, offset);
  res.json(result);
});

// Product endpoints
app.get('/api/product/:id/no-cache', createCacheMiddleware('none'), async (req, res) => {
  const product = await db.getProduct(parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product, timestamp: new Date().toISOString() });
});

app.get('/api/product/:id/memory-cache', createCacheMiddleware('memory', 300), async (req, res) => {
  const product = await db.getProduct(parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product, timestamp: new Date().toISOString() });
});

app.get('/api/product/:id/redis-cache', createCacheMiddleware('redis', 600), async (req, res) => {
  const product = await db.getProduct(parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product, timestamp: new Date().toISOString() });
});

// Weather endpoints with ETags
app.get('/api/weather/:city/memory-cache', createCacheMiddleware('memory', 30), async (req, res) => {
  const weather = await db.getWeather(req.params.city);
  if (!weather) return res.status(404).json({ error: 'Weather data not found' });
  res.json({ weather });
});

app.get('/api/weather/:city/http-cache', createCacheMiddleware('http', 60), async (req, res) => {
  const weather = await db.getWeather(req.params.city);
  if (!weather) return res.status(404).json({ error: 'Weather data not found' });
  res.json({ weather });
});

// Advanced performance testing endpoints
app.get('/api/load-test/:strategy/:concurrent/:requests', async (req, res) => {
  const { strategy, concurrent, requests } = req.params;
  const concurrentUsers = Math.min(parseInt(concurrent) || 10, 100);
  const totalRequests = Math.min(parseInt(requests) || 50, 1000);
  
  const results = {
    strategy,
    concurrent_users: concurrentUsers,
    total_requests: totalRequests,
    start_time: Date.now(),
    response_times: [],
    errors: 0,
    cache_hits: 0
  };
  
  const makeRequest = async (userId) => {
    const startTime = Date.now();
    try {
      const response = await fetch(`http://localhost:${PORT}/api/user/${userId}/${strategy}-cache`);
      const duration = Date.now() - startTime;
      const cacheHeader = response.headers.get('X-Cache');
      
      results.response_times.push(duration);
      if (cacheHeader === 'HIT') results.cache_hits++;
      
      return { success: true, duration, cache: cacheHeader };
    } catch (error) {
      results.errors++;
      return { success: false, error: error.message };
    }
  };
  
  // Simulate concurrent users
  const promises = [];
  for (let i = 0; i < totalRequests; i++) {
    const userId = (i % 1000) + 1; // Cycle through user IDs
    promises.push(makeRequest(userId));
    
    // Stagger requests to simulate realistic load
    if (i % concurrentUsers === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  await Promise.all(promises);
  
  results.end_time = Date.now();
  results.total_duration = results.end_time - results.start_time;
  results.requests_per_second = (totalRequests / (results.total_duration / 1000)).toFixed(2);
  results.cache_hit_rate = ((results.cache_hits / totalRequests) * 100).toFixed(2) + '%';
  
  // Calculate percentiles
  const sortedTimes = results.response_times.sort((a, b) => a - b);
  const len = sortedTimes.length;
  
  results.performance = {
    avg_response_time: (sortedTimes.reduce((a, b) => a + b, 0) / len).toFixed(2),
    min_response_time: sortedTimes[0],
    max_response_time: sortedTimes[len - 1],
    p50: sortedTimes[Math.floor(len * 0.5)],
    p95: sortedTimes[Math.floor(len * 0.95)],
    p99: sortedTimes[Math.floor(len * 0.99)]
  };
  
  res.json(results);
});

// Metrics and monitoring endpoints
app.get('/metrics', (req, res) => {
  res.json(metrics.getStats());
});

app.get('/metrics/prometheus', (req, res) => {
  const stats = metrics.getStats();
  let prometheus = '';
  
  prometheus += `# HELP http_requests_total Total number of HTTP requests\n`;
  prometheus += `# TYPE http_requests_total counter\n`;
  prometheus += `http_requests_total ${stats.requests.total}\n\n`;
  
  prometheus += `# HELP cache_hit_rate Cache hit rate percentage\n`;
  prometheus += `# TYPE cache_hit_rate gauge\n`;
  prometheus += `cache_hit_rate ${parseFloat(stats.cache_hit_rate)}\n\n`;
  
  if (stats.response_times) {
    prometheus += `# HELP response_time_avg Average response time in milliseconds\n`;
    prometheus += `# TYPE response_time_avg gauge\n`;
    prometheus += `response_time_avg ${stats.response_times.avg}\n\n`;
    
    prometheus += `# HELP response_time_p95 95th percentile response time\n`;
    prometheus += `# TYPE response_time_p95 gauge\n`;
    prometheus += `response_time_p95 ${stats.response_times.p95}\n\n`;
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(prometheus);
});

app.post('/metrics/reset', (req, res) => {
  metrics.reset();
  res.json({ message: 'Metrics reset successfully' });
});

// Cache management
app.get('/api/cache/stats', async (req, res) => {
  const stats = {
    node_cache: {
      keys: nodeCache.keys().length,
      stats: nodeCache.getStats()
    },
    redis: redisClient ? {
      connected: redisClient.status === 'ready',
      memory_usage: await redisClient.memory('usage').catch(() => 'N/A'),
      keyspace: await redisClient.info('keyspace').catch(() => 'N/A')
    } : { connected: false }
  };
  
  res.json(stats);
});

app.post('/api/cache/clear', async (req, res) => {
  nodeCache.flushAll();
  if (redisClient) {
    await redisClient.flushall();
  }
  res.json({ message: 'All caches cleared' });
});

// Health check with detailed information
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version,
    memory: process.memoryUsage(),
    caches: {
      node_cache: nodeCache.keys().length,
      redis: redisClient ? redisClient.status : 'disconnected'
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      port: PORT
    }
  };
  res.json(health);
});

// Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Express.js Caching Strategies API',
    version: '2.0.0',
    endpoints: {
      users: {
        "GET /api/user/:id/no-cache": "No caching baseline",
        "GET /api/user/:id/memory-cache": "In-memory cache (60s TTL)",
        "GET /api/user/:id/redis-cache": "Redis cache (120s TTL)",
        "GET /api/user/:id/http-cache": "HTTP cache with ETags (180s TTL)",
        "GET /api/users?limit=10&offset=0": "Batch users with pagination"
      },
      products: {
        "GET /api/product/:id/no-cache": "No caching",
        "GET /api/product/:id/memory-cache": "In-memory cache (300s TTL)",
        "GET /api/product/:id/redis-cache": "Redis cache (600s TTL)"
      },
      weather: {
        "GET /api/weather/:city/memory-cache": "Memory cache (30s TTL)",
        "GET /api/weather/:city/http-cache": "HTTP cache with ETags (60s TTL)"
      },
      testing: {
        "GET /api/load-test/:strategy/:concurrent/:requests": "Load testing endpoint",
        "GET /metrics": "Detailed metrics",
        "GET /metrics/prometheus": "Prometheus format metrics",
        "POST /metrics/reset": "Reset metrics"
      },
      management: {
        "GET /api/cache/stats": "Cache statistics",
        "POST /api/cache/clear": "Clear all caches",
        "GET /health": "Health check"
      }
    },
    sample_load_tests: [
      "/api/load-test/memory/10/100",
      "/api/load-test/redis/20/200", 
      "/api/load-test/none/5/50"
    ],
    http_cache_examples: [
      "curl -H 'If-None-Match: \"abc123\"' /api/user/1/http-cache",
      "curl -H 'If-Modified-Since: Wed, 21 Oct 2024 07:28:00 GMT' /api/weather/miami/http-cache"
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  metrics.destroy();
  nodeCache.close();
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

// Start server
const startServer = async () => {
  await initRedis();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Enhanced Caching Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`📊 Metrics Dashboard: http://localhost:${PORT}/metrics`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`\n🧪 Load Testing Examples:`);
    console.log(`   Memory: http://localhost:${PORT}/api/load-test/memory/10/100`);
    console.log(`   Redis:  http://localhost:${PORT}/api/load-test/redis/20/200`);
    console.log(`   None:   http://localhost:${PORT}/api/load-test/none/5/50`);
    console.log(`\n📈 Monitor metrics at: http://localhost:${PORT}/metrics`);
  });
};

startServer().catch(console.error);

module.exports = app;