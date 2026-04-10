# Vision

## Origin story

This project started with a small argument. Dave and his wife Krista had moved into a new house. There were dozens of things that needed to get done — around the house, in her business, general life admin — and Dave was carrying most of that list in his head. One evening, frustrated, he opened an Apple shared note and in about two minutes typed out forty things he wanted Krista to know needed doing.

The fight didn't end with "we need a new system." It ended with something quieter and more important: *"Wow, I didn't realize we had so much to get done."* Krista wasn't lounging because she didn't care. She was lounging because the list was invisible to her. Dave wasn't mad because she was lazy. He was mad because the load he was carrying was invisible to her.

That two-minute list was the product moment. It wasn't the argument — it was the reveal. One partner dumped what was in their head, and the other partner saw it and felt the weight. That instant of *oh* is the core emotional beat this app has to recreate on demand.

## The wedge

The productivity category has a thousand to-do apps. Most of them can technically be shared with another person. Todoist lets you invite a team. Apple Notes lets you share a note. Trello lets you invite collaborators. Any of them *can* be used by a couple.

None of them are *for* couples.

The wedge isn't a feature — it's positioning as a design constraint. Every surface of this app, from the onboarding to the empty states to the settings screen to the billing page, is designed around the specific dynamic of two people in a relationship. That gap in the market is wider than it looks because most tech-forward people haven't even realized what they're missing. A friend of Dave's who lives on a shared whiteboard with his partner is the proof: sophisticated users are actively *rejecting* general-purpose tools for shared household coordination, not because the tools can't do it, but because the tools don't *feel* like they were made for the job.

Everyone knows this. Nobody has planted a flag.

## The core emotional claim

**This app exists to make invisible labor visible — gently, playfully, and without blame.**

Coordination is table stakes. Recognition is the differentiator. Every feature must either (a) help a partner get what's in their head into a shared space, (b) help the other partner see and act on that shared space, or (c) create a moment of mutual recognition between them. Features that coordinate without creating recognition are commodity. Features that create recognition without coordinating are gimmicks. The product needs both, and recognition is the thing that makes it feel different from day one.

## Three nested motivations

This project is being built for three reasons that reinforce rather than compete with each other.

**1. Build a real product and bring it to market.** Dave and Krista's household coordination problem is not unique to them. Every couple with a mental-load asymmetry — which is most couples — has some version of it. This is not a personal tool that happens to work for others — it is a product intended to be marketed, sold, and grown. Dave and Krista are the first users and the proof of concept, but the goal is a commercially viable product serving many couples. Solving it well for two specific people in a specific house is the *starting point*, not the ceiling.

**2. Serve as a credibility artifact.** Dave is building an agentic software company. This app is a showcase of what one person assisted by AI can ship end-to-end: real auth, real payments, real infrastructure, real design craft, real test coverage. The origin story and the novel mechanics become part of the sales narrative when showing the work to prospective customers.

**3. Be fun to build and use.** Dave lives by to-do lists. A to-do app designed around his own workflow, with Krista as a real user from day one, is a project he'll actually finish. Enthusiasm is a feature.

These motivations point in the same direction. A commercially successful product is the best possible showcase. A project that's fun to build is the one that ships. There is no hidden trilemma; optimizing for craft serves all three.

## Tenets

The decisions downstream of this doc get checked against these. If a proposed feature, copy change, or design decision violates one of these, it needs a very good reason.

**Invisible labor, visible.** The core job of the product is turning what's in one partner's head into something the other partner can see. If a feature doesn't serve visibility, coordination, or recognition, it's not load-bearing and can be cut.

**Recognition over coordination.** Many apps coordinate. Few create recognition. When there's a trade-off, pick the path that makes the other partner feel seen.

**Symmetric roles, asymmetric moments.** There is no "primary" account and "secondary" account. Either partner can be the one holding the list or the one receiving tasks at any moment, and the roles fluidly swap. The product treats both partners as equals; the *moment* is what's asymmetric, not the identity.

**Warm, never scolding.** The app is on your side and on your partner's side simultaneously. It never takes sides in a disagreement, never shames missed tasks, never frames the partner as a problem. When things go wrong, it assumes good faith.

**Narrow surface, deep craft.** v1 ships with fewer features than competitors but higher craft per feature. We'd rather have three things that feel like Linear than ten that feel like a hackathon project.

**Themed from day one.** The product is themeable as a first-class concept, not a v2 add-on. Every component built in v1 uses theme tokens instead of hard-coded values, even if v1 only ships one theme.

**Built for the showcase.** This project's quality bar is "I would show this to a paying customer as an example of my work." That's a higher bar than "it works." It's not higher than "it's finished" — a showcase that never ships is worthless.

## What this product is not

- Not a general-purpose to-do app with a "share" button bolted on.
- Not a chore app that scolds you for missing chores.
- Not a relationship app that happens to have to-dos.
- Not a productivity tool for teams or roommates. (Roommates may use it. That's fine. It's not designed for them.)
- Not a scheduling or calendar app. It integrates with calendars but is not one.
- Not a habit tracker, though habit stacks are on the long-term roadmap.
