# Signup logic

This document describes the logic and flow of registering to an event.

## Quota rules

Each **Event** has one or more **Quotas**. Each **Quota** has a specific size.

In addition, the event may have an **open quota** which is specified by its size in the **Event**'s details.

When a user signs up, their **Signup** is attached to a single **Quota** instance (never the open quota).

- The first _size_ signups in a Quota (ordered by creation timestamp) are assigned to that Quota.
- The first _openQuotaSize_ signups that did not fit in their respective Quotas, ordered together by creation
  timestamp, are assigned to the open quota.
- The rest of the signups are assigned to the queue.

## Position computation

The quota assignment and position of signups is computed on-the-fly using `assignSignupPositions()` from
`src/services/signups/assignSignupPositions.ts`. This pure function takes all active signups and quotas
and returns a position map.

`computeSignupPosition.ts` contains `handlePositionSideEffects()`, which compares old vs new positions
and sends promotion emails. Callers snapshot state before mutations using a relational event query
that fetches quotas with nested active signups, then pass the snapshot to `handlePositionSideEffects()`.

The following actions trigger position side effects:

- Deletion of signups by user or admin
- Expiration of unconfirmed signups (`deleteUnconfirmedSignups.ts` cron job)
- Modifications to event quotas (via `updateEvent`)

## Expired signups

Signups expire after not being confirmed within `SIGNUP_CONFIRM_MINS` minutes (default: 30).
The cutoff is computed by `activeSignupCutoff()` in `src/db/filters.ts` and is used consistently
across all queries that filter active signups.

Expired signups immediately stop appearing in queries. Following this, the `deleteUnconfirmedSignups.ts`
cron job hard-deletes them and triggers position side effects (promotions from queue).

## Signup flow

```
                                          ╔═══════╗
                                          ║ START ║
                                          ╚═══╤═══╝
                                              │
                                ┌─────────────┴────────────┐
                                │ User clicks quota button │
                                └─────────────┬────────────┘
                                              │
                                   ╔══════════╧══════════╗
                                   ║ createNewSignup     ║
                                   ║ (server action)     ║
                                   ╚══════════╤══════════╝
                                              │
                              ┌───────────────┴────────────────┐
                              │    User receives edit token    │
                              │ and quota position information │
                              └───────────────┬────────────────┘
                                              │
                ┌─────────────────────────────┴──────┬───────────────────────┐
                │                                    │                       │
    ┌───────────┴──────────┐                         │             ┌─────────┴─────────┐
    │ User submits answers │                         │             │ User does nothing │
    └───────────┬──────────┘                         │             └─────────┬─────────┘
                │                                    │                       │
   ╔════════════╧════════════╗                       │          ┌────────────┴────────────┐
   ║ updateSignupAsUser      ║                       │          │ Unconfirmed signup      │
   ║ (server action)         ║                       │          │ expires after cutoff    │
   ╚════════════╤════════════╝                       │          └────────────┬────────────┘
                │                                    │                       │
   ┌────────────┴────────────┐                       │          ┌────────────┴─────────────┐
   │ Confirmation email sent │                       │          │ deleteUnconfirmedSignups │
   └────────────┬────────────┘                       │          │      cron job fires      │
                │                                    │          └────────────┬─────────────┘
                ├────────────────────────────┐       │                       │
                │                            │       │                       │
   ┌────────────┴───────────┐         ┌──────┴───────┴──────┐                │
   │  Admin deletes signup  │         │ User cancels signup │                │
   └────────────┬───────────┘         └──────────┬──────────┘                │
                │                                │                           │
   ╔════════════╧════════════╗     ╔═════════════╧═════════════╗             │
   ║ deleteSignup (admin)    ║     ║ deleteSignup (user)       ║             │
   ╚════════════╤════════════╝     ╚═════════════╤═════════════╝             │
                │                                │                           │
                └─────────────────────────────┬──┴───────────────────────────┘
                                              │
                                 ┌────────────┴────────────┐
                                 │ Notification email sent │
                                 │ to next signup in queue │
                                 └─────────────────────────┘
```
