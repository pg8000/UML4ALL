(function (root) {
  const examples = {
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
