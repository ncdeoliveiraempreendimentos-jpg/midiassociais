const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODU0NTYsImV4cCI6MjEwNjM2MTQ1Nn0.BqxI_Ungi2viYed5kXKD1yHoGlbpuHG-uEZvzheZ_V8';

const supabase = createClient(supabaseUrl, anonKey);

async function testQuery() {
  await supabase.auth.signInWithPassword({
    email: 'natan.cappra@gmail.com',
    password: '154e6few213!'
  });

  const projectId = '1a798f9e-5f8f-4941-8db8-5d3b8a595c8e';

  // Strategy: get slides with versions via slide_id FK (the normal one)
  console.log('=== Test: slides with versions via slide_id ===');
  const { data, error } = await supabase
    .from('content_items')
    .select(`*, content_slides(*, versions:content_versions!content_versions_slide_id_fkey(*))`)
    .eq('project_id', projectId)
    .limit(1);
  
  if (error) console.log('ERROR:', error.message);
  else {
    const slide = data?.[0]?.content_slides?.[0];
    console.log('Slides:', data?.[0]?.content_slides?.length);
    console.log('First slide versions:', slide?.versions?.length);
    if (slide?.versions?.[0]) console.log('Version path:', slide.versions[0].file_path);
    console.log('active_version_id:', slide?.active_version_id);
  }
}

testQuery();
