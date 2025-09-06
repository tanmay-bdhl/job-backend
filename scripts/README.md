# Database Migration Scripts

This directory contains scripts for managing your MongoDB database schema and data.

## 🚀 Database Migration

The `migrate-database.js` script creates new collections and indexes for the ATS Analysis and Interview Assessment features.

### Prerequisites

1. **MongoDB Connection**: Ensure your `.env` file has the correct `MONGO_URI` pointing to your cloud MongoDB instance
2. **Dependencies**: Make sure you have the required packages installed (`mongoose`, `uuid`)

### Running the Migration

#### 1. **Dry Run (Recommended First)**
```bash
node scripts/migrate-database.js --dry-run
```
This shows what would be created without making any changes to your database.

#### 2. **Live Migration**
```bash
node scripts/migrate-database.js
```
This actually creates the collections, indexes, and sample data.

#### 3. **Force Migration**
```bash
node scripts/migrate-database.js --force
```
This forces the migration even if collections already exist.

### What Gets Created

#### Collections
- `analysisevents` - Stores analysis events and detailed results
- `interviewassessments` - Stores interview questions and responses

#### Indexes
- User-based queries (fast user data retrieval)
- Analysis-based queries (fast analysis lookup)
- Score-based queries (fast ranking and filtering)
- Status-based queries (fast status filtering)

#### Sample Data
- Sample analysis event with ATS scores and improvements
- Sample interview assessment with questions

### Migration Output

The script provides detailed feedback:
```
🚀 Starting Database Migration...
📊 Mode: LIVE MIGRATION
🔗 MongoDB URI: mongodb+srv://***:***@cluster0.erp6qv9.mongodb.net/

🔌 Connecting to MongoDB...
✅ Connected to MongoDB successfully

📚 Creating new collections...
✅ Created collection: analysisevents
✅ Created collection: interviewassessments

🔍 Creating database indexes...
✅ All indexes created successfully

📝 Inserting sample data...
✅ Sample data inserted successfully

🔍 Validating migration...
✅ Collection found: analysisevents
✅ Collection found: interviewassessments
📊 Document counts:
   - Analysis Events: 1
   - Interview Assessments: 1

🎉 Migration completed successfully!

📋 Next steps:
   1. Update your models to use these new schemas
   2. Test the new collections with your application
   3. Deploy your AWS Lambda services
   4. Update your API endpoints to use the new data structure
```

### Troubleshooting

#### Common Issues

1. **Connection Failed**
   - Check your `MONGO_URI` in `.env`
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Verify network connectivity

2. **Collection Already Exists**
   - Use `--force` flag to overwrite
   - Or manually drop collections first

3. **Permission Denied**
   - Check MongoDB user permissions
   - Ensure user has `createCollection` and `createIndex` rights

#### Verification

After migration, verify in MongoDB Compass or shell:
```javascript
// Check collections
show collections

// Check indexes
db.analysisevents.getIndexes()
db.interviewassessments.getIndexes()

// Check sample data
db.analysisevents.find().pretty()
db.interviewassessments.find().pretty()
```

### Next Steps

1. **Update Your Models**: Import the new models in your application
2. **Test Integration**: Ensure your existing code works with new collections
3. **Deploy Lambda Services**: Set up AWS Lambda for ATS and interview features
4. **Update API Endpoints**: Add new routes for interview and skills features

### Safety Notes

- **Backup First**: Always backup your database before running migrations
- **Test Environment**: Test migrations in development before production
- **Rollback Plan**: Keep track of changes for potential rollback
- **Monitoring**: Monitor database performance after adding new indexes

### Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify MongoDB connection and permissions
3. Ensure all required environment variables are set
4. Check MongoDB Atlas logs for connection issues
