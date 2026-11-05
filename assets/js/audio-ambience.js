/**
 * Audio Ambience & Office SFX Synthesizer
 * Built with HTML5 Web Audio API (Zero External Asset Dependencies)
 * Kantor Virtual HQ
 */

class OfficeAudioAmbience {
    constructor() {
        this.ctx = null;
        this.isEnabled = false;
        this.typingInterval = null;
        this.coffeeNoiseNode = null;
        this.coffeeGain = null;
        this.masterGain = null;

        // Try restoring state from localStorage
        this.isEnabled = localStorage.getItem('kantor_sfx_enabled') === '1';
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            }
        }

        if (this.isEnabled) {
            this.startAmbience();
        }
    }

    toggle() {
        if (!this.ctx) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isEnabled = !this.isEnabled;
        localStorage.setItem('kantor_sfx_enabled', this.isEnabled ? '1' : '0');

        if (this.isEnabled) {
            this.startAmbience();
            this.playDing();
        } else {
            this.stopAmbience();
        }

        this.updateButtonUI();
        return this.isEnabled;
    }

    updateButtonUI() {
        const btn = document.getElementById('btn-toggle-ambience');
        if (!btn) return;

        if (this.isEnabled) {
            btn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-indigo-400/50');
            btn.classList.remove('text-slate-400');
            btn.innerHTML = `<i class="fa-solid fa-volume-high text-xs"></i><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-green"></span>`;
            btn.title = "Audio Ambience: Aktif (Klik untuk Matikan Suara)";
        } else {
            btn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-indigo-400/50');
            btn.classList.add('text-slate-400');
            btn.innerHTML = `<i class="fa-solid fa-volume-xmark text-xs"></i>`;
            btn.title = "Audio Ambience: Hening (Klik untuk Mengaktifkan SFX)";
        }
    }

    startAmbience() {
        if (!this.ctx) return;

        // 1. Start intermittent subtle mechanical typing clatters
        if (!this.typingInterval) {
            this.typingInterval = setInterval(() => {
                if (this.isEnabled && Math.random() < 0.6) {
                    this.playKeyboardClick();
                }
            }, 800);
        }

        // 2. Start gentle coffee maker white noise hiss
        this.startCoffeeHiss();
    }

    stopAmbience() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        if (this.coffeeGain && this.ctx) {
            this.coffeeGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        }
    }

    /**
     * Subtle mechanical keyboard switch synthesizer
     */
    playKeyboardClick() {
        if (!this.ctx || !this.isEnabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const freq = 1200 + Math.random() * 800;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.04 + Math.random() * 0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.06);
        } catch (e) {}
    }

    /**
     * Subtle coffee machine / office air background hiss
     */
    startCoffeeHiss() {
        if (!this.ctx || !this.isEnabled) return;
        try {
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.015;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800;
            filter.Q.value = 1.0;

            this.coffeeGain = this.ctx.createGain();
            this.coffeeGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

            noise.connect(filter);
            filter.connect(this.coffeeGain);
            this.coffeeGain.connect(this.masterGain);

            noise.start();
            this.coffeeNoiseNode = noise;
        } catch (e) {}
    }

    /**
     * Pleasant "Ting" Bell Chime on task completion
     */
    playDing() {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime); // C6 note
            osc.frequency.setValueAtTime(1318.5, this.ctx.currentTime + 0.08); // E6 note

            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.85);
        } catch (e) {}
    }

    /**
     * Cute Synthesized Cat "Meow" Sound
     */
    playMeow() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            // Meow pitch contour: starts at 400Hz, glides to 850Hz, then drops to 500Hz
            const t = this.ctx.currentTime;
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
            osc.frequency.exponentialRampToValueAtTime(520, t + 0.45);

            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.52);
        } catch (e) {}
    }
}

// Attach to window and AppController
window.officeAudio = new OfficeAudioAmbience();

if (typeof AppController !== 'undefined') {
    AppController.prototype.toggleAudioAmbience = function() {
        const active = window.officeAudio.toggle();
        this.showToast(active ? '🔊 Audio Ambience kantor diaktifkan (SFX Nyata)' : '🔇 Audio dinonaktifkan (Mode Hening)', 'info');
    };

    AppController.prototype.playTaskCompletedSound = function() {
        if (window.officeAudio && window.officeAudio.isEnabled) {
            window.officeAudio.playDing();
        }
    };
}

