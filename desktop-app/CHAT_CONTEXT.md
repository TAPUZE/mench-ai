# Chat context, source lookup, and tutor profiles

Version 0.3.0 restores the distinct English-speaking and Israeli community
frameworks inside the shared context pipeline. The original `English Rabbi` and
`Hebrew rabbi` documents remain intact as design material; they are not approved
source texts or evidence of a real rabbi's views.

## Request pipeline

1. The workbench collects the current question, recent conversation, saved project
   brief, explicitly checked current project files, and optional real task output.
   It reads current open editor contents; it does not reuse stale file attachments.
2. `shared/chat-context.mjs` routes the question by subject terms and conversation
   context. English and Hebrew use the same intent definitions. A substring such
   as `app` inside `happy` cannot select a coding persona. Source and practical
   religious follow-ups retain their evidence/referral requirements.
3. School requests are authenticated and checked against the expected account.
   The service searches its own approved library and builds the prompt from the
   current school policy. Client-supplied authority instructions, sources, and
   prepared prompts do not become trusted policy.
4. The shared context builder separates trusted policy/teaching style/source
   approach from user notes, conversation excerpts, files, process output, and
   retrieved passages. The same provider request format is used in browser,
   personal desktop, and school mode.
5. The provider response passes policy and citation checks. Account, session,
   policy revision, and source approval are checked again before release.
   Citation IDs must identify passages actually retrieved for that request.

The tutor identifies itself as AI. The English blueprint includes seven
approaches: Pam-inspired warmth, Salomon-inspired mussar/chinuch,
Feinstein-inspired concise legal study, Frand-inspired practical explanation,
Kamenetsky-inspired principled clarity, Krohn-inspired narrative inspiration,
and Schechter-inspired reflective hashkafa. The Israeli blueprint has five:
public unity (Yisrael Meir Lau), institutional responsibility (David Lau),
systematic contemporary analysis (Asher Weiss), compassionate case counsel
(Yitzchak Zilberstein), and the Gerrer Hasidic faith/trust/joy outlook.

Hebrew defaults to Israeli; English defaults to English-speaking. Users can
explicitly select an allowed framework independently of answer language. That
choice survives language changes. Automatic approach selection chooses a voice
for the question and blends in the family's baseline warmth; users can choose
a permitted primary voice themselves. Both choices appear in the answer's
context receipt. These are AI design approaches, not impersonations, endorsements,
personal memories, fabricated quotations, or authority to issue practical rulings.

Personal mode provides these blueprint presets. School administrators enable
profiles in a new policy revision, edit the full guidance and community-specific
restrictions, choose permitted profiles/voices, and control defaults and overrides.
The designated reviewer sees and approves the exact instruction snapshot. Common
school restrictions always apply, with selected-community restrictions added.
Existing approved policies retain their earlier general framework until a new
revision explicitly enables communities; code updates never silently change it.

## Conversation and project memory

School conversation records and saved project briefs live on the school service,
scoped to authenticated account and project. They are not saved in browser local
storage. Server ownership checks and optimistic revisions prevent account mixing
and silent overwriting by another client. Sign-out/account changes clear the
visible transcript and brief and cancel obsolete replies. A late status response
from the previous login cannot restore the previous account.

Personal-mode chat remains local to its project and Windows/browser profile.
The new storage namespace never automatically imports old unscoped histories:
their original local-storage records are retained, but their account ownership
cannot be inferred safely.

History retention is at most 80 messages within a 240 KB serialized limit.
Requests keep up to 16 recent messages, shorten very large older model answers,
and select bounded earlier user excerpts by relevance. These are labeled verbatim
extracts, not a verified model-written summary. The optional **Project brief**
holds up to 4,000 characters of user-selected decisions and is included separately
as untrusted user context.

The builder uses an estimated 24,000-token context budget, including fixed
instructions and selected evidence. This is an estimate, not the provider's exact
token count. Existing byte/character limits remain enforced. Older recent turns
can be omitted to fit; the current question and selected files are not silently
cut. Oversized selections return an actionable error. Receipts show intent,
style, estimated usage, earlier excerpts, and library lookup outcome.

## Approved source library

In **School → Sources**, a teacher or administrator submits a draft containing
title, exact reference, author, edition, source language, optional bilingual
keywords/HTTPS origin URL, and the exact passage. The passage limit is 30,000
characters. Saving a draft performs no internet fetch and grants no approval.

The designated reviewer of the currently approved school policy must open the
text, confirm its exact content hash, and record review notes. Other accounts
cannot approve it. A revision creates a separate draft; the old approved text
remains available until the replacement is approved. Retirement stops retrieval.
A new policy revision requires source review for that policy before reuse.
With community profiles enabled, reviewers also choose English, Israeli, or both
frameworks for each source approval. Retrieval, student browsing, and response-time
approval checks enforce that scope. A source's language does not determine scope.

SQLite FTS5 indexes normalized passages and metadata. Original text and offsets
are preserved for citations, including Hebrew marks and Unicode characters.
Common bilingual aliases assist discovery; teachers can add source-specific
keywords. Search is lexical with BM25 ranking, not an embedding/vector index.
It returns at most six bounded passages, filtered by current approval.

Religious source study/source-finding questions require retrieved approved
evidence. If none is found, the app says so without calling the model to invent
research. Practical halachic questions are referred to the human authority.
Academic/coding questions can use their selected context without library matches.
No general web-search or Sefaria connector is silently enabled.

Answers use `[[source:passage-id]]` internally. The renderer displays numbered,
expandable references with the actual retrieved text, author, edition, language,
and revision. Unknown/malformed citation IDs and source-dependent answers without
citations are rejected. This verifies citation provenance; it does not prove
that every interpretation of a passage is correct. Historical citations identify
the revision retrieved at answer time, rather than asserting current approval.

## Deployment, recovery, and evaluation

Deploy desktop and school service 0.3.0 together. Schema version 4 preserves the
account conversations, source revisions/passages, and FTS index introduced in
version 3 and adds source approval scopes. Existing schema-2/3 school data migrates
without replacing accounts, classroom work, source hashes, or approved policies.
Older app versions cannot open the newer database; retain a verified pre-upgrade
backup for rollback.

Backups include conversations, project briefs, sources, and indexes. Verification
checks source hashes, exact passage offsets, index contents, and conversation
shape. Restore preserves those records but creates a new draft policy and revokes
sessions; source approvals do not silently become valid under the new policy.

Regression tests cover bilingual routing, follow-ups, prompt boundaries, memory
limits, account switches and stale responses, source review/revisions/revocation,
citations, FTS lookup, and backup/restore. Offscreen renderer checks exercise the
actual library UI and cited answers using an explicitly isolated fixture provider.
They are supplemental to live model and actual school review.

The library starts empty. No real school policy, rabbinic source, or blueprint
document has been silently approved. A real provider key, designated reviewer,
and school evaluation are still required for deployment acceptance.
