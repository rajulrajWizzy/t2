# API Testing Guide

This document provides instructions on how to use the API testing tool included in the project. The tool allows you to test all API endpoints with various combinations, and generates Postman collections and curl commands for easier API interaction.

## Running the API Tests

### Option 1: Let the script start the server

```bash
node src/scripts/api-tester.js
```

This will:
1. Start the Next.js development server if it's not already running
2. Wait for the server to be ready
3. Run all API tests
4. Generate reports and collections

### Option 2: Use an already running server

If you already have the application running on http://localhost:3000:

```bash
node src/scripts/api-tester.js --no-server
```

## Test Outputs

The API tester generates several useful outputs in the `api-tests` directory at the project root:

- **Test Report (`test-report.json`)**: A JSON file containing detailed results of all API tests
- **Postman Collection (`coworks-api-collection.json`)**: Ready-to-import Postman collection with all API endpoints
- **Postman Environment (`coworks-api-environment.json`)**: Environment variables for the Postman collection
- **Curl Commands (`curl-commands.sh`)**: Shell script with curl commands for all endpoints

## Importing to Postman

1. Open Postman
2. Click "Import" button in the top left
3. Select the generated `coworks-api-collection.json` file
4. Import the `coworks-api-environment.json` environment file
5. Select the "CoWorks API Environment" from the environment dropdown in Postman
6. Update the environment variables with your authentication tokens

## Using Generated Curl Commands

The generated curl commands file includes all API endpoints with proper authentication headers.

```bash
# Make the file executable
chmod +x api-tests/curl-commands.sh

# Set your authentication tokens
export USER_TOKEN="your-user-token"
export ADMIN_TOKEN="your-admin-token"

# Run individual commands or the entire script
bash api-tests/curl-commands.sh
```

## Manually Testing with Curl

Here are some examples of using curl to test the API endpoints:

### User Authentication

```bash
# User Login
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Admin Login
curl -X POST "http://localhost:3000/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Using Authentication Tokens

```bash
# Get User Profile (requires authentication)
curl -X GET "http://localhost:3000/api/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get Admin Dashboard Stats (requires admin authentication)
curl -X GET "http://localhost:3000/api/admin/dashboard/stats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

## Customizing the Test Script

You can modify the `src/scripts/api-tester.js` file to:

1. Add or modify test endpoints
2. Change test data values
3. Adjust timeouts and waiting periods
4. Configure different test environments (by changing the BASE_URL)

## Troubleshooting

- **Connection refused errors**: Make sure the server is running on port 3000
- **Authentication failures**: Check that you're using the correct credentials
- **404 errors**: Verify the API endpoint path is correct
- **500 errors**: Check the server logs for more details

## Guidelines for Adding New Tests

When adding new API endpoints to the test script:

1. Add the endpoint configuration to the appropriate section in `API_ENDPOINTS`
2. Include all required request parameters and body data
3. Specify authentication requirements (requiresAuth or requiresAdminAuth)
4. Provide a clear description for the endpoint
5. Consider adding path parameters using the {param} syntax if needed
