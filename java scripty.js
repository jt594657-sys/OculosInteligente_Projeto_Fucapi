// 1. Relógio em tempo real
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        const now = new Date();
        clockElement.innerText = now.toLocaleTimeString('pt-BR');
    }
}
setInterval(updateClock, 1000);
updateClock();

// 2. Alternar modo Visão Noturna na tecla "N"
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'n') {
        document.body.classList.toggle('night-vision');
    }
});

// 3. Efeito Parallax da interface com o movimento do mouse
document.addEventListener('mousemove', (e) => {
    const hud = document.getElementById('hud');
    if (hud) {
        const x = (window.innerWidth / 2 - e.clientX) / 40;
        const y = (window.innerHeight / 2 - e.clientY) / 40;
        
        hud.style.transform = `translate(${x}px, ${y}px)`;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementos do DOM (existentes + novos do GPS e Pareamento)
    const hud = document.getElementById('hud');
    const reticle = document.getElementById('reticle');
    const objectTag = document.getElementById('object-tag');
    const clock = document.getElementById('clock');
    const bpmVal = document.getElementById('bpm-val');
    const modeStatus = document.getElementById('mode-status');

    // Novos Elementos para o Modo GPS & Pareamento
    const gpsCoords = document.getElementById('gps-coords');
    const gpsSpeed = document.getElementById('gps-speed');
    const gpsHeading = document.getElementById('gps-heading');
    const pairingQrContainer = document.getElementById('pairing-container');

    let reticleTimeout = null;
    let nightVision = false;
    let gpsMode = false;
    let wsSocket = null;

    const targetObjects = [
        'PESSOA DETECTADA (98%)',
        'MONITOR PARALELO',
        'ROUTER WI-FI (SINAL FORTE)',
        'MESA DE TRABALHO',
        'XÍCARA DE CAFÉ (QUENTE)',
        'DISPOSITIVO BLUETOOTH'
    ];

    // ==========================================
    // 2. PARAEAMENTO VIA WEBSOCKET (CONEXÃO CELULAR/PC)
    // ==========================================
    function initPairingSystem() {
        // Conecta ao servidor local ou remoto de WebSockets
        const serverURL = `ws://${window.location.hostname}:8080`;
        wsSocket = new WebSocket(serverURL);

        wsSocket.onopen = () => {
            console.log("HUD conectado à rede de pareamento.");
        };

        wsSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // Recebe dados transmitidos pelo celular pareado
            if (data.type === 'SENSOR_UPDATE') {
                updateGPSData(data.gps);
                if (data.bpm) bpmVal.innerText = data.bpm;
            }

            if (data.type === 'COMMAND') {
                handleRemoteCommand(data.command);
            }
        };
    }

    // Envia telemetria local caso este dispositivo seja o celular emissor
    function broadcastPhoneData(gpsData) {
        if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
            wsSocket.send(JSON.stringify({
                type: 'SENSOR_UPDATE',
                gps: gpsData
            }));
        }
    }

    // ==========================================
    // 3. MODO GPS NATIVO & BÚSSOLA
    // ==========================================
    function startGPS() {
        if (!('geolocation' in navigator)) {
            alert('Geolocalização não suportada neste dispositivo.');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        };

        // Captura posição e velocidade em tempo real
        navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(5);
                const lon = position.coords.longitude.toFixed(5);
                const speedKmh = position.coords.speed 
                    ? Math.round(position.coords.speed * 3.6) 
                    : 0;
                const heading = position.coords.heading || 0;

                const gpsPayload = { lat, lon, speed: speedKmh, heading };
                
                // Atualiza na tela atual
                updateGPSData(gpsPayload);

                // Transmite para o computador se estiver no celular
                broadcastPhoneData(gpsPayload);
            },
            (err) => console.warn(`Erro no GPS (${err.code}): ${err.message}`),
            options
        );

        // Bússola e Inclinação (Giroscópio do Celular)
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.alpha !== null && gpsHeading) {
                    const compassHeading = Math.round(360 - e.alpha);
                    gpsHeading.style.transform = `rotate(${compassHeading}deg)`;
                }
            });
        }
    }

    function updateGPSData(data) {
        if (gpsCoords) gpsCoords.innerText = `${data.lat}, ${data.lon}`;
        if (gpsSpeed) gpsSpeed.innerText = `${data.speed} KM/H`;
        if (gpsHeading && data.heading) {
            gpsHeading.style.transform = `rotate(${data.heading}deg)`;
        }
    }

    // Comandos Remotos enviados do Celular
    function handleRemoteCommand(cmd) {
        if (cmd === 'TOGGLE_NIGHT') {
            nightVision = !nightVision;
            document.body.classList.toggle('night-vision', nightVision);
        } else if (cmd === 'TOGGLE_GPS') {
            toggleGPSMode();
        }
    }

    function toggleGPSMode() {
        gpsMode = !gpsMode;
        if (modeStatus) {
            modeStatus.innerText = gpsMode ? "MODO: GPS & NAVEGAÇÃO" : "MODO: RECONHECIMENTO";
            modeStatus.style.borderColor = gpsMode ? "#ffcc00" : "#00f3ff";
        }
        if (gpsMode) startGPS();
    }

    // ==========================================
    // 4. INTERAÇÕES E ANIMAÇÕES (CÓDIGO BASE)
    // ==========================================
    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.clientX) / 30;
        const y = (window.innerHeight / 2 - e.clientY) / 30;

        if (hud) hud.style.transform = `translate(${x}px, ${y}px)`;
        
        if (reticle) {
            reticle.style.transform = 'scale(1.05)';
            clearTimeout(reticleTimeout);
            reticleTimeout = setTimeout(() => {
                reticle.style.transform = 'scale(1)';
            }, 100);
        }
    });

    function updateClock() {
        if (!clock) return;
        const now = new Date();
        clock.innerText = now.toLocaleTimeString('pt-BR');
    }
    setInterval(updateClock, 1000);
    updateClock();

    setInterval(() => {
        if (bpmVal) {
            const randomBPM = Math.floor(Math.random() * (78 - 68 + 1)) + 68;
            bpmVal.innerText = randomBPM;
        }

        if (objectTag && objectTag.innerText !== "ESCANEAR: PROCESSANDO...") {
            const randomObject = targetObjects[Math.floor(Math.random() * targetObjects.length)];
            objectTag.innerText = randomObject;
        }
    }, 3000);

    // Teclas de Atalho: Space (Noturna) e Tecla 'G' (GPS)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            nightVision = !nightVision;
            document.body.classList.toggle('night-vision', nightVision);
        }
        if (e.key.toLowerCase() === 'g') {
            toggleGPSMode();
        }
    });

    // Inicialização
    initPairingSystem();
});// Instalação necessária: npm install ws
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log("Servidor de pareamento HUD rodando na porta 8080...");

wss.on('connection', (ws) => {
    console.log("Novo dispositivo pareado com o HUD!");

    ws.on('message', (message) => {
        // Retransmite dados recebidos para todos os outros dispositivos conectados
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});function speak(text) {
    if ('speechSynthesis' in window) {
        // Cancela falas anteriores para não acumular áudio
        window.speechSynthesis.cancel(); 

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1; // Velocidade da fala
        utterance.pitch = 1.0; // Tom da voz

        window.speechSynthesis.speak(utterance);
    }
}
let lastMotionTime = Date.now();
let alertSent = false;
let prevFrameData = null;
let fatigueMonitorActive = false;

const motionCanvas = document.createElement('canvas');
motionCanvas.width = 64;
motionCanvas.height = 48;
// Use willReadFrequently para otimizar a leitura contínua de pixels
const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });

const IMMOBILITY_LIMIT_MS = 10000;
const NTFY_TOPIC = "alerta-oculi-fadiga";

function checkUserMovement() {
    // Garante que o monitor esteja ativo, a câmera ligada e o vídeo pronto com dimensões válidas
    if (!fatigueMonitorActive || !isCameraActive || video.readyState !== 4 || video.paused || video.ended) {
        return;
    }

    try {
        // Desenha o quadro atual reduzido para análise rápida
        motionCtx.drawImage(video, 0, 0, motionCanvas.width, motionCanvas.height);
        const currentFrameData = motionCtx.getImageData(0, 0, motionCanvas.width, motionCanvas.height);

        if (prevFrameData) {
            let diff = 0;
            const data = currentFrameData.data;
            const prevData = prevFrameData.data;

            // Comparação de diferença entre pixels consecutivos (canais R, G, B)
            for (let i = 0; i < data.length; i += 4) {
                diff += Math.abs(data[i] - prevData[i]);       // Red
                diff += Math.abs(data[i+1] - prevData[i+1]);   // Green
                diff += Math.abs(data[i+2] - prevData[i+2]);   // Blue
            }

            // Sensibilidade ajustada (limiar de movimento)
            const SENSITIVITY_THRESHOLD = 35000; 

            if (diff > SENSITIVITY_THRESHOLD) {
                lastMotionTime = Date.now();
                if (alertSent) {
                    alertSent = false;
                    fatigueStatus.innerText = "Status: Ativo";
                    fatigueStatus.classList.remove('alert-active');
                }
            }
        }
        
        // Atualiza a referência do quadro
        prevFrameData = currentFrameData;
    } catch (e) {
        // Captura exceções temporárias na leitura do frame
        return;
    }

    // Cálculo do tempo de inatividade
    const timeImmobile = Date.now() - lastMotionTime;
    const secondsImmobile = Math.floor(timeImmobile / 1000);
    idleTimer.innerText = `Tempo imóvel: ${secondsImmobile}s`;

    if (timeImmobile >= IMMOBILITY_LIMIT_MS && !alertSent) {
        alertSent = true;
        fatigueStatus.innerText = `ALERTA: Inativo ${secondsImmobile}s!`;
        fatigueStatus.classList.add('alert-active');
        speak("Alerta de inatividade.");
        sendMobileAlert();
    }
}
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            audio: false
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                camStatus.innerText = "Câmera: Ativa";
                
                // Inicia o monitoramento assim que o vídeo começar
                fatigueMonitorActive = true;
                lastMotionTime = Date.now();
                fatigueStatus.innerText = "Status: Ativo";

                resolve(video);
            };
        });
    } catch (e) {
        aiStatus.innerText = "IA: Erro Câmera";
        camStatus.innerText = "Câmera: Indisponível";
        throw e;
    }
}
// ==========================================
// MODO FADIGA - LÓGICA E ESTADO CORRIGIDOS
// ==========================================
let fatigueModeEnabled = false;
let lastInactivityReset = Date.now();
let inactiveSeconds = 0;
let lastDetectionsBBox = [];
const INACTIVITY_THRESHOLD = 300; // 5 minutos em segundos

function resetInactivityTimer() {
    lastInactivityReset = Date.now();
    if (inactiveSeconds >= INACTIVITY_THRESHOLD) {
        fatigueStatus.classList.remove('fatigue-alert');
        fatigueStatus.innerText = "Status: Monitorando";
    }
}

function toggleFatigueMode() {
    fatigueModeEnabled = !fatigueModeEnabled;
    if (fatigueModeEnabled) {
        btnToggleFatigue.innerText = "DESATIVAR MODO FADIGA";
        btnToggleFatigue.classList.add('active');
        fatigueStatus.innerText = "Status: Monitorando";
        resetInactivityTimer();
        speak("Modo fadiga ativado. Alerta configurado para 5 minutos de inatividade.");
    } else {
        btnToggleFatigue.innerText = "ATIVAR MODO FADIGA";
        btnToggleFatigue.classList.remove('active');
        fatigueStatus.innerText = "Status: Desativado";
        fatigueStatus.classList.remove('fatigue-alert');
        fatigueTimer.innerText = "Inatividade: 0s";
        speak("Modo fadiga desativado.");
    }
}

btnToggleFatigue.addEventListener('click', toggleFatigueMode);

// Loop principal do timer de inatividade (1 vez por segundo)
setInterval(() => {
    if (!fatigueModeEnabled) return;

    inactiveSeconds = Math.floor((Date.now() - lastInactivityReset) / 1000);
    
    const minutes = Math.floor(inactiveSeconds / 60);
    const seconds = inactiveSeconds % 60;
    fatigueTimer.innerText = `Inatividade: ${minutes}m ${seconds}s`;

    if (inactiveSeconds >= INACTIVITY_THRESHOLD) {
        fatigueStatus.innerText = "ALERTA: USUÁRIO INATIVO!";
        fatigueStatus.classList.add('fatigue-alert');
        speak("Alerta: Usuário inativo.");
    }
}, 1000);

// Sensores de interação física do usuário
window.addEventListener('mousemove', () => { if (fatigueModeEnabled) resetInactivityTimer(); });
window.addEventListener('keydown', () => { if (fatigueModeEnabled) resetInactivityTimer(); });
window.addEventListener('touchstart', () => { if (fatigueModeEnabled) resetInactivityTimer(); });

// ==========================================
// INTEGRAÇÃO COM COCO-SSD (RENDER LOOP)
// ==========================================
// Substitua o bloco correspondente dentro da função renderLoop:

if (fatigueModeEnabled && predictions && predictions.length > 0) {
    let moved = false;

    predictions.forEach((pred, idx) => {
        // Validação defensiva do frame anterior
        if (lastDetectionsBBox[idx] && Array.isArray(pred.bbox)) {
            const currentX = pred.bbox[0];
            const currentY = pred.bbox[1];
            const prevX = lastDetectionsBBox[idx][0];
            const prevY = lastDetectionsBBox[idx][1];

            const deltaX = Math.abs(currentX - prevX);
            const deltaY = Math.abs(currentY - prevY);

            // Detecção de deslocamento físico em pixels no canvas
            if (deltaX > 15 || deltaY > 15) {
                moved = true;
            }
        }
    });

    if (moved) {
        resetInactivityTimer();
    }

    // Armazena cópia limpa dos vetores de posição do frame atual
    lastDetectionsBBox = predictions.map(p => Array.from(p.bbox));
}
function processCommand(cmd) {
    lastCommand.textContent = `COMANDO: "${cmd}"`;
    resetActivity();

    // Modos de visão existentes
    if (cmd.includes("noturno")) setMode("noturno");
    else if (cmd.includes("tático") || cmd.includes("tatico")) setMode("tatico");
    else if (cmd.includes("médico") || cmd.includes("medico")) setMode("medico");
    else if (cmd.includes("ciberpunk") || cmd.includes("cyberpunk")) setMode("cyberpunk");
    else if (cmd.includes("uber") || cmd.includes("driver")) setMode("uber");
    else if (cmd.includes("lanterna")) setMode("lanterna");
    else if (cmd.includes("normal") || cmd.includes("padrão") || cmd.includes("padrao")) setMode("normal");
    
    // Utilitários de sistema
    else if (cmd.includes("fadiga")) toggleFatigue();
    else if (cmd.includes("clima") || cmd.includes("tempo")) fetchWeather();
    else if (cmd.includes("bateria")) speakBattery();
    else if (cmd.includes("onde estou")) speakLocation();
    
    // NOVOS COMANDOS SUGERIDOS:
    else if (cmd.includes("o que tem à frente") || cmd.includes("descrever")) {
        describeScene(); // Função a implementar: percorre o array de detecções e fala os nomes
    } 
    else if (cmd.includes("ocultar interface") || cmd.includes("limpar tela")) {
        document.querySelector(".hud").style.opacity = "0.1";
        speak("Interface ocultada.");
    }
    else if (cmd.includes("mostrar interface") || cmd.includes("restaurar tela")) {
        document.querySelector(".hud").style.opacity = "1";
        speak("Interface restaurada.");
    }
    else if (cmd.includes("emergência") || cmd.includes("socorro")) {
        speak(`Alerta ativado. Sua localização é latitude ${Oculi.state.latitude}, longitude ${Oculi.state.longitude}`);
    }
    else {
        speak("Comando não reconhecido.");
    }
}
// --- COMPLEMENTO E CORREÇÃO DO SISTEMA DE MAPA E GPS ---

function initGPS() {
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                Oculi.state.userLat = pos.coords.latitude;
                Oculi.state.userLon = pos.coords.longitude;
                
                $("latitude").innerText = Oculi.state.userLat.toFixed(4);
                $("longitude").innerText = Oculi.state.userLon.toFixed(4);
                
                const speedKm = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : "0";
                $("speed").innerText = `${speedKm} km/h`;

                if (!Oculi.state.isSimulating && Oculi.marker) {
                    Oculi.marker.setLatLng([Oculi.state.userLat, Oculi.state.userLon]);
                }
            },
            (err) => console.warn("Erro ao obter GPS:", err),
            { enableHighAccuracy: true }
        );
    }
}

function initBattery() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const updateBattery = () => {
                $("batteryStatus").innerText = `${Math.round(battery.level * 100)}%`;
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
        });
    }
}

function initAudioVisualizer() {
    const canvasWave = $("voiceWaveCanvas");
    if (!canvasWave) return;
    const ctxWave = canvasWave.getContext("2d");
    let angle = 0;

    function renderWave() {
        ctxWave.clearRect(0, 0, canvasWave.width, canvasWave.height);
        ctxWave.beginPath();
        ctxWave.lineWidth = 2;
        ctxWave.strokeStyle = Oculi.state.speaking ? "#00ff66" : "#00f3ff";

        for (let x = 0; x < canvasWave.width; x += 5) {
            const y = (canvasWave.height / 2) + Math.sin(angle + x * 0.05) * (Oculi.state.speaking ? 10 : 3);
            if (x === 0) ctxWave.moveTo(x, y);
            else ctxWave.lineTo(x, y);
        }
        ctxWave.stroke();
        angle += 0.15;
        requestAnimationFrame(renderWave);
    }
    renderWave();
}

function initMap() {
    // Inicialização do Mapa Leaflet
    Oculi.map = L.map('map', { zoomControl: false }).setView([Oculi.state.userLat, Oculi.state.userLon], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: ''
    }).addTo(Oculi.map);

    // Ícone Tático Personalizado
    const customIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `<div style="width: 14px; height: 14px; background: var(--accent); border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 10px var(--accent);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    Oculi.marker = L.marker([Oculi.state.userLat, Oculi.state.userLon], { icon: customIcon }).addTo(Oculi.map);

    // Clique no mapa define o ponto exato onde deve parar
    Oculi.map.on('click', (e) => {
        setExactDestination(e.latlng.lat, e.latlng.lng);
    });
}

function setExactDestination(destLat, destLng) {
    if (!Oculi.map) return;

    // Remove rota anterior se existir
    if (Oculi.routingControl) {
        Oculi.map.removeControl(Oculi.routingControl);
    }

    const startPoint = L.latLng(Oculi.state.userLat, Oculi.state.userLon);
    const endPoint = L.latLng(destLat, destLng);

    // Cria a rota travando exatamente nos dois pontos
    Oculi.routingControl = L.Routing.control({
        waypoints: [startPoint, endPoint],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        createMarker: function(i, wp) {
            return L.marker(wp.latLng, {
                icon: L.divIcon({
                    className: 'target-marker',
                    html: `<div style="width: 12px; height: 12px; background: ${i === 0 ? 'var(--primary)' : 'var(--accent)'}; border-radius: 50%; box-shadow: 0 0 8px currentColor;"></div>`,
                    iconAnchor: [6, 6]
                })
            });
        }
    }).addTo(Oculi.map);

    Oculi.targetLat = destLat;
    Oculi.targetLon = destLng;

    $("gpsBox").style.display = "flex";
    $("gpsInstruction").innerText = "Rota definida para o ponto selecionado";
    $("gpsDistance").innerText = `${(startPoint.distanceTo(endPoint)).toFixed(0)} M`;

    speakText("Destino marcado no mapa.");
}

function handleSearchKeyPress(e) {
    if (e.key === 'Enter') searchLocation();
}

async function searchLocation() {
    const query = $("mapSearchInput").value.trim();
    if (!query) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setExactDestination(lat, lon);
            Oculi.map.setView([lat, lon], 16);
        } else {
            speakText("Local não encontrado.");
        }
    } catch (err) {
        speakText("Erro na busca de localização.");
    }
}

function toggleSimulation() {
    if (Oculi.state.isSimulating) {
        clearInterval(Oculi.state.simInterval);
        Oculi.state.isSimulating = false;
        speakText("Simulação de GPS interrompida.");
        return;
    }

    if (!Oculi.targetLat || !Oculi.targetLon) {
        speakText("Selecione um ponto no mapa primeiro.");
        return;
    }

    Oculi.state.isSimulating = true;
    speakText("Iniciando deslocamento até o ponto.");

    // Movimentação gradual que PARA EXATAMENTE no ponto de destino
    Oculi.state.simInterval = setInterval(() => {
        const step = 0.00015; // Velocidade do passo
        const dLat = Oculi.targetLat - Oculi.state.userLat;
        const dLon = Oculi.targetLon - Oculi.state.userLon;
        const distRemaining = Math.sqrt(dLat * dLat + dLon * dLon);

        // Se estiver suficientemente perto (tolerância de parada exata)
        if (distRemaining <= step) {
            Oculi.state.userLat = Oculi.targetLat;
            Oculi.state.userLon = Oculi.targetLon;
            
            Oculi.marker.setLatLng([Oculi.state.userLat, Oculi.state.userLon]);
            Oculi.map.panTo([Oculi.state.userLat, Oculi.state.userLon]);

            $("latitude").innerText = Oculi.state.userLat.toFixed(4);
            $("longitude").innerText = Oculi.state.userLon.toFixed(4);
            $("speed").innerText = "0 km/h";
            $("gpsInstruction").innerText = "Você chegou ao ponto de destino!";
            $("gpsDistance").innerText = "0 M";

            clearInterval(Oculi.state.simInterval);
            Oculi.state.isSimulating = false;
            OculiAudio.playAlert();
            speakText("Destino alcançado. O veículo parou.");
            return;
        }

        // Interpolação até o ponto fixo
        Oculi.state.userLat += (dLat / distRemaining) * step;
        Oculi.state.userLon += (dLon / distRemaining) * step;

        Oculi.marker.setLatLng([Oculi.state.userLat, Oculi.state.userLon]);
        Oculi.map.panTo([Oculi.state.userLat, Oculi.state.userLon]);

        $("latitude").innerText = Oculi.state.userLat.toFixed(4);
        $("longitude").innerText = Oculi.state.userLon.toFixed(4);
        $("speed").innerText = "45 km/h";

        const currentDist = L.latLng(Oculi.state.userLat, Oculi.state.userLon)
                            .distanceTo(L.latLng(Oculi.targetLat, Oculi.targetLon));
        $("gpsDistance").innerText = `${currentDist.toFixed(0)} M`;
    }, 200);
}

function clearNavigation() {
    if (Oculi.routingControl) {
        Oculi.map.removeControl(Oculi.routingControl);
        Oculi.routingControl = null;
    }
    if (Oculi.state.isSimulating) {
        clearInterval(Oculi.state.simInterval);
        Oculi.state.isSimulating = false;
    }
    Oculi.targetLat = null;
    Oculi.targetLon = null;
    $("gpsBox").style.display = "none";
    $("speed").innerText = "0 km/h";
    speakText("Navegação cancelada.");
}

function zoomMap(delta) {
    if (Oculi.map) Oculi.map.setZoom(Oculi.map.getZoom() + delta);
}

function recenterMap() {
    if (Oculi.map) Oculi.map.panTo([Oculi.state.userLat, Oculi.state.userLon]);
}

function setMapFuturisticMode(mode) {
    const container = $("mapContainer");
    container.className = `map-container map-futuristic-${mode}`;
    
    document.querySelectorAll('.map-search-box ~ .btn-grid .hud-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = $(`btnMap${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');
}

async function findNearbyPOI(type) {
    const lat = Oculi.state.userLat;
    const lon = Oculi.state.userLon;
    const query = `[out:json];node(around:3000,${lat},${lon})["amenity"="${type === 'fuel' ? 'fuel' : 'hospital'}"];out 1;`;
    
    try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.elements && data.elements.length > 0) {
            const poi = data.elements[0];
            setExactDestination(poi.lat, poi.lon);
            speakText(`${type === 'fuel' ? 'Posto' : 'Hospital'} mais próximo localizado.`);
        } else {
            speakText("Nenhum local próximo foi encontrado.");
        }
    } catch (e) {
        speakText("Erro ao consultar locais próximos.");
    }
}
