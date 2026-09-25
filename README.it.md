# DoveArrivo

**Dove arrivo con i mezzi, e come torno in tempo.**
Indichi da dove parti, quando sei libero e quando vuoi rientrare: DoveArrivo propone mete raggiungibili con i mezzi pubblici, con andata e ritorno completi e, quando esiste, un rientro successivo di riserva.

🇬🇧 [English version](README.md) · 🌐 **Anteprima online: [dovearrivo.it](https://dovearrivo.it)**

> **Stato: anteprima pubblica.** Itinerari reali su orari reali per il Trentino. Le mete sono ancora bozze in verifica, per questo il sito è in modalità anteprima (avviso in alto, non indicizzato). Prossimo passo: un catalogo molto più ricco di mete e punti di interesse.

## Perché

I pianificatori di viaggio rispondono a “come vado da A a B?”. DoveArrivo risponde a “dove posso andare con il tempo che ho, tornando a casa in tempo?”.

- **Mete di ogni tipo**: paesi, laghi, castelli, parchi, non solo sentieri.
- **Fascia oraria libera**: “sono libero dalle 9 alle 19”, non un orario di partenza fisso.
- **Prima il ritorno**: una proposta esiste solo se entrambe le tratte rispettano i filtri; se c'è, viene mostrato un rientro successivo su una corsa diversa.
- **Niente gite inutili**: una meta accanto a dove parti non viene proposta.
- **Dati trasparenti**: orari programmati, copertura, fonti e versione dei dati visibili.

Progetti affini: [Zuugle](https://www.zuugle.it), [Chronotrains](https://www.chronotrains.com/en), [Transitous](https://transitous.org).

## Cosa si può fare oggi

- **Cercare** partendo da una fermata, un indirizzo o un luogo, con giorno, fascia oraria, durata del viaggio, permanenza minima, cammino e cambi. I risultati sono “biglietti” ordinati, con la linea del tempo della giornata, i due itinerari, il rientro di riserva e la mappa del percorso. Ogni ricerca è un link condivisibile e funziona anche senza JavaScript.
- **Tabellone delle partenze** in home: gite reali con ritorno in partenza da Trento nelle prossime ore, su palette meccaniche; ogni riga apre la sua gita.
- **Fin dove arrivi in 90 minuti**: una mappa guidata dallo scorrimento, dove le fermate raggiungibili da Trento si accendono in ordine di arrivo.
- **Mappa dei tempi** (`/reachability`): tutte le fermate raggiungibili entro un certo orario da qualsiasi punto di partenza.
- **Stato dei dati** (`/data-status`): fonti, licenze, versione e periodo coperto.
- Italiano e inglese, tema chiaro e scuro, usabile da tastiera e con lettore di schermo (controlli automatici WCAG 2.2 AA, non una certificazione).

## Decisioni principali

- Pilota in Trentino: GTFS urbano ed extraurbano di Trentino Trasporti e treni regionali Trenitalia (Valsugana e Brennero) dal National Access Point italiano.
- Un catalogo curato di mete con ingressi verificati; gite in giornata.
- SvelteKit + TypeScript per sito, API e pipeline dei dati; [MOTIS](https://github.com/motis-project/motis) per il calcolo degli itinerari, il cammino e la ricerca dei luoghi, sul nostro server.
- MapLibre con mappa di base Protomaps ospitata da noi; font e risorse serviti da noi; nessun tracciamento e nessuna richiesta a terzi.
- File versionati e cache in memoria: nessun database applicativo.
- Un piccolo server; ogni modifica su `main` con i controlli verdi viene pubblicata automaticamente.
- Nessun modello di intelligenza artificiale nel servizio in esercizio.

## Tabella di marcia

| Fase | Obiettivo | Stato |
| --- | --- | --- |
| 1 — Fondamenta | Prova del motore con tre fonti di dati; repository, CI | Fatto |
| 2 — Scheletro funzionante | Logica di ricerca, adattatore MOTIS, lista dei risultati, pipeline dei dati, messa online | Fatto |
| 3 — Vetrina | Mappa, condivisione, ricerca dei luoghi, inglese, mappa dei tempi, design | Fatto, design in revisione |
| 4 — Contenuti | Tante mete e punti di interesse verificati, con informazioni utili su ciascuno | Prossimo |
| 5 — Beta e lancio | Circa 10 persone di prova, correzioni, lancio pubblico | Previsto |

Dettagli (in inglese) in [DELIVERY](docs/DELIVERY.md) e stato attuale in [STATUS](docs/STATUS.md).

## Documentazione

La documentazione tecnica è in inglese: partire da [README](README.md) e [docs/](docs/). Interfaccia del sito in italiano e inglese. Sviluppo in locale: vedi la sezione “Local development” del [README](README.md#local-development).

## Come è costruito

Progettato, verificato e mantenuto da Riccardo Pontalti con l'aiuto di agenti AI di sviluppo (Claude Code): decisioni di prodotto, controlli sui dati e accettazione di ogni ticket sono umani, e i contributi degli agenti compaiono come `Co-Authored-By` nei commit. Le regole che gli agenti seguono sono in [AGENTS.md](AGENTS.md). Il servizio in esercizio non usa modelli AI: gli itinerari vengono da orari aperti e da un motore di calcolo open source.

## Contribuire

Sono utili anche contributi senza codice: verificare l'ingresso di una meta, segnalare una fermata ambigua, confrontare una proposta con gli orari ufficiali. Vedi [CONTRIBUTING](CONTRIBUTING.md); issue in italiano benvenute.

Codice e documentazione originali: [MIT](LICENSE). Dati, font e componenti esterni: [NOTICE](NOTICE.md).
