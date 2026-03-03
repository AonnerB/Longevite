(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Mobile menu ----------
  const btnMenu = $('#btnMenu');
  const drawer = $('#mobileDrawer');
  if (btnMenu && drawer) {
    const toggle = () => {
      const isHidden = drawer.hasAttribute('hidden');
      if (isHidden) drawer.removeAttribute('hidden');
      else drawer.setAttribute('hidden', '');
      btnMenu.setAttribute('aria-expanded', String(isHidden));
    };
    btnMenu.addEventListener('click', toggle);
    $$('#mobileDrawer a').forEach(a => a.addEventListener('click', () => drawer.setAttribute('hidden', '')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') drawer.setAttribute('hidden', '');
    });
  }

  // ---------- Scroll progress + back to top ----------
  const progress = $('.scroll-progress');
  const toTop = $('#toTop');
  const waFloat = $('.wa-float');

  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const ratio = max > 0 ? scrolled / max : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (toTop) {
      const show = scrolled > 800;
      if (show) toTop.classList.add('show');
      else toTop.classList.remove('show');

      // WhatsApp “inteligente”: sobe quando o botão de topo aparece (evita sobreposição)
      if (waFloat) {
        document.documentElement.style.setProperty('--float-stack', show ? '64px' : '0px');
      }
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ---------- Hero carousel (auto) ----------
  // FIX: selector helper is $$ (querySelectorAll). A typo here was breaking all JS on the page
  // and consequently hiding the rest of the content (reveal animations never ran).
  const heroSlides = $$('.hero .hero-carousel .hero-bg');
  if (heroSlides.length > 1) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idx = heroSlides.findIndex(el => el.classList.contains('is-active'));
    if (idx < 0) idx = 0;

    const setActive = (next) => {
      heroSlides.forEach((el, i) => el.classList.toggle('is-active', i === next));
      idx = next;
    };

    if (!reduce) {
      setInterval(() => {
        const next = (idx + 1) % heroSlides.length;
        setActive(next);
      }, 5200);
    } else {
      // Sem animação: garante primeira imagem
      setActive(0);
    }
  }

  // ---------- Reveal on scroll ----------
  const reveals = $$('.reveal, .stagger');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.14 });

  reveals.forEach(el => io.observe(el));

  // ---------- Count up stats ----------
  const countEls = $$('[data-count]');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      const end = Number(target.getAttribute('data-count') || 0);
      const suffix = target.getAttribute('data-suffix') || '';
      const prefix = target.getAttribute('data-prefix') || '';
      const duration = 900;
      const start = performance.now();

      const tick = (t) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(end * eased);
        target.textContent = `${prefix}${val}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(target);
    });
  }, { threshold: 0.35 });

  countEls.forEach(el => countIO.observe(el));

  // ---------- Accordion ----------
  $$('.acc').forEach((acc) => {
    const btn = $('button', acc);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = acc.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // ---------- Modal (Agendamento) ----------
  const modal = $('#modalAgendar');
  const openers = $$('[data-open="modal-agendar"]');
  const closer = $('#closeModal');

  const openModal = () => {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const first = $('#nome', modal);
    if (first) setTimeout(() => first.focus(), 50);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  openers.forEach(b => b.addEventListener('click', openModal));
  if (closer) closer.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ---------- Appointment form ----------
  const form = $('#formAgendar');
  const msgBox = $('#agendamentoMsg');
  const copyBtn = $('#copyAgendamento');
  const waBtn = $('#openWhatsApp');

  const setMsg = (text) => {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.style.display = 'block';
  };

  const buildMessage = (data) => {
    return [
      'Olá! Gostaria de agendar uma avaliação na LONGEVITÉ.',
      '',
      `Nome: ${data.nome}`,
      `Telefone/WhatsApp: ${data.telefone}`,
      `E-mail: ${data.email}`,
      `Preferência: ${data.preferencia}`,
      `Serviço: ${data.servico}`,
      data.mensagem ? `Observações: ${data.mensagem}` : null,
    ].filter(Boolean).join('\n');
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        nome: $('#nome')?.value?.trim() || '',
        telefone: $('#telefone')?.value?.trim() || '',
        email: $('#email')?.value?.trim() || '',
        preferencia: $('#preferencia')?.value || '',
        servico: $('#servico')?.value || '',
        mensagem: $('#mensagem')?.value?.trim() || '',
      };

      if (!data.nome || !data.telefone) {
        setMsg('Preencha ao menos Nome e Telefone/WhatsApp.');
        return;
      }

      const message = buildMessage(data);
      setMsg(message);

      // Persist to localStorage as lead
      try {
        const leads = JSON.parse(localStorage.getItem('longevite_leads') || '[]');
        leads.unshift({ ...data, createdAt: new Date().toISOString() });
        localStorage.setItem('longevite_leads', JSON.stringify(leads.slice(0, 60)));
      } catch {}

      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.textContent = 'Copiar mensagem';
      }
      if (waBtn) {
        waBtn.disabled = false;
        waBtn.dataset.msg = message;
      }

      form.reset();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = msgBox?.textContent || '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copiado ✓';
        setTimeout(() => (copyBtn.textContent = 'Copiar mensagem'), 1400);
      } catch {
        copyBtn.textContent = 'Falhou :(';
        setTimeout(() => (copyBtn.textContent = 'Copiar mensagem'), 1400);
      }
    });
  }

  // ---------- Copy palette swatches ----------
  $$('.swatch [data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const hex = btn.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(hex);
        const old = btn.textContent;
        btn.textContent = 'Copiado ✓';
        setTimeout(() => (btn.textContent = old), 1200);
      } catch {
        btn.textContent = 'Erro';
        setTimeout(() => (btn.textContent = 'Copiar'), 1200);
      }
    });
  });

  // ---------- Footer year ----------
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // ---------- WhatsApp phone (global) ----------
  const WA_PHONE = document.body?.dataset?.waPhone || '5500000000000';

  // Patch modal WhatsApp opener to use WA_PHONE
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const msg = waBtn.dataset.msg || msgBox?.textContent || '';
      if (!msg) return;
      const encoded = encodeURIComponent(msg);
      window.open(`https://wa.me/${WA_PHONE}?text=${encoded}`, '_blank', 'noopener');
    }, { once: true });
  }

  // ---------- Carousel ----------
  const track = $('#carouselTrack');
  const prev = $('#carouselPrev');
  const next = $('#carouselNext');
  const dotsWrap = $('#carouselDots');

  if (track && dotsWrap) {
    const slides = $$('.carousel-slide', track);
    let i = 0;
    const go = (idx) => {
      i = (idx + slides.length) % slides.length;
      track.style.transform = `translateX(${-i * 100}%)`;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      $$('.carousel-dot', dotsWrap).forEach((d, k) => d.classList.toggle('is-active', k === i));
    };

    // build dots
    dotsWrap.innerHTML = '';
    slides.forEach((_, k) => {
      const b = document.createElement('button');
      b.className = 'carousel-dot' + (k === 0 ? ' is-active' : '');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir para o slide ${k + 1}`);
      b.addEventListener('click', () => go(k));
      dotsWrap.appendChild(b);
    });

    const onPrev = () => go(i - 1);
    const onNext = () => go(i + 1);

    if (prev) prev.addEventListener('click', onPrev);
    if (next) next.addEventListener('click', onNext);

    // autoplay + pause on hover
    let timer = null;
    const start = () => {
      stop();
      timer = setInterval(() => go(i + 1), 5200);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const carousel = track.closest('.carousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', stop);
      carousel.addEventListener('mouseleave', start);
      carousel.addEventListener('focusin', stop);
      carousel.addEventListener('focusout', start);
    }

    // swipe (mobile)
    let startX = 0;
    let dx = 0;
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      dx = 0;
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
      dx = e.touches[0].clientX - startX;
    }, { passive: true });
    track.addEventListener('touchend', () => {
      if (Math.abs(dx) > 42) {
        if (dx > 0) onPrev();
        else onNext();
      }
    });
  }

})();
