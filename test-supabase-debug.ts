import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function test() {
  console.log('='.repeat(60));
  console.log('Supabase REST API 詳細デバッグ');
  console.log('='.repeat(60));

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;

  console.log('\n1. 接続情報:');
  console.log('  URL:', url);
  console.log('  Key (先頭30文字):', key.substring(0, 30));
  console.log('  Key (末尾30文字):', key.substring(key.length - 30));

  console.log('\n2. Supabaseクライアント作成:');
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  console.log('  ✅ クライアント作成成功');

  console.log('\n3. REST API エンドポイントURLを構築:');
  const restUrl = `${url}/rest/v1/repositories?select=*&limit=1`;
  console.log('  完全URL:', restUrl);

  console.log('\n4. 直接fetchでテスト:');
  try {
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('  ステータス:', response.status);
    console.log('  ステータステキスト:', response.statusText);
    console.log('  OK?:', response.ok);

    const responseText = await response.text();
    console.log('  レスポンス:', responseText);

    if (!response.ok) {
      console.log('\n  ❌ HTTPエラー:', response.status, responseText);
    } else {
      console.log('\n  ✅ fetch成功！');
    }
  } catch (error) {
    console.log('\n  ❌ fetchエラー:', error);
  }

  console.log('\n5. Supabase JSクライアントでテスト:');
  try {
    const { data, error, status, statusText } = await supabase
      .from('repositories')
      .select('*')
      .limit(1);

    console.log('  data:', data);
    console.log('  error:', error);
    console.log('  status:', status);
    console.log('  statusText:', statusText);

    if (error) {
      console.log('\n  ❌ Supabaseエラー:', error.message);
      console.log('  エラー詳細:', JSON.stringify(error, null, 2));
    } else {
      console.log('\n  ✅ Supabase JS クライアント成功！');
    }
  } catch (error) {
    console.log('\n  ❌ 例外発生:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('デバッグ完了');
  console.log('='.repeat(60));
}

test();
