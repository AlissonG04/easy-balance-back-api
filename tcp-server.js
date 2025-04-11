const net = require("net");
const WebSocket = require("ws");

const PORTA_WS = 8080;

// Servidor WebSocket
const wss = new WebSocket.Server({ port: PORTA_WS }, () => {
  console.log(`WebSocket Server rodando na porta ${PORTA_WS}`);
});

// Estado para rastrear pesos por balança
const estadoAtual = {
  "01": { peso: null, timer: null, ativo: true },
  "02": { peso: null, timer: null, ativo: true },
};

function broadcast(dado) {
  const json = JSON.stringify(dado);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

function processarPeso(id, novoPeso) {
  const atual = estadoAtual[id];
  const pesoNum = parseFloat(novoPeso);

  if (!atual.ativo) return;
  if (isNaN(pesoNum)) {
    console.warn(`Peso inválido da balança ${id}:`, novoPeso);
    return;
  }

  broadcast({ tipo: "peso", balanca: id, peso: pesoNum });
  console.log(`Enviando peso para WebSocket (balança ${id}): ${pesoNum}`);

  if (pesoNum !== atual.peso) {
    clearTimeout(atual.timer);

    atual.timer = setTimeout(() => {
      if (pesoNum > 500) {
        const registro = {
          tipo: "historico",
          balanca: id,
          peso: pesoNum,
          data: new Date().toISOString(),
        };

        console.log(`Peso estabilizado na Balança ${id}:`, registro);
        broadcast(registro);
      }
    }, 2000);

    atual.peso = pesoNum;
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.tipo === "controle") {
      const { balanca, acao } = data;
      if (estadoAtual[balanca]) {
        estadoAtual[balanca].ativo = acao === "iniciar";
        console.log(
          `Balança ${balanca} ${acao === "iniciar" ? "ativada" : "pausada"}`
        );
      }
    }

    if (data.tipo === "complemento-envio") {
      const { balanca, tara, liquido, bruto } = data;
      const payload = {
        tipo: "complemento",
        balanca,
        tara,
        liquido,
        bruto,
      };
      broadcast(payload);
      console.log("Complemento enviado para tablet:", payload);
    }

    if (data.tipo === "resposta-complemento") {
      const { balanca, acao } = data;
      if (estadoAtual[balanca]) {
        if (acao === "aceitar") {
          estadoAtual[balanca].ativo = true;
          console.log(`📲 Tablet aceitou complemento da balança ${balanca}`);
          const pesoAtual = estadoAtual[balanca].peso;
          if (pesoAtual !== null) {
            broadcast({ tipo: "peso", balanca, peso: pesoAtual });
          }
        } else {
          console.log(`Tablet recusou complemento da balança ${balanca}`);
        }
      }
    }
  });
});

function conectarBalança(id, ip, porta) {
  const socket = new net.Socket();

  function tentarReconectar() {
    console.log(`Tentando reconectar à Balança ${id} em 5s...`);
    setTimeout(() => conectarBalança(id, ip, porta), 5000);
  }

  socket.connect(porta, ip, () => {
    console.log(`Conectado à Balança ${id} (${ip}:${porta})`);
  });

  socket.on("data", (data) => {
    console.log(`RAW data (${id}):`, data);
    let peso = data.toString().trim();

    const match = peso.match(/\d+/g);
    if (match) {
      peso = match.join("");
    }

    console.log(`Peso limpo (${id}):`, peso);
    processarPeso(id, peso);
  });

  socket.on("close", () => {
    console.log(`Balança ${id} desconectada`);
    tentarReconectar();
  });

  socket.on("error", (err) => {
    console.error(`Erro na Balança ${id}:`, err.message);
    socket.destroy();
    tentarReconectar();
  });
}

const balancas = [
  { id: "01", ip: "192.168.0.72", porta: 23 },
  { id: "02", ip: "192.168.0.127", porta: 6432 },
];

balancas.forEach(({ id, ip, porta }) => {
  conectarBalança(id, ip, porta);
});
