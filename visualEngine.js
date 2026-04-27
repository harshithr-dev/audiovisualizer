class VisualEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        this.particles = [];
        this.waves = [];
        this.colorPalette = [];
        this.objects = [];
        this.audioData = { drone: 0, beat: 0, mod: 0 };
        
        // Create initial particles
        for (let i = 0; i < 100; i++) {
            this.particles.push(this.createParticle());
        }
        
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 4 + 1,
            life: Math.random(),
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        };
    }

    updateScene(colors, objects, audioParams) {
        this.colorPalette = colors;
        this.objects = objects;
        this.audioData = audioParams;
    }

    animate() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Fade effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
        ctx.fillRect(0, 0, w, h);
        
        // Draw color aura based on palette
        if (this.colorPalette.length > 0) {
            this.colorPalette.forEach((color, i) => {
                const x = w * (0.2 + (i / this.colorPalette.length) * 0.6);
                const y = h * 0.5;
                const radius = 100 + (this.audioData.drone * 2);
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, `hsla(${color.h}, ${color.s * 100}%, ${color.l * 50}%, 0.3)`);
                gradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);
            });
        }
        
        // Draw waves
        this.drawWaves(ctx, w, h);
        
        // Draw particles
        this.particles.forEach(p => {
            p.x += p.vx * (1 + this.audioData.beat * 0.01);
            p.y += p.vy * (1 + this.audioData.mod * 0.01);
            p.life -= 0.005;
            
            if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
                Object.assign(p, this.createParticle());
                p.life = 1;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + this.audioData.drone * 0.005), 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('hsl', 'hsla');
            ctx.fill();
        });
        
        // Draw object orbs
        this.objects.forEach((obj, i) => {
            const x = obj.x * w;
            const y = obj.y * h;
            const size = 20 + (obj.score * 50) + (this.audioData.beat * 0.3);
            
            // Glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
            gradient.addColorStop(0, `rgba(0, 212, 255, ${0.3 + Math.sin(Date.now() * 0.003 + i) * 0.2})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Core
            ctx.beginPath();
            ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#00d4ff';
            ctx.fill();
        });
        
        requestAnimationFrame(() => this.animate());
    }

    drawWaves(ctx, w, h) {
        const time = Date.now() * 0.001;
        const baseY = h * 0.7;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(0, baseY);
            
            for (let x = 0; x < w; x += 5) {
                const freq = 0.01 + (i * 0.005) + (this.audioData.drone * 0.0001);
                const amp = 30 + (this.audioData.mod * 0.5) + (i * 20);
                const y = baseY + Math.sin(x * freq + time * (1 + i * 0.5) + this.audioData.beat * 0.1) * amp;
                ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = `hsla(${180 + i * 40}, 70%, 60%, ${0.2 - i * 0.05})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    drawDetectionOverlay(detections) {
        // This is handled by the separate overlay canvas in objectDetector
    }
}