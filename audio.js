/**
 * Module quản lý âm thanh cho Game Ghép Chữ "a"
 * Sử dụng Web Audio API cho hiệu ứng âm thanh (SFX) không cần tải file ngoài
 * Sử dụng Web Speech API cho giọng đọc tiếng Việt & tiếng Anh
 */

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.hasInteracted = false;
  }

  // Khởi tạo AudioContext khi người dùng tương tác lần đầu
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.hasInteracted = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 1. Âm thanh khi nhấc nét lên (Pop vui tai)
  playPickup() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 2. Âm thanh khi nét hút vào đúng khớp (Ting / Chime lấp lánh)
  playSnap() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Arpeggio)
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.04);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + index * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.04 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.04);
        osc.stop(ctx.currentTime + index * 0.04 + 0.25);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 3. Âm thanh khi thả sai vị trí (Boing nảy về vị trí cũ)
  playWrong() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 4. Hợp âm hoan hô chiến thắng (Fanfare)
  playVictory() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      // Nhạc điệu chúc mừng: C4, G4, C5, E5, G5
      const melody = [
        { f: 523.25, d: 0.12, t: 0.0 },
        { f: 659.25, d: 0.12, t: 0.12 },
        { f: 783.99, d: 0.14, t: 0.24 },
        { f: 1046.50, d: 0.45, t: 0.38 }
      ];

      melody.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.t + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.t);
        osc.stop(ctx.currentTime + note.t + note.d);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 5. Phát âm tiếng Việt / Tiếng Anh cho lời khen ngợi
  speakPraise(text) {
    if (this.isMuted) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const isEnglish = /perfect/i.test(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isEnglish ? 'en-US' : 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.25; // Giọng hào hứng, phấn khích

    const voices = window.speechSynthesis.getVoices();
    if (isEnglish) {
      const enVoice = voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    } else {
      const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
      if (viVoice) utterance.voice = viVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // 6. Phát âm chung
  speak(text) {
    if (this.isMuted) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

// Khởi tạo instance toàn cục
window.soundManager = new SoundManager();
