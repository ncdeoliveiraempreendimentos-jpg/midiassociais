const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODU0NTYsImV4cCI6MjEwNjM2MTQ1Nn0.BqxI_Ungi2viYed5kXKD1yHoGlbpuHG-uEZvzheZ_V8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  console.log('Authenticating...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'natan.cappra@gmail.com',
    password: '154e6few213!'
  });

  console.log('Uploading test file...');
  const testFile = new Blob(['Hello World'], { type: 'image/png' });
  
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload('test/hello.png', testFile, { upsert: true });

  if (error) {
    console.error('Upload error:', error.message, error);
  } else {
    console.log('Upload success!', data);
  }
}

testUpload();
