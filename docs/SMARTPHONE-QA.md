# Smartphone-QA-Checkliste

Einmal pro Release am echten Gerät durchtippen (`npm run dev`, Handy im
selben WLAN auf `http://<mac-ip>:3000`, oder die Vercel-Preview).
Erwartetes Verhalten steht jeweils dahinter — weicht etwas ab, ist es ein Bug.

## Training (`/training`)
- [ ] Nach unten scrollen → **Live-Leiste** erscheint am unteren Rand (Mini-Radar + Archetyp + „● LIVE")
- [ ] Slider ziehen → Radar in der Leiste **morpht sofort**
- [ ] Slider weit ziehen (z. B. Migration + Klima auf 100) → Archetyp **blitzt weiß auf** beim Umschlagen
- [ ] Ganz nach unten scrollen → Leiste **verschwindet**, Speichern-Button frei bedienbar
- [ ] Land ist vorausgefüllt (Geo), lässt sich aber überschreiben und bleibt dann so

## Twin (`/twin`)
- [ ] „Ins Netzwerk teilen" → erst **Consent-Box** (gelb), Button wird „Verstanden — jetzt teilen"
- [ ] Zweiter Klick → „⛏ Proof-of-Work wird berechnet…" (einige Sekunden), dann „✓ Zwilling ist im Netzwerk"
- [ ] Danach erscheint die **gelbe Backup-Warnung** mit Button zu Identität
- [ ] „Als Bild teilen" → natives Teilen-Menü öffnet sich, Karte zeigt Radar + Archetyp + no-kings.world
- [ ] Karte visuell prüfen: Labels lesbar, nichts abgeschnitten

## Identität (`/identity`)
- [ ] „Geheimen Schlüssel anzeigen" → QR + nsec1…-Text + Kopieren
- [ ] **Umzugstest:** nsec kopieren → Inkognito-Fenster → Identität → Import → einfügen
      → „✓ Identität importiert — dein Zwilling wurde aus dem Netzwerk geladen"
      → `/twin` zeigt denselben Twin
- [ ] Müll einfügen („hallo") → rote Fehlermeldung, Identität bleibt unverändert
- [ ] **npub** (öffentlichen Schlüssel) einfügen → wird abgelehnt

## Netzwerk (`/network`)
- [ ] Unter 25 Personen: **Gründungsphase**-Box mit ehrlichem Zähler + Fortschrittsbalken, keine Aggregate
- [ ] „Simulation ansehen" → oranges **SIMULATION**-Banner, Demo-Daten, „← Zurück zu echten Daten"
- [ ] Statuszeile zeigt „X Personen · Y mit Proof-of-Work"
- [ ] Relay-Leiste: eigenes Relay hinzufügen (`wss://…`) → erscheint mit Status; ✕ entfernt es
- [ ] Ungültige Eingabe („test") → rote Umrandung, nichts passiert

## Sprachen
- [ ] Sprache im Header auf ES/FR/AR umstellen → neue Texte (Consent, Backup, Gründungsphase) sind übersetzt
- [ ] AR/FA: Layout läuft rechts-nach-links ohne kaputte Boxen

## PWA / Datenpersistenz
- [ ] Seite schließen, neu öffnen → Twin ist noch da
- [ ] iOS: „Zum Home-Bildschirm" → App startet standalone, Twin vorhanden
