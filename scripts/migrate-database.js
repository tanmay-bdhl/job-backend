#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  console.log('💡 Please add MONGO_URI to your .env file');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

console.log(`🚀 Starting Database Migration...`);
console.log(`📊 Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
