/**
 * Game Ghép Chữ "a" Viết Thường (Tiểu học Việt Nam)
 * Logic điều khiển trò chơi, Kéo - Thả (Pointer Events), Snap, Kiểm tra hoàn thành
 */

document.addEventListener('DOMContentLoaded', () => {
  // Trạng thái của trò chơi
  const gameState = {
    installedPieces: new Set(), // 'curve', 'hook'
    isDragging: false,
    currentPiece: null,
    dragOffset: { x: 0, y: 0 },
    initialCardRect: null,
    snapThreshold: 90, // Bán kính snap hút vào đích (pixel)
    showHints: true
  };

  // Các phần tử DOM
  const pieces = document.querySelectorAll('.draggable-piece');
  const targetCurve = document.getElementById('target-stroke-curve');
  const targetHook = document.getElementById('target-stroke-hook');
  const snapIndicator = document.getElementById('snap-indicator');
  const completedLetter = document.getElementById('completed-letter');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-fill');
  const progressStatus = document.getElementById('progress-status');
  const victoryModal = document.getElementById('victory-modal');

  // Các nút bấm điều khiển
  const btnReset = document.getElementById('btn-reset');
  const btnSound = document.getElementById('btn-sound');
  const btnHint = document.getElementById('btn-hint');
  const btnPronounceNav = document.getElementById('btn-pronounce-nav');
  const btnVictoryAudio = document.getElementById('btn-victory-audio');
  const btnVictoryReplay = document.getElementById('btn-victory-replay');
  const readPieceBtns = document.querySelectorAll('.btn-read-piece');

  // Bản đồ mục tiêu lắp ráp tương ứng
  const targets = {
    curve: targetCurve,
    hook: targetHook
  };

  /* ================= XỬ LÝ KÉO THẢ (POINTER EVENTS) ================= */

  pieces.forEach(pieceEl => {
    pieceEl.addEventListener('pointerdown', onPointerDown);
  });

  function onPointerDown(e) {
    const pieceId = this.dataset.piece;
    if (gameState.installedPieces.has(pieceId)) return; // Đã lắp rồi thì không kéo nữa

    e.preventDefault();
    gameState.isDragging = true;
    gameState.currentPiece = this;

    // Kích hoạt audio context khi tương tác
    if (window.soundManager) {
      window.soundManager.initAudio();
      window.soundManager.playPickup();
    }

    const rect = this.getBoundingClientRect();
    gameState.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    gameState.initialCardRect = rect;

    this.classList.add('is-dragging');
    this.style.width = `${rect.width}px`;
    this.style.height = `${rect.height}px`;
    this.style.left = `${e.clientX - gameState.dragOffset.x}px`;
    this.style.top = `${e.clientY - gameState.dragOffset.y}px`;

    // Đăng ký lắng nghe sự kiện di chuyển và thả tay toàn màn hình
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  }

  function onPointerMove(e) {
    if (!gameState.isDragging || !gameState.currentPiece) return;

    const piece = gameState.currentPiece;
    const currentX = e.clientX - gameState.dragOffset.x;
    const currentY = e.clientY - gameState.dragOffset.y;

    piece.style.left = `${currentX}px`;
    piece.style.top = `${currentY}px`;

    // Kiểm tra khoảng cách tới mục tiêu tương ứng
    checkNearTarget(piece, currentX, currentY);
  }

  function onPointerUp(e) {
    if (!gameState.isDragging || !gameState.currentPiece) return;

    const piece = gameState.currentPiece;
    const pieceId = piece.dataset.piece;
    const targetEl = targets[pieceId];

    cleanupDragEvents();

    if (isOverTarget(piece, targetEl)) {
      // Bé thả đúng vị trí mục tiêu -> Lắp ghép thành công!
      installPiece(pieceId, piece, targetEl);
    } else {
      // Thả sai hoặc ra ngoài -> Nảy về khay xuất phát
      revertPiece(piece);
    }

    // Xóa hiệu ứng hover trên mục tiêu
    targetCurve.classList.remove('hover-near');
    targetHook.classList.remove('hover-near');
    snapIndicator.classList.remove('show');

    gameState.isDragging = false;
    gameState.currentPiece = null;
  }

  function onPointerCancel() {
    if (gameState.currentPiece) {
      revertPiece(gameState.currentPiece);
    }
    cleanupDragEvents();
    gameState.isDragging = false;
    gameState.currentPiece = null;
  }

  function cleanupDragEvents() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
  }

  /* ================= TÍNH TOÁN VÙNG MỤC TIÊU (SNAP) ================= */

  // Kiểm tra khi nét đang kéo lại gần mục tiêu
  function checkNearTarget(piece, currentX, currentY) {
    const pieceId = piece.dataset.piece;
    const targetEl = targets[pieceId];
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const pieceRect = piece.getBoundingClientRect();

    // Tính tâm của mảnh ghép và tâm của mục tiêu
    const pieceCenterX = pieceRect.left + pieceRect.width / 2;
    const pieceCenterY = pieceRect.top + pieceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const distance = Math.hypot(pieceCenterX - targetCenterX, pieceCenterY - targetCenterY);

    if (distance < gameState.snapThreshold) {
      targetEl.classList.add('hover-near');
      snapIndicator.classList.add('show');
    } else {
      targetEl.classList.remove('hover-near');
      snapIndicator.classList.remove('show');
    }
  }

  // Xác nhận xem mảnh ghép có đủ gần để khớp vào vị trí hay không
  function isOverTarget(piece, targetEl) {
    if (!targetEl) return false;

    const targetRect = targetEl.getBoundingClientRect();
    const pieceRect = piece.getBoundingClientRect();

    const pieceCenterX = pieceRect.left + pieceRect.width / 2;
    const pieceCenterY = pieceRect.top + pieceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const distance = Math.hypot(pieceCenterX - targetCenterX, pieceCenterY - targetCenterY);

    return distance < gameState.snapThreshold;
  }

  /* ================= LẮP NÉT THÀNH CÔNG ================= */

  function installPiece(pieceId, pieceEl, targetEl) {
    gameState.installedPieces.add(pieceId);

    // Đánh dấu mục tiêu trên SVG
    targetEl.classList.add('snapped');
    targetEl.classList.remove('hover-near');

    // Chuyển màu / hiển thị nét thực tế trên bảng
    if (pieceId === 'curve') {
      const outline = targetEl.querySelector('.target-outline');
      if (outline) {
        outline.style.display = 'block';
        outline.style.fill = 'url(#grad-curve)';
        outline.style.stroke = '#e11d48';
        outline.style.strokeWidth = '6';
        outline.style.strokeDasharray = 'none';
      }
    } else if (pieceId === 'hook') {
      const outline = targetEl.querySelector('.target-outline');
      if (outline) {
        outline.style.display = 'block';
        outline.style.stroke = 'url(#grad-hook)';
        outline.style.strokeWidth = '18';
        outline.style.strokeDasharray = 'none';
      }
    }

    // Đánh dấu card mảnh ghép ở dưới đã được lắp
    const cardEl = document.getElementById(`card-${pieceId}`);
    if (cardEl) {
      cardEl.classList.add('is-installed');
    }

    // Xóa vị trí fixed drag của element
    pieceEl.classList.remove('is-dragging');
    pieceEl.style.position = '';
    pieceEl.style.left = '';
    pieceEl.style.top = '';
    pieceEl.style.width = '';
    pieceEl.style.height = '';

    // Âm thanh snap thành công
    if (window.soundManager) {
      window.soundManager.playSnap();
      const pieceName = pieceId === 'curve' ? 'Đúng rồi! Nét cong kín!' : 'Chính xác! Nét móc xuôi!';
      setTimeout(() => {
        window.soundManager.speak(pieceName);
      }, 250);
    }

    updateProgress();
    checkVictory();
  }

  /* ================= THẢ SAI VỊ TRÍ (REVERT) ================= */

  function revertPiece(pieceEl) {
    if (window.soundManager) {
      window.soundManager.playWrong();
    }

    // Hiệu ứng trượt về khay
    pieceEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    const initialRect = gameState.initialCardRect;

    if (initialRect) {
      pieceEl.style.left = `${initialRect.left}px`;
      pieceEl.style.top = `${initialRect.top}px`;
    }

    setTimeout(() => {
      pieceEl.classList.remove('is-dragging');
      pieceEl.style.transition = '';
      pieceEl.style.position = '';
      pieceEl.style.left = '';
      pieceEl.style.top = '';
      pieceEl.style.width = '';
      pieceEl.style.height = '';
    }, 300);

    // Lời động viên
    progressStatus.textContent = 'Chưa đúng vị trí rồi, bé thử lại nhé! 💪';
    progressStatus.style.color = '#e11d48';
    setTimeout(() => {
      if (gameState.installedPieces.size === 0) {
        progressStatus.textContent = 'Bé hãy chọn 1 nét để kéo nhé! ⭐';
      } else if (gameState.installedPieces.size === 1) {
        progressStatus.textContent = 'Còn 1 nét nữa thôi, cố lên bé ơi! 🚀';
      }
      progressStatus.style.color = '#d97706';
    }, 2000);
  }

  /* ================= TIẾN ĐỘ & CHIẾN THẮNG ================= */

  function updateProgress() {
    const count = gameState.installedPieces.size;
    progressText.innerHTML = `Đã lắp: <b>${count} / 2</b> nét`;
    progressFill.style.width = `${(count / 2) * 100}%`;

    if (count === 1) {
      progressStatus.textContent = 'Xuất sắc! Còn 1 nét nữa thôi bé ơi! 🌟';
      progressStatus.style.color = '#0284c7';
    } else if (count === 2) {
      progressStatus.textContent = 'Hoàn thành 100%! Bé siêu thật đấy! 🏆';
      progressStatus.style.color = '#10b981';
    }
  }

  function checkVictory() {
    if (gameState.installedPieces.size === 2) {
      // Ẩn 2 nét riêng lẻ và hiện chữ "a" mực tím hoàn chỉnh liền mạch
      setTimeout(() => {
        targetCurve.style.display = 'none';
        targetHook.style.display = 'none';
        completedLetter.classList.remove('hidden');
        completedLetter.classList.add('celebrate');

        // Bắn pháo hoa confetti
        if (window.confettiEffect) {
          window.confettiEffect.fire(4500);
        }

        // Phát âm thanh chiến thắng
        if (window.soundManager) {
          window.soundManager.playVictory();
          setTimeout(() => {
            window.soundManager.speak('Hoan hô bé! Bé đã ghép thành công chữ a viết thường!');
          }, 600);
        }

        // Mở modal chúc mừng
        setTimeout(() => {
          victoryModal.classList.add('active');
          victoryModal.setAttribute('aria-hidden', 'false');
        }, 1200);
      }, 400);
    }
  }

  /* ================= RESET TRÒ CHƠI ================= */

  function resetGame() {
    gameState.installedPieces.clear();

    // Reset giao diện các mảnh ghép
    document.querySelectorAll('.piece-card').forEach(card => {
      card.classList.remove('is-installed');
    });

    pieces.forEach(piece => {
      piece.classList.remove('is-dragging');
      piece.style.cssText = '';
    });

    // Reset mục tiêu
    targetCurve.style.display = '';
    targetCurve.classList.remove('snapped', 'hover-near');
    const outlineCurve = targetCurve.querySelector('.target-outline');
    if (outlineCurve) outlineCurve.style.cssText = '';

    targetHook.style.display = '';
    targetHook.classList.remove('snapped', 'hover-near');
    const outlineHook = targetHook.querySelector('.target-outline');
    if (outlineHook) outlineHook.style.cssText = '';

    // Reset chữ hoàn thiện
    completedLetter.classList.add('hidden');
    completedLetter.classList.remove('celebrate');

    // Đóng modal chiến thắng
    victoryModal.classList.remove('active');
    victoryModal.setAttribute('aria-hidden', 'true');

    // Dọn dẹp confetti nếu đang bay
    if (window.confettiEffect) {
      window.confettiEffect.clear();
    }

    // Reset thanh tiến độ
    updateProgress();
    progressStatus.textContent = 'Bé hãy chọn 1 nét để kéo nhé! ⭐';
    progressStatus.style.color = '#d97706';

    if (window.soundManager) {
      window.soundManager.speak('Bắt đầu chơi nào!');
    }
  }

  /* ================= CÁC NÚT TƯƠNG TÁC PHỤ TRỢ ================= */

  // Nút Chơi lại
  btnReset.addEventListener('click', resetGame);
  btnVictoryReplay.addEventListener('click', resetGame);

  // Nút Bật / Tắt âm thanh
  btnSound.addEventListener('click', () => {
    if (window.soundManager) {
      const isMuted = window.soundManager.toggleMute();
      btnSound.querySelector('.icon').textContent = isMuted ? '🔇' : '🔊';
      btnSound.title = isMuted ? 'Bật âm thanh' : 'Tắt âm thanh';
    }
  });

  // Nút Bật / Tắt bóng mờ gợi ý
  btnHint.addEventListener('click', () => {
    gameState.showHints = !gameState.showHints;
    document.body.classList.toggle('hide-hints', !gameState.showHints);
    btnHint.classList.toggle('active', gameState.showHints);
    btnHint.title = gameState.showHints ? 'Đang bật gợi ý' : 'Đang tắt gợi ý';

    if (window.soundManager) {
      window.soundManager.speak(gameState.showHints ? 'Đã bật bóng mờ gợi ý' : 'Đã tắt gợi ý');
    }
  });

  // Nút Nghe phát âm chữ "a" ở Header
  btnPronounceNav.addEventListener('click', () => {
    if (window.soundManager) {
      window.soundManager.initAudio();
      window.soundManager.speak('Chữ a');
    }
  });

  // Nút Nghe phát âm ở Modal chiến thắng
  btnVictoryAudio.addEventListener('click', () => {
    if (window.soundManager) {
      window.soundManager.speak('Chữ a. Nét cong kín và nét móc xuôi tạo thành chữ a.');
    }
  });

  // Nút loa đọc tên từng mảnh nét
  readPieceBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const textToRead = btn.dataset.speech || 'Nét chữ';
      if (window.soundManager) {
        window.soundManager.initAudio();
        window.soundManager.speak(textToRead);
      }
    });
  });

});
