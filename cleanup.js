const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4NTQ1NiwiZXhwIjoyMTA2MzYxNDU2fQ.2JYSRPiq6omzxKQUKQrIYxTpfQWn3eTO4i0FDdzm8-8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  // 1. Delete all empty content items (items with no slides)
  console.log('Finding empty content items...');
  const { data: allItems } = await supabase.from('content_items').select('id, title, project_id');
  
  if (allItems) {
    for (const item of allItems) {
      const { data: slides } = await supabase.from('content_slides').select('id').eq('content_item_id', item.id);
      if (!slides || slides.length === 0) {
        console.log(`Deleting empty item: "${item.title}" (${item.id})`);
        await supabase.from('content_items').delete().eq('id', item.id);
      }
    }
  }
  
  console.log('Cleanup done!');
  
  // 2. Check what's left
  const { data: remaining } = await supabase.from('content_items').select('id, title');
  console.log('Remaining items:', remaining?.length || 0);
  
  // 3. Check projects
  const { data: projects } = await supabase.from('projects').select('id, name, status');
  console.log('Projects:', projects);
  
  // 4. Check storage bucket config
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => ({ name: b.name, public: b.public, allowedMimeTypes: b.allowed_mime_types })));
}

cleanup();
