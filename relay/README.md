# Ossidiana — Print Relay Setup

Questo relay locale riceve i comandi di stampa dal cloud e li inoltra alla stampante MUNBYN ITPP047P via TCP.

## Architettura

```
Tablet (Admin) → Cloud Backend (Base44) → Relay Locale (questo script) → Stampante (192.168.1.51:9100)
```

Il cloud non può raggiungere direttamente la stampante (IP privato 192.168.1.51), quindi il relay funge da ponte.

## Requisisti

- Un dispositivo sempre acceso nella rete del ristorante (Mac, PC Windows, Linux, Raspberry Pi)
- Node.js 18+ installato (https://nodejs.org)
- La stampante accesa e collegata alla stessa rete Wi-Fi

## Setup

### 1. Avvia il relay

```bash
# Scarica print-server.js su un dispositivo del ristorante
# Modifica AUTH_TOKEN in print-server.js con una password sicura

node print-server.js
```

Vedrai:
```
  ┌─────────────────────────────────────────┐
  │   OSSIDIANA — Print Relay               │
  │   Relay:    http://localhost:3000       │
  │   Stampante: 192.168.1.51:9100          │
  └─────────────────────────────────────────┘
```

### 2. Esponi il relay su internet

Usa **Cloudflare Tunnel** (gratuito, no account richiesto per quick tunnel):

```bash
# Installa cloudflared
# Mac:   brew install cloudflared
# Linux: segui https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
# Windows: scarica cloudflared.exe da cloudflare.com

# Avvia il tunnel
cloudflared tunnel --url http://localhost:3000
```

Cloudflare ti darà un URL pubblico tipo:
```
https://random-words-xxx.trycloudflare.com
```

**Annota questo URL** — è il tuo `RELAY_URL`.

### 3. Configura i secrets nell'app

In Base44 dashboard → Settings → Environment Variables, aggiungi:

| Secret | Valore |
|--------|--------|
| `RELAY_URL` | `https://random-words-xxx.trycloudflare.com/print` |
| `RELAY_AUTH_TOKEN` | La password che hai impostato in `AUTH_TOKEN` in print-server.js |

### 4. Test

Vai nel pannello Admin → "Stampa Test". Se tutto è configurato correttamente, la stampante stamperà:

```
        OSSIDIANA
  Test stampante riuscito
  IP: 192.168.1.51
  Porta: 9100
```

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| `Timeout connessione` | Verifica che il relay sia in esecuzione (`node print-server.js`) e che cloudflared sia attivo |
| `Token non valido` | `AUTH_TOKEN` in print-server.js non corrisponde al secret `RELAY_AUTH_TOKEN` |
| `connect ECONNREFUSED` | La stampante è spenta o l'IP è cambiato. Verifica con `ping 192.168.1.51` |
| Il pulsante non dà risposta | Controlla che `RELAY_URL` termini con `/print` |

## Rendere il relay permanente

### Mac (launchd)
```bash
# Crea un plist in ~/Library/LaunchAgents/com.ossidiana.print-relay.plist
# che esegua node /percorso/print-server.js all'avvio
```

### Linux / Raspberry Pi (systemd)
```bash
sudo tee /etc/systemd/system/ossidiana-relay.service <<EOF
[Unit]
Description=Ossidiana Print Relay
After=network.target

[Service]
ExecStart=/usr/bin/node /home/pi/print-server.js
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable ossidiana-relay
sudo systemctl start ossidiana-relay
```

Per cloudflared come servizio permanente, consulta:
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/