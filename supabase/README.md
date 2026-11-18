# GymLog Supabase

GymLog uses the existing project **Gimnasio** and its existing tables: `groups`, `group_members`, `member_data` and `shared_data`. It does not use the separate normalized schema proposal.

## Applied migrations
The SQL files in `supabase/migrations/` correspond to migrations applied to project `hozoeaitandlypoqzlgf`:
- Private member data: `member_data` is readable only by its owner.
- RPC access: group and joint-save functions are not executable by anonymous users.
- Joint training: `save_gym_workout` verifies group membership and writes each participant's sets to their own private row.
- Group setup: a group is limited to two profiles, Jorge and Marta.
- Member removal: removing membership never deletes the other person's private history.

The unused normalized schema design was moved to `supabase/drafts/` so it cannot be applied accidentally by a normal migration push.

## Security model
- Each account has a separate Supabase Auth identity.
- Each person can read their own `member_data` row only.
- Group membership exposes the group and member display names, not private workout/body data.
- `shared_data.routines` is intentionally visible to both members.
- Joint training writes are performed through a SECURITY DEFINER RPC with explicit checks that both users belong to the same group.
- The browser contains only the Supabase publishable key. Never add `service_role` to frontend code or GitHub Pages artifacts.

## Supabase Auth URL configuration
In Supabase Dashboard → Authentication → URL Configuration:
- Set the Site URL to `https://jorgecrisos.github.io/gym-tracker/`.
- Add `https://jorgecrisos.github.io/gym-tracker/**` to the Redirect URLs allowlist.

This allowlist is required for the email-confirmation link to return to the app.

## Account setup
1. Register the first account in GymLog and create a group using the correct profile name.
2. Share the invite code.
3. Register the second account and join using the code, selecting the remaining profile name.
4. Reload the first account after the second member joins.

## Before real use
Complete the two-account tests in `supabase/tests/ACCEPTANCE_TEST_PLAN.md`. Supabase Auth currently has leaked-password protection disabled; enable it in the project's Auth password-security settings when available. The app has not yet completed a live end-to-end test with two user accounts.
