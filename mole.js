// Whack-a-Mole (jQuery) — robust hits with pointerdown + grace window
$(function(){
  const $grid = $('#grid');
  const $holes = $grid.find('.hole');
  const $time = $('#time'), $score = $('#score'), $best = $('#best');
  const $start = $('#start'), $stop = $('#stop'), $speed = $('#speed');
  const BEST_KEY = 'WAM_BEST_V1';

  // timing
  const GAME_SECONDS = 30;
  const GRACE_MS = 120; // accept hits this long after the mole goes down

  let running = false;
  let timeLeft = GAME_SECONDS;
  let score = 0;
  let gameTimer = null;
  let moleTimer = null;

  // track current mole + its timing for grace
  let currentHole = null;           // jQuery element
  let goesDownAt = 0;               // performance.now() timestamp when it hid

  function showBest(){
    try { const b = JSON.parse(localStorage.getItem(BEST_KEY) || '0'); $best.text(b || '—'); }
    catch { $best.text('—'); }
  }
  function updateBest(){
    const b = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    if (score > b) localStorage.setItem(BEST_KEY, String(score));
    showBest();
  }

  function randomHole(){
    return $holes.eq(Math.floor(Math.random() * $holes.length));
  }

  function scheduleNext(){
    if (!running) return;
    const hold = parseInt($speed.val(), 10); // ms to stay up
    let $h = randomHole();
    if (currentHole && $h[0] === currentHole[0]) $h = randomHole();

    // reset all holes to base state
    $holes.removeClass('up hit').each(function(){ $(this).data('scored', false); });

    currentHole = $h;
    goesDownAt = 0;
    $h.addClass('up');              // POP UP
    $h.data('scored', false);

    clearTimeout(moleTimer);
    moleTimer = setTimeout(() => {
      // Mole goes down
      $h.removeClass('up');
      goesDownAt = performance.now();
      // chain next after grace to avoid starving final clicks
      setTimeout(() => { if (running) scheduleNext(); }, GRACE_MS);
    }, hold);
  }

  function startGame(){
    if (running) return;
    running = true; score = 0; timeLeft = GAME_SECONDS;
    $score.text(score); $time.text(timeLeft);
    $start.prop('disabled', true); $stop.prop('disabled', false);
    showBest();
    scheduleNext();
    $('#win-modal').remove();

    clearInterval(gameTimer);
    gameTimer = setInterval(() => {
      timeLeft--; $time.text(timeLeft);
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function showWinModal(hits) {
    const overlay = $('<div id="overlay"></div>');
    const modal = $(`
      <div id="win-modal">
        <h2>🎉 You Win!</h2>
        <p>Moles hit: <strong>${hits}</strong></p>
        <button id="play-again">Play Again</button>
      </div>
    `);

    $('body').append(overlay).append(modal);
    overlay.fadeIn(200);
    modal.fadeIn(300);
  }

  function endGame(){
    if (!running) return;
    running = false;
    clearInterval(gameTimer); gameTimer = null;
    clearTimeout(moleTimer); moleTimer = null;
    $holes.removeClass('up hit').each(function(){ $(this).data('scored', false); });
    currentHole = null;
    $start.prop('disabled', false); $stop.prop('disabled', true);
    updateBest();
    showWinModal(score);
  }

  // EARLY input for reliability — pointerdown catches taps right away
  $grid.on('pointerdown', '.hole, .mole', function(e){
    if (!running) return;
    const $h = $(e.target).closest('.hole');
    if ($h.length === 0) return;

    const isCurrent = currentHole && ($h[0] === currentHole[0]);
    const wasUp = $h.hasClass('up');
    const withinGrace = !wasUp && isCurrent && (performance.now() - goesDownAt) <= GRACE_MS;

    // Only score once per pop
    if ((wasUp || withinGrace) && !$h.data('scored')) {
      $h.data('scored', true).addClass('hit').removeClass('up');
      score++; $score.text(score);

      // Speed up next pop immediately (don’t wait the rest of hold)
      clearTimeout(moleTimer); moleTimer = null;
      goesDownAt = performance.now(); // record down time for any straggler taps
      setTimeout(() => { if (running) scheduleNext(); }, 80);
    }
  });

  // Controls
  $start.on('click', startGame);
  $('body').on('click', '#play-again', function () {
    startGame();
  });
  $stop.on('click', endGame);

  // Init
  showBest();
});
