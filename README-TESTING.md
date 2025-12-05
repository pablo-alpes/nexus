# Testing Without MongoDB

This application supports local file-based storage for testing without setting up MongoDB.

## Quick Start (No MongoDB Required)

1. **Set environment variable**:
   ```bash
   # Create .env.local file
   echo "USE_LOCAL_STORAGE=true" > .env.local
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup data** (parse Excel to JSON):
   ```bash
   npm run setup
   ```

4. **Start the app**:
   ```bash
   npm run dev
   ```

That's it! The app will use local JSON files stored in `data/local-db/` instead of MongoDB.

## How It Works

- **Local Storage**: When `USE_LOCAL_STORAGE=true` or `MONGODB_URI` is not set, the app automatically uses file-based storage
- **Data Location**: All data is stored in `data/local-db/*.json` files
- **Auto-import**: Requirements are automatically imported from `data/dora-requirements-final.json` on first access
- **No Setup Required**: No MongoDB installation or configuration needed

## Environment Variables

Create a `.env.local` file:

```env
# Enable local storage (no MongoDB needed)
USE_LOCAL_STORAGE=true

# JWT (required)
JWT_SECRET=your-secret-key-for-testing
JWT_EXPIRE=30d

# Encryption (required)
ENCRYPTION_KEY=your-32-character-encryption-key

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Data Files

Local storage creates JSON files in `data/local-db/`:
- `DORARequirement.json` - All DORA requirements
- `User.json` - User accounts
- `Control.json` - Controls
- `Asset.json` - Assets
- etc.

## Switching to MongoDB

When you're ready to use MongoDB:

1. Set up MongoDB (local or Atlas)
2. Update `.env.local`:
   ```env
   USE_LOCAL_STORAGE=false
   MONGODB_URI=mongodb://localhost:27017/dora_compliance
   ```
3. Restart the app

The app will automatically detect and use MongoDB.

## Benefits

✅ **No MongoDB setup** - Start testing immediately  
✅ **Portable** - Data files can be easily backed up or shared  
✅ **Fast** - No network latency  
✅ **Easy debugging** - View/edit JSON files directly  
✅ **Zero configuration** - Works out of the box  

## Limitations

⚠️ **Not for production** - File-based storage is for testing only  
⚠️ **No concurrent access** - Multiple instances may cause data conflicts  
⚠️ **No transactions** - No ACID guarantees  
⚠️ **Limited queries** - Basic filtering only, no complex queries  

For production, use MongoDB or another proper database.

