class AmbientLensApp {
    constructor() {
        this.audio = new AudioEngine();
        this.visualizer = new VisualEngine('visualizer');
        this.detector = null;
        this.analyzer = null;
        
        this.isRunning = false;
        this.fps = 0;
        this.lastFrame = 0;
        this.frameCount = 0;
        
        this.setupUI();
    }

    setupUI() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());
        document.getElementById('record-btn').addEventListener('click', () => this.toggleRecord());
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        
        // Tap to trigger object sounds
        document.getElementById('detection-overlay').addEventListener('click', (e) => this.handleTap(e));
    }

    async start() {
        const video = document.getElementById('webcam');
        
        // Show loading
        document.getElementById('loading-screen').style.display = 'flex';
        
        try {
            // Initialize components
            this.detector = new ObjectDetector(video, 'detection-overlay');
            this.analyzer = new SceneAnalyzer(video);
            
            // Load model and start camera
            await this.detector.loadModel();
            await this.detector.start();
            
            // Initialize audio (requires user gesture)
            await this.audio.init();
            
            // Hide screens
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 500);
            
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            setTimeout(() => document.getElementById('app-container').classList.add('active'), 50);
            
            // Show tap hint briefly
            setTimeout(() => {
                document.getElementById('tap-hint').classList.remove('hidden');
            }, 2000);
            
            this.isRunning = true;
            this.loop();
            
        } catch (err) {
            console.error('Startup error:', err);
            alert('Error starting: ' + err.message + '\n\nPlease ensure camera permissions are granted.');
        }
    }

    loop() {
        if (!this.isRunning) return;
        
        // FPS calculation
        const now = performance.now();
        this.frameCount++;
        if (now - this.lastFrame >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrame = now;
            document.getElementById('fps').textContent = `${this.fps} FPS`;
        }
        
        // Analyze scene
        const sceneData = this.analyzer.analyze();
        const detections = this.detector.getDetections();
        
        // Update audio
        this.audio.updateFromScene({
            ...sceneData,
            objects: detections
        });
        
        // Update visualizer
        this.visualizer.updateScene(
            sceneData.colors,
            detections,
            this.audio.getAudioParams()
        );
        
        // Update UI
        this.updateUI(sceneData, detections);
        
        requestAnimationFrame(() => this.loop());
    }

    updateUI(sceneData, detections) {
        // Color palette
        const paletteEl = document.getElementById('color-palette');
        paletteEl.innerHTML = '';
        sceneData.colors.forEach(c => {
            const div = document.createElement('div');
            div.className = 'color-swatch';
            div.style.backgroundColor = `hsl(${c.h}, ${c.s * 100}%, ${c.l * 100}%)`;
            paletteEl.appendChild(div);
        });
        
        // Detected objects
        const objectsEl = document.getElementById('detected-objects');
        objectsEl.innerHTML = '';
        const uniqueObjects = [...new Set(detections.map(d => d.class))];
        uniqueObjects.forEach(cls => {
            const div = document.createElement('div');
            div.className = 'obj-tag';
            div.innerHTML = `<span class="dot"></span>${cls}`;
            objectsEl.appendChild(div);
        });
        
        document.getElementById('objects-count').textContent = `${detections.length} objects`;
        
        // Audio params bars
        const params = this.audio.getAudioParams();
        document.getElementById('drone-bar').style.width = `${params.drone}%`;
        document.getElementById('beat-bar').style.width = `${params.beat}%`;
        document.getElementById('mod-bar').style.width = `${params.mod}%`;
    }

    handleTap(e) {
        const rect = e.target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        // Find closest detection
        const detections = this.detector.getDetections();
        let closest = null;
        let closestDist = Infinity;
        
        detections.forEach(d => {
            const dist = Math.sqrt(Math.pow(d.x - x, 2) + Math.pow(d.y - y, 2));
            if (dist < closestDist && dist < 0.15) {
                closestDist = dist;
                closest = d;
            }
        });
        
        if (closest) {
            this.audio.triggerObjectSound(closest.class, closest.x, closest.y);
            
            // Visual feedback
            this.createTapRipple(e.clientX, e.clientY);
        }
    }

    createTapRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(0, 212, 255, 0.6);
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: rippleExpand 0.6s ease-out forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes rippleExpand {
                to { width: 200px; height: 200px; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
            style.remove();
        }, 600);
    }

    toggleMute() {
        const isMuted = this.audio.toggleMute();
        document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
    }

    async toggleRecord() {
        const btn = document.getElementById('record-btn');
        
        if (!this.recording) {
            this.audio.startRecording();
            this.recording = true;
            btn.classList.add('recording');
            btn.textContent = '⏹ Stop';
        } else {
            const blob = await this.audio.stopRecording();
            this.recording = false;
            btn.classList.remove('recording');
            btn.textContent = '⏺ Record';
            
            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ambient-lens-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialize app
const app = new AmbientLensApp();