ALTER TABLE brands ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE brands
SET user_id = '9d3e413d-3aef-4ea8-9019-6c94ec66e523'
WHERE user_id IS NULL;

ALTER TABLE brands ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS brands_user_id_idx ON brands(user_id);
