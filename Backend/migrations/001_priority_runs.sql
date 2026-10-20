-- PostgreSQL upgrade from the previous task-facts/assessment schema.
-- Run with application writers stopped. Existing tables/users must already exist.
-- Does not delete historical assessments or their legacy snapshots.
BEGIN;

CREATE TABLE IF NOT EXISTS priority_runs (
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    id VARCHAR NOT NULL,
    generation INTEGER NOT NULL CHECK (generation >= 1),
    context_snapshot JSON NOT NULL,
    calendar_snapshot JSON NOT NULL DEFAULT '{}',
    engine_version VARCHAR NOT NULL,
    policy_version VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    briefing JSON NOT NULL DEFAULT '{}',
    explanation_status VARCHAR NOT NULL DEFAULT 'pending'
        CHECK (explanation_status IN ('pending','generating','ready','fallback','stale')),
    explanation_model VARCHAR,
    explanation_prompt_version VARCHAR,
    explanation_generated_at TIMESTAMPTZ,
    explanation_attempt VARCHAR,
    explanation_error VARCHAR,
    PRIMARY KEY (user_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_priority_run_generation ON priority_runs(user_id, generation);

ALTER TABLE priority_assessments ALTER COLUMN context_snapshot DROP NOT NULL;
ALTER TABLE priority_assessments ADD COLUMN IF NOT EXISTS explanation_details JSON;

-- Preserve an original shared snapshot per historical run. Legacy runs have
-- no calendar fingerprint; fresh ranking is recommended before explanation.
WITH missing AS (
    SELECT DISTINCT ON (a.user_id, a.run_id)
        a.user_id, a.run_id, a.context_snapshot, a.engine_version, a.policy_version, a.generated_at
    FROM priority_assessments a
    WHERE NOT EXISTS (
        SELECT 1 FROM priority_runs r WHERE r.user_id = a.user_id AND r.id = a.run_id
    )
    ORDER BY a.user_id, a.run_id, a.rank
), numbered AS (
    SELECT m.*,
        ROW_NUMBER() OVER (PARTITION BY m.user_id ORDER BY m.generated_at, m.run_id)
        + COALESCE((SELECT MAX(r.generation) FROM priority_runs r WHERE r.user_id = m.user_id), 0) AS generation
    FROM missing m
)
INSERT INTO priority_runs(user_id, id, generation, context_snapshot, engine_version, policy_version, created_at)
SELECT user_id, run_id, generation, context_snapshot, engine_version, policy_version, generated_at
FROM numbered;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assessment_run'
                   AND conrelid = 'priority_assessments'::regclass) THEN
        ALTER TABLE priority_assessments ADD CONSTRAINT fk_assessment_run
        FOREIGN KEY(user_id, run_id) REFERENCES priority_runs(user_id, id) ON DELETE RESTRICT;
    END IF;
END $$;
COMMIT;
