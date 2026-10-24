/**
 * Google Play Store - Sara 777
 * Client-side Interactivity & UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Install & Download Simulation
  const installBtn = document.getElementById('installBtn');
  const installText = document.getElementById('installText');
  let installState = 'idle'; // 'idle', 'downloading', 'installed'

  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (installState === 'idle') {
        installState = 'downloading';
        installBtn.classList.add('installing');
        installText.innerHTML = `
          <svg class="gp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path>
          </svg>
          <span>Downloading 0%</span>
        `;
        showToast('Download started for Sara 777 APK...');

        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.floor(Math.random() * 20) + 15;
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            installState = 'installed';
            installBtn.classList.remove('installing');
            installBtn.classList.add('installed');
            installText.textContent = 'Open';
            showToast('✓ Sara 777 installed successfully!');

            // Trigger real APK download
            const apkLink = document.createElement('a');
            apkLink.href = '/public/apk/app-release.apk';
            apkLink.download = 'sara-777.apk';
            document.body.appendChild(apkLink);
            apkLink.click();
            document.body.removeChild(apkLink);
          } else {
            installText.innerHTML = `
              <svg class="gp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path>
              </svg>
              <span>Downloading ${progress}%</span>
            `;
          }
        }, 350);
      } else if (installState === 'installed') {
        showToast('Opening Sara 777 App...');
        window.open('/', '_blank');
      }
    });
  }

  // 2. Wishlist Toggle
  const wishlistBtn = document.getElementById('wishlistBtn');
  let isWishlisted = false;
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => {
      isWishlisted = !isWishlisted;
      if (isWishlisted) {
        wishlistBtn.classList.add('wishlisted');
        wishlistBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span>Added to wishlist</span>
        `;
        showToast('Added to your Google Play wishlist');
      } else {
        wishlistBtn.classList.remove('wishlisted');
        wishlistBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="9" x2="12" y2="15"/>
            <line x1="9" y1="12" x2="15" y2="12"/>
          </svg>
          <span>Add to wishlist</span>
        `;
        showToast('Removed from your wishlist');
      }
    });
  }

  // 3. Share Button & Modal
  const shareBtn = document.getElementById('shareBtn');
  const shareModal = document.getElementById('shareModal');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const copyShareBtn = document.getElementById('copyShareBtn');

  if (shareBtn && shareModal) {
    shareBtn.addEventListener('click', () => {
      shareModal.classList.add('open');
    });
  }

  if (copyShareBtn && shareUrlInput) {
    copyShareBtn.addEventListener('click', () => {
      shareUrlInput.select();
      navigator.clipboard.writeText(shareUrlInput.value);
      copyShareBtn.textContent = 'Copied!';
      showToast('Link copied to clipboard');
      setTimeout(() => { copyShareBtn.textContent = 'Copy'; }, 2000);
    });
  }

  // 4. Screenshots Carousel Navigation
  const scrollContainer = document.getElementById('screenshotsScroll');
  const prevBtn = document.getElementById('prevScreenshots');
  const nextBtn = document.getElementById('nextScreenshots');

  if (scrollContainer) {
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: -260, behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: 260, behavior: 'smooth' });
      });
    }

    // Toggle arrow visibility on scroll
    const updateArrows = () => {
      if (prevBtn) prevBtn.style.opacity = scrollContainer.scrollLeft > 20 ? '1' : '0';
      if (nextBtn) {
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth - 20;
        nextBtn.style.opacity = scrollContainer.scrollLeft < maxScroll ? '1' : '0';
      }
    };
    scrollContainer.addEventListener('scroll', updateArrows);
    updateArrows();
  }

  // 5. Screenshots Lightbox
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxContainer = document.getElementById('lightboxContainer');
  const screenshotItems = document.querySelectorAll('.gp-screenshot-item');

  screenshotItems.forEach(item => {
    item.addEventListener('click', () => {
      if (lightboxModal && lightboxContainer) {
        lightboxContainer.innerHTML = item.innerHTML;
        lightboxModal.classList.add('open');
      }
    });
  });

  // 6. Review Helpful Buttons (Yes / No)
  const helpfulBtns = document.querySelectorAll('.gp-helpful-btn');
  helpfulBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parentRow = btn.closest('.gp-review-helpful-row');
      const countSpan = parentRow.querySelector('.helpful-count');

      if (btn.classList.contains('voted')) return;

      parentRow.querySelectorAll('.gp-helpful-btn').forEach(b => b.classList.remove('voted'));
      btn.classList.add('voted');

      if (btn.dataset.type === 'yes' && countSpan) {
        const currentCount = parseInt(countSpan.textContent) || 0;
        countSpan.textContent = `${currentCount + 1} people found this review helpful`;
      }
      showToast('Thank you for your feedback');
    });
  });

  // 7. App Support Accordion
  const accordionTrigger = document.getElementById('accordionTrigger');
  const accordionContent = document.getElementById('accordionContent');
  const accordionArrow = document.getElementById('accordionArrow');

  if (accordionTrigger && accordionContent) {
    accordionTrigger.addEventListener('click', () => {
      const isOpen = accordionContent.classList.contains('open');
      if (isOpen) {
        accordionContent.classList.remove('open');
        if (accordionArrow) accordionArrow.style.transform = 'rotate(0deg)';
      } else {
        accordionContent.classList.add('open');
        if (accordionArrow) accordionArrow.style.transform = 'rotate(180deg)';
      }
    });
  }

  // 8. Device Chips Switcher
  const chips = document.querySelectorAll('.gp-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      showToast(`Showing reviews for ${chip.textContent.trim()}`);
    });
  });

  // 9. Generic Modal Closers
  const modalOverlays = document.querySelectorAll('.gp-modal-overlay');
  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.gp-modal-close')) {
        overlay.classList.remove('open');
      }
    });
  });

  // 10. Floating Toast Helper
  const toastEl = document.getElementById('gpToast');
  let toastTimeout;
  window.showToast = function (message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  };

  // Add keyframe for spinner
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `;
  document.head.appendChild(styleTag);
});
