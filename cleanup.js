const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4NTQ1NiwiZXhwIjoyMTA2MzYxNDU2fQ.2JYSRPiq6omzxKQUKQrIYxTpfQWn3eTO4i0FDdzm8-8';

const supabase = createClient(supabaseUrl, serviceKey);

async function cleanup() {
  console.log('Cleaning up empty content items...');
  
  const { data: items } = await supabase.from('content_items').select('id, title');
  
  let deleted = 0;
  for (const item of (items || [])) {
    const { data: slides } = await supabase.from('content_slides').select('id').eq('content_item_id', item.id);
    if (!slides || slides.length === 0) {
      await supabase.from('content_items').delete().eq('id', item.id);
      console.log(`Deleted empty: ${item.title}`);
      deleted++;
    } else {
      console.log(`Kept: ${item.title} (${slides.length} slides)`);
    }
  }
  
  // Also clean orphan slides (no active_version_id and no versions)
  const { data: allSlides } = await supabase.from('content_slides').select('id, active_version_id, content_item_id');
  let deletedSlides = 0;
  for (const slide of (allSlides || [])) {
    if (!slide.active_version_id) {
      const { data: versions } = await supabase.from('content_versions').select('id').eq('slide_id', slide.id);
      if (!versions || versions.length === 0) {
        await supabase.from('content_slides').delete().eq('id', slide.id);
        deletedSlides++;
      }
    }
  }
  
  console.log(`Done! Deleted ${deleted} empty items, ${deletedSlides} orphan slides.`);
}

cleanup();
