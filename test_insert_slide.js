const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODU0NTYsImV4cCI6MjEwNjM2MTQ1Nn0.BqxI_Ungi2viYed5kXKD1yHoGlbpuHG-uEZvzheZ_V8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Authenticating...');
  await supabase.auth.signInWithPassword({
    email: 'natan.cappra@gmail.com',
    password: '154e6few213!'
  });

  const { data: items } = await supabase.from('content_items').select('id').limit(1);
  if (!items || items.length === 0) return console.log('No items');
  const itemId = items[0].id;

  console.log('Testing DB insert into content_slides...');
  const { data: slideData, error: slideError } = await supabase
    .from('content_slides')
    .insert({
      content_item_id: itemId,
      sort_order: 0,
      status: 'pending',
    })
    .select()
    .single();
    
  if (slideError) console.error('Insert slide error:', slideError.message);
  else console.log('Insert slide success!', slideData.id);
  
  const { data: versionData, error: versionError } = await supabase
    .from('content_versions')
    .insert({
      slide_id: slideData.id,
      file_path: 'test',
      file_name: 'test',
      file_type: 'test',
      version_number: 1,
    })
    .select()
    .single();

  if (versionError) console.error('Insert version error:', versionError.message);
  else console.log('Insert version success!', versionData.id);
}

testInsert();
