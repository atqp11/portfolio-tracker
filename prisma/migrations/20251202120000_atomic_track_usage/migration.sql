CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_action TEXT,
  p_tier TEXT
)
RETURNS void AS $$
DECLARE
  v_record_id BIGINT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_period_type TEXT;
  v_update_query TEXT;
BEGIN
  v_period_type := CASE WHEN p_action = 'secFiling' THEN 'monthly' ELSE 'daily' END;

  IF v_period_type = 'daily' THEN
    v_period_start := date_trunc('day', now() AT TIME ZONE 'UTC');
    v_period_end := v_period_start + interval '1 day - 1 microsecond';
  ELSE
    v_period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
    v_period_end := v_period_start + interval '1 month - 1 microsecond';
  END IF;

  -- Upsert logic: Find or create the record for the current period
  LOOP
    SELECT id INTO v_record_id
    FROM usage_tracking
    WHERE user_id = p_user_id
      AND period_start = v_period_start
      AND period_end = v_period_end;

    IF FOUND THEN
      EXIT;
    END IF;

    BEGIN
      INSERT INTO usage_tracking(user_id, tier, period_start, period_end, chat_queries, portfolio_analysis, sec_filings, portfolio_changes)
      VALUES (p_user_id, p_tier, v_period_start, v_period_end, 0, 0, 0, 0);
      EXIT;
    EXCEPTION WHEN UNIQUE_VIOLATION THEN
      -- Concurrent insert, loop again to select the existing row
    END;
  END LOOP;

  -- Atomically increment the appropriate counter
  v_update_query := format(
    'UPDATE usage_tracking SET %I = %I + 1 WHERE id = %L',
    CASE p_action
      WHEN 'chatQuery' THEN 'chat_queries'
      WHEN 'portfolioAnalysis' THEN 'portfolio_analysis'
      WHEN 'secFiling' THEN 'sec_filings'
      WHEN 'portfolioChange' THEN 'portfolio_changes'
    END,
    CASE p_action
      WHEN 'chatQuery' THEN 'chat_queries'
      WHEN 'portfolioAnalysis' THEN 'portfolio_analysis'
      WHEN 'secFiling' THEN 'sec_filings'
      WHEN 'portfolioChange' THEN 'portfolio_changes'
    END,
    v_record_id
  );

  EXECUTE v_update_query;
END;
$$ LANGUAGE plpgsql;
