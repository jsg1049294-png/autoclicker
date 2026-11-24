# AutoClicker – iPad Web Auto Clicker

Moderner, schwebender Auto-Clicker speziell für **iPad (Safari & Chrome auf iPadOS)** optimiert.  
Dunkles Gaming-Design mit neon-türkisen Akzenten, Touch-Steuerung, mehreren Klickpositionen und Bookmarklet für beliebige Webseiten.

**Live-Demo (GitHub Pages):**  
Nach dem Aktivieren von GitHub Pages erreichbar unter:  
`https://jsg1049294-png.github.io/autoclicker/`

---

## Wichtige technische Klarstellung (iPadOS)

Eine normale Webseite **kann nicht**:

- andere Browser-Tabs steuern
- andere Apps anklicken
- systemweite Klicks auslösen

Das ist eine Sicherheitsgrenze von iPadOS / WebKit / allen modernen Browsern.

**Was dieses Projekt deshalb macht:**

1. **Standalone auf der eigenen Seite** – voll funktionsfähiger AutoClicker mit schwebendem Fenster (Demo-Ziele zum Testen).
2. **Bookmarklet für jede Website** – der AutoClicker wird per Lesezeichen **in die gerade geöffnete Seite** injiziert. Dort kannst du Positionen antippen und automatische Klicks auslösen.

Simulierte Klicks (`element.click()` + Pointer-/Mouse-Events) funktionieren auf den meisten Seiten. Manche Spiele oder Seiten, die nur „echte“ Hardware-Events (`isTrusted`) akzeptieren, reagieren möglicherweise nicht. Das ist eine Browser-Beschränkung und lässt sich mit reinem JavaScript nicht umgehen.

Für echte systemweite Auto-Klicks braucht man eine native iOS-App (App Store).

---

## Funktionen

### Schwebendes Fenster
- Frei verschiebbar (Titelleiste) – Touch & Maus
- Minimieren (−) → runder Restore-Button
- Schließen (×)
- Transparenz + modernes Dark-Neon-Design
- Scrollt nicht versehentlich mit (Drag nur über Titelleiste)

### Klickpositionen
- Button „Klickposition auswählen“
- Tippen auf die gewünschte Stelle (Touch-fähig)
- Mehrere Positionen möglich
- Einzeln löschen
- Anzeige der Koordinaten

### Geschwindigkeit & Steuerung
- Intervalle: 0,1 s · 0,25 s · 0,5 s · 1 s · 2 s · 5 s · 10 s + eigene Zeit (ms)
- Anzahl der Klicks oder unendlich (0)
- Start / Pause / Stop
- Anzeige: bisherige Klicks + vergangene Zeit

### Design
- Dunkler Hintergrund, neon-türkise Akzente
- Große Touch-Buttons
- Responsive (iPad, iPhone, PC)
- Hoch- & Querformat

---

## Schnellstart auf dem iPad

### 1. Demo auf dieser Seite
1. Öffne die GitHub-Pages-URL in Safari.
2. Tippe auf **„AutoClicker öffnen“** (oder warte kurz – das Fenster erscheint automatisch).
3. „Klickposition auswählen“ → auf ein Demo-Ziel tippen.
4. Intervall wählen → **Start**.

### 2. Bookmarklet für beliebige Websites

1. Öffne die AutoClicker-Seite und tippe auf **„Code kopieren“** (Abschnitt Bookmarklet).
2. In Safari eine beliebige Seite öffnen → **Teilen** → **Lesezeichen** / **Zu Favoriten**.
3. Lesezeichen bearbeiten:
   - Name z. B. `AutoClicker`
   - **Adresse komplett löschen** und den kopierten `javascript:…`-Code einfügen
4. Speichern.
5. Auf der gewünschten Website das Lesezeichen antippen → AutoClicker erscheint.
6. Positionen wählen und starten.

**Tipp:** Unter Einstellungen → Safari → „Favoritenleiste anzeigen“ aktivieren, dann ist der AutoClicker schneller erreichbar.

---

## Dateien

| Datei          | Beschreibung                                      |
|----------------|---------------------------------------------------|
| `index.html`   | Hauptseite + Demo + Anleitung                     |
| `style.css`    | Dark-Neon-Design, Floating-Panel, Touch-optimiert |
| `script.js`    | Logik (Standalone + Bookmarklet-Generator)        |
| `README.md`    | Diese Anleitung                                   |

Keine externen Abhängigkeiten, keine API-Keys, keine Anmeldung, keine Datenbank.

---

## GitHub Pages aktivieren

1. Repo öffnen → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Folder: `/ (root)`
4. Speichern
5. Nach 1–2 Minuten unter `https://jsg1049294-png.github.io/autoclicker/` erreichbar

---

## Einschränkungen (ehrlich)

- Funktioniert **nur innerhalb der Seite**, in der der AutoClicker läuft (eigene Seite oder per Bookmarklet injiziert).
- Keine Steuerung anderer Tabs oder Apps.
- Manche Websites/Spiele ignorieren simulierte Events.
- Im Hintergrund (Tab nicht sichtbar) drosseln Browser Timer – Tab sichtbar lassen.
- Bookmarklets auf iPad erfordern den etwas umständlichen Installationsweg (Adresse ersetzen).

---

## Lizenz

Frei nutzbar. Keine Garantie. Auf eigene Verantwortung verwenden (Respektiere die Nutzungsbedingungen der jeweiligen Websites).
