// Configuration file for API routes
module.exports = {
  // Use Node.js runtime instead of Edge Runtime for all API routes
  // This is required because Sequelize uses dynamic code evaluation
  // which is not supported in Edge Runtime
  runtime: 'nodejs'
}; 