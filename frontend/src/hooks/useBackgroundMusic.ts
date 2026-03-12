import { useState, useEffect, useRef, useCallback } from "react";

const MUSIC_URL = "https://www.myinstants.com/media/sounds/nhac-xo-so.mp3";
const BET_SELECT_URL = "https://www.myinstants.com/media/sounds/money-soundfx.mp3";
const DICE_REVEAL_URL = "https://www.myinstants.com/media/sounds/coin_1.mp3";
const WIN_URL = "https://www.myinstants.com/media/sounds/musica_1.mp3";
const LOSE_URL = "https://www.myinstants.com/media/sounds/070-challenge-lose.mp3";
const HACKER_URL = "https://www.myinstants.com/media/sounds/hackerman-the-most-powerful-hacker-of-all-the-time-mp3cut.mp3";
const JACKPOT_URL = "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3";

export function useBackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const hasInteracted = useRef(false);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.2;
    audioRef.current = audio;

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const playBetSelect = useCallback(() => {
    const sfx = new Audio(BET_SELECT_URL);
    sfx.volume = 1;
    sfx.play().catch(() => {});
  }, []);

  const playDiceReveal = useCallback(() => {
    const sfx = new Audio(DICE_REVEAL_URL);
    sfx.volume = 1;
    sfx.play().catch(() => {});
  }, []);

  const playWin = useCallback(() => {
    const sfx = new Audio(WIN_URL);
    sfx.volume = 1;
    sfx.play().catch(() => {});
    setTimeout(() => {
      sfx.pause();
      sfx.src = "";
    }, 5000);
  }, []);

  const playLose = useCallback(() => {
    const sfx = new Audio(LOSE_URL);
    sfx.volume = 1;
    sfx.play().catch(() => {});
  }, []);

  const playHacker = useCallback(() => {
    const sfx = new Audio(HACKER_URL);
    sfx.volume = 1;
    sfx.play().catch(() => {});
  }, []);

  const playJackpot = useCallback(() => {
    const sfx = new Audio(JACKPOT_URL);
    sfx.volume = 1;
    sfx.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (hasInteracted.current) return;
    const autoplay = () => {
      hasInteracted.current = true;
      const audio = audioRef.current;
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
      document.removeEventListener("click", autoplay);
      document.removeEventListener("touchstart", autoplay);
    };
    document.addEventListener("click", autoplay);
    document.addEventListener("touchstart", autoplay);
    return () => {
      document.removeEventListener("click", autoplay);
      document.removeEventListener("touchstart", autoplay);
    };
  }, []);

  return { playing, toggle, playBetSelect, playDiceReveal, playWin, playLose, playHacker, playJackpot };
}
