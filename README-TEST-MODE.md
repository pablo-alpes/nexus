# Test Mode - No Login Required

This application supports a test mode that bypasses authentication for easy testing.

## Quick Start (Test Mode)

1. **Environment is already configured** with:
   ```env
   TEST_MODE=true
   USE_LOCAL_STORAGE=true
   ```

2. **Start the app**:
   ```bash
   npm run dev
   ```

3. **Login options**:
   - **Option 1**: Click "Quick Test Login" button on the login page (no password needed)
   - **Option 2**: Use the test login API endpoint
   - **Option 3**: The app will automatically use test authentication in test mode

## Test Mode Features

✅ **No MongoDB required** - Uses local file storage  
✅ **No login required** - Automatic test user authentication  
✅ **No password needed** - Just click "Quick Test Login"  
✅ **Full functionality** - All features work normally  

## Test User

When in test mode, you automatically get:
- **User ID**: `test-user-123`
- **Email**: `test@nexuscloud.local`
- **Name**: `Test User`
- **Company**: `Test Company`

## API Endpoints

### Test Login
```bash
POST /api/auth/test-login
# Returns test token without requiring credentials
```

### Check Test Mode
```bash
GET /api/auth/test-login
# Returns test mode status and test user info
```

## How It Works

1. **Test Mode Detection**: 
   - Set `TEST_MODE=true` in `.env.local`
   - App automatically enables test mode

2. **Authentication Bypass**:
   - Test tokens are automatically accepted
   - No password verification needed
   - Test user is automatically created

3. **Local Storage**:
   - All data stored in `data/local-db/*.json`
   - No database setup required

## Disabling Test Mode

To use normal authentication:

1. Remove or set `TEST_MODE=false` in `.env.local`
2. Set up MongoDB (or keep local storage)
3. Create real user accounts via `/api/auth/register`

## Benefits

- **Fast Testing**: Start testing immediately
- **No Setup**: No database or user creation needed
- **Safe**: Test mode only works in development
- **Full Access**: All features available for testing

## Security Note

⚠️ **Test mode is automatically disabled in production** (`NODE_ENV=production`)

Test mode only works when:
- `TEST_MODE=true` is set, OR
- `NODE_ENV=development` (default in dev mode)

