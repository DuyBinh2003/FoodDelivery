/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql('SET search_path TO schema_ai, public;');

  // 1. m_chat_sessions
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS schema_ai.m_chat_sessions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL,
      user_role     VARCHAR(20) NOT NULL,
      title         VARCHAR(255),
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
    );
  `);

  // 2. t_chat_messages
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS schema_ai.t_chat_messages (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id       UUID NOT NULL REFERENCES schema_ai.m_chat_sessions(id) ON DELETE CASCADE,
      role             VARCHAR(10) NOT NULL,
      content          TEXT NOT NULL,
      intent           VARCHAR(50),
      model_used       VARCHAR(50),
      context_sources  JSONB,
      relevance_score  FLOAT,
      tokens_used      INTEGER,
      latency_ms       INTEGER,
      langsmith_run_id VARCHAR(100),
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. m_knowledge_chunks
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS schema_ai.m_knowledge_chunks (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type  VARCHAR(30) NOT NULL,
      source_ref   VARCHAR(100),
      content      TEXT NOT NULL,
      embedding    public.vector(768),
      metadata     JSONB,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
      ON schema_ai.m_knowledge_chunks
      USING hnsw (embedding public.vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);

  // 4. t_chat_feedback
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS schema_ai.t_chat_feedback (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES schema_ai.t_chat_messages(id) ON DELETE CASCADE,
      rating     SMALLINT NOT NULL CHECK (rating IN (1, -1)),
      comment    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS schema_ai.t_chat_feedback CASCADE;');
  pgm.sql('DROP TABLE IF EXISTS schema_ai.m_knowledge_chunks CASCADE;');
  pgm.sql('DROP TABLE IF EXISTS schema_ai.t_chat_messages CASCADE;');
  pgm.sql('DROP TABLE IF EXISTS schema_ai.m_chat_sessions CASCADE;');
};
