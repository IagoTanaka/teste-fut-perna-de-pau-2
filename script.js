// Constantes do jogo
const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;
const PLAYER_RADIUS = 15;
const GOALKEEPER_RADIUS = 18;
const BALL_RADIUS = 10;
const PLAYER_SPEED = 2;
const GOALKEEPER_SPEED = 1.8;
const SPRINT_SPEED_FACTOR = 1.5;
const BALL_FRICTION = 0.98;
const PLAYER_FRICTION = 0.9;
const KICK_POWER = 5;
const MAX_KICK_POWER = 15;
const KICK_CHARGE_RATE = 0.2;
const GOAL_WIDTH = 100;
const GOAL_DEPTH = 20;
const MATCH_DURATION = 300; // 5 minutos em segundos

// Elementos do DOM
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const gameModeSelect = document.getElementById('game-mode');
const teamAScoreElement = document.querySelector('.team-a .score');
const teamBScoreElement = document.querySelector('.team-b .score');
const timerElement = document.querySelector('.timer');
const mobileControls = document.querySelectorAll('.mobile-controls button');

// Configuração do canvas
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Estado do jogo
let gameState = {
    isRunning: false,
    isPaused: false,
    timeLeft: MATCH_DURATION,
    lastTime: 0,
    teamAScore: 0,
    teamBScore: 0,
    gameMode: 'pvp',
    players: [],
    ball: null,
    input: {
        teamA: { up: false, down: false, left: false, right: false, sprint: false, kick: false },
        teamB: { up: false, down: false, left: false, right: false, sprint: false, kick: false }
    },
    kickPower: 0,
    isChargingKick: false
};

// Classes do jogo
class Player {
    constructor(x, y, radius, color, team, isGoalkeeper = false) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.team = team;
        this.isGoalkeeper = isGoalkeeper;
        this.vx = 0;
        this.vy = 0;
        this.speed = isGoalkeeper ? GOALKEEPER_SPEED : PLAYER_SPEED;
        this.hasBall = false;
    }

    update() {
        // Aplicar atrito
        this.vx *= PLAYER_FRICTION;
        this.vy *= PLAYER_FRICTION;
        
        // Atualizar posição
        this.x += this.vx;
        this.y += this.vy;
        
        // Limitar ao campo
        if (this.isGoalkeeper) {
            // Goleiro limitado à área
            const areaTop = this.team === 'A' ? GAME_HEIGHT / 2 - 100 : GAME_HEIGHT / 2 - 100;
            const areaBottom = this.team === 'A' ? GAME_HEIGHT / 2 + 100 : GAME_HEIGHT / 2 + 100;
            const areaLeft = this.team === 'A' ? 0 : GAME_WIDTH - 50;
            const areaRight = this.team === 'A' ? 50 : GAME_WIDTH;
            
            this.x = Math.max(areaLeft + this.radius, Math.min(areaRight - this.radius, this.x));
            this.y = Math.max(areaTop + this.radius, Math.min(areaBottom - this.radius, this.y));
        } else {
            // Jogadores de linha limitados ao campo
            this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Desenhar número ou "G" para goleiro
        ctx.fillStyle = 'white';
        ctx.font = `${this.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.isGoalkeeper ? 'G' : this.team === 'A' ? '1' : '2', this.x, this.y);
    }
}

class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = BALL_RADIUS;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
    }

    update() {
        // Aplicar atrito
        this.vx *= BALL_FRICTION;
        this.vy *= BALL_FRICTION;
        
        // Parar quando velocidade for muito baixa
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        if (Math.abs(this.vy) < 0.1) this.vy = 0;
        
        // Atualizar posição
        this.x += this.vx;
        this.y += this.vy;
        
        // Rotação baseada na velocidade
        if (this.vx !== 0 || this.vy !== 0) {
            this.rotation += Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 0.1;
        }
        
        // Limitar ao campo (com colisão simplificada)
        this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
        
        // Verificar gols
        this.checkGoals();
    }

    checkGoals() {
        // Gol do Time B (esquerda)
        if (this.x < this.radius && this.y > GAME_HEIGHT / 2 - GOAL_WIDTH / 2 && this.y < GAME_HEIGHT / 2 + GOAL_WIDTH / 2) {
            scoreGoal('A');
        }
        // Gol do Time A (direita)
        else if (this.x > GAME_WIDTH - this.radius && this.y > GAME_HEIGHT / 2 - GOAL_WIDTH / 2 && this.y < GAME_HEIGHT / 2 + GOAL_WIDTH / 2) {
            scoreGoal('B');
        }
    }

    draw() {
        // Desenhar bola com efeito de rotação
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Bola base
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Detalhes da bola
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, this.radius);
        ctx.moveTo(-this.radius, 0);
        ctx.lineTo(this.radius, 0);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Sombra
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius + 2, this.radius, this.radius / 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
    }
}

// Funções do jogo
function initGame() {
    // Criar jogadores
    gameState.players = [];
    
    // Time A (azul)
    gameState.players.push(new Player(150, GAME_HEIGHT / 2, GOALKEEPER_RADIUS, '#3498db', 'A', true));
    gameState.players.push(new Player(300, GAME_HEIGHT / 2 - 80, PLAYER_RADIUS, '#3498db', 'A'));
    gameState.players.push(new Player(300, GAME_HEIGHT / 2 + 80, PLAYER_RADIUS, '#3498db', 'A'));
    gameState.players.push(new Player(400, GAME_HEIGHT / 2 - 40, PLAYER_RADIUS, '#3498db', 'A'));
    gameState.players.push(new Player(400, GAME_HEIGHT / 2 + 40, PLAYER_RADIUS, '#3498db', 'A'));
    
    // Time B (vermelho)
    gameState.players.push(new Player(GAME_WIDTH - 150, GAME_HEIGHT / 2, GOALKEEPER_RADIUS, '#e74c3c', 'B', true));
    gameState.players.push(new Player(GAME_WIDTH - 300, GAME_HEIGHT / 2 - 80, PLAYER_RADIUS, '#e74c3c', 'B'));
    gameState.players.push(new Player(GAME_WIDTH - 300, GAME_HEIGHT / 2 + 80, PLAYER_RADIUS, '#e74c3c', 'B'));
    gameState.players.push(new Player(GAME_WIDTH - 400, GAME_HEIGHT / 2 - 40, PLAYER_RADIUS, '#e74c3c', 'B'));
    gameState.players.push(new Player(GAME_WIDTH - 400, GAME_HEIGHT / 2 + 40, PLAYER_RADIUS, '#e74c3c', 'B'));
    
    // Criar bola
    gameState.ball = new Ball(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    // Resetar placar e tempo
    gameState.teamAScore = 0;
    gameState.teamBScore = 0;
    gameState.timeLeft = MATCH_DURATION;
    updateScore();
    updateTimer();
    
    // Resetar input
    gameState.input = {
        teamA: { up: false, down: false, left: false, right: false, sprint: false, kick: false },
        teamB: { up: false, down: false, left: false, right: false, sprint: false, kick: false }
    };
    
    gameState.kickPower = 0;
    gameState.isChargingKick = false;
}

function updateScore() {
    teamAScoreElement.textContent = gameState.teamAScore;
    teamBScoreElement.textContent = gameState.teamBScore;
}

function updateTimer() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function scoreGoal(team) {
    if (team === 'A') {
        gameState.teamAScore++;
    } else {
        gameState.teamBScore++;
    }
    updateScore();
    resetAfterGoal();
}

function resetAfterGoal() {
    // Reposicionar jogadores e bola
    gameState.ball.x = GAME_WIDTH / 2;
    gameState.ball.y = GAME_HEIGHT / 2;
    gameState.ball.vx = 0;
    gameState.ball.vy = 0;
    
    // Reposicionar jogadores
    gameState.players[0].x = 150; // Goleiro A
    gameState.players[0].y = GAME_HEIGHT / 2;
    gameState.players[1].x = 300; // Jogador A1
    gameState.players[1].y = GAME_HEIGHT / 2 - 80;
    gameState.players[2].x = 300; // Jogador A2
    gameState.players[2].y = GAME_HEIGHT / 2 + 80;
    gameState.players[3].x = 400; // Jogador A3
    gameState.players[3].y = GAME_HEIGHT / 2 - 40;
    gameState.players[4].x = 400; // Jogador A4
    gameState.players[4].y = GAME_HEIGHT / 2 + 40;
    
    gameState.players[5].x = GAME_WIDTH - 150; // Goleiro B
    gameState.players[5].y = GAME_HEIGHT / 2;
    gameState.players[6].x = GAME_WIDTH - 300; // Jogador B1
    gameState.players[6].y = GAME_HEIGHT / 2 - 80;
    gameState.players[7].x = GAME_WIDTH - 300; // Jogador B2
    gameState.players[7].y = GAME_HEIGHT / 2 + 80;
    gameState.players[8].x = GAME_WIDTH - 400; // Jogador B3
    gameState.players[8].y = GAME_HEIGHT / 2 - 40;
    gameState.players[9].x = GAME_WIDTH - 400; // Jogador B4
    gameState.players[9].y = GAME_HEIGHT / 2 + 40;
    
    // Resetar velocidades
    gameState.players.forEach(player => {
        player.vx = 0;
        player.vy = 0;
    });
}

function handleCollisions() {
    // Colisão entre jogadores e bola
    gameState.players.forEach(player => {
        const dx = gameState.ball.x - player.x;
        const dy = gameState.ball.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + gameState.ball.radius) {
            // Colisão detectada
            if (gameState.input[player.team === 'A' ? 'teamA' : 'teamB'].kick && player.hasBall) {
                // Chutar a bola
                const angle = Math.atan2(dy, dx);
                const power = gameState.kickPower;
                
                gameState.ball.vx = Math.cos(angle) * power;
                gameState.ball.vy = Math.sin(angle) * power;
                player.hasBall = false;
                gameState.kickPower = 0;
                gameState.isChargingKick = false;
            } else {
                // Apenas tocar na bola
                player.hasBall = true;
                
                // Empurrar a bola
                const overlap = player.radius + gameState.ball.radius - distance;
                const angle = Math.atan2(dy, dx);
                
                gameState.ball.x += Math.cos(angle) * overlap * 0.5;
                gameState.ball.y += Math.sin(angle) * overlap * 0.5;
                
                // Transferir um pouco da velocidade do jogador para a bola
                gameState.ball.vx = player.vx * 0.5;
                gameState.ball.vy = player.vy * 0.5;
            }
        } else {
            player.hasBall = false;
        }
    });
    
    // Colisão entre jogadores (simplificada)
    for (let i = 0; i < gameState.players.length; i++) {
        for (let j = i + 1; j < gameState.players.length; j++) {
            const player1 = gameState.players[i];
            const player2 = gameState.players[j];
            
            const dx = player2.x - player1.x;
            const dy = player2.y - player1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player1.radius + player2.radius) {
                // Colisão entre jogadores
                const angle = Math.atan2(dy, dx);
                const overlap = player1.radius + player2.radius - distance;
                
                // Empurrar os jogadores para fora
                player1.x -= Math.cos(angle) * overlap * 0.5;
                player1.y -= Math.sin(angle) * overlap * 0.5;
                player2.x += Math.cos(angle) * overlap * 0.5;
                player2.y += Math.sin(angle) * overlap * 0.5;
            }
        }
    }
}

function updatePlayers() {
    // Atualizar jogadores do Time A
    const teamAPlayers = gameState.players.filter(p => p.team === 'A');
    const teamBPlayers = gameState.players.filter(p => p.team === 'B');
    
    // Time A (controles WASD + Shift)
    const inputA = gameState.input.teamA;
    teamAPlayers.forEach(player => {
        let speed = player.speed * (inputA.sprint ? SPRINT_SPEED_FACTOR : 1);
        
        if (inputA.up) player.vy = -speed;
        if (inputA.down) player.vy = speed;
        if (inputA.left) player.vx = -speed;
        if (inputA.right) player.vx = speed;
        
        // Se nenhuma tecla de movimento estiver pressionada, parar gradualmente
        if (!inputA.up && !inputA.down) player.vy *= 0.8;
        if (!inputA.left && !inputA.right) player.vx *= 0.8;
        
        player.update();
    });
    
    // Time B (controles setas + Ctrl)
    if (gameState.gameMode === 'pvp') {
        const inputB = gameState.input.teamB;
        teamBPlayers.forEach(player => {
            let speed = player.speed * (inputB.sprint ? SPRINT_SPEED_FACTOR : 1);
            
            if (inputB.up) player.vy = -speed;
            if (inputB.down) player.vy = speed;
            if (inputB.left) player.vx = -speed;
            if (inputB.right) player.vx = speed;
            
            // Se nenhuma tecla de movimento estiver pressionada, parar gradualmente
            if (!inputB.up && !inputB.down) player.vy *= 0.8;
            if (!inputB.left && !inputB.right) player.vx *= 0.8;
            
            player.update();
        });
    } else {
        // Modo PvE - IA simples para o Time B
        teamBPlayers.forEach(player => {
            // IA básica: seguir a bola
            const dx = gameState.ball.x - player.x;
            const dy = gameState.ball.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Se estiver perto da bola, tentar chutar para o gol
            if (distance < 100) {
                const goalX = 0; // Gol do Time A (esquerda)
                const goalY = GAME_HEIGHT / 2;
                
                const angleToGoal = Math.atan2(goalY - player.y, goalX - player.x);
                
                player.vx = Math.cos(angleToGoal) * player.speed;
                player.vy = Math.sin(angleToGoal) * player.speed;
                
                // Chutar aleatoriamente
                if (Math.random() < 0.02 && distance < 50) {
                    gameState.ball.vx = Math.cos(angleToGoal) * MAX_KICK_POWER * 0.7;
                    gameState.ball.vy = Math.sin(angleToGoal) * MAX_KICK_POWER * 0.7;
                }
            } else {
                // Seguir a bola
                player.vx = (dx / distance) * player.speed;
                player.vy = (dy / distance) * player.speed;
            }
            
            // Goleiro tem comportamento especial
            if (player.isGoalkeeper) {
                // Ficar mais perto da linha do gol
                player.vx *= 0.5;
                
                // Tentar interceptar a bola se estiver vindo em direção ao gol
                if (gameState.ball.x > GAME_WIDTH - 200 && gameState.ball.vx < 0) {
                    const interceptY = gameState.ball.y + (gameState.ball.vy / gameState.ball.vx) * (GAME_WIDTH - 150 - gameState.ball.x);
                    const dy = interceptY - player.y;
                    
                    player.vy = (dy > 0 ? 1 : -1) * player.speed * 0.8;
                }
            }
            
            player.update();
        });
    }
    
    // Carregar chute se o botão de chute estiver pressionado
    if (gameState.input.teamA.kick || gameState.input.teamB.kick) {
        if (!gameState.isChargingKick) {
            gameState.isChargingKick = true;
            gameState.kickPower = KICK_POWER;
        } else if (gameState.kickPower < MAX_KICK_POWER) {
            gameState.kickPower += KICK_CHARGE_RATE;
        }
    } else if (gameState.isChargingKick) {
        gameState.isChargingKick = false;
        gameState.kickPower = 0;
    }
}

function drawField() {
    // Gramado
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Linhas do campo
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    // Linhas externas
    ctx.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
    
    // Linha do meio
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, 10);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT - 10);
    ctx.stroke();
    
    // Círculo central
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    
    // Área do Time A (esquerda)
    ctx.beginPath();
    ctx.rect(10, GAME_HEIGHT / 2 - 100, 50, 200);
    ctx.stroke();
    
    // Área do Time B (direita)
    ctx.beginPath();
    ctx.rect(GAME_WIDTH - 60, GAME_HEIGHT / 2 - 100, 50, 200);
    ctx.stroke();
    
    // Gols
    ctx.fillStyle = 'white';
    ctx.fillRect(0, GAME_HEIGHT / 2 - GOAL_WIDTH / 2, GOAL_DEPTH, GOAL_WIDTH);
    ctx.fillRect(GAME_WIDTH - GOAL_DEPTH, GAME_HEIGHT / 2 - GOAL_WIDTH / 2, GOAL_DEPTH, GOAL_WIDTH);
    
    // Ponto central
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Desenhar barra de força do chute (se estiver carregando)
    if (gameState.isChargingKick) {
        const playerWithBall = gameState.players.find(p => p.hasBall);
        if (playerWithBall) {
            const barWidth = 50;
            const barHeight = 10;
            const barX = playerWithBall.x - barWidth / 2;
            const barY = playerWithBall.y - playerWithBall.radius - 15;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = 'yellow';
            ctx.fillRect(barX, barY, barWidth * (gameState.kickPower / MAX_KICK_POWER), barHeight);
            
            ctx.strokeStyle = 'white';
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
}

function gameLoop(timestamp) {
    if (!gameState.isRunning || gameState.isPaused) {
        return;
    }
    
    // Calcular delta time
    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    
    // Atualizar tempo do jogo
    if (deltaTime < 100) { // Evitar grandes saltos de tempo
        gameState.timeLeft -= deltaTime / 1000;
        updateTimer();
        
        if (gameState.timeLeft <= 0) {
            gameState.timeLeft = 0;
            gameState.isRunning = false;
            alert(`Jogo terminado! Placar final: Time A ${gameState.teamAScore} x ${gameState.teamBScore} Time B`);
        }
    }
    
    // Limpar canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Desenhar campo
    drawField();
    
    // Atualizar jogadores
    updatePlayers();
    
    // Atualizar bola
    gameState.ball.update();
    
    // Verificar colisões
    handleCollisions();
    
    // Desenhar jogadores e bola
    gameState.players.forEach(player => player.draw());
    gameState.ball.draw();
    
    // Continuar o loop
    requestAnimationFrame(gameLoop);
}

// Event listeners
startBtn.addEventListener('click', () => {
    if (!gameState.isRunning) {
        gameState.isRunning = true;
        gameState.isPaused = false;
        gameState.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    } else if (gameState.isPaused) {
        gameState.isPaused = false;
        gameState.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
});

pauseBtn.addEventListener('click', () => {
    if (gameState.isRunning) {
        gameState.isPaused = true;
    }
});

resetBtn.addEventListener('click', () => {
    gameState.isRunning = false;
    gameState.isPaused = false;
    initGame();
});

gameModeSelect.addEventListener('change', (e) => {
    gameState.gameMode = e.target.value;
});

// Controles de teclado
document.addEventListener('keydown', (e) => {
    // Time A (WASD + Shift)
    if (e.key === 'w' || e.key === 'W') gameState.input.teamA.up = true;
    if (e.key === 's' || e.key === 'S') gameState.input.teamA.down = true;
    if (e.key === 'a' || e.key === 'A') gameState.input.teamA.left = true;
    if (e.key === 'd' || e.key === 'D') gameState.input.teamA.right = true;
    if (e.key === 'Shift') gameState.input.teamA.sprint = true;
    if (e.key === ' ') gameState.input.teamA.kick = true;
    
    // Time B (Setas + Ctrl)
    if (e.key === 'ArrowUp') gameState.input.teamB.up = true;
    if (e.key === 'ArrowDown') gameState.input.teamB.down = true;
    if (e.key === 'ArrowLeft') gameState.input.teamB.left = true;
    if (e.key === 'ArrowRight') gameState.input.teamB.right = true;
    if (e.key === 'Control') gameState.input.teamB.sprint = true;
    if (e.key === 'Enter') gameState.input.teamB.kick = true;
});

document.addEventListener('keyup', (e) => {
    // Time A (WASD + Shift)
    if (e.key === 'w' || e.key === 'W') gameState.input.teamA.up = false;
    if (e.key === 's' || e.key === 'S') gameState.input.teamA.down = false;
    if (e.key === 'a' || e.key === 'A') gameState.input.teamA.left = false;
    if (e.key === 'd' || e.key === 'D') gameState.input.teamA.right = false;
    if (e.key === 'Shift') gameState.input.teamA.sprint = false;
    if (e.key === ' ') gameState.input.teamA.kick = false;
    
    // Time B (Setas + Ctrl)
    if (e.key === 'ArrowUp') gameState.input.teamB.up = false;
    if (e.key === 'ArrowDown') gameState.input.teamB.down = false;
    if (e.key === 'ArrowLeft') gameState.input.teamB.left = false;
    if (e.key === 'ArrowRight') gameState.input.teamB.right = false;
    if (e.key === 'Control') gameState.input.teamB.sprint = false;
    if (e.key === 'Enter') gameState.input.teamB.kick = false;
});

// Controles mobile
mobileControls.forEach(button => {
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMobileInput(button, true);
    });
    
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleMobileInput(button, false);
    });
    
    button.addEventListener('mousedown', () => {
        handleMobileInput(button, true);
    });
    
    button.addEventListener('mouseup', () => {
        handleMobileInput(button, false);
    });
});

function handleMobileInput(button, isPressed) {
    const direction = button.getAttribute('data-direction');
    
    if (direction) {
        switch (direction) {
            case 'up': gameState.input.teamA.up = isPressed; break;
            case 'down': gameState.input.teamA.down = isPressed; break;
            case 'left': gameState.input.teamA.left = isPressed; break;
            case 'right': gameState.input.teamA.right = isPressed; break;
        }
    } else if (button.id === 'sprint-btn') {
        gameState.input.teamA.sprint = isPressed;
    } else if (button.id === 'kick-btn') {
        gameState.input.teamA.kick = isPressed;
    }
}

// Inicializar o jogo
initGame();
