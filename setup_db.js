const { Client } = require('pg');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function setup() {
  console.log('Starting automated setup...');
  
  // 1. Run SQL Schema using PG
  const connectionString = 'postgresql://postgres.ajpqosbanitlmxwnyzfj:RWPr3npTLo20tNsx@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
    
    const schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');
    
    // We can't run everything in one go sometimes if there are multiple statements, but pg usually handles it.
    await client.query(schemaSql);
    console.log('Schema executed successfully!');
    
  } catch (err) {
    console.error('Error executing SQL:', err.message);
  } finally {
    await client.end();
  }

  // 2. Setup Storage using Supabase JS
  const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4NTQ1NiwiZXhwIjoyMTA2MzYxNDU2fQ.2JYSRPiq6omzxKQUKQrIYxTpfQWn3eTO4i0FDdzm8-8';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Creating Storage Bucket...');
  const { data, error } = await supabase.storage.createBucket('project-files', {
    public: true,
    fileSizeLimit: 50000000,
    allowedMimeTypes: ['image/*', 'video/*']
  });

  if (error && error.message !== 'Bucket already exists') {
    console.error('Error creating bucket:', error);
  } else {
    console.log('Bucket "project-files" is ready!');
  }
}

setup();
