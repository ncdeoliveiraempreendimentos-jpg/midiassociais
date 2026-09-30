const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODU0NTYsImV4cCI6MjEwNjM2MTQ1Nn0.BqxI_Ungi2viYed5kXKD1yHoGlbpuHG-uEZvzheZ_V8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Authenticating...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'natan.cappra@gmail.com',
    password: '154e6few213!'
  });

  const { data: projects } = await supabase.from('projects').select('id').limit(1);
  if (!projects || projects.length === 0) return console.log('No projects');
  
  const projectId = projects[0].id;

  console.log('Testing DB insert into content_items...');
  const { data: itemData, error: itemError } = await supabase
    .from('content_items')
    .insert({
      project_id: projectId,
      title: 'Test',
      type: 'carousel',
      sort_order: 0,
    })
    .select()
    .single();
    
  if (itemError) console.error('Insert error:', itemError.message);
  else console.log('Insert success!', itemData.id);
}

testInsert();
