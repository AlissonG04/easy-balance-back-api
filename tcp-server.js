const net = require("net");

// Lista de balanças com IPs e portas diferentes
const balancas = [
  { id: "01", ip: "192.168.0.72", porta: 23 },
  { id: "02", ip: "192.168.0.127", porta: 6432 },
];

// Armazenamento temporário em memória (último peso recebido por balança)
const estadoAtual = {
  "01": null,
  "02": null,
};

balancas.forEach(({ id, ip, porta }) => {
  const socket = new net.Socket();

  socket.connect(porta, ip, () => {
    console.log(`Conectado à Balança ${id} (${ip}:${porta})`);
  });

  socket.on("data", (data) => {
    const peso = data.toString().trim();

    // Atualiza estado
    estadoAtual[id] = peso;

    console.log(`Balança ${id} | Peso: ${peso}`);

    // Aqui você pode:
    // - Enviar para o front-end via WebSocket
    // - Salvar em arquivo JSON
    // - Registrar no banco de dados
  });

  socket.on("close", () => {
    console.log(`Balança ${id} desconectada`);
  });

  socket.on("error", (err) => {
    console.error(`Erro na Balança ${id}:`, err.message);
  });
});
