# GymLog Supabase setup

This is a proposed schema for a dedicated GymLog Supabase project. It has NOT been executed. Do not run it against the Financias project or the old RepTrack schema.

The migration uses gymlog-prefixed table names to avoid collisions with legacy tables. It enables RLS on all application tables and keeps sets, measurements, recovery, goals and photos private to their owner. Joint-session metadata is shared only with explicit participants.

## Current application status
The React app currently saves data to browser localStorage on the current device. It is a local beta, not yet cloud-synced. The Jorge/Marta selector is not an authentication boundary. Do not store real private data for both people on a shared device until separate sign-in and cloud RLS are implemented.

## Before applying
1. Confirm the target is a dedicated GymLog project, not Financias.
2. Inspect existing tables and back up any data.
3. Apply to a development project only.
4. Run Supabase security and performance advisors.
5. Test with two distinct accounts: neither account may read the other's sets, metrics, recovery, goals or photos.
6. Complete invitation/onboarding for adding the second account to a group before using joint sessions.
7. Configure frontend environment variables only after the schema and policies are verified.

## Joint session permissions
The private record_joint_set RPC is constrained: the authenticated creator may insert a set for a participant in their own unfinished joint session. It does not grant SELECT access to another participant's history. A proper invitation/onboarding flow is still required before this path is usable end-to-end.

## Photos
A private gymlog-progress bucket is created. Object paths must start with the authenticated user's UUID, followed by a filename.

The schema has not been deployed to any Supabase project.
