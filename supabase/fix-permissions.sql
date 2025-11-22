-- ================================================
-- Supabase REST API 権限修正
-- ================================================
-- 参考: https://supabase.com/docs/guides/api#missing-grants

-- publicスキーマへのアクセス権限
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 全テーブルへの権限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 全関数への権限
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 全シーケンスへの権限
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- デフォルト権限設定（今後作成されるオブジェクトにも適用）
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
