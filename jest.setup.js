// Use local file storage for tests (no MongoDB required)
process.env.USE_LOCAL_STORAGE = 'true';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
// Isolate test data from dev data
const path = require('path');
process.env.TEST_LOCAL_DB_PATH = path.join(process.cwd(), 'data', 'test-db');
