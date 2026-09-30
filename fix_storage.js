const { Client } = require('pg');

async function fixStorage() {
  console.log('Fixing storage policies...');
  
  const connectionString = 'postgresql://postgres.ajpqosbanitlmxwnyzfj:RWPr3npTLo20tNsx@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const sql = `
      -- Drop existing if any to avoid errors
      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

      -- Create policies
      CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'project-files');
      CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-files');
      CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'project-files');
      CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'project-files');
    `;
    
    await client.query(sql);
    console.log('Storage policies created successfully!');
    
  } catch (err) {
    console.error('Error executing SQL:', err.message);
  } finally {
    await client.end();
  }
}

fixStorage();
