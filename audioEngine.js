class AudioEngine {
    constructor() {
        this.initialized = false;
        this.isMuted = false;
        
        // Synth components
        this.droneSynth = null;
        this.beatSynth = null;
        this.modSynth = null;
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        
        // Current parameters
        this.droneFreq = 110;
        this.beatRate = 2;
        this.modDepth = 0.5;
        
        // Object-specific sounds map
        this.objectSounds = new Map();
    }

    async init() {
        await Tone.start();
        
        // Master effects chain
        this.reverb = new Tone.Reverb({
            decay: 8,
            wet: 0.4
        }).toDestination();
        
        this.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0.2
        }).connect(this.reverb);
        
        this.filter = new Tone.Filter(800, 'lowpass').connect(this.delay);
        
        // Drone synth (polyphonic FM)
        this.droneSynth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 2,
            modulationIndex: 3,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2,
                decay: 1,
                sustain: 1,
                release: 4
            },
            modulation: { type: 'triangle' },
            modulationEnvelope: {
                attack: 1,
                decay: 0.5,
                sustain: 1,
                release: 2
            }
        }).connect(this.filter);
        
        this.droneSynth.volume.value = -12;
        
        // Beat synth (membrane for rhythmic elements)
        this.beatSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 1.4
            }
        }).connect(this.delay);
        
        this.beatSynth.volume.value = -15;
        
        // Modulation synth (AM for texture)
        this.modSynth = new Tone.AMSynth({
            harmonicity: 3,
            detune: 0,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 1,
                decay: 0.5,
                sustain: 1,
                release: 3
            },
            modulation: { type: 'square' },
            modulationEnvelope: {
                attack: 0.5,
                decay: 0,
                sustain: 1,
                release: 0.5
            }
        }).connect(this.filter);
        
        this.modSynth.volume.value = -20;
        
        // Start background drone
        this.startDrone();
        
        // Start beat loop
        this.startBeatLoop();
        
        this.initialized = true;
    }

    startDrone() {
        // Base drone chord based on scene
        const chords = [
            ['C2', 'G2', 'C3', 'E3'],  // C major
            ['D2', 'A2', 'D3', 'F#3'], // D major
            ['E2', 'B2', 'E3', 'G#3'], // E major
            ['F2', 'C3', 'F3', 'A3'],  // F major
            ['G2', 'D3', 'G3', 'B3'],  // G major
            ['A2', 'E3', 'A3', 'C#3'], // A major
        ];
        
        this.currentChord = chords[0];
        this.droneSynth.triggerAttack(this.currentChord);
    }

    startBeatLoop() {
        this.beatLoop = new Tone.Loop((time) => {
            if (Math.random() > 0.3) {
                this.beatSynth.triggerAttackRelease('C1', '8n', time);
            }
            if (Math.random() > 0.6) {
                this.beatSynth.triggerAttackRelease('G1', '8n', time + 0.25);
            }
        }, '2n').start(0);
        
        Tone.Transport.bpm.value = 60;
        Tone.Transport.start();
    }

    updateFromScene(sceneData) {
        if (!this.initialized || this.isMuted) return;
        
        const { colors, objects, dominantColor, brightness } = sceneData;
        
        // Map dominant hue to musical key
        const hue = dominantColor ? dominantColor.h : 0;
        const noteIndex = Math.floor((hue / 360) * 7);
        const baseFreq = 110 * Math.pow(2, noteIndex / 12);
        
        // Update drone frequency smoothly
        this.droneFreq = this.lerp(this.droneFreq, baseFreq, 0.05);
        
        // Brightness affects filter
        const targetFreq = 200 + (brightness * 3000);
        this.filter.frequency.rampTo(targetFreq, 0.5);
        
        // Object count affects beat density
        const objCount = objects.length;
        this.beatRate = this.lerp(this.beatRate, 1 + objCount * 0.5, 0.1);
        Tone.Transport.bpm.rampTo(40 + this.beatRate * 20, 1);
        
        // Color saturation affects modulation
        const saturation = dominantColor ? dominantColor.s : 0.5;
        this.modDepth = saturation;
        
        // Update chord based on scene
        this.updateChord(hue);
        
        // Update modulation
        if (Math.random() < 0.02) {
            const modFreq = 2 + (brightness * 8);
            this.modSynth.triggerAttackRelease(
                Tone.Frequency(this.droneFreq * 2).toNote(),
                '4n'
            );
        }
    }

    updateChord(hue) {
        const chordRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const rootIndex = Math.floor((hue / 360) * 7) % 7;
        const root = chordRoots[rootIndex];
        
        const chordMap = {
            'C': ['C2', 'G2', 'C3', 'E3'],
            'D': ['D2', 'A2', 'D3', 'F#3'],
            'E': ['E2', 'B2', 'E3', 'G#3'],
            'F': ['F2', 'C3', 'F3', 'A3'],
            'G': ['G2', 'D3', 'G3', 'B3'],
            'A': ['A2', 'E3', 'A3', 'C#3'],
            'B': ['B2', 'F#3', 'B3', 'D#3']
        };
        
        const newChord = chordMap[root];
        if (JSON.stringify(newChord) !== JSON.stringify(this.currentChord)) {
            this.droneSynth.releaseAll();
            this.currentChord = newChord;
            this.droneSynth.triggerAttack(this.currentChord);
        }
    }

    triggerObjectSound(objectClass, x, y) {
        if (!this.initialized || this.isMuted) return;
        
        // Map object class to sound characteristics
        const soundMap = {
            'person': { note: 'C4', type: 'bright' },
            'chair': { note: 'E3', type: 'wood' },
            'book': { note: 'G3', type: 'paper' },
            'bottle': { note: 'B3', type: 'glass' },
            'cup': { note: 'D4', type: 'ceramic' },
            'laptop': { note: 'A3', type: 'digital' },
            'cell phone': { note: 'F#4', type: 'digital' },
            'tv': { note: 'C3', type: 'bass' },
            'couch': { note: 'G2', type: 'soft' },
            'potted plant': { note: 'E4', type: 'organic' },
            'bed': { note: 'A2', type: 'soft' },
            'dining table': { note: 'D3', type: 'wood' },
            'refrigerator': { note: 'C2', type: 'metal' },
            'microwave': { note: 'F4', type: 'digital' },
            'sink': { note: 'B2', type: 'water' },
            'clock': { note: 'G4', type: 'tick' }
        };
        
        const sound = soundMap[objectClass] || { note: 'C3', type: 'default' };
        
        // Create a one-shot synth for this object
        const synth = new Tone.Synth({
            oscillator: { type: sound.type === 'digital' ? 'square' : 'triangle' },
            envelope: {
                attack: 0.02,
                decay: 0.3,
                sustain: 0.1,
                release: 1
            }
        }).connect(this.reverb);
        
        // Pan based on x position
        const panner = new Tone.Panner((x - 0.5) * 2).connect(Tone.Destination);
        synth.disconnect();
        synth.connect(panner);
        
        synth.triggerAttackRelease(sound.note, '8n');
        
        // Auto-cleanup
        setTimeout(() => {
            synth.dispose();
            panner.dispose();
        }, 3000);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        Tone.Destination.mute = this.isMuted;
        return this.isMuted;
    }

    startRecording() {
        this.recorder = new Tone.Recorder();
        Tone.Destination.connect(this.recorder);
        this.recorder.start();
        return this.recorder;
    }

    async stopRecording() {
        if (!this.recorder) return null;
        const recording = await this.recorder.stop();
        this.recorder.dispose();
        this.recorder = null;
        return recording;
    }

    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    getAudioParams() {
        return {
            drone: Math.min(100, (this.droneFreq / 440) * 50),
            beat: Math.min(100, this.beatRate * 25),
            mod: Math.min(100, this.modDepth * 100)
        };
    }
}