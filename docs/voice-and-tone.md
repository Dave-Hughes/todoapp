# Voice and Tone

This doc defines the app's *character*. It is deliberately separated from the theme system. Voice and tone are *what the app says* and *how it says it*. Themes are *what the app looks and sounds like when it's saying it*. The character does not change when the costume changes.

## The character

Imagine the app as a person. That person is:

- **Warm.** On your side, and on your partner's side, simultaneously. Never neutral to the point of cold, never clinical.
- **Playful.** Uses light humor where it fits. Not zany. Not goofy. Not cute for the sake of cute. Playful the way a good friend is playful — dry, a little knowing, occasionally a gentle tease.
- **Cheeky, in small doses.** Knows that doing chores is not inherently exciting and is willing to acknowledge that with a wink. Especially at Bounties and Vault surfaces (post-v1), where cheeky is load-bearing.
- **Competent.** Moves fast, knows what it's doing, doesn't waste your time. Playfulness never gets in the way of getting things done.
- **Low-ego.** Doesn't preen. Doesn't announce its own cleverness. The humor lands better because it's understated.
- **On the team.** Talks about "you two" more than "you." Acknowledges the partnership as the subject of most things.

If the character had a one-line pitch: *it's the cheeky accomplice helping two people run a life together.*

## Voice principles

**1. Write like a friend, not like a product.** "Nothing left today. You two are dangerous." is the voice. "All tasks completed!" is not.

**2. Talk to both partners, not just the one who's looking.** Where natural, frame copy as if both partners are the audience, even when only one is reading. Use "you two" and "your partner" liberally.

**3. Never scold.** Missed a task? The app notices gently, if at all. It never says "overdue" in red ink. It never uses the word "failed." It never implies that the user is doing something wrong by being human.

**4. Never take sides.** If one partner hasn't done something the other asked for, the app does not side with the asker. It does not guilt-trip the other partner. It's equally warm to both.

**5. Short beats long.** Two words where five would do. The humor lands better when the copy gets out of the way quickly.

**6. Specific beats generic.** "You two knocked out five things this morning" beats "Great job!" every time. Specificity is warmth.

**7. Never be cute about something serious.** Payment errors, account deletion, data export, partner unlinking — these surfaces go quiet and direct. The playfulness never obscures something the user needs to understand clearly.

## Do and don't

| Don't | Do |
|---|---|
| "All tasks completed! 🎉" | "Nothing left. You two are dangerous." |
| "Error: task could not be saved." | "That didn't save. Try again?" |
| "You have 3 overdue tasks." | "A few things are still hanging around." |
| "Welcome to ToDoApp!" | "Welcome. Let's get what's in your head out of there." |
| "No tasks yet. Add one to get started." | "Empty. What's rattling around up there?" |
| "Invite your partner." | "Bring your person in." |
| "Task assigned to Krista." | "On Krista's plate now." |
| "Are you sure you want to delete this task?" | "Delete it for good?" |
| "Your subscription has expired." | "Your plan ran out. Want to keep going?" |
| "Failed to sync." | "Couldn't sync just now. Retrying." |

## Surfaces where tone actually shows up

A to-do app has very little copy compared to, say, a social app. The places where voice and tone *actually matter* are:

- **Onboarding** (both the Organizer's first run and the invited partner's first run — these are two different scripts)
- **Empty states** (the Today view when nothing's on the list, Week view when the week is clear, Vault when it's empty, etc.)
- **Confirmation dialogs** (delete, unlink partner, cancel subscription)
- **Error and offline states**
- **Notifications and nudges** (including SMS when it ships)
- **Bounty flavor text** (post-v1)
- **Vault prize approval flow** (post-v1)
- **Marketing surfaces** (landing page, social, email, digests) — these carry *more* of the tone than the in-app surfaces

Everything else is chrome and should just work.

## Where the tone turns down

Some surfaces need to get quiet and direct. The character doesn't disappear — it just stops winking.

- **Payment, billing, and subscription errors.** Direct. Clear. Actionable.
- **Account deletion and data export.** Respectful. Precise. The user is trusting you with something serious.
- **Partner unlinking.** Treat it as a significant event. No jokes.
- **Accessibility labels and screen-reader text.** Descriptive and literal. Don't try to be clever in places the tone can't land.
- **Legal copy and privacy notices.** Plain. Short. The voice is present in sentence rhythm, not in jokes.

## Sample copy for reference

These are not final copy. They're tuning-fork examples for future copywriting sessions.

**First-run, Organizer, completely empty app:**
> Welcome. Let's get what's in your head out of there.
> [CTA: Add the first thing]

**First-run, invited partner, seeing the shared list for the first time:**
> You're in. This is everything Dave's been carrying around up there.
> [Subtext:] Nothing's assigned to you yet. Take a look around.

**Today view, nothing due:**
> Nothing left today. You two are dangerous.

**Today view, a handful of tasks, everything done by mid-afternoon:**
> All clear. The rest of today is yours.

**Task just completed, small reward moment:**
> Nice. One less thing.

**Task created and assigned to partner:**
> On Krista's plate now.

**Partner completes a task you assigned:**
> Dave got it. Trash is out.

**Confirmation to delete a task:**
> Delete it for good?
> [Delete] [Never mind]

**Error, network:**
> Couldn't reach the server. Trying again in a moment.

**Partner invite sent, waiting on accept:**
> Waiting on Krista. You'll know when she's in.

**Partner hasn't accepted after a few days:**
> Krista hasn't joined yet. Want to send the invite again?

## A note on the Cyberpunk test

The tone above has to work identically in the default warm-cozy theme *and* in a hypothetical Cyberpunk theme. Test: read each sample line above in a neon-magenta monospace font with glitchy scanlines. Does the character survive? If yes, the copy is theme-agnostic. If no, it's leaking visual tone into written tone, and it needs to be rewritten. This is the acid test for everything we write.
