# Smartphone-QA-Checkliste

Einmal pro Release am echten Gerät durchtippen (`npm run dev`, Handy im
selben WLAN auf `http://<mac-ip>:3000`, oder die Vercel-Preview).
Erwartetes Verhalten steht jeweils dahinter — weicht etwas ab, ist es ein Bug.

Die Plattform ist drei Seiten: `/` erklärt, `/twin` erschafft, `/world` analysiert.

## Erklärseite (`/`)
- [ ] Hero-Titel, 3 Schritte (1 Erzähl / 2 Teile / 3 Sieh), 4 Vertrauens-Prinzipien sichtbar
- [ ] „Erzähl mir, was dich bewegt" → führt zu `/twin`
- [ ] „Die Welt ansehen" → führt zu `/world`

## Zwilling (`/twin`) — die eine Seite für alles Persönliche
- [ ] **Sprach-Hero:** „Verstehens-Modell laden" → Fortschrittsbalken mit % (~150 MB einmalig)
- [ ] Danach: Textfeld + runder **Mikro-Knopf**; Mikro tippen → Berechtigungs-Dialog → pulsierender Knopf „Ich höre …"
- [ ] Etwas sagen (z. B. „die Mieten sind zu hoch") → Transkript erscheint im Feld → **passende Fragen** erscheinen als Karten
- [ ] Auf einer Karte Stellung nehmen (5 Knöpfe) → Radar oben **morpht sofort**, ✓ mit gewählter Antwort
- [ ] Unsinn erzählen („Bananenrakete") → ehrliche Meldung „keine passende Frage gefunden"
- [ ] **Fallback:** „10 Fragen antippen" → Karte mit Aussage + Vorlesen-Knopf (🔊 spricht in UI-Sprache) + 5 Antworten; nach 10 → grünes ✓
- [ ] **Auto-Speichern:** Seite neu laden → Twin-Werte sind noch da (kein Speichern-Knopf nötig)
- [ ] Nach unten scrollen → **Live-Leiste** (Mini-Radar + Archetyp + „● LIVE"), verschwindet ganz unten
- [ ] Feinjustieren: „Bearbeiten" → 8 Slider; Werte ändern → Radar folgt; „Speichern" klappt zu
- [ ] Land vorausgefüllt (Geo), überschreibbar; Region-Dropdown erscheint nur bei unterstützten Ländern
- [ ] **Veröffentlichen:** „Ins Netzwerk teilen" → gelbe **Consent-Box** → zweiter Klick → „⛏ Proof-of-Work…" → „✓ Zwilling ist im Netzwerk" → gelbe **Backup-Warnung** mit Link zu Identität
- [ ] „Als Bild teilen" → natives Teilen-Menü, Karte zeigt Radar + Archetyp + no-kings.world

## Welt (`/world`) — gesperrt ohne eigenen Twin
- [ ] **Ohne Twin** (Inkognito): „Erst deine Stimme, dann die Welt." + CTA zu `/twin` + „Simulation ansehen" — keine echten Daten sichtbar
- [ ] „Simulation ansehen" → oranges **SIMULATION**-Banner, Weltkugel voll beleuchtet, „← Zurück zu echten Daten"
- [ ] **Mit Twin:** Suchleiste („Frag die Welt"), Weltkugel (Zoom flüssig, Pinch), Tagesfrage (Antwort → Schätzung → ggf. Enthüllung), Fragenliste mit eigener Position (Bernstein-Marker)
- [ ] Unter 25 Personen: **Gründungsphase**-Box statt Aggregate

## Identität (`/identity`)
- [ ] „Geheimen Schlüssel anzeigen" → QR + nsec1…-Text + Kopieren
- [ ] **Umzugstest:** nsec kopieren → Inkognito → Import → „✓ Identität importiert" → `/twin` zeigt denselben Twin
- [ ] Müll einfügen („hallo") → rote Fehlermeldung; **npub** einfügen → wird abgelehnt

## Alte Links
- [ ] `/training`, `/network`, `/about` usw. → leiten auf die drei Seiten um (kein 404)

## Sprachen
- [ ] Sprache im Header auf ES/FR/AR umstellen → alle neuen Texte (Sprach-Hero, Gate, Erklärseite) übersetzt
- [ ] AR/FA: Layout läuft rechts-nach-links ohne kaputte Boxen
- [ ] Vorlesen-Knopf spricht in der eingestellten Sprache

## PWA / Datenpersistenz
- [ ] Seite schließen, neu öffnen → Twin ist noch da
- [ ] iOS: „Zum Home-Bildschirm" → App startet standalone, Twin vorhanden
