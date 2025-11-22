import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function test() {
  console.log('='.repeat(60));
  console.log('Step 1: Supabase 基本接続テスト（テーブル不要）');
  console.log('='.repeat(60));

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;

  console.log(`\nURL: ${url}`);
  console.log(`Key: ${key.substring(0, 30)}...`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  // Test 1: Health check via REST API
  console.log('\n--- Test 1: REST APIヘルスチェック ---');
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    console.log('Result:', response.status === 200 ? '✅ Success' : '❌ Failed');
  } catch (error) {
    console.log('❌ Error:', error);
  }

  // Test 2: Try to execute a simple RPC (should work even without tables)
  console.log('\n--- Test 2: PostgreSQL接続確認（version関数） ---');
  try {
    const { data, error } = await supabase.rpc('version');
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Success! PostgreSQL version:', data);
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  // Test 3: Try to query pg_catalog (system tables - always exist)
  console.log('\n--- Test 3: システムテーブルへのアクセス ---');
  try {
    // Query information_schema to list all tables
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public')
      .limit(10);

    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Found tables:', data);
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  // Test 4: Raw SQL query via function
  console.log('\n--- Test 4: 生SQLクエリでテーブル一覧取得 ---');
  try {
    // Create a simple function to list tables
    const sqlQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('Trying to execute SQL...');
    // Note: This requires a custom RPC function to be created
    console.log('⚠️  このテストにはカスタムRPC関数が必要です（スキップ）');
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('基本接続テスト完了');
  console.log('='.repeat(60));
}

test();
