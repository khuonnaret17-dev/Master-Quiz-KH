# Firebase Security Specification - Vignasa Cambodia

## 1. Data Invariants
- A `ministry` can only be created/updated/deleted by an Admin.
- A `user` profile can only be accessed or modified by the owner of that UID.
- A user's `role` cannot be changed by the user themselves (only by an Admin or system).
- `ministries` are publicly readable by any authenticated user.

## 2. The Dirty Dozen Payloads (Denial Tests)

1. **Anonymous Write to Ministries**: 
   `POST /ministries` with `{ name: "Fake Ministry" }` while not logged in. -> DENIED
2. **Member Modifying Ministry**: 
   `PATCH /ministries/m1` with `{ name: "Hacked" }` as a non-admin. -> DENIED
3. **Escalating Role**: 
   `PATCH /users/my-uid` with `{ role: "ADMIN" }` as a member. -> DENIED
4. **Reading Other's Progress**: 
   `GET /users/other-uid` as a member. -> DENIED
5. **ID Poisoning**: 
   `POST /ministries` with ID `../../../etc/passwd`. -> DENIED
6. **Shadow Fields**: 
   `POST /ministries` with `{ name: "X", extraSecretField: "val" }`. -> DENIED
7. **Junk Document ID**:
   Creating a ministry with a 2KB string as ID. -> DENIED
8. **Invalid Status Update**:
   Setting a non-existent category in a quiz. -> DENIED
9. **PII Leak**: 
   Querying the entire `users` collection. -> DENIED
10. **Admin Identity Spoofing**: 
    `GET /ministries` while sending a manual auth token with `role: admin`. -> DENIED (must check DB)
11. **Orphaned Write**: 
    Creating progress for a ministry ID that doesn't exist. -> DENIED
12. **Recursive Cost Attack**: 
    Deeply nested `get()` calls in rules. -> DENIED

## 3. Test Runner (Mock)
(See `firestore.rules.test.ts` for implementation details)
