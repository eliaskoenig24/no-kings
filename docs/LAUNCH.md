# Launch-Runbook — von localhost zur Welt

Stand: Juli 2026. Alles Code-seitige ist fertig (Tests grün, Build sauber,
Rechtsseiten vorhanden). Die verbleibenden Schritte brauchen deine Accounts
bzw. deine Unterschrift — deshalb kann sie nur Elias ausführen. Reihenfolge einhalten.

## Schritt 0 — Impressum ausfüllen (Pflicht VOR jeder öffentlichen URL)

Datei: `src/app/impressum/page.tsx` → die vier `[PLATZHALTER]` ersetzen
(Name, Straße, PLZ/Ort, E-Mail). Ohne vollständiges Impressum ist eine
öffentlich erreichbare Website in Deutschland abmahnfähig (§ 5 DDG).
Danach: `git add -A && git commit -m "Fill Impressum" && git push`

## Schritt 1 — Vercel verbinden (einmalig, ~3 Minuten)

```bash
vercel login          # öffnet den Browser, mit GitHub anmelden
cd ~/no-kings
vercel link           # neues Projekt "no-kings" anlegen (Defaults bestätigen)
vercel deploy         # Preview-Deploy: liefert eine öffentliche Test-URL
```

Die Preview-URL am Handy testen (QA-Checkliste: `docs/SMARTPHONE-QA.md`).
Wenn alles gut aussieht:

```bash
vercel --prod         # Produktion: https://no-kings-<team>.vercel.app
```

**Dauerhaft automatisch:** Im Vercel-Dashboard → Project → Settings → Git →
GitHub-Repo `eliaskoenig24/no-kings` verbinden. Ab dann deployt jeder Push
auf `main` automatisch. (Solange das Repo privat ist, braucht Vercel die
GitHub-App-Berechtigung für dieses Repo.)

## Schritt 2 — Domain

Befund vom 05.07.2026: `no-kings.world` hat keine DNS-Einträge und ist mit
hoher Wahrscheinlichkeit **nicht registriert** — die Adresse steht aber
bereits überall in der App und auf der Share-Card. Zwei Optionen:

- **A (empfohlen): `no-kings.world` registrieren** — bei einem Registrar
  (z. B. Porkbun, Namecheap, Cloudflare Registrar), Kosten grob 20–40 €/Jahr
  für `.world`. Danach im Vercel-Dashboard → Domains → `no-kings.world`
  hinzufügen und die zwei angezeigten DNS-Einträge beim Registrar setzen
  (A-Record auf Vercel-IP + CNAME für www). SSL macht Vercel automatisch.
- **B: andere Domain wählen** — dann VOR dem Launch die hartkodierten
  Verweise ersetzen: `grep -rn "no-kings.world" src/` (Share-Card, Twin-Seite,
  Sitemap/Robots, OG-Images) und `metadataBase` in `src/app/layout.tsx` prüfen.

Bis die Domain steht, funktioniert die kostenlose `*.vercel.app`-Adresse
vollwertig — für die ersten Tester völlig ausreichend.

## Schritt 3 — Open Source (macht eure Kern-Versprechen erst wahr)

1. Lizenz wählen (Empfehlung: AGPL-3.0 — jeder darf prüfen/forken/hosten,
   niemand darf eine geschlossene Kopie betreiben).
2. `LICENSE`-Datei ins Repo, README-Abschnitt "License" aktualisieren.
3. GitHub → Repo → Settings → Danger Zone → Visibility → Public.

## Schritt 4 — CI aktivieren

```bash
gh auth refresh -s workflow    # einmalig, Browser-Bestätigung
git add .github && git commit -m "Add CI workflow" && git push
```

Ab dann laufen Lint + Tests + Build bei jedem Push auf GitHub.

## Schritt 5 — Los

1. QA-Checkliste einmal auf der Produktions-URL durchtippen.
2. Eigenen Twin auf der Produktions-URL veröffentlichen (erster echter Eintrag).
3. Link + Share-Card an die ersten 5 Menschen. Ziel: 25 Personen = erste
   freigeschaltete Netzwerk-Auswertung.

## Notfall-Wissen

- **Rollback:** Vercel-Dashboard → Deployments → vorheriges Deployment →
  "Promote to Production" (eine Minute).
- **Relay down:** Nutzer können unter /network eigene Relays eintragen;
  Standard-Liste in `src/lib/relays.ts`.
- **Alles neu bauen lokal:** `npm ci && npm test && npm run build && npm start`.
