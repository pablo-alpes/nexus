# Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **MongoDB** - Install locally or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
3. **Azure Storage Account** - [Create Azure Storage Account](https://azure.microsoft.com/en-us/services/storage/)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MongoDB

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. MongoDB URI: `mongodb://localhost:27017/dora_compliance`

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. MongoDB URI: `mongodb+srv://username:password@cluster.mongodb.net/dora_compliance`

### 3. Set Up Azure Blob Storage

1. Create Azure Storage Account
2. Create a container named `dora-evidence` (or use your preferred name)
3. Get connection string from Azure Portal:
   - Go to Storage Account → Access Keys
   - Copy Connection String

### 4. Configure Environment Variables

Create `.env` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/dora_compliance

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=dora-evidence

# Encryption Key (32 characters recommended)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**Important Security Notes:**
- Never commit `.env` file to version control
- Use strong, random values for `JWT_SECRET` and `ENCRYPTION_KEY`
- Keep Azure Storage connection string secure

### 5. Generate Secure Keys

#### Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Generate Encryption Key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6. Initialize Database

The database will be automatically initialized when you first run the application. Models will be created on first use.

### 7. Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 8. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Initial Setup Steps

### 1. Create Admin Account

1. Go to `/register`
2. Create your account
3. Login at `/login`

### 2. Import DORA Requirements

1. Prepare Excel file with DORA requirements (see `scripts/import-requirements.md`)
2. Use API endpoint or create admin interface to upload:
   ```bash
   curl -X POST http://localhost:3000/api/requirements \
     -F "file=@requirements.xlsx" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### 3. Create Questions

Create questionnaire questions via API or admin interface:
```bash
POST /api/questionnaire/questions
```

### 4. Create Controls

Map DORA requirements to controls:
```bash
POST /api/controls
```

## Troubleshooting

### MongoDB Connection Issues

- Verify MongoDB is running: `mongosh` or `mongo`
- Check connection string format
- Ensure network access is allowed (for Atlas)

### Azure Storage Issues

- Verify connection string is correct
- Check container name matches configuration
- Ensure storage account is accessible

### Port Already in Use

If port 3000 is in use:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Or use different port
PORT=3001 npm run dev
```

## Next Steps

1. Complete questionnaire wizard
2. Add your assets
3. Run gap analysis
4. Generate remediation plans
5. Upload evidence

## Support

For issues or questions, please refer to the main README.md or create an issue.

