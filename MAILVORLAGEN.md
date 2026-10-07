# Mailvorlagen für Supabase (Englisch)

Stand: 07.10.2026. Einzutragen unter **Supabase → Authentication →
Email Templates**. Je Vorlage: **Subject** ersetzen, **Message body**
komplett ersetzen, speichern.

Englisch, weil die App seit dem 07.10. Englisch als Standard hat
(NL-Launch). Supabase kennt die Sprache des Empfängers nicht — eine
Vorlage pro Mail.

## Vorher einmal prüfen

**Authentication → URL Configuration:**

- **Site URL** = `https://pthree-wine.vercel.app` (später die eigene
  Domain). Die Links unten bauen darauf auf — steht hier noch
  `localhost`, führen alle Mails dorthin.
- **Redirect URLs** enthält `https://pthree-wine.vercel.app/**`.

## Warum die Links anders aussehen als im Standard

Der Standard `{{ .ConfirmationURL }}` führt über Supabase zurück auf
die Site URL, und zwar ohne Sitzung im Cookie. Für die Einladung hieß
das: Der neue Trainer landete auf der Anmeldeseite, ohne je ein
Passwort gesetzt zu haben.

Die Links unten gehen stattdessen direkt auf `/auth/callback` der App
(`app/auth/callback/route.ts`). Die prüft das Merkmal aus der Mail
(`token_hash`), legt die Sitzung an und leitet dorthin weiter, wo es
weitergeht — bei Einladung und Passwort auf „New password".

Nebeneffekt: Der Passwort-Link funktioniert jetzt auch in einem
anderen Browser als dem, in dem er angefordert wurde. Mit
`{{ .ConfirmationURL }}` scheiterte das am PKCE-Schlüssel, der nur im
anfragenden Browser liegt.

---

## 1. Invite user — neuer Trainer

**Subject**

```
You're invited to PTHREE
```

**Message body**

```html
<h2>Welcome to PTHREE</h2>
<p>You've been invited to PTHREE as a coach.</p>
<p>Click the link below to set your password and get started:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/passwort/neu">Set your password</a></p>
<p>The link is valid for 24 hours and works once.</p>
<p>— PTHREE</p>
```

---

## 2. Reset password — „Forgot password"

**Subject**

```
Reset your PTHREE password
```

**Message body**

```html
<h2>Reset your password</h2>
<p>You asked to set a new password for PTHREE.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/passwort/neu">Choose a new password</a></p>
<p>The link is valid for one hour and works once. If you didn't request this, you can ignore this email — nothing will change.</p>
<p>— PTHREE</p>
```

---

## 3. Confirm signup — Klient nimmt eine Einladung an

Kommt nur, wenn unter *Authentication → Sign In / Providers → Email*
„Confirm email" eingeschaltet ist. Danach landet der Klient über `/` in
seiner App.

**Subject**

```
Confirm your email for PTHREE
```

**Message body**

```html
<h2>Almost there</h2>
<p>Your coach has invited you to PTHREE. Please confirm your email address:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/">Confirm email</a></p>
<p>If you didn't sign up, you can ignore this email.</p>
<p>— PTHREE</p>
```

---

## 4. Change email address — aus dem Profil des Athleten

**Subject**

```
Confirm your new email for PTHREE
```

**Message body**

```html
<h2>Confirm your new email</h2>
<p>You asked to change the email address you use to sign in to PTHREE to <strong>{{ .NewEmail }}</strong>.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/athlete/profile">Confirm new email</a></p>
<p>Until you click the link, you keep signing in with your old address. If you didn't request this, you can ignore this email.</p>
<p>— PTHREE</p>
```

---

## Nicht benutzt

**Magic Link** und **Reauthentication** löst die App nicht aus. Können
bleiben, wie sie sind.

## Danach testen

1. **Passwort:** Auf `/auth/passwort` eine Testadresse eintragen, Mail
   abwarten, Link klicken → muss auf „New password" landen.
2. **Einladung:** *Authentication → Users → Invite user* mit einer
   Testadresse → Link → „New password" → Passwort setzen → danach
   `select promote_to_coach('adresse', 'Name');` im SQL-Editor.
