const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4NTQ1NiwiZXhwIjoyMTA2MzYxNDU2fQ.2JYSRPiq6omzxKQUKQrIYxTpfQWn3eTO4i0FDdzm8-8';

const supabase = createClient(supabaseUrl, serviceKey);

async function diagnose() {
  // 1. Check projects
  const { data: projects } = await supabase.from('projects').select('*');
  console.log('=== PROJECTS ===');
  console.log(JSON.stringify(projects, null, 2));

  // 2. Check content_items
  const { data: items } = await supabase.from('content_items').select('*');
  console.log('\n=== CONTENT ITEMS ===');
  console.log(`Total: ${items?.length}`);
  items?.forEach(i => console.log(`  ${i.id} | ${i.title} | type: ${i.type}`));

  // 3. Check content_slides
  const { data: slides } = await supabase.from('content_slides').select('*');
  console.log('\n=== CONTENT SLIDES ===');
  console.log(`Total: ${slides?.length}`);
  slides?.forEach(s => console.log(`  ${s.id} | item: ${s.content_item_id} | active_version: ${s.active_version_id} | status: ${s.status}`));

  // 4. Check content_versions
  const { data: versions } = await supabase.from('content_versions').select('*');
  console.log('\n=== CONTENT VERSIONS ===');
  console.log(`Total: ${versions?.length}`);
  versions?.forEach(v => console.log(`  ${v.id} | slide: ${v.slide_id} | path: ${v.file_path} | type: ${v.file_type}`));

  // 5. Check storage
  const { data: files, error: storageErr } = await supabase.storage.from('project-files').list('projects', { limit: 50 });
  console.log('\n=== STORAGE (projects/) ===');
  if (storageErr) console.log('Storage error:', storageErr.message);
  else console.log(`Files in projects/: ${files?.length}`, files?.map(f => f.name));

  // 6. Check auth user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  console.log('\n=== AUTH USERS ===');
  users?.forEach(u => console.log(`  ${u.id} | ${u.email}`));
}

diagnose();
