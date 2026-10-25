(function (root) {
  const examples = {
    soc: "diagram \"Cyber Security Operations Center\" {\n  direction down\n  layout layered\n  spacing compact\n  group \"Cyber Security Operations Center\" {\n    group \"SOC Monitoring (L1/L2/L3)\" {\n      node M2 \"Triage L1\" {\n        color = \"#ffe3cc\"\n      }\n      node M3 \"Escalation tecnica L2/L3 / Preparazione segnalazione\" {\n        color = \"#ffe3cc\"\n      }\n      node M4 \"Chiusura ticket\" {\n        color = \"#ffe3cc\"\n      }\n    }\n    group \"SOC Quality\" {\n      node Q1 \"Verifica chiusure incident\" {\n        color = \"#fff4b3\"\n      }\n      node Q2 \"Aggiornamento knowledge base / runbook\" {\n        color = \"#fff4b3\"\n      }\n      node Q3 \"Coaching / feedback operativi\" {\n        color = \"#fff4b3\"\n      }\n      node Q4 \"Report periodici di qualità / KPI\" {\n        color = \"#fff4b3\"\n      }\n    }\n    group \"Communication Coordinator\" {\n      node C2 \"Invio segnalazione strutturata a IT/IR + referenti IT\" {\n        color = \"#ffd9d9\"\n      }\n      node C3 \"Raccolta feedback / esiti / fix richiesti\" {\n        color = \"#ffd9d9\"\n      }\n      node C4 \"Tracciamento / archiviazione\" {\n        color = \"#ffd9d9\"\n      }\n    }\n    group \"SOC Management\" {\n      node G1 \"Supervisione attività operative\" {\n        color = \"#fff4b3\"\n      }\n      node G2 \"Controllo KPI e analisi dati\" {\n        color = \"#fff4b3\"\n      }\n      node G3 \"Revisione e adeguamento procedure / flussi operativi\" {\n        color = \"#fff4b3\"\n      }\n      node G4 \"Validazione e pianificazione miglioramenti\" {\n        color = \"#fff4b3\"\n      }\n      node G5 \"Report strategici\" {\n        color = \"#fff4b3\"\n      }\n    }\n    group \"Detection & Platform Engineering\" {\n      node DE1 \"Onboarding log & integrazioni\" {\n        color = \"#ffe3cc\"\n      }\n      node DE2 \"Tuning regole SIEM/UEBA\" {\n        color = \"#ffe3cc\"\n      }\n      node DE3 \"Automazioni SOAR (watchlist IOC, enrichment)\" {\n        color = \"#ffe3cc\"\n      }\n      node DE4 \"Analytics custom / modifiche\" {\n        color = \"#ffe3cc\"\n      }\n      node DE5 \"Data quality & health\" {\n        color = \"#ffe3cc\"\n      }\n    }\n    group \"Threat Hunting\" {\n      node TH1 \"Ingest fonti interne/esterne + analisi TTP\" {\n        color = \"#dce6ff\"\n      }\n      node TH2 \"Validazione e correlazione\" {\n        color = \"#dce6ff\"\n      }\n      node TH3 \"Ipotesi di hunting\" {\n        color = \"#dce6ff\"\n      }\n      node TH4 \"Investigazione\" {\n        color = \"#dce6ff\"\n      }\n      node TH5 \"Gap analysis & proposte di detection\" {\n        color = \"#dce6ff\"\n      }\n    }\n    group \"Data Analyst\" {\n      node D1 \"Raccolta dati e modellazione\" {\n        color = \"#fff4b3\"\n      }\n      node D2 \"Analisi trend e KPI\" {\n        color = \"#fff4b3\"\n      }\n      node D3 \"Creazione dashboard e workbook\" {\n        color = \"#fff4b3\"\n      }\n    }\n  }\n  group \"IT/IR Esterno\" {\n    node PROTECT_EXT \"Controlli preventivi (Hardening, Patch, IAM, Awareness)\" {\n      color = \"#eddcff\"\n    }\n    node IR_EXT \"Incident Response (IT / Fornitori)\" {\n      color = \"#ffd9d9\"\n    }\n    node REG_NOTIFY \"Notifiche regolamentari\\n(CSIRT/ACN/Autorità)\" {\n      color = \"#ffd9d9\"\n    }\n    node REC_ACT \"Remediation & Restore (IT / Fornitori)\" {\n      color = \"#d5f5df\"\n    }\n  }\n  node CTIEXT \"CTI Provider (Intelligence / Feed)\"\n  node STKH \"Stakeholder / Direzione\"\n  group \"Legenda\" {\n    group \"Flussi Comunicativi\" {\n      node f1 \" \"\n      node f2 \" \"\n      node i1 \" \"\n      node i2 \" \"\n    }\n    group \"NIST CSF 2.0\" {\n      node GId \"Identify\"\n      node GDet \"Detect\"\n      node GPro \"Protect\"\n      node GRes \"Respond\"\n      node GGov \"Govern\"\n      node GRec \"Recover\"\n    }\n  }\n  f1 -> f2 : \"Operativo\"\n  i1 --> i2 : \"Informativo\"\n  TH1 -> TH2\n  TH2 -> TH3\n  TH2 -> DE3\n  TH3 -> TH4\n  TH4 -> TH5\n  TH4 -> M3 : \"Incident ed escalation\"\n  TH5 <-> DE2 : \"Candidate detection\"\n  DE1 -> DE2\n  DE2 -> DE3\n  DE3 -> DE4\n  DE4 -> DE5\n  M2 -> M3\n  M3 -> M4\n  M4 -> Q1\n  C2 -> C3\n  C3 -> C4\n  C3 -> M4\n  C3 -> DE2\n  Q1 -> Q2\n  Q1 -> Q4\n  Q2 -> Q3\n  Q2 --> DE2 : \"Lesson learned / gap\"\n  Q3 -> M2\n  Q3 -> M3\n  Q4 --> D1 : \"Report qualità / KPI\"\n  D1 -> D2\n  D2 -> D3\n  D3 --> G2 : \"Dashboard / trend / KPI\"\n  G1 -> G2\n  G2 -> G3\n  G3 -> G4\n  G4 -> G5\n  CTIEXT --> TH1 : \"Bollettini CTI\"\n  DE2 -> M2 : \"Regole aggiornate\"\n  DE4 -> M2 : \"Nuove analytics\"\n  M3 --> C2 : \"Richiesta segnalazione esterna\"\n  C2 -> IR_EXT : \"Richiesta intervento esterno / segnalazione\"\n  IR_EXT -> REC_ACT\n  IR_EXT -> REG_NOTIFY\n  IR_EXT -> PROTECT_EXT\n  IR_EXT -> C3 : \"Feedback / esiti intervento\"\n  M3 --> IR_EXT : \"Supporto tecnico su richiesta\"\n  M3 --> TH2 : \"Richiesta analisi estesa\"\n  TH2 --> M3 : \"Esito analisi\"\n  G5 --> STKH : \"Report strategici\"\n  STKH --> G1 : \"Richieste / indirizzi\"\n}\n",
    network: `diagram "Architettura di rete" {
  direction right

  cloud internet "Internet"

  zone "Perimetro" {
    firewall fw "Firewall" {
      ip = "203.0.113.1"
    }
  }

  zone "Sede principale" {
    switch core "Core switch"
    network lan "LAN utenti" {
      subnet = "192.168.10.0/24"
      vlan = "10"
    }
    server app "Applicazione" {
      ip = "192.168.20.10"
    }
    database db "Database"
  }

  internet -> fw : HTTPS
  fw -> core
  core -> lan
  core -> app : HTTPS
  app -> db : SQL
}`,
    workflow: `diagram "Richiesta di accesso" {
  direction down

  start inizio "Inizio"
  task richiesta "Invio richiesta"
  decision verifica "Approvata?"
  task abilita "Abilita accesso" {
    owner = "Team IT"
  }
  task rifiuta "Comunica rifiuto"
  end fine "Fine"

  inizio -> richiesta -> verifica
  verifica -> abilita : sì
  verifica -> rifiuta : no
  abilita -> fine
  rifiuta -> fine
}`,
    logic: `diagram "Architettura logica" {
  direction right

  actor utente "Utente"

  zone "Presentazione" {
    service web "Portale web"
  }

  zone "Servizi applicativi" {
    service api "API Gateway"
    group "Dominio" {
      service ordini "Gestione ordini"
      service catalogo "Catalogo prodotti"
    }
  }

  zone "Dati" {
    database db "Archivio"
  }

  utente -> web : Browser
  web -> api : REST
  api -> ordini
  api -> catalogo
  ordini -> db : Scrittura
  catalogo --> db : Lettura
}`,
    blank: `diagram "Il mio schema" {
  direction right

  node a "Prima idea"
  node b "Passo successivo"

  a -> b : Collegamento
}`
  };
  if (typeof module === 'object' && module.exports) module.exports = examples;
  else root.UML4ALLExamples = examples;
})(typeof globalThis !== 'undefined' ? globalThis : this);
