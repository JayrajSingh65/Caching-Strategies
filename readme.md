# Express.js Caching Strategies Demo

A comprehensive Express.js application demonstrating different caching strategies with simulated database operations and performance testing.

## Features

- **Simulated Database**: Custom DB class with realistic query latency (100-400ms)
- **Multiple Caching Strategies**: No cache, in-memory, Redis, and HTTP-level caching
- **Dynamic Data**: User profiles, product catalog, and weather data with variations
- **Performance Testing**: Built-in endpoints to measure cache effectiveness
- **Cache Management**: Clear caches and view statistics
- **Comprehensive Logging**: Request timing and cache hit/miss information

## Caching Strategies Implemented

### 1. No Caching (Baseline)
- Every request hits the database
- Consistent response times but highest latency
- Good for highly dynamic or critical data

### 2. Application-Level In-Memory Cache
- Custom TTL-based cache using JavaScript Map
- Fastest cache hits (< 1ms)
- Limited to single server instance
- Automatic expiration with cleanup

### 3. Redis-Based Cache
- Distributed caching using Redis
- Survives server restarts
- Shared across multiple server instances
- Slightly higher latency than memory cache (~1-5ms)

### 4. HTTP-Level Caching
- Cache-Control headers for client/proxy caching
- ETags for conditional requests
- Works with CDNs like Cloudflare
- Reduces server load entirely

## Installation & Setup

### Prerequisites
- Node.js >= 14.0.0
- Redis (optional - app works without it)

### Install Dependencies
```bash
npm install
```

### Start Redis (Optional)
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Install Redis (macOS with Homebrew)
brew install redis

# Start Redis
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### Start the Server
```bash
# Production
npm start

# Development (with nodemon)
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### User Endpoints
```
GET /api/user/:id/no-cache        # No caching
GET /api/user/:id/memory-cache    # In-memory cache (60s TTL)
GET /api/user/:id/redis-cache     # Redis cache (120s TTL)
GET /api/user/:id/http-cache      # HTTP cache headers (180s TTL)
```

### Product Endpoints
```
GET /api/product/:id/no-cache     # No caching
GET /api/product/:id/memory-cache # In-memory cache (300s TTL)
GET /api/product/:id/redis-cache  # Redis cache (600s TTL)
```

### Weather Endpoints (Short TTL)
```
GET /api/weather/:city/memory-cache # In-memory cache (30s TTL)
GET /api/weather/:city/redis-cache  # Redis cache (30s TTL)
```

### Management Endpoints
```
POST /api/cache/clear              # Clear all caches
GET /api/cache/stats               # Cache statistics
GET /api/performance-test/:strategy/:iterations # Performance testing
```

### Documentation & Health
```
GET /api/docs                      # API documentation
GET /health                        # Health check
```

## Usage Examples

### Basic Usage
```bash
# Test different caching strategies
curl http://localhost:3000/api/user/1/no-cache
curl http://localhost:3000/api/user/1/memory-cache
curl http://localhost:3000/api/user/1/redis-cache

# Check response headers for cache information
curl -I http://localhost:3000/api/user/1/memory-cache
```

### Performance Testing
```bash
# Test memory cache performance with 50 iterations
curl http://localhost:3000/api/performance-test/memory/50

# Compare different strategies
curl http://localhost:3000/api/performance-test/none/20
curl http://localhost:3000/api/performance-test/redis/20
```

### Cache Management
```bash
# View cache statistics
curl http://localhost:3000/api/cache/stats

# Clear all caches
curl -X POST http://localhost:3000/api/cache/clear
```

## Running Tests

The project includes a comprehensive test script that demonstrates all caching strategies:

```bash
npm test
```

This will:
- Test each caching strategy with multiple requests
- Show cache hit/miss patterns
- Compare performance across strategies
- Display cache statistics

## Understanding the Output

### Response Headers
- `X-Cache`: `HIT` or `MISS` indicating cache status
- `X-Cache-Strategy`: Which caching strategy was used
- `Cache-Control`: HTTP caching directives (for HTTP cache strategy)
- `ETag`: Entity tag for conditional requests

### Console Logs
The server logs all requests with timing information:
```
GET /api/user/1/memory-cache - 200 - 125ms - Cache: MISS
GET /api/user/1/memory-cache - 200 - 2ms - Cache: HIT
```

## Sample Data

### Users
- ID 1: John Doe (New York, Premium)
- ID 2: Jane Smith (Los Angeles, Standard)
- ID 3: Bob Johnson (Chicago, Premium)

### Products
- ID 1: Laptop Pro ($1,299.99, Electronics)
- ID 2: Coffee Maker ($89.99, Appliances)  
- ID 3: Running Shoes ($129.99, Sports)

### Weather Cities
- new-york
- los-angeles
- chicago

## Configuration

### Environment Variables
```bash
PORT=3000              # Server port (default: 3000)
REDIS_HOST=localhost   # Redis host (default: localhost)
REDIS_PORT=6379        # Redis port (default: 6379)
```