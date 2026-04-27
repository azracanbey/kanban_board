alter table cards add column if not exists urgency_score int
  check (urgency_score is null or (urgency_score >= 1 and urgency_score <= 10));
