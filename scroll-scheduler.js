/*
 * Scheduler scroll bersama.
 *
 * Sebelumnya setiap animasi (stacking hero, reveal teks, portal Tools) punya
 * requestAnimationFrame sendiri. Tiap callback menulis style lalu callback
 * berikutnya membaca getBoundingClientRect(), sehingga browser dipaksa
 * menghitung ulang layout berkali-kali dalam satu frame (layout thrashing).
 *
 * Di sini semua animasi didaftarkan sebagai { read, write }.
 * Setiap frame: semua read dijalankan dulu, baru semua write.
 * Hasilnya layout paling banyak dihitung satu kali per frame.
 */
(() => {
  const tasks = [];
  const MAX_SETTLE_FRAMES = 3;
  let frame = null;
  let settleFrames = 0;

  function run() {
    frame = null;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;

    // Fase baca: tidak ada penulisan style sama sekali.
    const states = tasks.map((task) => task.read(viewportHeight, scrollY));

    // Fase tulis: hanya menulis, tidak ada pembacaan layout.
    let changed = false;
    tasks.forEach((task, index) => {
      if (states[index] === null || states[index] === undefined) return;
      if (task.write(states[index]) === true) changed = true;
    });

    // Satu animasi bisa bergantung pada hasil tulis animasi lain (misalnya
    // reveal teks mengikuti posisi portal). Beri beberapa frame tambahan
    // sampai semuanya stabil, lalu berhenti sendiri.
    if (changed && settleFrames < MAX_SETTLE_FRAMES) {
      settleFrames += 1;
      schedule();
    }
  }

  function schedule() {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(run);
  }

  function onViewportChange() {
    settleFrames = 0;
    schedule();
  }

  window.addEventListener("scroll", onViewportChange, { passive: true });
  window.addEventListener("resize", onViewportChange, { passive: true });

  window.ScrollScheduler = {
    add(task) {
      tasks.push(task);
      onViewportChange();
    },
    schedule: onViewportChange,
  };
})();
