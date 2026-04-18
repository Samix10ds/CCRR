# CCRR Community Platform

Piattaforma community per le classi CCRR — React + Vite + Supabase + Vercel

---

## Setup rapido

### 1. Installa dipendenze
```bash
npm install
```

### 2. Configura variabili d'ambiente
Copia `.env.example` in `.env` e compila:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=la_tua_anon_key
```

### 3. Supabase
1. Vai su **SQL Editor** e incolla + esegui `ccrr_schema.sql`
2. In **Authentication → Settings**: disabilita "Email confirmations" (email fake)
3. (Opzionale) in **Authentication → Settings**: disabilita "Secure email change"

### 4. Imposta Davide come admin
Dopo che Davide si è registrato, vai su Supabase → **Table Editor → profiles**,
trova il suo profilo e cambia `role` da `user` ad `admin`.

Oppure da SQL:
```sql
UPDATE profiles
SET role = 'admin'
WHERE nome = 'Davide' AND cognome = 'TuoCognome';
```

### 5. Avvia in locale
```bash
npm run dev
```

### 6. Deploy su Vercel
```bash
npm run build
```
Poi importa su Vercel e aggiungi le variabili d'ambiente nel pannello.

---

## Struttura file

```
src/
├── lib/
│   ├── supabase.js        # Client Supabase
│   ├── automod.js         # Ban automatico parole vietate
│   └── notifications.js   # Helper notifiche DB
├── context/
│   ├── AuthContext.jsx    # Login/registrazione email fake
│   └── ThemeContext.jsx   # Gestione temi
├── hooks/
│   └── useNotifications.js # Realtime notifiche
├── components/
│   ├── layout/
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Navbar.jsx
│   │   └── AdminGuard.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── CardBadge.jsx
│   │   └── Modal.jsx
│   └── notifications/
│       └── NotificationBell.jsx
├── pages/
│   ├── Auth.jsx           # Login / Registrazione
│   ├── Home.jsx           # Dashboard utente
│   ├── Ideas.jsx          # Lista idee + invia
│   ├── Vote.jsx           # Vota idee pending
│   ├── Rules.jsx          # Regole community
│   ├── Reports.jsx        # Segnalazioni
│   ├── Profile.jsx        # Profilo + tema + warning
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── AdminIdeas.jsx      # Approva/rifiuta idee
│       ├── AdminUsers.jsx      # Cartellini + ban
│       ├── AdminReports.jsx    # Gestisci segnalazioni
│       ├── AdminRules.jsx      # CRUD regole
│       └── AdminBannedWords.jsx # Parole vietate
├── App.jsx                # Router
├── main.jsx               # Entry point
└── index.css              # Temi + stili globali
```

---

## Sistema cartellini

| Colore   | Significato         | Effetto                          |
|----------|---------------------|----------------------------------|
| 🟢 Verde | In regola           | Nessuno                          |
| 🟡 Giallo | Primo warning      | Avviso                           |
| 🟠 Arancione | A rischio       | Ban temporaneo 1-60 min          |
| 🔴 Rosso | Ban permanente      | Accesso bloccato, appello email  |

---

## Temi disponibili

`dark` · `light` · `color_festa` · `color_natale` · `color_pasqua`

Ogni utente sceglie il suo tema dal profilo. Viene salvato nel DB e sincronizzato.

---

## Ban automatico

Il sistema controlla ogni testo inviato (idee, ecc.) contro la lista di parole vietate approvate.
- Prima infrazione → 🟡 giallo
- Seconda → 🟠 arancione + ban 30min
- Terza → 🔴 ban permanente
