# Personas

The target user is a psychographic, not a demographic. This app is not "for millennials" or "for parents" or "for couples aged 25–40." It's for a specific pair of behavioral patterns that exist across every demographic and every life stage.

There are two personas. They are not two different *users* — they are two different *roles* that either partner can occupy at any given moment. The product treats them as symmetric: no primary account, no secondary account. Roles swap fluidly depending on the domain and the day.

## The Organizer

**The dishwasher test:** The Organizer is the partner who unloads the dishwasher and silently reloads it after their partner does it wrong.

They are not a nag. They are not a control freak. They are the person who quietly holds the mental model of the household, notices what needs doing before anyone else does, and writes the honey-do list in their head even when they don't write it down. They've probably had the "why do I always have to ask you twice" conversation. They hated it. They don't want to have it again.

**Emotional job to be done:** Relief. *"I don't have to carry this alone anymore. I can get it out of my head and know my partner can see it."*

**What they open the app to do:** Offload. Dump what's in their head into a place their partner can actually see. Assign tasks without feeling like they're nagging. See that something got done without having to ask.

**What they currently use:** Apple Notes, a paper list on the fridge, a Google Doc, a whiteboard, Todoist with an invited partner who doesn't really engage with it, or — most commonly — their own memory and occasional verbal reminders.

**What they currently believe about to-do apps:** They've probably tried two or three and bounced off. Common reasons: the partner never actually used it with them, so it became a solo productivity app; the app required too much upkeep; the app scolded them for overdue tasks; the app was boring.

**What success feels like for them:** They open the app on a Tuesday, see that their partner completed three things without being asked, and feel a small hit of warmth. The mental load isn't gone, but it's lighter, and it's shared.

## The Willing Partner

**Who they are:** The Organizer's partner. They love the Organizer. They genuinely want to contribute. They do contribute, often in ways the Organizer doesn't see. But their brain doesn't naturally hold the list. They forget. They get distracted. They feel bad when they drop the ball, which then makes them defensive, which is how the fights start.

They are not lazy. They are not checked out. They just have a different relationship to the household's operational surface than the Organizer does.

**Emotional job to be done:** Competence and warmth. *"I showed up. I'm pulling my weight. My partner sees it."*

**What they open the app to do:** Remember and contribute. See what's on the list. Knock a few things out. Occasionally surprise their Organizer by crushing a task without being asked. Feel like a good partner.

**What they currently use:** Their own memory, mostly. Calendar reminders for the big stuff. Their Organizer's verbal reminders for everything else.

**What they currently believe about to-do apps:** They associate them with work. With stress. With being managed. With being told what to do. The ask "hey let's try this new to-do app together" lands in their ears as "I am going to formally assign you tasks now."

**What success feels like for them:** They open a nudge from the app, spend ninety seconds finishing a task they'd forgotten about, mark it complete, and their Organizer smiles at them at dinner without saying anything. The app got out of the way and made them look good.

## The spectrum

These two personas are endpoints of a spectrum, not boxes to sort users into. In some couples the split is extreme — one partner is 90% Organizer and the other is 90% Willing Partner. In other couples the split is closer to 55/45 and both partners share the mental load fairly evenly.

**This matters for product design in two concrete ways.**

First, the app cannot assume one fixed Organizer and one fixed Willing Partner. Both partners need to be able to create tasks, assign tasks (to themselves or the other), and hold the list. The UI is symmetric. The roles live in the moment, not in the account.

Second, for couples with an even split, *both partners want to feel seen and appreciated.* The recognition beat — the "oh, I didn't realize all of that was on your plate" moment — is not just for the Organizer. Either partner, at any time, may be the one getting recognized. The product needs to deliver that moment to either partner equally.

## Who this is not for

- Not for individuals. A solo user experience is not a v1 goal. (It might be a sad-empty-state in which the only available action is inviting a partner.)
- Not for teams at work.
- Not for parents managing tasks *for* children, though children may appear as the subject of tasks ("pick up Sam from soccer").
- Not for polycules, co-parents living in separate households, or three-person households. The app is architected around exactly two accounts in a shared space. That is a product decision, not a technical limitation, and it's load-bearing for the positioning.

## Who the primary buyer is

In almost every couple, the Organizer is the one who discovers the app, downloads it, and asks their partner to join. The Willing Partner is the one who has to be convinced.

This has two product implications:

1. **The landing page and marketing is primarily aimed at Organizers.** The pitch is relief. "Finally, a place to put what's in your head where your partner will actually see it."
2. **The in-app onboarding for the invited partner is a completely separate design problem from the first-time setup for the Organizer.** The Willing Partner did not seek out this app. They were invited. The first time they open it, the experience cannot feel like work. It has to feel like being welcomed into something by someone they love.

This two-sided onboarding problem is one the open-questions doc tracks.
