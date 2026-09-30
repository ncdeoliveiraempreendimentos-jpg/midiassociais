const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ajpqosbanitlmxwnyzfj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHFvc2Jhbml0bG14d255emZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4NTQ1NiwiZXhwIjoyMTA2MzYxNDU2fQ.2JYSRPiq6omzxKQUKQrIYxTpfQWn3eTO4i0FDdzm8-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('Criando administrador...');
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'natan.cappra@gmail.com',
    password: '154e6few213!',
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already been registered')) {
       console.log('O usuário já existe!');
    } else {
       console.error('Erro ao criar usuário:', error.message);
    }
  } else {
    console.log('Administrador criado com sucesso!', data.user.email);
  }
}

createAdmin();
