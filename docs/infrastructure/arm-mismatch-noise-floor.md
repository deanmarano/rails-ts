# Arm-mismatch noise floor — the RFC 0113 measurement

RFC 0113 pre-committed, before any measurement, to a tripwire: **if more than
roughly one third of the arm mismatches `pnpm parity:api:arms:report` reports
are lowering artefacts rather than real divergences, take the ungated path** and
record the measured rate rather than tuning a gate until it agrees with us.

This is that measurement. Story: `measure-arm-mismatch-noise-floor`.

## Verdict

**Run ungated.** The measured artefact rate is **57.5%** — with a further 5.0%
attributable to defects in the extraction itself, so **62.5% of reported rows
are not real arm divergences**. That is roughly double the tripwire, and the
95% interval on the figure (±10.8 points, i.e. 51.9%–73.1% for the combined
non-real rate) does not come near ⅓.

| Verdict           | Rows | Share |
| ----------------- | ---: | ----: |
| real              |   30 | 37.5% |
| lowering artefact |   46 | 57.5% |
| extraction bug    |    4 |  5.0% |
| **total**         |   80 |  100% |

The report itself stays: 37.5% of 2,718 rows is ~1,020 genuine divergences, and
that signal is worth reading. What it cannot do is gate — a ratchet over this
population would spend most of its rows on spellings, and the only way to make
it green would be to baseline the noise, which is the outcome the tripwire
exists to prevent.

## Reproducing the sample

```bash
pnpm build                                  # the extractor reads dist/*.d.ts
API_COMPARE_FORCE=1 pnpm parity:api --calls # writes output/call-skeletons.json
pnpm tsx scripts/api-compare/report-arms.ts --sample=80 --seed=113
```

**Size 80, seed 113** (the RFC number). The draw is a seeded Fisher–Yates
shuffle (`mulberry32`) over the mismatch rows sorted by
`package/tsFile#tsName`, so the same seed re-draws the same 80 rows from the
same artifact. Population at the time of measurement: **2,718 mismatched pairs
across 559 files, out of 5,614 pairs compared** — 48.4% of all compared pairs
are flagged, which is itself a signal that the comparison is not selective.

80 rows separates ⅓ from ½ comfortably: the standard error on a proportion near
0.5 at n=80 is 5.6 points, so the 95% interval is ±11.

## Classification rules

Each row is exactly one of three, decided by asking **what would have to change
for this row to stop being reported**:

- **real** — a genuine missing, invented or reordered arm. The port would have
  to change. Includes an arm invented for a trails-specific mechanism
  (an override hook, an async halt protocol) and an arm dropped because the
  port reimplemented the method.
- **lowering artefact** — the same control flow spelled differently across the
  language boundary. Nothing about the port is wrong; the projection cannot see
  that the two spellings agree. Includes:
  - **nullability** — `?? default`, `x?.y`, a `typeof`/`Array.isArray` guard
    standing in for a Ruby duck-type or a kwarg default;
  - **`case` lowering** — Ruby `case` is ONE `if` token whatever its `when`
    count; its faithful TS `if`/`else if` chain is one token per arm, so every
    ported `case` with two or more `when`s reports;
  - **stdlib idiom** — `uniq`, `filter_map`, `drop_while`, `delete_if`,
    `compact!`, `concat` have no JS equivalent, so a faithful port spells them
    as a loop or a filter with a guard;
  - **Ruby-only guards** — `block_given?`, `defined?`, `to_enum`, `.nil?`
    chains that TS types make unreachable;
  - **exception idiom** — Ruby `rescue TypedError` / `catch`-`throw` lowers to
    `catch (e) { if (e instanceof X) …; throw e }`, and `ensure` around a
    possibly-async body lowers to `catch`+rethrow plus `finally`;
  - **Ruby Symbol convention** — `Symbol === k` becomes
    `typeof k === "string" && k.startsWith(":")`, two tokens for one;
  - **helper delegation** — the arms exist, in a same-file helper the sequence
    comparison deliberately does not union (`ArmVerdict`'s rejected option 1).
- **extraction bug** — the skeleton is wrong on one side, and fixing the
  extractor ALONE would clear the row.

## Extraction bugs found

Both are defects in RFC 0084's delivered tooling, filed there rather than
against RFC 0113's burndown.

1. **Ruby `||=` / `&&=` emits no arm; TS `??=` / `||=` / `&&=` emits one.**
   `extract-ruby-api.rb:2392` compares `op_assign_op(node[2])` — which returns
   the Ruby String `"||="` — against `SKELETON_LOGICAL_OPS`, which holds the
   Symbols `:"||"` / `:"&&"`. The test never passes, so every Ruby memo
   (`@x ||= …`) is silent while its faithful TS port (`this._x ??= …`, or the
   `if (!this._x)` spelling) reports an invented `if`. 4 of the 80 rows are
   this defect alone (rows 15, 43, 61, 66), and Ruby memos are everywhere, so
   its share of the full 2,718 is likely higher than 5%.
2. **The block-iteration fold covers only `each`.** `foldSkeletonTokens`
   derives `LOOP_SKELETON_NAMES` from the names that are BOTH a
   `JS_ENUMERABLE_ALIASES` entry aliasing `forEach` AND in `NO_JS_CALL_FORM`;
   in practice that set is `{each, forEach}`. `each_value`, `each_pair`,
   `each_key`, `each_with_index`, `each_with_object`, `reverse_each` and
   `filter_map` all stay `ref:` tokens, so their faithful `for…of` ports report
   an invented `loop`. RFC 0113's own story text says this artefact class
   "should NOT appear"; it does, for every iterator but one.

Two further asymmetries were observed but did not by themselves flag a row, so
they are recorded here rather than filed: Ruby's **modifier `rescue`**
(`@v = expr rescue nil`, a `rescue_mod` node) emits no `try` where the TS
`try`/`catch` port does, and Ruby's **`catch`/`throw`** block is an ordinary
call reach while its TS lowering is a `try` plus an `if` plus a `throw`.

## Per-row verdicts

Rows are numbered as `--sample=80 --seed=113` prints them.

| #   | pair                                                                           | verdict        | why                                                                |
| --- | ------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------ |
| 1   | rack `method-override.ts#methodOverrideParam`                                  | real           | the port inlines a whole form-parse implementation Rails delegates |
| 2   | activerecord `associations/builder/association.ts#build`                       | real           | invented array + repeated dangerous-name guards                    |
| 3   | activerecord `result.ts#castValues`                                            | artefact       | `is_a?(Array)` hoisted into one ternary                            |
| 4   | activesupport `log-subscriber.ts#color`                                        | artefact       | Symbol test spelled as `&&` + `?? ""`                              |
| 5   | trailties `…/change-generator.ts#editDevcontainerJson`                         | real           | reimplemented; Rails delegates to two helpers                      |
| 6   | activerecord `coders/column-serializer.ts#load`                                | artefact       | `object \|\|= …` spelled as an `if`                                |
| 7   | activerecord `migration.ts#runWithoutLock`                                     | artefact       | `?? ""` on the error argument                                      |
| 8   | actionview `digestor.ts#digest`                                                | real           | no cache, no dependency arm — a different method                   |
| 9   | activerecord `associations/through-association.ts#ensureMutable`               | real           | invented macro/owner guards                                        |
| 10  | activerecord `…/query-cache.ts#disableQueryCache`                              | artefact       | `ensure` over a maybe-async body                                   |
| 11  | activerecord `relation/predicate-builder.ts#build`                             | real           | invented scalar-normalisation arms                                 |
| 12  | activesupport `secure-compare-rotator.ts#secureCompareBang`                    | artefact       | kwarg-default lowering                                             |
| 13  | activerecord `migration/command-recorder.ts#invertChangeColumnDefault`         | artefact       | `is_a?(Hash)` needs an extra null test                             |
| 14  | trailties `generators/generated-attribute.ts#parse`                            | artefact       | truthiness guard on `type`                                         |
| 15  | activerecord `result.ts#columnIndexes`                                         | extraction bug | Ruby `@x \|\|=` emits no arm                                       |
| 16  | activerecord `reflection.ts#checkValidityOfInverseBang`                        | artefact       | identity compare spelled as two field compares                     |
| 17  | activerecord `associations/join-dependency.ts#constructModel`                  | real           | inlines the ported `column_aliases`                                |
| 18  | activesupport `json/encoding.ts#encode`                                        | artefact       | `fetch` lowered to `??`                                            |
| 19  | activerecord `…/reaper.ts#registerPool`                                        | real           | invented timer/discard guards                                      |
| 20  | globalid `locator.ts#use`                                                      | real           | drops the no-locator raise                                         |
| 21  | globalid `signed-global-id.ts#parse`                                           | real           | invented verifier assertion (documented deviation)                 |
| 22  | actiondispatch `http/mime-negotiation.ts#accepts`                              | artefact       | `?? ""` on the header                                              |
| 23  | activesupport `deprecation/deprecators.ts#each`                                | artefact       | `to_enum` arm has no TS analogue (the `+loop` half is bug 2)       |
| 24  | activerecord `…/extended-deterministic-uniqueness-validator.ts#installSupport` | real           | invented install guard and callable check                          |
| 25  | actiondispatch `…/page-dump-helper.ts#openFile`                                | real           | invented per-platform branches                                     |
| 26  | activemodel `type/binary.ts#cast`                                              | real           | drops the encoding arm                                             |
| 27  | activesupport `message-verifier.ts#decode`                                     | artefact       | `catch`/`throw` lowered to try/catch                               |
| 28  | activerecord `associations/association.ts#buildRecord`                         | real           | invented klass/reflection fallback arms                            |
| 29  | actiondispatch `middleware/flash.ts#empty`                                     | real           | tests a `_now` map Rails does not have                             |
| 30  | activerecord `associations/has-one-association.ts#_createRecord`               | real           | invented displaced-target load and rethrow                         |
| 31  | activerecord `…/transaction.ts#records`                                        | artefact       | `concat` spelled as a push loop                                    |
| 32  | activerecord `…/has-many-through-association.ts#markOccurrence`                | artefact       | body delegates to a same-file helper                               |
| 33  | activesupport `cache.ts#deserializeEntry`                                      | artefact       | typed `rescue` lowering                                            |
| 34  | activesupport `core-ext/hash/conversions.ts#processHash`                       | artefact       | `case` + `try(:empty?)` lowering                                   |
| 35  | actiondispatch `journey/formatter.ts#extractParameterizedParts`                | artefact       | `drop_while` / `delete_if` / `compact!` have no JS form            |
| 36  | activerecord `associations/preloader/branch.ts#targetClasses`                  | artefact       | `uniq` spelled as a Set filter, three times                        |
| 37  | activerecord `…/has-one-through-association.ts#replace`                        | real           | thirteen invented arms over a two-line Rails body                  |
| 38  | activerecord `…/envelope-encryption-key-provider.ts#primaryKeyProvider`        | real           | invented override branch                                           |
| 39  | actioncontroller `…/strong-parameters.ts#deepTransformKeysBang`                | artefact       | duck-typed `to_unsafe_h`                                           |
| 40  | activerecord `encryption/message-serializer.ts#validateMessageDataFormat`      | real           | invented headers-shape validation                                  |
| 41  | actiondispatch `middleware/debug-exceptions.ts#isApiRequest`                   | artefact       | guard clause hoisted, `\|\|`                                       |
| 42  | activerecord `relation/query-methods.ts#buildFrom`                             | real           | invented NotImplementedError arm                                   |
| 43  | activesupport `message-encryptor.ts#lengthOfEncodedAuthTag`                    | extraction bug | Ruby `@x \|\|=` emits no arm                                       |
| 44  | activerecord `schema-dumper.ts#constructor`                                    | artefact       | adapter duck-typing and `??`                                       |
| 45  | activesupport `hash-with-indifferent-access.ts#convertKey`                     | artefact       | Ruby-Symbol-as-`":name"` convention                                |
| 46  | activerecord `table-metadata.ts#isAssociatedWith`                              | artefact       | `&.` lowered to a guard clause                                     |
| 47  | actiondispatch `http/request.ts#readBodyStream`                                | artefact       | stream duck-typing guards                                          |
| 48  | activerecord `model-schema.ts#resetTableName`                                  | artefact       | Ruby `superclass` chain spelled with `hasOwnProperty`              |
| 49  | activerecord `associations/join-dependency.ts#instantiate`                     | real           | reimplemented; inlines ported collaborators                        |
| 50  | actioncontroller `base.ts#cookies`                                             | artefact       | `?? {}`                                                            |
| 51  | activerecord `counter-cache.ts#updateCounters`                                 | real           | drops the composite-key and Hash arms                              |
| 52  | actioncontroller `metal/rendering.ts#_processVariant`                          | artefact       | `defined?` / `.nil?` guards collapse into `present?`               |
| 53  | activerecord `…/oid/date-time.ts#castValue`                                    | artefact       | `case` lowered to an `if` chain                                    |
| 54  | activerecord `…/sqlite3/database-statements.ts#buildTruncateStatement`         | artefact       | `?? ` fallback quoting                                             |
| 55  | arel `visitors/dot.ts#visitEdge`                                               | real           | invented method-presence guard and raise                           |
| 56  | activerecord `…/postgresql/schema-definitions.ts#newColumnDefinition`          | real           | invented datetime physical-type arms                               |
| 57  | activesupport `notifications.ts#subscribe`                                     | artefact       | block-vs-callable duck typing                                      |
| 58  | activerecord `associations/preloader/branch.ts#likelyReflections`              | artefact       | `filter_map` spelled as loop + push guard                          |
| 59  | activerecord `attribute-methods.ts#formatForInspect`                           | artefact       | body delegates to a same-file helper                               |
| 60  | activerecord `relation/query-methods.ts#reverseSqlOrder`                       | artefact       | `case` + `\|\|` chain lowering                                     |
| 61  | trailties `…/change-generator.ts#database`                                     | extraction bug | Ruby `@x \|\|=` emits no arm                                       |
| 62  | activerecord `associations/preloader.ts#constructor`                           | real           | invented `_materialized` arm                                       |
| 63  | activerecord `future-result.ts#executeQuery`                                   | artefact       | kwarg default `?? false`                                           |
| 64  | activerecord `…/postgresql/schema-dumper.ts#prepareColumnOptions`              | real           | the enum arm is duplicated into an early return                    |
| 65  | activesupport `hash-utils.ts#deepStringifyKeysBang`                            | artefact       | Ruby-Symbol convention                                             |
| 66  | activesupport `number-helper/number-converter.ts#options`                      | extraction bug | Ruby `@x \|\|=` emits no arm                                       |
| 67  | activemodel `type/helpers/time-value.ts#fastStringToTime`                      | artefact       | Temporal needs the normalisation `Time.new` does internally        |
| 68  | activerecord `relation/finder-methods.ts#findTake`                             | artefact       | `?? null` twice (plus bug 1)                                       |
| 69  | actiondispatch `testing/request-encoder.ts#parser`                             | artefact       | modifier-if spelled as `&&` + ternary                              |
| 70  | activerecord `associations/builder/association.ts#addDestroyCallbacks`         | real           | invented halt/rescue protocol in the callback                      |
| 71  | activerecord `log-subscriber.ts#sql`                                           | artefact       | `??` fallbacks and a helper extraction                             |
| 72  | activesupport `notifications.ts#instrument`                                    | artefact       | `block_given?` has no TS analogue                                  |
| 73  | arel `nodes/casted.ts#isInfinite`                                              | artefact       | JS numbers have no `infinite?`                                     |
| 74  | activerecord `…/mysql/schema-statements.ts#typeWithSizeToSql`                  | artefact       | multi-`when` `case` lowering                                       |
| 75  | actionview `lookup-context.ts#detailsCacheKey`                                 | artefact       | `fetch`-with-block spelled as get/set, `?? []`                     |
| 76  | activerecord `insert-all.ts#disallowRawSqlBang`                                | real           | invented `permit` regex arm                                        |
| 77  | arel `select-manager.ts#lock`                                                  | artefact       | `case` lowering                                                    |
| 78  | activerecord `persistence.ts#incrementBang`                                    | real           | invented arity raise and touch-callback arm                        |
| 79  | actiondispatch `testing/assertions/response.ts#exceptionIfPresent`             | artefact       | `Minitest::UnexpectedError` has no analogue                        |
| 80  | activerecord `scoping/named.ts#scope`                                          | real           | drops the `to_proc` and extension arms                             |

## What this means for the RFC

- Open question 1 is answered: **ungated**. RFC 0113's 59 burndown stories are
  verified arm-for-arm against the cited Rails `file:line` in review, per its
  Rollout's ungated branch.
- `pnpm parity:api:arms:report` stays report-only, and stays useful: it is how a
  burndown story finds its rows.
- The two extraction bugs are worth fixing regardless of the gate decision —
  they cost the report roughly a twentieth of its rows outright, and the
  `||=` one silently biases every memoised reader in the corpus.

## Addendum — what the per-clause count and the helper splice cleared

RFC 0113's `skeleton-emits-one-arm-per-when-elsif-and-rescue-clause` and
`arms-report-unions-same-file-helper-skeletons` shipped together. Measured over
the same corpus on the same commit, the report moved **2,746 → 2,673 mismatched
pairs** (6,040 pairs compared; the population has grown since the 2,718/5,614
this document's sample was drawn from, so the row numbering above no longer
re-draws).

Two of this document's classifications turned out to be finer-grained than the
sample's shorthand, and are corrected here rather than silently:

- **`case` lowering.** One `if` per `when` CLAUSE is the right count, and it
  clears row 77 (`arel select-manager.ts#lock`). It does not clear rows 34, 53,
  60 or 74: each of those is a single `when` with several VALUES
  (`when nil, "tiny", "medium", "long"`,
  `mysql/schema_statements.rb:273`) or a `case` mixed with another artefact
  class, and a multi-value `when` is one arm in Ruby however many `===` tests
  its port spells.
- **Helper delegation.** Row 77's sibling class splices as designed, but neither
  row 32 nor row 59 does. Row 59 (`attribute-methods.ts#formatForInspect`)
  delegates ACROSS files, to `attribute-inspection.ts`, which the splice
  deliberately does not credit — the same line `effectiveTsCalls` draws. Row 32
  (`has-many-through-association.ts#markOccurrence`) is a same-file delegation
  from a method to a top-level function of the SAME name, so the reach resolves
  ambiguously under the per-(file, name) scoping compare.ts keys on; filed as
  `arms-splice-same-name-same-file-delegation`.

The splice is one-directional by construction: it can discharge a flag, never
raise one (`report-arms.ts#compareArms`). Taken naively in both directions it
charged every divergent helper's arms to each of its callers and inflated the
report to 3,684 rows.

## Second measurement — 2026-09-05, stratified by token

Story: `remeasure-arm-noise-floor-per-token`. The first measurement drew ONE
sample over the whole mismatch population, and its number is a property of the
population as projected THEN. Six extractor stories have since landed
(`skeleton-emits-one-arm-per-when-elsif-and-rescue-clause`,
`arms-report-unions-same-file-helper-skeletons` — both already recorded in the
addendum above — plus `skeleton-throw-token-carries-the-raised-class`,
`ruby-logical-op-assign-emits-no-skeleton-arm`,
`skeleton-loop-fold-covers-only-each`,
`skeleton-short-circuit-operators-get-their-own-token` and
`fold-skeleton-tokens-takes-an-idiom-lowering-table`), and between them they
address every artefact class the first audit named except "Ruby-only guards".

The population moved **2,718 → 2,141 mismatched pairs** across 525 files, out of
**6,072 pairs compared** — 35.3% of compared pairs flagged, down from 48.4%. Per
token:

```text
Missing arms by token:  if 536, loop 121, throw 92, try 70, rescue 62
Invented arms by token: if 3184, loop 385, throw 333, try 106, rescue 96
```

### Verdict

**The whole population still cannot gate; the missing-`throw` stratum can.**

| Population                          |   n |  real | lowering artefact | extraction bug |  non-real | 95% interval on non-real |
| ----------------------------------- | --: | ----: | ----------------: | -------------: | --------: | -----------------------: |
| whole, `--sample=80 --seed=113`     |  80 | 25.0% |             72.5% |           2.5% | **75.0%** |              64.5%–85.5% |
| `--token=if --sample=80 --seed=113` |  80 | 30.0% |             70.0% |           0.0% | **70.0%** |              60.0%–80.0% |
| missing `-throw`, ALL rows          |  69 | 88.4% |             11.6% |           0.0% | **11.6%** |               4.1%–19.1% |

The whole-population figure is _worse_ than the first measurement's 62.5%, not
better: the extractor fixes retired ~580 rows, and they retired real and
artefact rows alike while the residue stayed dominated by spellings. The `if`
stratum is 1,891 of the 2,141 rows — 88% of the population — so its figure and
the whole-population figure are the same statement twice, which is the point:
**`if` IS the noise floor.**

The missing-`throw` stratum is the opposite and clears the tripwire outright.
Its 95% interval tops out at 19.1%, well under ⅓. RFC 0113's Rollout Phase 5
ranked a missing `throw` above everything else on the assumption that a dropped
raise is nearly always real; the assumption holds, and it is now measured rather
than assumed. A gating story is filed:
`seed-a-missing-throw-arm-ratchet` (RFC 0113).

### Reproducing

```bash
pnpm build
API_COMPARE_FORCE=1 pnpm parity:api --calls
pnpm tsx scripts/api-compare/report-arms.ts --sample=80 --seed=113
pnpm tsx scripts/api-compare/report-arms.ts --sample=80 --seed=113 --token=if
```

`--token=if|loop|try|rescue|throw` (added by this story) restricts the draw to
the rows whose multiset difference names that token on either side, matched
against the class-ERASED token, so `throw:RecordNotSaved` is a `throw` row here.
The stratum sizes it draws from are `if` 1,891, `loop` 410, `throw` 345, `try`
163, `rescue` 144.

The missing-`throw` sub-stratum — rows whose `missing` names `throw`, which is
the direction Phase 5 ranks — is **69 rows** and was read in full rather than
sampled, so it carries no sampling error beyond the binomial one quoted above.
`--token=throw` draws from all 345 rows in both directions; the 69 are the
`-throw` subset of those, and no flag narrows to one direction.

### Classification rules

The three verdicts are the first measurement's, with one boundary made explicit
because it decides ~15 rows and the first measurement left it implicit:

**"Helper delegation" splits in two.** The arms being in a helper rather than in
the body is a lowering artefact only when Rails has that helper too — an
`eachPair` / `mergeInPlace` standing in for `each_pair` / `merge!`. When the
helper is a trails invention (`_assertPgAdvisoryLockId`, `storeNestedParamImpl`,
`normalizeFindArgs`, `_withinNewTransactionBody`, `normalizeModelName`,
`parseHstoreString`, `requireOriginalColumnPresent`, `_unpermittedParameters`,
`_bufferData`, `_pgGeneratedClause`, `castTimeout`, `_normalizeAssociationName`)
the delegation IS the deviation — CLAUDE.md's Decomposition rule is "if Rails
inlines something, inline it" — and the row is **real**. Read the lenient way
instead, the missing-`throw` stratum's non-real rate is 30.4% rather than 11.6%;
both readings clear the tripwire, and the strict one is the repo's own rule.

Two lowering classes are new since the first measurement and account for most of
the missing-`throw` stratum's remaining artefacts:

- **`throw(:abort)` has no TS analogue.** Rails' callback halt is a Ruby
  `throw`; the settled trails idiom is `return false`, so every ported
  `handle_dependency` / autosave callback reports a `-throw`
  (`has_many_association.rb:22`, `has_one_association.rb:18`,
  `autosave_association.rb:213`).
- **Ruby-only guards around gem loading and constant lookup.** `require "bcrypt"
rescue LoadError` (`secure_password.rb:120-124`), `constantize` /
  `NameError` (`request.rb:98-103`), `singleton_class?`
  (`attribute_accessors.rb:56`) and Ruby's raise-to-build-a-backtrace trick
  (`error_reporter.rb:258-263`) have no JS counterpart at all. This is the one
  artefact class the six extractor stories did NOT address, exactly as this
  story's context predicted.

### Extraction defects found

Both are pairing defects rather than skeleton defects — the two bodies compared
are not counterparts, so the row says nothing about anyone's arms. Filed as
`api-compare-pairs-a-ruby-predicate-and-instance-new-onto-one-ts-member`.

1. **A Ruby predicate can pair onto its own bare-named sibling.**
   `capture_helper.rb` defines both `content_for` and `content_for?`; both pair
   to `contentFor`, because the port spells the predicate `contentForQuestion`,
   which is not one of the candidates `docs/ruby-ts-conventions.md` produces
   (`isContentFor` / `contentFor` / `contentForQ`). Row 1 of the whole-population
   sample, +7 invented `if`s, none of them real.
2. **`initialize` and an instance `new` both claim `constructor`.**
   `action_controller/renderer.rb` defines both (`:72` and `:111`); the
   conventions table maps both spellings to `constructor`, so `Renderer#new` — a
   three-line delegation — is scored against the port of `initialize`. Row 3 of
   the whole-population sample.

The same shape inflates the population without being separately classifiable:
`base.ts#delete` is paired twice (`base.rb` and `persistence.rb`),
`base.ts#allowBrowser` twice (`base.rb` and `metal/allow_browser.rb`), and
`model-generator.ts#constructor` twice (`model_helpers.rb` and
`rails/model/model_generator.rb`) — one TS member, one verdict, counted once per
Ruby file that defines the name.

### What this means for the RFC

- Open question 1's answer is unchanged for the population as a whole and for
  the `if` stratum: **ungated**, at a measured 75.0% / 70.0% non-real.
- It is answered differently for the missing-`throw` stratum: **11.6% non-real,
  a gate is warranted**, and `seed-a-missing-throw-arm-ratchet` is filed to seed
  one. This story gates nothing itself.
- The `loop`, `try` and `rescue` strata are not measured here. Each is under 200
  rows in the missing direction and readable in full; whether any of them also
  clears is a question for a story of its own, not an extrapolation from these
  three.

### Per-row verdicts — whole population, `--sample=80 --seed=113`

| #   | pair                                                                                 | verdict    | why                                                                                  |
| --- | ------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ | --- | ------------------------------------------ | --- | ------------------------------- |
| 1   | actionview `helpers/capture-helper.ts#contentFor`                                    | extraction | mispaired predicate: `content_for?` scored against the port of `content_for`         |
| 2   | activerecord `connection-adapters/abstract/connection-pool/reaper.ts#registerPool`   | real       | invented frequency / discard / dedupe guards over one Ruby `unless`                  |
| 3   | actioncontroller `renderer.ts#constructor`                                           | extraction | mispaired: instance `Renderer#new` scored against the port of `initialize`           |
| 4   | actiondispatch `http/param-builder.ts#paramsHashHasKey`                              | artefact   | `inject` block lowered to `for…of`; not in the fold table                            |
| 5   | actiondispatch `routing/route-set.ts#generateUrlHelpers`                             | real       | the whole anonymous-module body relocated into a `UrlHelpersModule` class            |
| 6   | rack `multipart/generator.ts#dump`                                                   | real       | drops the `file.path` / `File.open` branch of the multipart dump                     |
| 7   | activerecord `associations/association.ts#ensureKlassExistsBang`                     | artefact   | explicit throw reproducing the `NameError` Ruby's `klass` raises implicitly          |
| 8   | activerecord `encryption/encryptable-record.ts#overrideAccessorsToPreserveOriginal`  | real       | reimplemented with `beforeSave` + `defineProperty`; Rails wraps two `define_method`s |
| 9   | activemodel `type/helpers/time-value.ts#userInputInTimeZone`                         | artefact   | Temporal has no `in_time_zone`; one dispatch arm per temporal type                   |
| 10  | actionview `helpers/number-helper.ts#parseFloat`                                     | artefact   | Ruby `Float(n, exception: false)` has no JS form                                     |
| 11  | activerecord `associations/preloader/through-association.ts#runnableLoaders`         | artefact   | `flat_map` spelled as a push loop, twice                                             |
| 12  | activesupport `hash-with-indifferent-access.ts#fetchValues`                          | artefact   | trailing-block extraction and a `fetch`-with-block ternary                           |
| 13  | actiondispatch `journey/formatter.ts#possibles`                                      | artefact   | `find_all` / `flat_map` lowering plus a cache-child guard                            |
| 14  | activerecord `connection-adapters/postgresql-adapter.ts#active`                      | artefact   | method-level `rescue` lowers to a `try` that opens before the guard                  |
| 15  | activesupport `duration.ts#constructor`                                              | artefact   | `unless value == 0` as a ternary, `if @variable.nil?` as `??`                        |
| 16  | actiondispatch `http/filter-parameters.ts#envFilter`                                 | artefact   | `fetch_header` with a `return`-ing block lowered to a `has`/`get` pair               |
| 17  | actiondispatch `routing/url-for.ts#fullUrlFor`                                       | real       | invented `polymorphicUrl`-on-host capability raise                                   |
| 18  | actiondispatch `journey/router.ts#recognize`                                         | real       | invented block-return halt protocol over Ruby's `yield`                              |
| 19  | activerecord `connection-adapters/postgresql/schema-statements.ts#schemaSearchPath`  | artefact   | `@x                                                                                  |     | = …`memo spelled as an`if` guard           |
| 20  | activemodel `validations.ts#constructor`                                             | artefact   | `i18n_scope` typeof guard and `?? "activemodel"` fallback                            |
| 21  | activesupport `encrypted-file.ts#key`                                                | artefact   | `a                                                                                   |     | b                                          |     | c` lowered to two guard clauses |
| 22  | actioncontroller `metal/rendering.ts#renderToBody`                                   | artefact   | `super                                                                               |     | …                                          |     | " "` lowered to a ternary       |
| 23  | rack-session `pool.ts#findSession`                                                   | artefact   | `unless sid and session = …` split into a ternary and a guard                        |
| 24  | actiondispatch `http/response.ts#parseContentType`                                   | artefact   | assignment-in-condition split into two guards                                        |
| 25  | activerecord `connection-adapters/abstract-adapter.ts#stealBang`                     | real       | drops the owner-mismatch branch entirely                                             |
| 26  | arel `visitors/to-sql.ts#prepareUpdateStatement`                                     | real       | drops the `stmt.groups` / `stmt.havings` unless-empty arms                           |
| 27  | activerecord `connection-adapters/abstract/transaction.ts#commitRecords`             | artefact   | duck-typed `typeof … === "function"` probes and `&.each`                             |
| 28  | activerecord `relation/query-methods.ts#preprocessOrderArgs`                         | artefact   | `map!` / `flatten!` / multi-clause `case` lowering                                   |
| 29  | activerecord `internal-metadata.ts#tableExists`                                      | artefact   | explicit `NoMethodError` reproducing Ruby's implicit raise on nil                    |
| 30  | activerecord `persistence.ts#_updateRecord`                                          | artefact   | `constraints.map` / `transform_keys` lowered to `for…of`                             |
| 31  | trailties `application.ts#keyGenerator`                                              | real       | invented `ArgumentError` for a null `secret_key_base`                                |
| 32  | activerecord `connection-adapters/pool-config.ts#pool`                               | artefact   | `@pool                                                                               |     | synchronize { @pool                        |     | = … }` memo lowering            |
| 33  | activerecord `schema-dumper.ts#indexes`                                              | artefact   | an extra empty-statements guard before the join                                      |
| 34  | actiondispatch `middleware/exception-wrapper.ts#causesFor`                           | artefact   | `return enum_for(…) unless block_given?` has no TS analogue                          |
| 35  | activerecord `connection-handling.ts#establishConnection`                            | real       | invented adapter-reset walk up the prototype chain                                   |
| 36  | i18n `backend/base.ts#loadTranslations`                                              | artefact   | trailing-block extraction ahead of `if filenames.empty?`                             |
| 37  | rack `conditional-get.ts#fresh`                                                      | artefact   | `elsif (x = …) && (x = …)` split into two guards                                     |
| 38  | arel `select-manager.ts#with`                                                        | real       | drops the `WithRecursive` Symbol branch                                              |
| 39  | activerecord `connection-adapters/postgresql-adapter.ts#addIndexOptions`             | artefact   | `if (where = …) && …` lowered to a typeof guard plus a nested one                    |
| 40  | activerecord `type/type-map.ts#fetch`                                                | artefact   | `fetch_or_store` with a block lowered to get / compute / set                         |
| 41  | actionview `helpers/text-helper.ts#highlight`                                        | artefact   | `blank?` / `fetch` / `Array()` lowering around a `map`                               |
| 42  | activerecord `inheritance.ts#isDescendsFromActiveRecord`                             | artefact   | Ruby `superclass` chain walked with `hasOwnProperty` and prototype guards            |
| 43  | activerecord `reflection.ts#isInverseUpdatesCounterInMemory`                         | artefact   | `inverse_of && … == inverse_of` split into null guards and a field compare           |
| 44  | activerecord `reflection.ts#deriveFkQueryConstraints`                                | real       | invented `!primaryQueryConstraints` early return Rails does not have                 |
| 45  | activerecord `tasks/database-tasks.ts#checkCurrentProtectedEnvironmentBang`          | artefact   | typed `rescue NoDatabaseError` lowered to catch + rethrow                            |
| 46  | activerecord `connection-adapters/abstract/schema-definitions.ts#foreignKeyExists`   | artefact   | `*args, **options` splat lowered to a pop-and-branch                                 |
| 47  | activerecord `schema-dumper.ts#foreignKeys`                                          | artefact   | duck-typed `"isCustomPrimaryKey" in fk` shape probes                                 |
| 48  | activerecord `tasks/database-tasks.ts#collation`                                     | artefact   | explicit `NoMethodError` reproducing Ruby's implicit raise                           |
| 49  | activerecord `migration/command-recorder.ts#invertDropEnum`                          | artefact   | `extract_options!` lowered to a four-clause type test                                |
| 50  | activerecord `associations/collection-association.ts#findByScan`                     | artefact   | `detect` / `select` blocks and an `expects_array` ternary                            |
| 51  | trailties `code-statistics-calculator.ts#fileType`                                   | artefact   | `File.extname(...).to_sym` lowered to a regex plus Symbol prefixing                  |
| 52  | activerecord `connection-adapters/abstract/schema-statements.ts#checkConstraintName` | artefact   | `options.fetch(:name) { … }` lowered to `in` plus an explicit `KeyError`             |
| 53  | activerecord `connection-adapters/abstract/transaction.ts#rollbackRecords`           | artefact   | duck-typed `rolledbackBang` probes and `&.each`                                      |
| 54  | actioncontroller `base.ts#allowBrowser`                                              | real       | invented `only:` / `except:` filter arms around `before_action`                      |
| 55  | actioncontroller `metal/strong-parameters.ts#_deepTransformKeysInObject`             | real       | drops the `permitted?` / `to_unsafe_h` branch                                        |
| 56  | actioncontroller `log-subscriber.ts#startProcessing`                                 | artefact   | `each_pair` delegated to the ruby-compat `eachPair` shim                             |
| 57  | activerecord `associations/preloader/through-association.ts#throughPreloaders`       | real       | invented empty-array return when the through reflection is absent                    |
| 58  | activerecord `connection-adapters/mysql/schema-creation.ts#visitIndexDefinition`     | artefact   | `o.type&.to_s&.upcase                                                                |     | o.unique && "UNIQUE"` lowered to a ternary |
| 59  | rack `etag.ts#digestBody`                                                            | artefact   | `digest                                                                              |     | = …`memo replaced by a`hasContent` flag    |
| 60  | globalid `locator.ts#locateSigned`                                                   | real       | inlines `SignedGlobalID.find` instead of delegating to it                            |
| 61  | activerecord `connection-adapters/schema-cache.ts#loadCache`                         | artefact   | `pool` truthiness and a `schemaVersion` capability probe                             |
| 62  | activemodel `type/integer.ts#isInRange`                                              | artefact   | JS numbers need explicit bigint and finiteness handling                              |
| 63  | activerecord `connection-adapters/postgresql/quoting.ts#quotedBinary`                | artefact   | binary-vs-string duck typing on the value                                            |
| 64  | activerecord `scoping/default.ts#defaultScope`                                       | artefact   | `scope = block if block_given?` has no analogue, so the raise hoists                 |
| 65  | activerecord `associations/join-dependency.ts#construct`                             | real       | invented `tableIndex` skip, association-cache probe and Map scaffolding              |
| 66  | actioncontroller `metal/strong-parameters.ts#_deepTransformKeysInObjectBang`         | real       | drops the `permitted?` / `to_unsafe_h` branch                                        |
| 67  | rack `files.ts#bytesize`                                                             | artefact   | `inject` lowered to `for…of`                                                         |
| 68  | activerecord `connection-adapters/postgresql/oid/array.ts#cast`                      | artefact   | `rescue TypeError` lowered to catch + instanceof + rethrow                           |
| 69  | activesupport `log-subscriber.ts#call`                                               | real       | invented `silenced(event)` guard Rails' `call` does not have                         |
| 70  | trailties `code-statistics.ts#toString`                                              | real       | inlines `print_code_test_stats` and the header builder                               |
| 71  | rack `recursive.ts#_call`                                                            | artefact   | typed `rescue ForwardRequest` lowered to catch + instanceof + a loop                 |
| 72  | activerecord `relation/batches.ts#batchCondition`                                    | artefact   | `Array(values)` and an `lteq` ternary inside the loop                                |
| 73  | activerecord `encryption/encrypted-attribute-type.ts#decryptAsText`                  | artefact   | method-level typed `rescue` plus a JSON-coercion arm                                 |
| 74  | rack `headers.ts#update`                                                             | artefact   | `update` delegates to `mergeInPlace`, the port of Ruby's `merge!`                    |
| 75  | actionview `template-details.ts#handlerClass`                                        | artefact   | invented `typeof handler !== "string"` nullability guard                             |
| 76  | activerecord `associations/preloader/association.ts#associationKeyType`              | artefact   | `Array.isArray(pk)` composite-key guard returning undefined                          |
| 77  | activesupport `callbacks.ts#compile`                                                 | artefact   | `@callbacks                                                                          |     | =`/`@single_callbacks[type]                |     | =`memos and`reverse.inject`     |
| 78  | activerecord `connection-adapters/abstract-adapter.ts#connectionRetries`             | artefact   | `(@config[:x]                                                                        |     | 1).to_i` lowered to a typeof ternary       |
| 79  | activesupport `core-ext/array/access.ts#to`                                          | artefact   | Ruby's negative-range slice needs an explicit clamp in JS                            |
| 80  | activesupport `ordered-options.ts#dig`                                               | artefact   | reimplements Ruby `Hash#dig`, which has no JS equivalent                             |

### Per-row verdicts — `--token=if --sample=80 --seed=113`

| #   | pair                                                                                    | verdict  | why                                                                                  |
| --- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | -------- | ---------------------------------------------- |
| 1   | activerecord `connection-adapters/postgresql/schema-dumper.ts#schemas`                  | artefact | invented `!adapter?.schemaNames` capability guard                                    |
| 2   | actiondispatch `middleware/static.ts#eachCandidateFilepath`                             | artefact | Ruby `yield` lowered to a boolean block-return halt protocol                         |
| 3   | activerecord `connection-adapters/postgresql/database-statements.ts#castResult`         | artefact | numeric-string column names would collide with array indices in JS                   |
| 4   | activerecord `connection-adapters/mysql/schema-creation.ts#visitIndexDefinition`        | artefact | `o.type&.to_s&.upcase                                                                |          | o.unique && "UNIQUE"` lowered to a ternary     |
| 5   | activerecord `connection-adapters/abstract/transaction.ts#currentTransaction`           | artefact | `@stack.last                                                                         |          | NULL_TRANSACTION` lowered to a ternary         |
| 6   | activerecord `connection-adapters/postgresql/quoting.ts#unescapeBytea`                  | real     | reimplements libpq's `unescape_bytea` instead of delegating to it                    |
| 7   | activesupport `current-attributes.ts#currentInstancesKey`                               | artefact | `@current_instances_key                                                              |          | = …` memo lowering                             |
| 8   | actiondispatch `middleware/debug-exceptions.ts#renderException`                         | real     | reimplements content negotiation and drops the `formats.first` rescue                |
| 9   | activerecord `relation/predicate-builder/association-query-value.ts#ids`                | artefact | `Array.isArray(pk)` composite-key guard                                              |
| 10  | actiondispatch `http/request.ts#fullpath`                                               | real     | drops the `@fullpath                                                                 |          | = super` memo and inlines the superclass body  |
| 11  | activesupport `testing/assertions.ts#assertChanges`                                     | artefact | modifier-`if`s inside the rich-message closures                                      |
| 12  | activesupport `messages/codec.ts#catchAndIgnore`                                        | artefact | `catch throwable do … end` lowered to try / instanceof / rethrow                     |
| 13  | activesupport `core-ext/string/output-safety.ts#concat`                                 | real     | inlines the escaping Rails delegates to `implicit_html_escape_interpolated_argument` |
| 14  | activerecord `encryption/encryptable-record.ts#cantModifyEncryptedAttributesWhenFrozen` | artefact | `Array.isArray` guard and the loop inverted onto `changed`                           |
| 15  | arel `nodes/table-alias.ts#isAbleToTypeCast`                                            | artefact | `respond_to?(:able_to_type_cast?)` lowered to a `typeof` test                        |
| 16  | activesupport `cache/entry.ts#bytesize`                                                 | artefact | three-clause `case` plus an `@s                                                      |          | =` memo                                        |
| 17  | activerecord `connection-adapters/postgresql/oid/money.ts#castValue`                    | artefact | invented `value == null` nullability guard                                           |
| 18  | abstractcontroller `helpers.ts#defineHelpersModule`                                     | artefact | `const_defined?` has no analogue; a Map memo stands in                               |
| 19  | actiondispatch `http/content-security-policy.ts#styleSrc`                               | artefact | a `define_method`-generated body delegated to `setDirective`                         |
| 20  | activerecord `connection-handling.ts#establishConnection`                               | real     | invented adapter-reset walk up the prototype chain                                   |
| 21  | activerecord `associations/singular-association.ts#scopeForCreate`                      | artefact | `Array(klass.primary_key)` lowering plus a composite-key guard                       |
| 22  | activerecord `enum.ts#assertValidEnumDefinitionValues`                                  | real     | invented per-value type validation and a blank check in the Array arm                |
| 23  | actiondispatch `middleware/stack.ts#delete`                                             | artefact | `reject!` lowered to a reverse splice loop                                           |
| 24  | activerecord `migration.ts#recordEnvironment`                                           | real     | invented `_internalMetadata.enabled` guard                                           |
| 25  | activerecord `encryption/cipher.ts#tryToDecryptWithEach`                                | artefact | per-index `rescue` lowered to a lastError loop plus an empty-keys guard              |
| 26  | activerecord `model-schema.ts#reloadSchemaFromCache`                                    | real     | drops the `recursive` parameter and its subclass-recursion arm                       |
| 27  | activerecord `connection-adapters/postgresql-adapter.ts#sessionAuth`                    | real     | invented `DEFAULT` special-case in the quoting                                       |
| 28  | actioncontroller `renderer.ts#render`                                                   | real     | reimplemented; renders json / plain / html itself instead of delegating              |
| 29  | activemodel `attribute-set.ts#accessed`                                                 | artefact | `each_key.select` delegated to the ruby-compat `eachKey` shim                        |
| 30  | activemodel `validations/callbacks.ts#setOptionsForCallback`                            | artefact | `Array(options[:on])` and kwarg normalisation                                        |
| 31  | activerecord `connection-adapters/abstract/schema-statements.ts#removeIndex`            | artefact | positional-vs-options overload normalisation                                         |
| 32  | activerecord `associations/preloader/through-association.ts#preloadIndex`               | artefact | `@preload_index                                                                      |          | = …` memo lowering                             |
| 33  | activerecord `attribute-methods.ts#aliasAttribute`                                      | artefact | `class_attribute` write needs the own-property dance in JS                           |
| 34  | activesupport `number-helper/number-to-delimited-converter.ts#delimiterPattern`         | artefact | JS regexes are stateful, so `g` has to be normalised                                 |
| 35  | activerecord `connection-adapters/mysql/quoting.ts#castBoundValue`                      | artefact | five-clause `case` plus a Rational integer-formatting arm                            |
| 36  | activerecord-test-support `connection.ts#connect`                                       | real     | drops the adapter-name validation and its `ArgumentError`                            |
| 37  | activesupport `time-with-zone.ts#_transferTimeValuesToUtcConstructor`                   | artefact | Temporal dispatch over four temporal types                                           |
| 38  | activerecord `attribute-methods/serialization.ts#serialize`                             | artefact | `coder                                                                               |          | =` and kwarg-default normalisation             |
| 39  | actioncontroller `base.ts#processAction`                                                | real     | invented pending-render and params-wrapping arms                                     |
| 40  | activesupport `notifications/instrumenter.ts#buildHandle`                               | artefact | invented `buildHandle` capability probe                                              |
| 41  | actioncontroller `metal/mime-responds.ts#negotiateFormat`                               | real     | reimplements negotiation instead of delegating to `negotiate_mime`                   |
| 42  | activerecord `associations/builder/has-one.ts#addTouchCallbacks`                        | real     | invented re-entrancy flag and `afterTouch` capability guard                          |
| 43  | activerecord `validations/uniqueness.ts#buildRelation`                                  | real     | thirteen invented arms over a fifteen-line Rails body                                |
| 44  | activemodel `attribute-set/builder.ts#defaultAttribute`                                 | artefact | Ruby's `value = values.fetch(name) { … }` default-arg lowering                       |
| 45  | activesupport `log-subscriber.ts#_modeFrom`                                             | artefact | `filter_map` lowered to a loop plus a guard                                          |
| 46  | activerecord `relation/finder-methods.ts#takeBang`                                      | artefact | `take                                                                                |          | raise…` lowered to a guard clause              |
| 47  | activerecord `attribute-methods.ts#initializeGeneratedModules`                          | artefact | JS class-attribute lowering around the generated-methods module                      |
| 48  | activesupport `cache.ts#normalizeOptions`                                               | artefact | `detect` / `except!` lowered to explicit key tests                                   |
| 49  | activerecord `relation/calculations.ts#selectForCount`                                  | artefact | `select_values.empty?` plus a join guard                                             |
| 50  | activerecord `log-subscriber.ts#renderBind`                                             | artefact | duck typing over the three shapes `attr` can take                                    |
| 51  | activerecord `associations/preloader/branch.ts#loaders`                                 | artefact | `@loaders                                                                            |          | = …` memo lowering                             |
| 52  | activerecord `model-schema.ts#yamlEncoder`                                              | artefact | `@yaml_encoder                                                                       |          | = …` memo lowering                             |
| 53  | activerecord `associations/has-one-association.ts#_createRecord`                        | real     | invented displaced-target load and rethrow                                           |
| 54  | activerecord `persistence.ts#_insertRecord`                                             | real     | invented `pkExists` column probe and adapter-capability branches                     |
| 55  | activerecord `connection-adapters/mysql2-adapter.ts#active`                             | artefact | `if connected? … end                                                                 |          | false` lowered to a guard plus try / catch     |
| 56  | activerecord `token-for.ts#payloadFor`                                                  | artefact | bigint coercion and a composite-id `Array.isArray` guard                             |
| 57  | activerecord `connection-adapters/postgresql/quoting.ts#quoteTableName`                 | artefact | `QUOTED_TABLE_NAMES[name]                                                            |          | = …` memo lowering                             |
| 58  | activerecord `connection-adapters/abstract/schema-creation.ts#visitTableDefinition`     | real     | folds two `supports_*?` arms into an invented `tableConstraintStatements`            |
| 59  | arel `select-manager.ts#union`                                                          | artefact | `const_get("Union#{…}")` lowered to a table lookup plus a ternary                    |
| 60  | activerecord `connection-adapters/postgresql/schema-statements.ts#setPkSequenceBang`    | artefact | `… if @logger` lowered to `this.logger?.warn?.()`                                    |
| 61  | actiondispatch `http/content-security-policy.ts#prefetchSrc`                            | artefact | a `define_method`-generated body delegated to `setDirective`                         |
| 62  | activerecord `connection-adapters/abstract/transaction.ts#commitRecords`                | artefact | duck-typed `committedBang` probes and `&.each`                                       |
| 63  | actiondispatch `http/content-security-policy.ts#styleSrcAttr`                           | artefact | a `define_method`-generated body delegated to `setDirective`                         |
| 64  | activesupport `hash-with-indifferent-access.ts#compact`                                 | artefact | `dup.tap(&:compact!)` lowered to a build loop                                        |
| 65  | activerecord `encryption/deterministic-key-provider.ts#constructor`                     | artefact | `Array(password)` lowering                                                           |
| 66  | actiondispatch `testing/test-request.ts#create`                                         | real     | drops the `Rails.application.env_config` merge arm                                   |
| 67  | activerecord `reflection.ts#sourceReflectionName`                                       | real     | invented `options.source` short-circuit and through-reflection guard                 |
| 68  | actiondispatch `testing/assertions/response.ts#assertRedirectedTo`                      | artefact | Minitest `assert_operator … :===` lowered to explicit compares                       |
| 69  | activerecord `relation/batches/batch-enumerator.ts#touchAll`                            | artefact | `sum do                                                                              | relation | `lowered to`for await` plus a capability probe |
| 70  | i18n `backend/fallbacks.ts#translate`                                                   | artefact | `catch(:exception)` and typed `rescue` lowering                                      |
| 71  | activerecord `relation/calculations.ts#lookupCastTypeFromJoinDependencies`              | artefact | block-scoped `return type if type` lowered to a guard                                |
| 72  | activerecord `connection-adapters/postgresql-adapter.ts#addIndexOptions`                | artefact | `if (where = …) && …` lowered to a typeof guard plus a nested one                    |
| 73  | activesupport `testing/time-helpers.ts#travel`                                          | artefact | Duration-vs-number coercion ternary                                                  |
| 74  | actionview `helpers/text-helper.ts#safeConcat`                                          | real     | drops the `respond_to?(:safe_concat)` fallback arm                                   |
| 75  | actioncontroller `metal/request-forgery-protection.ts#isProtectAgainstForgery`          | artefact | `respond_to?(:enabled?)` and `&&` lowering                                           |
| 76  | activerecord `relation/predicate-builder/relation-handler.ts#call`                      | real     | folds three arms into two invented helpers Rails does not have                       |
| 77  | activerecord `tasks/database-tasks.ts#structureDumpFlagsFor`                            | artefact | `is_a?(Hash)` lowered to a three-part typeof test plus `?? null`                     |
| 78  | actioncontroller `renderer.ts#constructor`                                              | real     | drops the `env.blank? && @defaults == DEFAULTS` DEFAULT_ENV arm                      |
| 79  | activesupport `testing/assertions.ts#assertRaises`                                      | artefact | Ruby's `rescue`-based assertion lowered to try / catch                               |
| 80  | activerecord `base.ts#delete`                                                           | real     | reimplemented as a composite-key-aware class-level delete                            |

### Per-row verdicts — every row whose `missing` names `throw` (69 of 69)

Numbered as `report-arms.ts` enumerates the mismatch rows; this stratum is
read in full, so the numbering is a list, not a draw.

| #   | pair                                                                                  | verdict  | why                                                                          |
| --- | ------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| 1   | arel `visitors/visitor.ts#visit`                                                      | real     | drops the NoMethodError / ancestor-walk / retry dispatch fallback entirely   |
| 2   | activerecord `associations/alias-tracker.ts#initialCountFor`                          | real     | drops the `ArgumentError` for a join that is neither StringJoin nor Join     |
| 3   | activerecord `associations/collection-association.ts#concatRecords`                   | real     | drops `raise ActiveRecord::Rollback unless result`                           |
| 4   | activerecord `associations/has-many-association.ts#handleDependency`                  | artefact | `throw(:abort)` lowered to `return false`, the settled trails halt idiom     |
| 5   | activerecord `associations/has-many-through-association.ts#findTarget`                | real     | drops the `async:` kwarg and its `NotImplementedError` arm                   |
| 6   | activerecord `associations/has-one-association.ts#handleDependency`                   | artefact | `throw(:abort)` lowered to `return false`                                    |
| 7   | activerecord `associations/has-one-association.ts#delete`                             | artefact | `throw(:abort)` lowered to `return false`; the rest is duck typing           |
| 8   | activerecord `associations/preloader/branch.ts#constructor`                           | real     | the name normalisation and its `ArgumentError` moved into an invented helper |
| 9   | activerecord `associations/singular-association.ts#replace`                           | real     | implements a method Rails leaves abstract with `NotImplementedError`         |
| 10  | activerecord `attribute-assignment.ts#executeCallstackForMultiparameterAttributes`    | real     | the whole body delegated to an invented `executeMultiparameterAssignment`    |
| 11  | activerecord `attribute-methods.ts#aliasAttributeMethodDefinition`                    | real     | drops `build_mangled_name` / `define_call` and their arms                    |
| 12  | activerecord `autosave-association.ts#addAutosaveAssociationCallbacks`                | artefact | `throw(:abort)` lowered to `throwAbort()`; the `+if`s are duck typing        |
| 13  | activerecord `connection-adapters.ts#resolve`                                         | real     | reimplements adapter loading; the three raise arms become one catch          |
| 14  | activerecord `connection-adapters/abstract-adapter.ts#expire`                         | real     | drops the owner-mismatch `ActiveRecordError`                                 |
| 15  | activerecord `connection-adapters/abstract-mysql-adapter.ts#errorNumber`              | real     | implements a method Rails leaves abstract with `NotImplementedError`         |
| 16  | activerecord `connection-adapters/abstract/connection-pool.ts#newConnection`          | real     | invented lazy / eager schema-cache warming; drops the `set_pool` rescue      |
| 17  | activerecord `connection-adapters/abstract/schema-statements.ts#changeColumnDefault`  | real     | implements a method Rails leaves abstract with `NotImplementedError`         |
| 18  | activerecord `connection-adapters/abstract/schema-statements.ts#changeColumnNull`     | real     | implements a method Rails leaves abstract with `NotImplementedError`         |
| 19  | activerecord `connection-adapters/abstract/schema-statements.ts#renameColumn`         | real     | implements a method Rails leaves abstract with `NotImplementedError`         |
| 20  | activerecord `connection-adapters/abstract/transaction.ts#withinNewTransaction`       | real     | the whole body moved into an invented `_withinNewTransactionBody`            |
| 21  | activerecord `connection-adapters/mysql2-adapter.ts#connect`                          | real     | drops the `ConnectionNotEstablished` / `set_pool` rescue                     |
| 22  | activerecord `connection-adapters/mysql2/database-statements.ts#performQuery`         | real     | reimplemented against the mysql2 driver; the two rescues are gone            |
| 23  | activerecord `connection-adapters/postgresql-adapter.ts#getAdvisoryLock`              | real     | the guard and its `ArgumentError` moved into an invented helper              |
| 24  | activerecord `connection-adapters/postgresql-adapter.ts#releaseAdvisoryLock`          | real     | the guard and its `ArgumentError` moved into an invented helper              |
| 25  | activerecord `connection-adapters/postgresql-adapter.ts#prepareStatement`             | real     | drops the `translate_exception_class` rescue                                 |
| 26  | activerecord `connection-adapters/postgresql-adapter.ts#connect`                      | real     | drops the `ConnectionNotEstablished` / `set_pool` rescue                     |
| 27  | activerecord `connection-adapters/postgresql/oid/hstore.ts#deserialize`               | real     | the whole scanner moved into an invented `parseHstoreString`                 |
| 28  | activerecord `connection-adapters/postgresql/schema-creation.ts#addColumnOptionsBang` | real     | the generated-column arm moved into an invented `_pgGeneratedClause`         |
| 29  | activerecord `connection-adapters/sqlite3-adapter.ts#constructor`                     | real     | drops the empty-database `ArgumentError` and the mkdir `NoDatabaseError`     |
| 30  | activerecord `connection-adapters/sqlite3-adapter.ts#configureConnection`             | real     | invented pragma implementation; the two raises moved into `castTimeout`      |
| 31  | activerecord `connection-adapters/sqlite3-adapter.ts#newClient`                       | real     | drops the `Errno::ENOENT` to `NoDatabaseError` translation                   |
| 32  | activerecord `encryption/encryptable-record.ts#preserveOriginalEncrypted`             | real     | the column-presence raise moved into an invented helper                      |
| 33  | activerecord `inheritance.ts#setBaseClass`                                            | real     | drops the `unless self < Base` `ActiveRecordError` arm                       |
| 34  | activerecord `relation/finder-methods.ts#findWithIds`                                 | real     | the whole argument normalisation moved into an invented `normalizeFindArgs`  |
| 35  | activerecord `relation/finder-methods.ts#findOne`                                     | real     | drops the `ActiveRecord::Base === id` `ArgumentError` arm                    |
| 36  | activerecord `relation/predicate-builder/relation-handler.ts#call`                    | real     | folds three arms into two invented helpers Rails does not have               |
| 37  | activerecord `relation/query-methods.ts#buildJoinBuckets`                             | real     | drops the second `raise` and moves the first into an invented assertion      |
| 38  | activerecord-test-support `connection.ts#connect`                                     | real     | drops the adapter-name validation and its `ArgumentError`                    |
| 39  | activemodel `secure-password.ts#hasSecurePassword`                                    | artefact | `require "bcrypt" rescue LoadError` has no analogue; bcrypt is a hard dep    |
| 40  | activesupport `module-ext.ts#mattrReader`                                             | real     | drops `singleton_class?`; the NameError moved into an invented assertion     |
| 41  | activesupport `module-ext.ts#mattrWriter`                                             | real     | drops `singleton_class?`; the NameError moved into an invented assertion     |
| 42  | activesupport `error-reporter.ts#ensureBacktrace`                                     | artefact | Ruby's raise-to-build-a-backtrace trick has no JS analogue                   |
| 43  | activesupport `notifications/fanout.ts#subscribe`                                     | real     | drops the `ArgumentError` for a pattern that is not String / Regexp / nil    |
| 44  | activesupport `number-helper/number-to-human-converter.ts#unitExponents`              | real     | drops the `:units must be a Hash or String` `ArgumentError`                  |
| 45  | activesupport `module-ext.ts#rescueFrom`                                              | real     | drops both `ArgumentError` arms of the handler and class checks              |
| 46  | activesupport `time-with-zone.ts#change`                                              | real     | drops the `:offset` + `:zone` `ArgumentError` and reimplements               |
| 47  | actiondispatch `http/param-builder.ts#storeNestedParam`                               | real     | the whole body delegated to an invented `storeNestedParamImpl`               |
| 48  | actiondispatch `http/permissions-policy.ts#applyMappings`                             | real     | drops the Symbol / String / Proc case and its `ArgumentError`                |
| 49  | actiondispatch `http/request.ts#controllerClassFor`                                   | artefact | `constantize` and `NameError` have no JS analogue; a registry stands in      |
| 50  | actiondispatch `http/request.ts#GET`                                                  | real     | drops the memoised parse and the `ParamError` to `BadRequest` rescue         |
| 51  | actiondispatch `http/request.ts#POST`                                                 | real     | drops the memoised parse and the `ParamError` to `BadRequest` rescue         |
| 52  | actiondispatch `journey/gtg/transition-table.ts#statesHashFor`                        | real     | drops the String / Symbol arm and the `ArgumentError`                        |
| 53  | actiondispatch `middleware/debug-exceptions.ts#call`                                  | real     | drops the X-Cascade `RoutingError` and the `wrapper.show?` reraise           |
| 54  | actiondispatch `routing/route-set.ts#addRoute`                                        | real     | drops the duplicate-name `ArgumentError` and both deprecation arms           |
| 55  | actiondispatch `routing/route-set.ts#recognizePathWithRequest`                        | real     | reimplemented; drops the missing-controller `RoutingError`                   |
| 56  | actioncontroller `metal/mime-responds.ts#respondTo`                                   | real     | drops the types-or-block `ArgumentError` and `RespondToMismatchError`        |
| 57  | actioncontroller `metal/strong-parameters.ts#unpermittedParametersBang`               | real     | the whole body delegated to an invented `_unpermittedParameters`             |
| 58  | actioncontroller `test-case.ts#assignParameters`                                      | real     | drops the unknown-content-type raise and two branches                        |
| 59  | abstractcontroller `url-for.ts#_routes`                                               | real     | returns a default where Rails raises for an unconfigured route set           |
| 60  | actionview `base.ts#_run`                                                             | real     | drops the template-error rescue and its raise                                |
| 61  | actionview `renderer/template-renderer.ts#determineTemplate`                          | real     | drops the `:file` branches and both of their `ArgumentError`s                |
| 62  | actionview `renderer/template-renderer.ts#resolveLayout`                              | real     | drops the `MissingTemplate` rescue and its conditional reraise               |
| 63  | actionview `template.ts#compile`                                                      | real     | drops the strict-locals parameter validation entirely                        |
| 64  | trailties `generators/rails/model/model-generator.ts#constructor`                     | real     | the whole body delegated to an invented `normalizeModelName`                 |
| 65  | trailties `generators/rails/model/model-generator.ts#constructor`                     | real     | the whole body delegated to an invented `normalizeModelName`                 |
| 66  | rack `lint.ts#checkHeaders`                                                           | real     | fewer header checks than Rack's lint performs                                |
| 67  | rack `response.ts#constructor`                                                        | real     | drops the body-shape raise                                                   |
| 68  | rack `rewindable-input.ts#makeRewindable`                                             | real     | the whole body delegated to an invented `_bufferData`                        |
| 69  | i18n `backend/base.ts#translate`                                                      | artefact | `throw(:exception, …)` lowered to `throwException(…)`                        |
