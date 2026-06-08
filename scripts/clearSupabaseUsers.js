import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxwissvbcckdoaxyvjgs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required to run this script.');
  console.error('Set it in your shell before executing the script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Clearing user_profiles...');
  const { error: profileError } = await supabase.from('user_profiles').delete().neq('id', '');
  if (profileError) {
    throw profileError;
  }
  console.log('user_profiles cleared.');

  console.log('Listing Supabase auth users...');
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  if (!data?.users?.length) {
    console.log('No auth users found.');
    return;
  }

  for (const user of data.users) {
    if (!user.id) continue;
    console.log(`Deleting auth user ${user.id} (${user.email || 'no-email'})`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }
  }

  console.log('All auth users deleted.');
}

main().catch((error) => {
  console.error('Failed to clear Supabase users:', error);
  process.exit(1);
});
