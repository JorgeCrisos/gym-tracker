# GymLog manual acceptance and security test plan

## Functional acceptance
- [ ] Create a Jorge individual session and save sets with load, reps, RPE and rest.
- [ ] Create a Marta individual session and confirm her history view filters to Marta.
- [ ] Start a joint session and add at least one set for each participant from the same device.
- [ ] Finish a session, reload the app, and confirm completed history remains.
- [ ] Start a session, reload before finishing, and confirm the active session is restored.
- [ ] Add, start and delete a routine.
- [ ] Verify rest timer presets 60/90/120 seconds, pause and reset.
- [ ] Export CSV and inspect accents, separators and per-person set ownership.
- [ ] Verify weekly count, volume, best load, estimated 1RM and muscle-group grouping.
- [ ] Add goals, body measurements and recovery entries; verify the selected profile filter.
- [ ] Check 320px mobile, iPhone Safari, iPad and desktop layouts.

## Supabase security acceptance (two real test accounts required)
- [ ] User A can SELECT/INSERT/UPDATE/DELETE only their own sets, goals, measurements, recovery and photo metadata.
- [ ] User B cannot SELECT A's private rows by changing filters, IDs or REST requests.
- [ ] User A cannot change owner_id to B on UPDATE/INSERT.
- [ ] Session metadata is visible only to the creator and explicit participants.
- [ ] Session creator can call record_joint_set only for a participant in their own unfinished joint session.
- [ ] The joint-set RPC does not permit reading the other participant's set history.
- [ ] A user outside the group cannot add themselves to a session or write a set for a participant.
- [ ] Storage objects are private and only accessible under the authenticated user's UUID folder.
- [ ] RLS advisors return no unresolved critical/high findings.

## Current blockers
- The current React beta is localStorage-only; its profile selector is not authentication.
- The second-account invitation/group membership flow is not implemented.
- Do not apply the SQL migration until the dedicated GymLog Supabase project is active and the schema has been reviewed.
- Do not merge the draft PR or deploy to production until functional and two-account security tests pass.
