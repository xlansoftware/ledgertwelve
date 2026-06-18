const audio = new Audio("/sounds/success.mp3");

const isTest = import.meta.env.MODE === 'test';

export function playSound() {
   if (isTest) return;
   audio.play().catch((e) => console.warn("Playback blocked:", e));
}
