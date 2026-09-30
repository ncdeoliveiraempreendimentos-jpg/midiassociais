const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4NTQ1NiwiZXhwIjoyMTA2MzYxNDU2fQ.2JYSRPiq6omzxKQUKQrIYxTpfQWn3eTO4i0FDdzm8-8';

const supabase = createClient(supabaseUrl, serviceKey);

async function cleanup() {
  // Delete test data
  console.log('Cleaning up test data...');
  
  // Delete the test slide (has path "test")
  const { data: testVersions } = await supabase.from('content_versions').select('id, slide_id').eq('file_path', 'test');
  if (testVersions) {
    for (const v of testVersions) {
      await supabase.from('content_versions').delete().eq('id', v.id);
      await supabase.from('content_slides').delete().eq('id', v.slide_id);
    }
    console.log(`Deleted ${testVersions.length} test records`);
  }

  // Delete duplicate content items (keep only one with slides)
  const { data: items } = await supabase.from('content_items').select('id, title');
  console.log(`Total items: ${items?.length}`);
  
  if (items) {
    for (const item of items) {
      const { data: slides } = await supabase.from('content_slides').select('id').eq('content_item_id', item.id);
      if (!slides || slides.length === 0) {
        console.log(`Deleting empty item: ${item.title}`);
        await supabase.from('content_items').delete().eq('id', item.id);
      } else {
        console.log(`Keeping item: ${item.title} (${slides.length} slides)`);
      }
    }
  }
  
  // Clean test files in storage
  await supabase.storage.from('project-files').remove(['test/hello.png']);
  
  console.log('Done!');
}

cleanup();
