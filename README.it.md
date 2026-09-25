# DoveArrivo

**Dove arrivo con i mezzi, e come torno in tempo.**
Indichi da dove parti, quando sei libero e quando vuoi rientrare: DoveArrivo propone mete raggiungibili con i mezzi pubblici, con andata e ritorno completi e, quando esiste, un rientro successivo di riserva.

🇬🇧 [English version](README.md) · 🌐 **Anteprima online: [dovearrivo.it](https://dovearrivo.it)** (finché il server resta attivo)

> **Stato: concluso — pilota v0.1, settembre 2026. Non in sviluppo attivo.**
> Il pilota tecnico è completo: itinerari reali su orari reali per il Trentino, dalla pipeline dei dati al sito online. Le mete non sono mai state verificate, quindi il sito resta in modalità anteprima (avviso in alto, non indicizzato) e mostra mete in bozza. Dopo averlo usato, il maintainer ha valutato la domanda troppo ristretta per giustificare il lavoro sui contenuti e un lancio pubblico; il repository resta come implementazione di riferimento. Vedi [Cosa non è stato fatto](#cosa-non-è-stato-fatto).

## Perché

I pianificatori di viaggio rispondono a “come vado da A a B?”. DoveArrivo risponde a “dove posso andare con il tempo che ho, tornando a casa in tempo?”.

- **Mete di ogni tipo**: paesi, laghi, castelli, parchi, non solo sentieri.
- **Fascia oraria libera**: “sono libero dalle 9 alle 19”, non un orario di partenza fisso.
- **Prima il ritorno**: una proposta esiste solo se entrambe le tratte rispettano i filtri; se c'è, viene mostrato un rientro successivo su una corsa diversa.
- **Niente gite inutili**: una meta accanto a dove parti non viene proposta.
- **Dati trasparenti**: orari programmati, copertura, fonti e versione dei dati visibili.

Progetti affini: [Zuugle](https://www.zuugle.it), [Chronotrains](https://www.chronotrains.com/en), [Transitous](https://transitous.org).

## Punti tecnici principali

- **Prima la correttezza.** Una gita viene proposta solo se entrambe le tratte rispettano tutti i limiti; il rientro di riserva deve partire con un mezzo *diverso*; l'attesa a casa non conta come durata del viaggio. I casi di [routing-cases.json](research/routing-cases.json) girano come test, compresi cambio dell'ora e corse dopo mezzanotte.
- **Dati reali e imperfetti.** GTFS di Trentino Trasporti, NeTEx di Trenitalia dal National Access Point e OpenStreetMap, importati in [MOTIS](https://github.com/motis-project/motis). Una pipeline in TypeScript scarica, valida (validatore GTFS di MobilityData), importa, prova ricerche campione, attiva la nuova versione dei dati in modo atomico e permette il ripristino.
- **Problemi trovati con prove e risolti alla radice:** le risposte di MOTIS delimitate dalla chiusura della connessione mandavano in crash il `fetch` di Node sotto carico (client riscritto su `node:http`); un estratto OSM pubblicato con riferimenti mancanti bloccava l'importazione; gli ID delle fermate Trenitalia cambiano tra versioni; una finestra di 16 ore veniva rifiutata da un limite del motore.
- **Misurato** (su un portatile, non rimisurato sul server): importazione completa 14 s; 5 ricerche concorrenti a cache fredda su 19 mete: p95 1,8 s, a cache calda 3 ms.
- **Testato e pubblicato.** 136 test unitari, 30 test end-to-end nel browser su desktop e mobile (con e senza JavaScript, controlli automatici WCAG 2.2 AA), test di contratto sul motore MOTIS fissato, immagini Docker compilate in CI, deploy automatico dopo la CI verde.
- **Niente di terzi in esecuzione.** Calcolo degli itinerari, ricerca dei luoghi, mappa e font ospitati da noi; CSP limitata alla nostra origine; nessun tracciamento; nessun modello AI nel servizio.

## Cosa si può fare nell'anteprima online

- **Cercare** partendo da una fermata, un indirizzo o un luogo, con giorno, fascia oraria, durata del viaggio, permanenza minima, cammino e cambi. I risultati sono “biglietti” ordinati, con la linea del tempo della giornata, i due itinerari, il rientro di riserva e la mappa del percorso. Ogni ricerca è un link condivisibile e funziona anche senza JavaScript.
- **Tabellone delle partenze** in home: gite reali con ritorno in partenza da Trento nelle prossime ore, su palette meccaniche; ogni riga apre la sua gita.
- **Fin dove arrivi in 90 minuti**: una mappa guidata dallo scorrimento, dove le fermate raggiungibili da Trento si accendono in ordine di arrivo.
- **Mappa dei tempi** (`/reachability`): tutte le fermate raggiungibili entro un certo orario da qualsiasi punto di partenza.
- **Stato dei dati** (`/data-status`): fonti, licenze, versione e periodo coperto.
- Italiano e inglese, tema chiaro e scuro, usabile da tastiera e con lettore di schermo (controlli automatici WCAG 2.2 AA, non una certificazione).

## Decisioni principali

- Pilota in Trentino: GTFS urbano ed extraurbano di Trentino Trasporti e treni regionali Trenitalia (Valsugana e Brennero) dal National Access Point italiano.
- Pensato per un catalogo curato di mete con ingressi verificati (la verifica non è stata fatta); gite in giornata.
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
| 3 — Vetrina | Mappa, condivisione, ricerca dei luoghi, inglese, mappa dei tempi, design | Fatto |
| 4 — Contenuti | Tante mete e punti di interesse verificati, con informazioni utili su ciascuno | Non fatto — progetto concluso |
| 5 — Beta e lancio | Circa 10 persone di prova, correzioni, lancio pubblico | Non fatto — progetto concluso |

## Cosa non è stato fatto

- **Verifica e pubblicazione delle mete (D11).** Le 19 mete sono bozze: i punti vengono da OpenStreetMap e non sono stati controllati sul posto. Per questo il sito online è in modalità anteprima.
- **Beta con utenti e lancio pubblico (D12).**
- **Pagina privacy, contatto del gestore e THIRD_PARTY_NOTICES**, necessari prima di un lancio vero.
- **Conferma scritta delle condizioni di riuso dei dati Trenitalia**: il National Access Point non indica una licenza; i dati sono usati con attribuzione e verrebbero rimossi su richiesta.
- **Misure di carico e memoria sul server di produzione**, un suggerimento quando più cammino sbloccherebbe proposte, dati in tempo reale.

Dettagli (in inglese) in [DELIVERY](docs/DELIVERY.md) e stato attuale in [STATUS](docs/STATUS.md).

## Documentazione

La documentazione tecnica è in inglese: partire da [README](README.md) e [docs/](docs/). Interfaccia del sito in italiano e inglese. Sviluppo in locale: vedi la sezione “Local development” del [README](README.md#local-development).

## Come è costruito

Progettato, verificato e mantenuto da Riccardo Pontalti con l'aiuto di agenti AI di sviluppo (Claude Code): decisioni di prodotto, controlli sui dati e accettazione di ogni ticket sono umani, e i contributi degli agenti compaiono come `Co-Authored-By` nei commit. Le regole che gli agenti seguono sono in [AGENTS.md](AGENTS.md). Il servizio in esercizio non usa modelli AI: gli itinerari vengono da orari aperti e da un motore di calcolo open source.

## Contribuire

Sono utili anche contributi senza codice: verificare l'ingresso di una meta, segnalare una fermata ambigua, confrontare una proposta con gli orari ufficiali. Vedi [CONTRIBUTING](CONTRIBUTING.md); issue in italiano benvenute.

Codice e documentazione originali: [MIT](LICENSE). Dati, font e componenti esterni: [NOTICE](NOTICE.md).
