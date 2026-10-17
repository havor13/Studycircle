# StudyCircle: build and update guide

All the step notes in one file, in order (steps 2 to 14). Each step's pack is a zip with the files that changed.

## Every time you apply a step
1. Stop the dev server (Ctrl+C). A running server locks Prisma's engine file and can cause EPERM errors.
2. Copy the pack's `src` (and `prisma`, if the step has one) into your project. Choose Merge, then
   "Replace the files in the destination". Check the new files listed in that step actually arrived,
   especially in `components`.
3. If the step changes the schema: `npx prisma db push`, then `npx prisma generate`.
4. `npm run dev` and run the step's test.

## Before you deploy
- Steps that change the schema (check each step below) need `npx prisma db push` against the LIVE database
  first: temporarily put the live connection string in `.env`, push, then put the dev one back.
- New environment variables must be added in Vercel too, then redeploy.
- Never run `git add .` in your home folder; only commit inside the studycircle project folder.

## Contents
- [Step 2 finish + posts feed](#step-2-finish--posts-feed)
- [Step 3: resources (links) and reactions](#step-3-resources-links-and-reactions)
- [Step 4: circle chat](#step-4-circle-chat)
- [Step 5: progress tracking](#step-5-progress-tracking)
- [Step 6: reactions on chat messages](#step-6-reactions-on-chat-messages)
- [Step 7: ownership transfer](#step-7-ownership-transfer)
- [Step 8: notifications](#step-8-notifications)
- [Step 9: easier invites](#step-9-easier-invites)
- [Step 10: file uploads (Vercel Blob, private store)](#step-10-file-uploads-vercel-blob-private-store)
- [Step 11: real-time chat (Pusher)](#step-11-real-time-chat-pusher)
- [Step 12: deleted accounts get logged out + change password](#step-12-deleted-accounts-get-logged-out--change-password)
- [Step 13: study-session scheduler](#step-13-study-session-scheduler)
- [Step 14: profile pictures](#step-14-profile-pictures)

---

## Step 2 finish + posts feed


Copy the `src` folder into your project and choose MERGE (do not delete your own src first).

New files:
- src/lib/permissions.ts            role rules + requireMember() check used by every action
- src/app/actions/members.ts        changeRole, removeMember, leaveGroup
- src/app/actions/posts.ts          createPost, togglePin, deletePost
- src/components/post-form.tsx      the "share something" box

Replaced file (it is the one from my first zip):
- src/app/(app)/groups/[slug]/page.tsx   now shows posts, members, role controls, leave button

No database change: Post and Membership already exist in your schema. No migration needed.

### Rules built in
- Any member can post. Authors can delete their own posts.
- OWNER, ADMIN and MODERATOR can pin/unpin and delete any post.
- OWNER can set ADMIN / MODERATOR / MEMBER. ADMIN can set MODERATOR / MEMBER on people below ADMIN.
- Managers can remove people who rank below them. Nobody can change or remove themselves.
- The OWNER cannot leave (no ownership transfer yet). Everyone else can leave.
- Every action re-checks membership on the server, so edited forms cannot bypass the rules.

### How to test
1. Log in as admin@studycircle.test, open /groups/demo, write a post, pin it.
2. In a private window register a second user and join with the invite link.
3. Back as admin: change that user's role to moderator, then try Remove.
4. As the second user: check that Pin/Delete show only after being promoted.

---

## Step 3: resources (links) and reactions


This builds on the step 2 pack. Apply step 2 first if you have not.
Copy the `src` folder into your project and choose MERGE.

New files:
- src/lib/reactions.ts               the allowed emoji (edit the list to change them)
- src/app/actions/reactions.ts       togglePostReaction
- src/app/actions/resources.ts       addResource, deleteResource
- src/components/resource-form.tsx   the "Add a resource" form

Replaced file (it will overwrite the step 2 version, which is expected):
- src/app/(app)/groups/[slug]/page.tsx   adds the Resources card and reaction buttons

No database change: Resource and Reaction already exist. No migration needed.

### Rules built in
- Any member can add a link resource and react. Click an emoji again to remove your reaction.
- Only http:// and https:// links are accepted.
- Tags: up to 5 per resource, lowercased, 20 characters each.
- The uploader can delete their own resource. OWNER, ADMIN and MODERATOR can delete any.
- Reactions are limited to the emoji in src/lib/reactions.ts.

### Not built yet
- File uploads (kind FILE). They need a storage service such as Vercel Blob, so links come first.
- Reactions on chat messages (they will use the same table when chat exists).

### Test
1. Open /groups/demo, add a resource with the tags "video, week 3".
2. React to a post with the thumbs up, then click it again to remove it.
3. As a second user, react to the same post and check the count goes to 2.

---

## Step 4: circle chat


Builds on steps 2 and 3. Apply those first.
Copy the `src` folder into your project and choose MERGE.

New files:
- src/app/(app)/groups/[slug]/chat/page.tsx   the chat page at /groups/<slug>/chat
- src/app/actions/messages.ts                 sendMessage, deleteMessage
- src/components/chat-log.tsx                 scroll box + refresh every 4 seconds
- src/components/chat-form.tsx                message box (Enter sends, Shift+Enter = new line)
- src/components/local-time.tsx               shows times in each person's own time zone

Replaced file (same as the step 3 page plus one "Open chat" button):
- src/app/(app)/groups/[slug]/page.tsx

No database change: the Message table already exists. No migration needed.

### How it works
- Only members can read or send. Every action re-checks membership on the server.
- New messages appear because the page re-loads its data every 4 seconds while the tab is visible.
  It is not true real-time (there can be a delay of a few seconds), but it needs no extra service.
- The log stays at the bottom for new messages unless you scrolled up to read older ones.
- Authors can delete their own messages. OWNER, ADMIN and MODERATOR can delete any.
- Shows the latest 100 messages.

### Later upgrades
- True real-time: add a service such as Pusher or Ably (Vercel cannot hold WebSocket connections).
- Reactions on messages: the Reaction table already has a messageId column.
- Notifications: needs a new table.

### Test
1. Open /groups/demo and press "Open chat".
2. Open the same chat as a second user in a private window.
3. Send a message from one and watch it appear in the other within a few seconds.

---

## Step 5: progress tracking


Builds on steps 2, 3 and 4 (it reuses the LocalTime component from step 4). Apply those first.
Copy the `src` folder into your project and choose MERGE.

New files:
- src/app/(app)/groups/[slug]/progress/page.tsx   the page at /groups/<slug>/progress
- src/app/actions/sessions.ts                     logSession, deleteSession
- src/components/session-logger.tsx               timer + log form
- src/lib/progress.ts                             week/day helpers and the LogState type

Replaced file (step 4 page plus one "Progress" button):
- src/app/(app)/groups/[slug]/page.tsx

No database change: the StudySession table already exists. No migration needed.

### What it does
- Timer: Start, Stop, then Save session. The timer survives a page refresh (it is kept in the browser).
- Or type minutes by hand. One session can be 1 to 720 minutes.
- Shows circle total, your total, and session count for this week (Monday to Sunday).
- Bar chart of your last 7 days, a leaderboard of the top 10 this week, and the 15 most recent sessions.
- You can delete your own sessions. OWNER, ADMIN and MODERATOR can delete any.
- Every action re-checks membership on the server.

### Good to know
- Weeks and days are counted in UTC, so someone far from UTC may see a late-evening session land
  on the next day's bar.
- Sessions are always saved as "now". Logging time for an earlier day is not built yet.
- The timer lives in one browser. Starting it on a phone will not show on your laptop.

### Test
1. Open /groups/demo, press "Progress", start the timer, stop it, save the session.
2. Type 45 minutes by hand with a topic and save.
3. Check the totals, the bar for today, and your name on the leaderboard.
4. As a second user, log time and watch the leaderboard order change.

---

## Step 6: reactions on chat messages


Builds on step 4 (chat) and step 3 (reactions on posts). Apply those first.
Copy the `src` folder into your project and choose MERGE.

Replaced files (both are full versions of the earlier files plus the new parts):
- src/app/actions/reactions.ts                      keeps togglePostReaction, adds toggleMessageReaction
- src/app/(app)/groups/[slug]/chat/page.tsx         shows reactions under each message

No new files. No database change: the Reaction table already has a messageId column.
No migration needed.

### What it does
- Under each message, emoji that people have used show as small pills with a count.
  Click a pill to add or remove your own reaction.
- The "+" button opens the four emoji (the same list as posts, in src/lib/reactions.ts) to add a new one.
- Your reactions are highlighted. Counts update with the chat's 4 second refresh.
- Only members can react. The action re-checks membership on the server and only accepts
  emoji from the allowed list.

### Test
1. Open /groups/demo/chat and send a message.
2. Press "+" under it and pick an emoji. A pill with the count 1 appears.
3. Click the pill to remove your reaction.
4. In a private window, log in as a second user, react to the same message, and check the count.

---

## Step 7: ownership transfer


Builds on steps 2 to 5. Apply those first (the circle page here includes everything from them).
Copy the `src` folder into your project and choose MERGE.

Replaced files (each is the earlier version plus the new parts):
- src/app/actions/members.ts                  adds transferOwnership
- src/app/(app)/groups/[slug]/page.tsx        adds "Make owner" in the members list

No new files. No database change. No migration needed.

### What it does
- The OWNER sees "Make owner" under every other member. Clicking it opens a short warning with
  a confirm button, so it cannot be done by accident.
- After confirming: that member becomes OWNER and you become ADMIN, in one step.
- The old owner can now use "Leave this circle" like any other non-owner.
- Owners see a note explaining why they cannot leave until they hand over the circle.

### Rules built in
- Only the current OWNER can transfer. The action re-checks this on the server.
- The target must already be a member, and cannot be yourself.
- Both role changes happen in one database transaction, and the demotion only applies while
  you are still the owner, so a double click can never leave two owners or none.
- There is always exactly one owner.

### Test
1. Log in as the admin (owner) of /groups/demo. You need a second member, so join with the
   invite link from a private window first.
2. In the Members card, press "Make owner" under the second user, then confirm.
3. You are now listed as admin and the other user as owner.
4. Log in as the new owner and transfer it back if you like.
5. As the old owner (now admin), "Leave this circle" is available.

---

## Step 8: notifications


Builds on steps 2 to 7. Apply those first (several files here are the latest versions of them).
THIS STEP CHANGES THE DATABASE, so follow the order below.

### Apply it

1. Stop the dev server (Ctrl+C in the terminal). This avoids the Windows EPERM error.
2. Copy the `src` AND `prisma` folders from this zip into your project, choosing Merge / Replace.
   - `prisma/schema.prisma` is replaced. If you edited your schema yourself since the start,
     do not replace it: instead copy only the parts marked "NEW in step 8" into your own file
     (the NotificationKind enum, two lines on User, one line on Group, and the Notification model).
3. Create the table:

   ```powershell
   npx prisma migrate dev --name add_notifications
   ```

   Your existing data is not touched. A new migration folder appears under prisma/migrations.
4. If the command ends with an EPERM error, run `npx prisma generate` once more with the dev server stopped.
5. Start the app: `npm run dev`.

### New files
- prisma/schema.prisma                         (replaced) adds the Notification model
- src/lib/notifications.ts                     notify() helper. A failure never breaks the real action.
- src/app/actions/notifications.ts             markAllRead, openNotification
- src/app/(app)/notifications/page.tsx         the page at /notifications

### Replaced files (each is the latest earlier version plus the notification parts)
- src/lib/permissions.ts                       requireMember also returns userName and groupName
- src/app/actions/posts.ts                     new post -> notifies the other members
- src/app/actions/members.ts                   role change / ownership transfer -> notifies that person
- src/app/actions/reactions.ts                 reaction on a post -> notifies the post's author
- src/app/actions/groups.ts                    joining -> notifies the owner and admins
- src/auth.config.ts                           /notifications now requires login
- src/app/(app)/layout.tsx                     bell with an unread count in the header

### Who gets told what
- New post: every other member of the circle.
- Someone joins by invite link: the owner and the admins.
- Your role changes (including becoming owner): you.
- Someone reacts to your post: you (not for your own reactions, not when a reaction is removed).
- Not covered: chat messages (every message would flood people), reactions on chat messages,
  and being removed from a circle.

### Good to know
- Click a notification to mark it read and go to the circle. "Mark all as read" clears the badge.
- The page shows your latest 50.
- The header count updates when you open or reload a page. It does not update live while you sit
  on one page. Live updates belong with the real-time chat step.
- Events from before this step have no notifications.
- There are no emails or push notifications. This is in-app only.

### Test
1. Log in as user A (admin) and user B (private window), both in /groups/demo.
2. As A, write a post. As B, the bell shows 1. Open /notifications and click it: you land on the circle.
3. As B, react to A's post. A's bell shows 1.
4. As A, change B's role to moderator. B gets "Your role in Demo Group is now moderator".
5. Register a third user, join with the invite link. A (owner) is told who joined.

---

## Step 9: easier invites


Builds on steps 2 to 8. Apply those first (several files here are the latest versions of them).
Copy the `src` folder into your project and choose Merge. There is no `prisma` folder in this pack,
so nothing touches your database or migrations. Nothing to run except `npm run dev`.

### New files
- src/lib/invite.ts                          cleanInviteCode(): finds the code in a pasted link or messy text
- src/components/invite-link.tsx             one selectable link box with a "Copy link" button
- src/components/join-by-code-form.tsx       the "Join with an invite link" box for the dashboard

### Replaced files (each is the latest earlier version plus the new parts)
- src/app/actions/groups.ts                  adds joinByCode
- src/app/(app)/groups/[slug]/page.tsx       invite box now shows the full link with a Copy button
- src/app/(app)/dashboard/page.tsx           adds the join box above your circles
- src/app/(app)/join/[inviteCode]/page.tsx   forgives a messy paste in the address bar

### What changed
- Circle page (owner and admins): the Invite link box is now a single selectable line holding the
  FULL link (for example http://localhost:3000/join/<code>) and a "Copy link" button. The extra grey
  text that caused the 404 is gone. The address comes from the page you are on, so it is right on
  localhost and on your real domain with no setting.
- Dashboard: a "Join with an invite link" box. Paste a whole link or just the code and press Continue.
  You land on the normal "Join <circle>?" page and confirm there, so notifications still work.
- Join page: if someone pastes the code with extra text, or a whole link after /join/, it now cleans
  it up and redirects to the right address instead of showing a 404.
- A code that does not exist shows a clear message in the dashboard box.
- Nobody is added by accident: joining always happens on the confirmation page.

### Test
1. As the admin, open /groups/demo. The Invite link box shows one line starting with http://. Press "Copy link".
2. In a private window, register a new user. On the dashboard, paste the link into the join box, press Continue.
3. You see "Join Demo Group?". Press "Join circle". The admin gets a "joined" notification.
4. Try pasting only the code, then some nonsense, to see the error message.
5. Visit /join/<code>%20anything in the address bar. It redirects to the clean address.

---

## Step 10: file uploads (Vercel Blob, private store)


Builds on steps 2 to 9. Apply those first. NO database change: uploaded files use the existing
Resource table (kind FILE). Nothing to push or migrate.

### Apply it
1. Make sure BLOB_READ_WRITE_TOKEN is in your local `.env` (see the chat message for where to copy it from).
2. Stop the dev server, then in the project folder run:
   ```powershell
   npm install @vercel/blob@latest
   ```
   (needs version 2.3 or newer for private stores)
3. Copy the `src` folder from this zip into your project and choose Merge.
4. `npm run dev`
5. On Vercel: the token is already on the project because you connected the store. Redeploy after pushing.

### New files
- src/lib/files.ts                              allowed types, 4 MB limit, helpers
- src/components/file-upload-form.tsx           "Upload a file" form
- src/app/api/groups/[groupId]/files/route.ts   upload (members only)
- src/app/api/files/[id]/route.ts               download (members of that circle only)

### Replaced files
- src/app/actions/resources.ts                  deleting a file resource also deletes the stored file
- src/app/(app)/groups/[slug]/page.tsx          files show with a paperclip and size; new "Upload a file" box

### Rules
- Up to 4 MB. Types: pdf, png, jpg, jpeg, webp, gif, txt, docx, pptx, xlsx.
- The type is decided by the extension from our own list, never by what the browser claims.
- PDFs, images and text open in the browser; Word, PowerPoint and Excel download.
- The store is private: there is no public web address. Every open goes through /api/files/<id>,
  which checks you are logged in and a member of that circle.
- Not covered: notifications for new files, files bigger than 4 MB, previews.

### Test
1. Open /groups/demo, expand "Upload a file", pick a small PDF, press Upload. It appears under Resources with a 📎.
2. Click it: the PDF opens. Try a .exe or a file over 4 MB: you get a clear error.
3. Copy the file's link (/api/files/<id>) into a private window logged in as a user who is NOT in the circle: Not found.
4. Delete the file: it disappears, and the Blob store's file list on Vercel loses it too.

---

## Step 11: real-time chat (Pusher)


Builds on steps 2 to 10. NO database change.

### Before you apply it
- Pusher keys in your local `.env` (development app) and in Vercel (production app):
  PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER
- `npm install pusher pusher-js`

### Apply it
1. Stop the dev server. Copy the `src` folder into your project and choose Merge.
2. `npm run dev`
3. Push to GitHub. After adding the four variables on Vercel, redeploy (variables only apply to new deployments).

### New files
- src/lib/pusher-server.ts             server client + pingChat(): tells a circle's chat to reload
- src/app/api/pusher/auth/route.ts     lets only logged-in MEMBERS listen to a circle's channel

### Replaced files
- src/components/chat-log.tsx          listens for the ping; polling is now only a backup
- src/app/actions/messages.ts          pings after send and delete
- src/app/actions/reactions.ts         pings after a chat-message reaction
- src/app/(app)/groups/[slug]/chat/page.tsx   passes groupId, new wording

### How it works
When someone sends, deletes or reacts, the server tells Pusher "this circle changed". Every open chat
for that circle reloads its messages from YOUR database. The ping carries no message text, so Pusher
never sees what people write, and the usual membership checks still decide who sees what.
Channels are private: Pusher asks /api/pusher/auth first, which says yes only to members.

### Fallback
No keys, or the connection drops: it polls every 4 seconds like before. With real-time connected it
also refreshes about every 30 seconds as a safety net.

### Test
1. Open /groups/demo/chat in two windows (one private) as two members.
2. Send a message in one: it appears in the other within a second, with no waiting.
3. React with an emoji and delete a message: the other window updates too.
4. In the browser's developer tools, Network tab, filter "WS": a websocket to Pusher is open.
5. As a user who is NOT in the circle, the chat page shows Not found and never subscribes.

### Free plan notes
Pusher's free plan has daily message and connection limits. A study group is far below them, but each
send/delete/reaction counts as one message to each open chat.

---

## Step 12: deleted accounts get logged out + change password


Builds on steps 2 to 11. NO database change. No new packages.

### Apply it
Stop the dev server, copy `src` into your project (Merge), `npm run dev`.

### New files
- src/app/(app)/account/page.tsx          /account page
- src/app/actions/account.ts              changePassword
- src/components/change-password-form.tsx the form

### Replaced files
- src/auth.ts                  jwt callback now checks the account still exists (null = logged out)
- src/auth.config.ts           /account is protected; the "logged in on /login -> dashboard" redirect moved
- src/lib/validations.ts       adds changePasswordSchema
- src/app/(app)/layout.tsx     your name in the header links to /account
- src/app/(auth)/login/page.tsx, register/page.tsx   send logged-in people to the dashboard themselves

### Why the login/register pages changed
The check in middleware runs at the "edge" and cannot ask the database. If it kept redirecting
logged-in visitors away from /login, a deleted user's old cookie would bounce between /login and
/dashboard forever. Now the pages do that redirect on the server, where the account check is real.

### Cost
One small database lookup (by id) each time the server reads the session. Fine at this size.

### Test
1. Change password: header name -> /account. Wrong current password shows an error; a correct one shows "Password changed". Log out and in with the new one.
2. Deleted account: log in as a throwaway user in a private window, then delete that user in Prisma Studio.
   Click any page in that window: you land on /login, with no loop. Logging in as them fails.
3. Your own account is unaffected.

---

## Step 13: study-session scheduler


Builds on steps 2 to 12. THIS STEP CHANGES THE DATABASE.

### Apply it
1. Stop the dev server. Copy `src` AND `prisma` from this zip into your project (Replace/Merge).
   `prisma/schema.prisma` is replaced; it adds NEW_EVENT to NotificationKind plus two models
   (StudyEvent, EventRsvp) and a back-relation line on User and Group.
2. Create the tables in your DEV database (the one in your local .env):
   ```powershell
   npx prisma db push
   ```
3. `npm run dev` and test (below).

### BEFORE you deploy to Vercel: update the LIVE database too
The live site uses a different database, so it does not have the new tables yet. If you deploy the
code first, circle pages will error with "table does not exist". Do this once, before pushing to GitHub:
1. In .env, temporarily put the LIVE connection string (Vercel > Settings > Environment Variables > POSTGRES_URL)
   in both DATABASE_URL and DIRECT_URL.
2. `npx prisma db push`  (it only ADDS tables; nothing is deleted)
3. Put your DEV connection string back in .env.
4. Now commit, push and let Vercel deploy.

### New files
- src/app/actions/events.ts          createEvent, toggleRsvp, deleteEvent
- src/components/event-form.tsx      "Propose a session" form

### Replaced files
- prisma/schema.prisma
- src/app/(app)/groups/[slug]/page.tsx   "Study sessions" card above Resources

### How it works
- Any member can propose a session: title, date and time, length, optional place or link, optional notes.
- The time you pick is in YOUR time zone and is converted to UTC before it is saved, so everyone sees it in their own zone.
- The organiser is marked as going. Everyone else taps "I'm going" (tap again to cancel).
- The organiser, and admins and moderators, can delete a session.
- Everyone else in the circle gets a notification (the bell).
- Sessions stay listed until one hour after they start. The list shows the next 10.

### Test
1. As user A, open a circle > Study sessions > Propose a session. Pick a time tomorrow. Plan it.
2. As user B (private window): the bell shows 1, the session is listed with A going. Press "I'm going".
3. Back as A: "2 going". Delete the session as A: it disappears for both.
4. Try a time in the past: "Pick a time in the future."

---

## Step 14: profile pictures


Builds on steps 2 to 13. NO database change (it uses the `image` column User already had),
so there is no `prisma db push` this time, for dev or live.

### Apply it
1. Stop the dev server.
2. Copy `src` from this zip into your project, choose Merge, then "Replace the files in the destination".
   Check that these NEW files exist afterwards (you have missed new files in `components` before):
   - src/lib/avatar.ts
   - src/components/avatar.tsx
   - src/components/avatar-form.tsx
   - src/app/api/account/avatar/route.ts
   - src/app/api/avatars/[userId]/route.ts   (use `dir -LiteralPath` to check, because of the brackets)
3. `npm run dev`. Your .env already needs BLOB_READ_WRITE_TOKEN (step 10).

### Replaced files
- src/app/(app)/layout.tsx            picture beside your name in the top bar
- src/app/(app)/account/page.tsx      "Profile picture" section
- src/app/(app)/groups/[slug]/page.tsx   pictures on posts and the member list
- src/app/(app)/groups/[slug]/chat/page.tsx   pictures on other people's chat messages

### How it works
- Account page > Upload picture. PNG, JPG or WebP, up to 2 MB. The first bytes of the file are checked,
  so a renamed non-image is refused.
- Stored in your PRIVATE Blob store under avatars/<your id>/. Replacing or removing a picture deletes the old file.
- Pictures are served through /api/avatars/<id>, which requires a logged-in user. Logged-out visitors get nothing.
  Any logged-in user can see any picture (they only ever see them next to people in their circles).
- No picture: a round badge with the person's initials.

### Test
1. Account page: upload a picture. It appears there and in the top bar.
2. Open a circle and the chat: your posts and members row show it. Another user sees it too.
3. Try a .txt renamed to .png: "That file is not a valid picture." Try a 5 MB image: "too large".
4. Change picture, then Remove: back to initials.
5. Open the picture URL in a private window (not logged in): it is refused.