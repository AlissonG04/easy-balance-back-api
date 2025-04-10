const net = require("net");
const WebSocket = require("ws");

const PORTA_WS = 8080;

// Servidor WebSocket
const wss = new WebSocket.Server({ port: PORTA_WS }, () => {
  console.log(`WebSocket Server rodando na porta ${PORTA_WS}`);
});

// Função para enviar mensagem para todos os clientes conectados
function broadcast(dado) {
  const json = JSON.stringify(dado);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// Conexão com as balanças
const balancas = [
  { id: "01", ip: "192.168.0.72", porta: 23 },
  { id: "02", ip: "192.168.0.127", porta: 6432 },
];

balancas.forEach(({ id, ip, porta }) => {
  const socket = new net.Socket();

  socket.connect(porta, ip, () => {
    console.log(`Conectado à Balança ${id} (${ip}:${porta})`);
  });

  socket.on("data", (data) => {
    const peso = data.toString().trim();
    console.log(`Balança ${id} | Peso: ${peso}`);

    // Envia peso via WebSocket
    broadcast({ balanca: id, peso });
  });

  socket.on("close", () => {
    console.log(`Balança ${id} desconectada`);
  });

  socket.on("error", (err) => {
    console.error(`Erro na Balança ${id}:`, err.message);
  });
});
