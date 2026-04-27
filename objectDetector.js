class ObjectDetector {
    constructor(videoElement, overlayCanvasId) {
        this.video = videoElement;
        this.overlay = document.getElementById(overlayCanvasId);
        this.ctx = this.overlay.getContext('2d');
        this.model = null;
        this.detections = [];
        this.isRunning = false;
    }

    async loadModel() {
        this.model = await cocoSsd.load({
            base: 'mobilenet_v2'
        });
        return this.model;
    }

    async start() {
        // Get webcam stream
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment'
            },
            audio: false
        });
        
        this.video.srcObject = stream;
        
        await new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play();
                resolve();
            };
        });
        
        this.isRunning = true;
        this.detect();
    }

    async detect() {
        if (!this.isRunning) return;
        
        if (this.model && this.video.readyState === 4) {
            this.detections = await this.model.detect(this.video);
            this.drawDetections();
        }
        
        requestAnimationFrame(() => this.detect());
    }

    drawDetections() {
        const ctx = this.ctx;
        const w = this.overlay.width = window.innerWidth;
        const h = this.overlay.height = window.innerHeight;
        
        ctx.clearRect(0, 0, w, h);
        
        // Calculate scale factors
        const scaleX = w / this.video.videoWidth;
        const scaleY = h / this.video.videoHeight;
        
        this.detections.forEach(det => {
            const [x, y, width, height] = det.bbox;
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledW = width * scaleX;
            const scaledH = height * scaleY;
            
            // Color based on class
            const hue = this.getClassHue(det.class);
            
            // Box
            ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.lineWidth = 3;
            ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);
            
            // Label background
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.fillRect(scaledX, scaledY - 28, ctx.measureText(det.class).width + 60, 28);
            
            // Label text
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`${det.class} ${Math.round(det.score * 100)}%`, scaledX + 6, scaledY - 8);
            
            // Center point for tap detection
            ctx.beginPath();
            ctx.arc(scaledX + scaledW/2, scaledY + scaledH/2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });
    }

    getClassHue(className) {
        const hues = {
            'person': 200, 'chair': 30, 'book': 60, 'bottle': 180,
            'cup': 300, 'laptop': 120, 'cell phone': 140, 'tv': 160,
            'couch': 20, 'potted plant': 100, 'bed': 10, 'dining table': 40,
            'refrigerator': 220, 'microwave': 240, 'sink': 200, 'clock': 280
        };
        return hues[className] || Math.abs(className.split('').reduce((a,b) => a + b.charCodeAt(0), 0)) % 360;
    }

    getDetections() {
        return this.detections.map(d => ({
            class: d.class,
            score: d.score,
            x: (d.bbox[0] + d.bbox[2]/2) / this.video.videoWidth,
            y: (d.bbox[1] + d.bbox[3]/2) / this.video.videoHeight,
            bbox: d.bbox
        }));
    }

    stop() {
        this.isRunning = false;
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(t => t.stop());
        }
    }
}