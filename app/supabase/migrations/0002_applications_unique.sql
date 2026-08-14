-- Prevents duplicate application rows when the ranking pipeline reruns
-- over jobs it has already scored.
alter table applications
  add constraint applications_job_profile_unique unique (job_id, profile_id);
