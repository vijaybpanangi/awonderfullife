---
title: "Built With AI, Here to Stay"
date: 2026-07-10
category: technology
description: "I built Track Your App with AI's help, production incident and all. Here's why software deserves to be judged on what it does, not how it was made."
excerpt: 'Building Track Your App with AI assistance meant real architecture calls, a real production incident, and a genuine ethical stand on privacy, none of it visible from outside. Here is what happened when something went wrong, and why the label "AI-assisted" says less than people think it does.'
heroAlt: "A cluttered desk of scattered notes and spreadsheet sketches under a lamp dissolves into a glowing tiled pathway leading to a bright red maple leaf, with a starry night sky, trees, and a lake visible through a large window."
dek: "What building Track Your App taught me about software, responsibility, and the wrong way to judge AI-assisted work."
minRead: 9
guid: "https://awonderfullife.ca/posts/built-with-ai-here-to-stay.html"
---
The moment someone learns that a piece of software was built with AI assistance, something changes in how they look at it.

Not the software itself. The interface has not moved. The feature still works exactly as it did a second earlier. What changes is the presumption underneath it.

Suddenly, it is “vibe coded.” A toy. A liability waiting to be discovered. Something to be politely impressed by, perhaps, but not genuinely trusted.

The verdict often arrives before the inspection. Before anyone has opened the app, followed a complete flow, reviewed how the data is handled, or asked what happens when something breaks.

It is a strange kind of skepticism because many of the same people are already using AI to draft emails, summarize documents, analyze data, or debug their own code. They understand that using a tool does not automatically remove the judgment of the person using it. Yet when software is involved, that understanding seems to disappear.

The assumption becomes that if AI helped build it, the reasoning, trade-offs, accountability, and decisions under pressure must have disappeared too.

That assumption is wrong often enough that it deserves a closer look.

AI-assisted development is not a passing trend that the industry is waiting to outgrow. It is already part of how real software gets built, including ours. The habit of judging the method before examining the result needs to catch up.

## It Started With a Spreadsheet

Track Your App began with a Google Sheet.

The IRCC PR Master Tracker is collaboratively maintained by Canadian Express Entry applicants. Each row represents someone’s immigration journey: when they received their Acknowledgement of Receipt, when biometrics were requested, when their background check progressed, and when the final decision arrived.

It is remarkable because the information is real. It comes from the lived experiences of people who went through the process, not from a generalized government processing estimate.

But the question most applicants wanted answered was also one of the hardest to answer from inside the spreadsheet:

**How much is actually moving?**

How many people received an update this week? How many applications progressed since the last time you checked? Are applicants with timelines similar to yours beginning to receive decisions?

In a spreadsheet containing hundreds of rows, those answers were buried. Sorting one column could disrupt the context provided by another. Filters were limited. Trends were difficult to see. There was no simple way to glance at the information and understand whether the process was moving.

You could only scroll, compare, calculate, and scroll again.

We built Track Your App for the people staring at that spreadsheet at midnight, quietly doing arithmetic on someone else’s timeline to make sense of their own.

Waiting for a permanent residence decision is not a background process. It follows you through the day. It sits with you at dinner. It wakes you up at night. Sometimes the only honest comfort available is understanding how long the process took for people whose circumstances resembled yours.

The spreadsheet contained that knowledge. It was simply buried under its own size.

We wanted to return it to the community in a form that answered the questions people were actually asking.

## What “AI-Assisted” Really Looked Like

Building the application with AI did not mean typing one sentence and receiving a finished product.

It meant working with an AI collaborator through the same decisions any serious software project requires, then living with the consequences when those decisions were wrong.

Early in the project, we had to decide where the data would live.

The obvious modern choice was a popular database service with a generous free tier. However, databases on that tier could automatically pause after roughly a week without activity.

For many side projects, that might be an acceptable inconvenience.

It was not acceptable for this one.

People might use the tracker intensely for several days, step away for a few weeks, and return during one of the most stressful moments of their immigration process. They should not have to wait for our database to wake up because our infrastructure was designed around the convenience of a free plan.

We chose a less fashionable option that remained available continuously.

That decision worked until the free tier itself became the problem.

As more real timelines began flowing through the application, the platform’s strict computing limits caused the site to time out under ordinary traffic. It was a real outage affecting real users, and it was entirely ours to own.

We moved to a paid tier that same week. The capacity problem disappeared.

The decision was not made by AI. AI helped us understand the options, examine the trade-offs, implement the changes, and test the result. The responsibility for choosing, monitoring, and correcting the system remained ours.

## The Most Important Decision Was Not Technical

The hardest decision we made was not architectural. It was ethical.

People were trusting an unfamiliar application with information about their immigration status. They deserved better than having their names, email addresses, or other identifying details sitting in a database that might someday be breached, subpoenaed, exposed through an error, or simply misused.

Partway through the build, we reconsidered the account system entirely.

We removed the collection and storage of email addresses and real names. Users would instead be represented by a nickname they could choose themselves or allow the application to generate.

Nobody had requested this feature.

Most users would never even notice it as a feature.

Implementing it meant tearing out part of the existing account system and rebuilding it from the ground up. It cost us weeks that we had not planned to spend.

We did it anyway because it was the right decision.

That is the part that gets lost when people hear “built with AI” and imagine that nobody was making deliberate choices. AI could help us restructure the system. It could not decide what responsibility we owed the people using it.

## Then We Made a Serious Mistake

The privacy rebuild required us to restructure the central database table that many other parts of the application depended on.

During that work, a safety guard designed to prevent changes from cascading into connected tables was removed. The assumption was that the safeguard was no longer necessary.

It was necessary.

When the rebuild ran, the change cascaded further than intended and deleted real users’ application records.

These were not test records. They were actual immigration milestones belonging to actual people. Dates they had trusted us to preserve disappeared in the time it took a database query to execute.

We caught the problem within minutes.

Fortunately, every table had automatic point-in-time backups running underneath it. We restored the database to the moment before the mistake, reconstructed the legitimate changes that had occurred since then, and verified the restored information carefully.

Milestone by milestone. Application by application.

Nothing was permanently lost.

Still, that does not make the mistake insignificant. The fact that recovery systems worked does not excuse the action that made them necessary.

The lesson was painfully simple: before changing anything that other data depends on, back up and protect everything connected to it, not only the component you intend to modify.

It is the kind of lesson many engineering teams learn once, the hard way.

We were fortunate that it cost us an afternoon of quiet panic instead of a single person’s trust.

## Trust Is Built After the Launch

None of this happened over one weekend.

The application has now been live and growing for months. More than six hundred real applicants have shared their timelines through it. Thousands of automated tests run against changes before they are released. A native iOS application has also been built through the same process and, at the time of writing, is awaiting Apple’s review.

The work happened decision by decision, test by test, and incident by incident.

None of that is visible to someone who dismisses the application the moment they hear that AI helped build it.

They do not see the reasoning behind the database choice.

They do not see the decision to remove personal information that nobody had asked us to remove.

They do not see the afternoon when records were accidentally deleted, the backups that restored them, or the safeguards added afterward.

They do not see the testing, monitoring, revisions, or months of continued work.

They see only the phrase:

**Built with AI.**

And sometimes that phrase is enough for them to reach a conclusion before looking at what was actually built.

## Judge the Software, Not the Toolchain

We do not dismiss all human-written software because one development team once released a defect or brought down a production database.

We understand that mistakes happen.

What matters is whether the team anticipated risks, detected problems, took responsibility, restored what was affected, and improved the system afterward.

AI-assisted development deserves the same standard. No less scrutiny, certainly, but no automatic presumption of incompetence either.

There is plenty of genuinely careless AI-generated software in the world. Applications are launched without proper testing. Security concerns are ignored. Hallucinated code is accepted without review. Products are released by people who do not understand what they have built.

That deserves criticism.

But the problem in those cases is not merely that AI was involved. The problem is that judgment and accountability were missing.

Those failures existed long before generative AI. AI simply allows careless work to be produced faster, just as it allows careful builders to test ideas, investigate problems, and improve systems faster.

The useful question is not whether AI touched the code.

The useful questions are these:

Does the software work?

Is the data handled responsibly?

What happens when something fails?

Was the system tested?

Are the people behind it willing to own their decisions?

Those are the questions that reveal whether software deserves trust.

## What Actually Earned Trust

In the end, trust was never earned because an AI helped write the code.

It was earned through what happened when something went wrong.

How quickly we noticed it.

How completely we restored what had been affected.

How honestly we took responsibility.

What we changed afterward so the same failure could not happen in the same way again.

That is the test that has always mattered for software.

It has very little to do with who, or what, held the pen.

Somewhere tonight, an applicant is still staring at a spreadsheet and doing quiet arithmetic on a stranger’s timeline, trying to predict their own future.

That person is who Track Your App was built for.

AI helped us build it.

The responsibility for making it worthy of their trust remains entirely ours.
