/**
 * Hostinger hPanel Node.js Application Entrypoint
 * This file boots the compiled TypeScript production server from dist/server.js
 */

require('dotenv').config();

try {
  require('./dist/server.js');
} catch (err) {
  console.error('Failed to start server from dist/server.js:', err);
  process.exit(1);
}
