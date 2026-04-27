class SceneAnalyzer {
    constructor(videoElement) {
        this.video = videoElement;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.lastAnalysis = 0;
        this.analysisInterval = 500; // ms
    }

    analyze() {
        const now = Date.now();
        if (now - this.lastAnalysis < this.analysisInterval) {
            return this.lastResult;
        }
        
        this.canvas.width = 320;
        this.canvas.height = 180;
        this.ctx.drawImage(this.video, 0, 0, 320, 180);
        
        const imageData = this.ctx.getImageData(0, 0, 320, 180);
        const pixels = imageData.data;
        
        // Extract color palette using simple quantization
        const colors = this.extractColors(pixels);
        const dominantColor = colors[0] || { h: 0, s: 0, l: 0.5 };
        const brightness = this.calculateBrightness(pixels);
        
        this.lastResult = {
            colors: colors.slice(0, 5),
            dominantColor,
            brightness,
            timestamp: now
        };
        
        this.lastAnalysis = now;
        return this.lastResult;
    }

    extractColors(pixels) {
        const colorMap = new Map();
        
        for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Quantize to reduce unique colors
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;
            
            const key = `${qr},${qg},${qb}`;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }
        
        // Sort by frequency and convert to HSL
        const sorted = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        return sorted.map(([color, count]) => {
            const [r, g, b] = color.split(',').map(Number);
            return this.rgbToHsl(r, g, b);
        });
    }

    calculateBrightness(pixels) {
        let total = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            total += (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
        }
        return (total / (pixels.length / 4)) / 255;
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s, l };
    }
}