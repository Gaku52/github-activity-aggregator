import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function test() {
  console.log('Testing Supabase connection...\n');

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;

  console.log(`URL: ${url}`);
  console.log(`Key (first 30 chars): ${key.substring(0, 30)}...`);
  console.log('');

  // Try anon key first
  console.log('Test 1: Using ANON key...');
  const anonClient = createClient(url, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { data: data1, error: error1 } = await anonClient
    .from('repositories')
    .select('*')
    .limit(1);

  console.log('Anon result:', { data: data1, error: error1 });
  console.log('');

  // Try service_role key
  console.log('Test 2: Using SERVICE_ROLE key...');
  const serviceClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { data: data2, error: error2 } = await serviceClient
    .from('repositories')
    .select('*')
    .limit(1);

  console.log('Service role result:', { data: data2, error: error2 });
  console.log('');

  // Try with explicit schema
  console.log('Test 3: Using SERVICE_ROLE with explicit schema...');
  const schemaClient = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  });

  const { data: data3, error: error3 } = await schemaClient
    .from('repositories')
    .select('*')
    .limit(1);

  console.log('Schema client result:', { data: data3, error: error3 });
}

test();
