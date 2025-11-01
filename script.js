const GAME_CONFIG = {
    gravity: 0.4,
    jumpVelocity: -8,
    playerSpeed: 3.5,
    platformWidth: 90,
    platformHeight: 12,
    bombSize: 16,
    platformSpacing: 80,
    bombChance: 0.15,
    maxJumpHeight: 70
};

const COLORS = {
    player: "#FF6B9D",
    platforms: ["#FFB4D6", "#E8BBE8", "#C8A8E9", "#B8A9FF"],
    bomb: "#FF4757",
    background: "#FFF0F5",
    cloud: "rgba(255,192,203,0.6)"
};

let gameState = 'start';
let canvas, ctx;
let player, platforms, bombs, camera, clouds;
let score = 0;
let highScore = 0;
let keys = {};
let mobileInput = { left: false, right: false };
let lastTime = 0;
let animationFrameId;

class Cloud {
    constructor(x, y, size, speed) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.opacity = Math.random() * 0.3 + 0.2;
    }

    update() {
        this.x += this.speed;
        if (this.x > canvas.width + this.size) {
            this.x = -this.size;
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255,182,193,${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.3, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.arc(this.x - this.size * 0.3, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.15, this.y - this.size * 0.3, this.size * 0.35, 0, Math.PI * 2);
        ctx.arc(this.x - this.size * 0.15, this.y - this.size * 0.3, this.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 18;
        this.height = 18;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.wasOnGround = false;
        this.jumpCooldown = 0;
    }

    update(deltaTime) {
        this.wasOnGround = this.onGround;
        this.onGround = false;
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A'] || mobileInput.left) {
            this.velocityX = Math.max(this.velocityX - 0.3, -GAME_CONFIG.playerSpeed);
        } else if (keys['ArrowRight'] || keys['d'] || keys['D'] || mobileInput.right) {
            this.velocityX = Math.min(this.velocityX + 0.3, GAME_CONFIG.playerSpeed);
        } else {
            this.velocityX *= 0.9;
        }
        this.velocityY += GAME_CONFIG.gravity;
        if (this.velocityY > 12) {
            this.velocityY = 12;
        }
        this.x += this.velocityX;
        this.y += this.velocityY;
        if (this.x < -this.width/2) {
            this.x = canvas.width + this.width/2;
        } else if (this.x > canvas.width + this.width/2) {
            this.x = -this.width/2;
        }
    }

    draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.width/2);
        gradient.addColorStop(0, COLORS.player);
        gradient.addColorStop(1, "#E55A8B");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 3, 1, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 3, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 1, 3, 0, Math.PI);
        ctx.stroke();
    }

    jump() {
        if (this.jumpCooldown <= 0) {
            this.velocityY = GAME_CONFIG.jumpVelocity;
            this.onGround = false;
            this.jumpCooldown = 200;
        }
    }

    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }
}

class Platform {
    constructor(x, y, width = GAME_CONFIG.platformWidth, height = GAME_CONFIG.platformHeight) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = COLORS.platforms[Math.floor(Math.random() * COLORS.platforms.length)];
    }

    draw() {
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.darkenColor(this.color, 20));
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(this.x, this.y, this.width, this.height / 4);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(this.x + 2, this.y + this.height, this.width, 3);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                     (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                     (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

class Bomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GAME_CONFIG.bombSize;
        this.pulseTime = 0;
        this.rotation = 0;
    }

    update(deltaTime) {
        this.pulseTime += deltaTime * 0.002;
        this.rotation += deltaTime * 0.001;
    }

    draw() {
        const pulse = Math.sin(this.pulseTime) * 1;
        const size = this.size + pulse;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = COLORS.bomb;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-size/6, -size/6, size/4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/4, -size/2 - 5);
        ctx.stroke();
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x - this.size / 2,
            right: this.x + this.size / 2,
            top: this.y - this.size / 2,
            bottom: this.y + this.size / 2
        };
    }
}

class Camera {
    constructor() {
        this.y = 0;
        this.targetY = 0;
    }

    update() {
        if (player.y < this.y + canvas.height * 0.7) {
            this.targetY = player.y - canvas.height * 0.8;
        }
        this.y += (this.targetY - this.y) * 0.03;
    }

    apply() {
        ctx.translate(0, -this.y);
    }

    reset() {
        ctx.translate(0, this.y);
    }
}

function checkAABBCollision(rect1, rect2) {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right ||
             rect1.bottom < rect2.top ||
             rect1.top > rect2.bottom);
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    player = new Player(canvas.width / 2, canvas.height - 50);
    platforms = [];
    bombs = [];
    clouds = [];
    camera = new Camera();
    score = 0;
    for (let i = 0; i < 8; i++) {
        clouds.push(new Cloud(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 30 + 20,
            (Math.random() * 0.5 + 0.1) * (Math.random() < 0.5 ? 1 : -1)
        ));
    }
    generatePlatforms();
    setupEventListeners();
}

function generatePlatforms() {
    platforms.push(new Platform(canvas.width / 2 - 70, canvas.height - 25, 140, 15));
    for (let i = 1; i < 50; i++) {
        let x;
        if (i === 1) {
            x = Math.random() * 200 + 100;
        } else {
            const prevPlatform = platforms[platforms.length - 1];
            const maxDistance = 150;
            x = Math.max(0, Math.min(canvas.width - GAME_CONFIG.platformWidth, 
                prevPlatform.x + (Math.random() * maxDistance * 2 - maxDistance)));
        }
        const y = canvas.height - 25 - (i * GAME_CONFIG.platformSpacing);
        platforms.push(new Platform(x, y));
        if (Math.random() < GAME_CONFIG.bombChance && i > 8) {
            const bombX = x + GAME_CONFIG.platformWidth / 2;
            const bombY = y - GAME_CONFIG.bombSize / 2 - 2;
            bombs.push(new Bomb(bombX, bombY));
        }
    }
}

function generateMorePlatforms() {
    if (platforms.length === 0) return;
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    const lowestVisibleY = camera.y + canvas.height + 200;
    let platformCount = 0;
    for (let y = highestPlatform - GAME_CONFIG.platformSpacing; y > camera.y - canvas.height * 2; y -= GAME_CONFIG.platformSpacing) {
        const lastPlatform = platforms[platforms.length - 1];
        const maxDistance = 120;
        const x = Math.max(0, Math.min(canvas.width - GAME_CONFIG.platformWidth, 
            lastPlatform.x + (Math.random() * maxDistance * 2 - maxDistance)));
        platforms.push(new Platform(x, y));
        platformCount++;
        if (Math.random() < GAME_CONFIG.bombChance) {
            const bombX = x + GAME_CONFIG.platformWidth / 2;
            const bombY = y - GAME_CONFIG.bombSize / 2 - 2;
            bombs.push(new Bomb(bombX, bombY));
        }
    }
    platforms = platforms.filter(platform => platform.y < lowestVisibleY);
    bombs = bombs.filter(bomb => bomb.y < lowestVisibleY);
}

function setupEventListeners() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    const moveLeftBtn = document.getElementById('moveLeft');
    const moveRightBtn = document.getElementById('moveRight');
    if (moveLeftBtn && moveRightBtn) {
        moveLeftBtn.replaceWith(moveLeftBtn.cloneNode(true));
        moveRightBtn.replaceWith(moveRightBtn.cloneNode(true));
        const newMoveLeftBtn = document.getElementById('moveLeft');
        const newMoveRightBtn = document.getElementById('moveRight');
        newMoveLeftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileInput.left = true;
        });
        newMoveLeftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileInput.left = false;
        });
        newMoveRightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileInput.right = true;
        });
        newMoveRightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileInput.right = false;
        });
        newMoveLeftBtn.addEventListener('mousedown', () => mobileInput.left = true);
        newMoveLeftBtn.addEventListener('mouseup', () => mobileInput.left = false);
        newMoveRightBtn.addEventListener('mousedown', () => mobileInput.right = true);
        newMoveRightBtn.addEventListener('mouseup', () => mobileInput.right = false);
    }
}

function handleKeyDown(e) {
    keys[e.key] = true;
    if (e.key === ' ' && gameState === 'gameOver') {
        e.preventDefault();
        startGame();
    }
}

function handleKeyUp(e) {
    keys[e.key] = false;
}

function checkCollisions() {
    const playerBounds = player.getBounds();
    for (let platform of platforms) {
        const platformBounds = platform.getBounds();
        if (checkAABBCollision(playerBounds, platformBounds)) {
            if (player.velocityY > 0 &&
                playerBounds.bottom <= platformBounds.top + 8 &&
                playerBounds.bottom >= platformBounds.top - 2) {
                player.y = platformBounds.top - player.height / 2;
                player.velocityY = 0;
                player.onGround = true;
                if (!player.wasOnGround) {
                    setTimeout(() => {
                        if (player.onGround) {
                            player.jump();
                            const newScore = Math.max(0, Math.floor((canvas.height - player.y) / 15));
                            if (newScore > score) {
                                score = newScore;
                                document.getElementById('currentScore').textContent = score;
                            }
                        }
                    }, 50);
                }
                break;
            }
        }
    }
    for (let bomb of bombs) {
        const bombBounds = bomb.getBounds();
        if (checkAABBCollision(playerBounds, bombBounds)) {
            gameOver();
            return;
        }
    }
    if (player.y > camera.y + canvas.height + 100) {
        gameOver();
    }
}

function update(currentTime) {
    if (gameState !== 'playing') return;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    player.update(deltaTime);
    camera.update();
    clouds.forEach(cloud => cloud.update());
    bombs.forEach(bomb => bomb.update(deltaTime));
    checkCollisions();
    generateMorePlatforms();
}

function draw() {
    if (gameState !== 'playing') return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#FFE4E6');
    gradient.addColorStop(0.5, '#FECDD3');
    gradient.addColorStop(1, '#FDA4AF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    camera.apply();
    clouds.forEach(cloud => cloud.draw());
    platforms.forEach(platform => platform.draw());
    bombs.forEach(bomb => bomb.draw());
    player.draw();
    camera.reset();
    ctx.restore();
}

function gameLoop(currentTime) {
    update(currentTime);
    draw();
    if (gameState === 'playing') {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    gameState = 'playing';
    mobileInput = { left: false, right: false };
    keys = {};
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    initGame();
    lastTime = 0;
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameOver';
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (score > highScore) {
        highScore = score;
        document.getElementById('highScore').textContent = highScore;
    }
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalHighScore').textContent = highScore;
}

function showStartScreen() {
    gameState = 'start';
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('highScore').textContent = highScore;
});
