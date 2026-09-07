/**
 * Request Logger Middleware
 * Logs all incoming requests and responses with detailed information
 */

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log incoming request
  console.log('\n' + '='.repeat(70));
  console.log(`[${timestamp}] INCOMING REQUEST`);
  console.log('-'.repeat(70));
  console.log(`METHOD: ${req.method}`);
  console.log(`ROUTE: ${req.originalUrl}`);
  console.log(`IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Log query parameters if any
  if (Object.keys(req.query).length > 0) {
    console.log(`QUERY PARAMS: ${JSON.stringify(req.query)}`);
  }
  
  // Log body for POST/PUT/PATCH (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
    if (sanitizedBody.token) sanitizedBody.token = '[HIDDEN]';
    console.log(`BODY: ${JSON.stringify(sanitizedBody)}`);
  }
  
  // Log authorization status
  const authHeader = req.headers.authorization;
  if (authHeader) {
    console.log(`AUTH: Bearer token present`);
  } else {
    console.log(`AUTH: No authorization header`);
  }

  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    console.log('-'.repeat(70));
    console.log(`[${new Date().toISOString()}] RESPONSE SENT`);
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`DURATION: ${duration}ms`);
    
    // Try to parse and log response summary
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (parsed) {
        if (parsed.success !== undefined) {
          console.log(`SUCCESS: ${parsed.success}`);
        }
        if (parsed.message) {
          console.log(`MESSAGE: ${parsed.message}`);
        }
        if (parsed.error) {
          console.log(`ERROR: ${parsed.error}`);
        }
        // Log counts for list responses
        if (parsed.movies && Array.isArray(parsed.movies)) {
          console.log(`MOVIES RETURNED: ${parsed.movies.length}`);
        }
        if (parsed.heroMovies && Array.isArray(parsed.heroMovies)) {
          console.log(`HERO MOVIES RETURNED: ${parsed.heroMovies.length}`);
        }
        if (parsed.personalizedMovies && Array.isArray(parsed.personalizedMovies)) {
          console.log(`PERSONALIZED CATEGORIES: ${parsed.personalizedMovies.length}`);
        }
        if (parsed.movie) {
          console.log(`MOVIE: ${parsed.movie.Title || parsed.movie.title || 'Unknown'}`);
        }
      }
    } catch (e) {
      // Body is not JSON, skip parsing
    }
    
    console.log('='.repeat(70) + '\n');
    
    return originalSend.call(this, body);
  };

  next();
};

module.exports = requestLogger;
