# GymLog acceptance and security tests

## Build and deployment
- [ ] GitHub Actions build passes lint, TypeScript and Vite build.
- [ ] GitHub Pages workflow uploads `dist/` and deploys successfully.
- [ ] Open the deployed URL on iPhone Safari and install the PWA.
- [ ] Confirm refresh and deep-link navigation work under `/gym-tracker/`.

## Authentication and group onboarding
- [ ] Create Jorge's account and confirm email if required.
- [ ] Create a GymLog group as Jorge and copy the invite code.
- [ ] Create Marta's separate account and join using the invite code.
- [ ] Confirm the group contains exactly two profiles with different display names.
- [ ] Confirm a third account cannot join the full group.

## Privacy and RLS (two real accounts required)
- [ ] Jorge can read his own `member_data` row.
- [ ] Jorge cannot read Marta's `member_data` row by changing filters or IDs.
- [ ] Marta cannot read Jorge's `member_data` row.
- [ ] An unauthenticated client cannot execute group or joint-save RPCs.
- [ ] A user outside the group cannot read group details or member data.
- [ ] Both members can read/update shared routines.
- [ ] Removing a member does not delete their private `member_data`.

## Workout flows
- [ ] Save an individual Jorge workout and verify it appears after refresh/sign-in.
- [ ] Save an individual Marta workout and verify it appears after refresh/sign-in.
- [ ] From one mobile, create a joint session with sets for both people.
- [ ] Verify the joint workout appears in both histories, each with only that person's sets.
- [ ] Retry a save with the same workout ID and verify no duplicate is created.
- [ ] Verify a joint-save RPC rejects a user ID outside the same group.

## Remaining functional checks
- [ ] Create/edit/delete personal and shared routines.
- [ ] Add goals, body measurements and recovery entries; verify privacy and persistence.
- [ ] Verify CSV export and per-person ownership.
- [ ] Test timer presets, active workout behavior and app refresh.
- [ ] Check mobile, iPad and desktop layouts.

## Known gaps
- Photos in private Supabase Storage are not wired into the UI.
- Offline write queue and conflict resolution are not implemented.
- Realtime updates between devices are not implemented.
- No automated end-to-end test has yet been run with two authenticated accounts.
