# Question Constitution / Fragen-Verfassung

> Whoever controls the questions shapes the answers. This document is how
> "no kings" avoids having a king of the questionnaire.

*Deutsche Fassung unten.*

## Why this exists

The twin's 8 dimensions and the training questions are the lens through which
the platform sees the world. That lens must be governed by public, verifiable
rules — not by the taste of whoever holds commit access.

## Rules for every question

A question may only enter `src/data/questions.ts` or `src/data/agenda.ts` if it
meets **all** of these criteria:

1. **Neutral wording.** No loaded terms, no framing that makes one answer feel
   moral and the other shameful. Test: would a strong supporter *and* a strong
   opponent of the position both accept the wording as fair?
2. **One dimension, one claim.** No compound questions ("cheaper *and*
   greener"). If you need the word "and" between two demands, it is two questions.
3. **Both poles are legitimate.** The low end and the high end of the scale must
   each describe a position a reasonable person can hold, stated with equal care.
4. **Globally answerable.** No question that only makes sense in one country's
   political system. Country-specific questions belong to a future regional layer.
5. **Agree-scale compatible.** Must work on a 1–5 disagree/agree scale, mapped
   to exactly one of the 8 dimensions, with an explicit `direction` (pro/contra).
6. **Balanced direction mix.** Within each dimension, pro- and contra-coded
   questions should stay roughly balanced to limit acquiescence bias (the human
   tendency to just agree).

## Change process

- Every addition, removal, or rewording is a **git commit** with a rationale in
  the commit message. The full history of the questionnaire is public and auditable.
- Proposals come in as GitHub issues/discussions. Anyone may propose; arguments
  are public; the maintainer merges only what satisfies the rules above and
  must cite them when rejecting.
- Changing a **dimension** (adding, removing, redefining one of the 8) is a
  breaking change to every twin in the network. It requires a public proposal,
  a migration plan for existing twins, and a deprecation period.
- **Phase C (goal):** once the network is large enough, proposed questions are
  put to the network itself — twins vote, and a question goes live only above a
  published support threshold. The platform then governs its own questionnaire
  with its own machinery.

## Honesty clause

If a flaw is found in a live question (biased wording, double-barreled claim),
it is fixed or removed **and the flaw is documented** — not silently rewritten.
Data collected under the flawed wording is not silently merged with data from
the fixed wording.

---

# Deutsche Fassung

## Warum es dieses Dokument gibt

Die 8 Dimensionen des Zwillings und die Trainingsfragen sind die Linse, durch
die die Plattform die Welt sieht. Diese Linse braucht öffentliche, prüfbare
Regeln — nicht den Geschmack dessen, der gerade Commit-Rechte hat.

## Regeln für jede Frage

Eine Frage darf nur in `src/data/questions.ts` oder `src/data/agenda.ts`,
wenn sie **alle** Kriterien erfüllt:

1. **Neutrale Formulierung.** Keine Kampfbegriffe, kein Framing, das eine
   Antwort moralisch und die andere beschämend wirken lässt. Test: Würden ein
   überzeugter Befürworter *und* ein überzeugter Gegner die Formulierung als
   fair akzeptieren?
2. **Eine Dimension, eine Aussage.** Keine Doppelfragen („billiger *und*
   grüner"). Wer ein „und" zwischen zwei Forderungen braucht, hat zwei Fragen.
3. **Beide Pole sind legitim.** Beide Enden der Skala müssen Positionen
   beschreiben, die ein vernünftiger Mensch vertreten kann — gleich sorgfältig
   formuliert.
4. **Global beantwortbar.** Keine Frage, die nur in einem Land Sinn ergibt.
   Länderspezifisches gehört in eine spätere regionale Ebene.
5. **Skalen-tauglich.** Muss auf einer 1–5-Zustimmungsskala funktionieren,
   genau einer der 8 Dimensionen zugeordnet, mit expliziter Richtung (pro/contra).
6. **Ausgewogene Richtungen.** Pro- und Contra-kodierte Fragen pro Dimension
   ungefähr im Gleichgewicht halten (gegen Zustimmungstendenz).

## Änderungsprozess

- Jede Änderung ist ein **Git-Commit** mit Begründung. Die Geschichte des
  Fragebogens ist öffentlich und für immer prüfbar.
- Vorschläge laufen über GitHub Issues/Discussions. Jeder darf vorschlagen,
  die Argumente sind öffentlich, gemergt wird nur, was die Regeln erfüllt —
  Ablehnungen müssen die verletzte Regel benennen.
- Eine **Dimension** zu ändern ist ein Bruch für jeden Twin im Netzwerk:
  öffentlicher Vorschlag, Migrationsplan, Übergangsfrist — Pflicht.
- **Phase C (Ziel):** Ist das Netzwerk groß genug, stimmen die Twins selbst
  über neue Fragen ab. Die Plattform regiert ihren Fragebogen dann mit ihrer
  eigenen Maschinerie.

## Ehrlichkeits-Klausel

Wird ein Fehler in einer aktiven Frage gefunden, wird er behoben **und
dokumentiert** — nie still umgeschrieben. Daten aus der fehlerhaften
Formulierung werden nicht stillschweigend mit neuen Daten vermischt.
