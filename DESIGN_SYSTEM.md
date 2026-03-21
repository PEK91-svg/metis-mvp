# Metis v2: FE & UX Design System

Questo documento codifica l'estetica, le regole utente e le convenzioni di codice frontend del progetto **Metis v2**. Serve come fonte di verità per preservare il design "Premium Glass-Box" e garantire consistenza architetturale in futuri aggiornamenti.

---

## 1. Filosofia del Design: "Agentic Glass-Box"

L'interfaccia deve ispirare totale fiducia tecnologica mantenendo completa trasparenza decisionale. Metis è un'applicazione per B2B Finance (Underwriting AI), ma l'estetica deve distaccarsi dalle tradizionali e noiose dashboard bancarie, per abbracciare un approccio "scuro, tecno-radicale ma accessibile".

*   **Tema Esclusivo Dark Mode:** L'app vive in un ecosistema dark nativo (`color-scheme: dark`). Nessun adattamento "Light" necessario se non specificamente richiesto in futuro.
*   **Trasparenza (Glassmorphism):** Utilizzo inteso di `backdrop-blur` e sfondi neri con bassa opacità (alpha channel) per simulare l'effetto vetro su uno spazio vuoto (Void).
*   **Glow & Neon Accents:** Elementi interattivi vitali (Bottoni, Nodi, Check di Frode) si illuminano proiettando un'ombra colorata (Glow), simulando dati in movimento.

---

## 2. Tipografia

Abbiamo istanziato due font principali (tramite *next/font/google*):
1.  **Inter (`var(--font-inter)`)**: Font primario per blocchi di testo lunghi, descrizioni, UI standard. Altamente leggibile per micro-testi nei pannelli dati.
2.  **Space Grotesk (`var(--font-space)`)**: Font secondario "Display" a uso massiccio per Headers, Metriche numeriche principali (es. 82.0%), Etichette Uppercase, KPI, e il branding (Logo text). Ha un tono spiccatamente tecnologico e geometrico. Spesso accompagnato da `tracking-widest` e `uppercase`.

---

## 3. Palette Colori (Tailwind v4 CSS Variables)

Le configurazioni cromatiche in `globals.css`:
*   `--color-void` (**#090D14**): Il nero profondo del background dell'app.
*   `--color-panel` (**rgba(14, 21, 33, 0.65)**): Il colore core dei pannelli sovrapposti.
*   `--color-text-main` (**#F1F5F9**): Testo standard (equivalente slate-100).
*   `--color-text-muted` (**#94A3B8**): Testo grigio di supporto.

**Accenti Neon (Uso Semantico):**
*   `--color-cyan` (**#00E5FF**): Colore primario. Identifica intelligenza artificiale, stati attivi di default, dati neutri/certificati. Cifra stilistica dell'interazione standard.
*   `--color-purple` (**#7B2CBF**): Colore primario alternativo. Identifica agenti NLP, Explainable AI (XAI) o bottoni CTA principali.
*   `--color-green` (**#00FF66**): Successo, approvazione sicura, Fair Lending score ottimale.
*   `--color-yellow` (**#FACC15**): Attenzione, frode sospetta limitata, threshold al limite.
*   `--color-red` (**#FF0055**): Default Rate, rifiuto, pericolo critico compliance.

---

## 4. Classi CSS Ricorrenti e utilities Tailwind 

### 4.1. The Glass Panel
Fondamentale per i contenitori a schede.
```css
.glass-panel {
  background: var(--color-panel);
  backdrop-filter: blur(16px);
  border: 1px solid var(--color-glass-border);
  border-radius: 0.75rem; /* rounded-xl */
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```
In alternativa nativa Tailwind: `bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl`.

### 4.2. Glow Effects (Effetto Neon)
Usati per nodi drag-and-drop o metriche vincenti.
*   **Shadow statica:** `shadow-[0_0_15px_rgba(0,229,255,0.2)]`
*   **Hover Glow:** `hover:shadow-[0_0_20px_rgba(123,44,191,0.5)] transition-shadow`
*   **Drop Shadow (su testo/metriche):** `drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]`

### 4.3. Animazioni Micro-Interattive 
Le interfacce non devono apparire di scatto.
*   `animate-[fadeUp_0.5s_ease-out_forwards]`: Usa il Keyframe `fadeUp` (presente in `page.tsx`) per caricare blocchi narrativi o pannelli dal basso con ritardo di opacity. Utile l'attributo `style={{ animationDelay: '0.2s' }}` per reveal a cascata.
*   `animate-pulse`: Applicato sui puntini (es. `<div className="w-2 h-2 rounded-full bg-cyan animate-pulse"></div>`) per indicare simulazioni live o sensori IA attivi.
*   `group-hover:scale-110`: Usato sulle Sidebar e nelle icone SVG per dare tangibilità all'hover, insieme a `transition-transform`.

### 4.4. Background Ambientali Assoluti
Evitare il monocolore piatto. Aggiungere sempre un hint di ambiente sullo sfondo root:
```html
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(123,44,191,0.15),_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(0,229,255,0.1),_transparent_50%)] pointer-events-none"></div>
```

---

## 5. Componenti Pattern Comuni

### 5.1 Tag e Badge
Applicati per gli identificatori di sistema. Devono essere molto piccoli (text-[9px] / text-[10px]), uppercase, ampiamente spaziati e con bordi deludenti.
```jsx
// Esempio Tag Cyan
<span className="text-[9px] px-2 py-0.5 rounded border font-space font-semibold uppercase tracking-widest border-cyan/30 text-cyan bg-cyan/10">
  Validato
</span>
```

### 5.2 Header di Sezione (Glass)
```jsx
<div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl">
  <span>{Titolo}</span>
</div>
```

### 5.3 Alert Narrativi IA (Bordi colorati a sinistra)
Utilizzati per i display di reportistica (XAI e Compliance nell'Home Dashboard).
```jsx
<div className="bg-[rgba(0,229,255,0.05)] border border-glass-border p-5 rounded-lg border-l-2 border-l-cyan leading-relaxed">
   <!-- Content -->
</div>
```

---

## 6. Accessibilità e UX Scenografica

1.  **Stati di Rete e Caricamento:** Poiché le operazioni IA (OCR, Crawling API, Generazione) richiedono tempo, non inserire mai loading spinner muti. Scrivere testi "Agentici" dinamici: *"Inizializzazione Swarm Multi-Agente..." -> "Estrazione dati da Bilancio..."*. L'attesa diventa uno show tecnico.
2.  **Cursore Crosshair nei Testi:** Quando il testo narrativo AI (es. l'agent writer) menziona un dato chiave (EBITDA, Scaduti), avvolgere il testo in tag HTML che al cursore (es. `cursor-crosshair border-b border-dotted`) reagiscono graficamente per indicare la referenza quantitativa (Data Lineage).
3.  **No Scrollbars Invasivi:** La root è sempre `h-screen overflow-hidden`, e si applica il flex-column interno con scroll interno dei singoli pannelli `overflow-y-auto`. La scrollbar `::-webkit-scrollbar` è forzata a una width ridottissima (6px) con bordo arrotondato trasparente (vedere `globals.css`).
