const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          headers: {
            'x-cache': res.headers['x-cache'],
            'x-cache-strategy': res.headers['x-cache-strategy'],
            'cache-control': res.headers['cache-control']
          },
          data: JSON.parse(data),
          duration
        });
      });
    }).on('error', reject);
  });
}

// Test function to demonstrate caching differences
async function testCachingStrategies() {
  console.log('🧪 Testing Express.js Caching Strategies\n');
  
  const tests = [
    {
      name: 'No Cache (Baseline)',
      path: '/api/user/1/no-cache',
      requests: 3
    },
    {
      name: 'Memory Cache',
      path: '/api/user/1/memory-cache',
      requests: 3
    },
    {
      name: 'Redis Cache',
      path: '/api/user/1/redis-cache',
      requests: 3
    },
    {
      name: 'HTTP Cache Headers',
      path: '/api/user/1/http-cache',
      requests: 3
    },
    {
      name: 'Weather (Short TTL)',
      path: '/api/weather/new-york/memory-cache',
      requests: 3
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📊 Testing: ${test.name}`);
    console.log('=' .repeat(50));
    
    const results = [];
    
    for (let i = 0; i < test.requests; i++) {
      try {
        const result = await makeRequest(test.path);
        results.push(result);
        
        console.log(`Request ${i + 1}: ${result.duration}ms | Cache: ${result.headers['x-cache'] || 'N/A'} | Strategy: ${result.headers['x-cache-strategy'] || 'N/A'}`);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Request ${i + 1} failed:`, error.message);
      }
    }
    
    // Calculate averages
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const cacheHits = results.filter(r => r.headers['x-cache'] === 'HIT').length;
    
    console.log(`\n📈 Results:`);
    console.log(`   Average Response Time: ${Math.round(avgDuration)}ms`);
    console.log(`   Cache Hit Rate: ${cacheHits}/${results.length} (${Math.round(cacheHits/results.length*100)}%)`);
  }
  
  // Test performance endpoint
  console.log('\n\n🚀 Performance Comparison');
  console.log('=' .repeat(50));
  
  const strategies = ['none', 'memory', 'redis'];
  
  for (const strategy of strategies) {
    try {
      const result = await makeRequest(`/api/performance-test/${strategy}/20`);
      const data = result.data;
      
      console.log(`\n${strategy.toUpperCase()} Strategy:`);
      console.log(`   Total Time: ${data.totalTime}ms`);
      console.log(`   Average Time: ${data.averageTime}ms`);
      console.log(`   Cache Hit Rate: ${data.cacheHitRate * 100}%`);
    } catch (error) {
      console.error(`Performance test for ${strategy} failed:`, error.message);
    }
  }
  
  // Test cache stats
  console.log('\n\n📊 Cache Statistics');
  console.log('=' .repeat(50));
  
  try {
    const result = await makeRequest('/api/cache/stats');
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Failed to get cache stats:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/health');
    console.log('✅ Server is running and healthy');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start it with: npm start');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await testCachingStrategies();
  
  console.log('\n\n🎉 Testing completed!');
  console.log('\n💡 Key Observations:');
  console.log('   • No cache: Consistent ~100-300ms response times');
  console.log('   • Memory cache: First request slow, subsequent requests < 1ms');
  console.log('   • Redis cache: First request slow, subsequent requests ~1-5ms');
  console.log('   • HTTP cache: Server still processes requests but client can cache');
  console.log('\n📚 Check console logs in your server for detailed timing information');
}

main().catch(console.error);