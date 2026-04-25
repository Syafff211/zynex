// ============ INIT LUCIDE ICONS ============
lucide.createIcons();

// ============ FOOTER YEAR ============
document.getElementById('footerYear').textContent = new Date().getFullYear();

// ============ PARTICLE BACKGROUND ============
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
const PARTICLE_COUNT = 80;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6, 182, 212, ${this.opacity})`;
    ctx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

function connectParticles() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.05 * (1 - dist / 150)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  connectParticles();
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ============ SCROLL ANIMATIONS (Re-trigger on scroll up/down) ============
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('anim-visible');
    } else {
      // Remove class to re-trigger animation when scrolling back up/down
      entry.target.classList.remove('anim-visible'); 
    }
  });
}, observerOptions);

document.querySelectorAll('.anim-fade-up, .anim-fade-in, .anim-zoom-in').forEach(el => {
  observer.observe(el);
});

// ============ NAVBAR SCROLL ============
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('nav-solid');
  } else {
    navbar.classList.remove('nav-solid');
  }
});

// ============ DARK / LIGHT MODE ============
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function setTheme(light) {
  if (light) {
    html.classList.add('light');
    html.classList.remove('dark');
    document.body.style.background = '#f8faff';
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    document.body.style.background = '#0a0a1a';
  }
  updateInputs();
}

themeToggle.addEventListener('click', () => {
  const isLight = html.classList.contains('light');
  setTheme(!isLight);
});

// ============ MOBILE MENU ============
const burgerBtn = document.getElementById('burgerBtn');
const closeMobile = document.getElementById('closeMobile');
const mobileMenu = document.getElementById('mobileMenu');

burgerBtn.addEventListener('click', () => mobileMenu.classList.add('open'));
closeMobile.addEventListener('click', () => mobileMenu.classList.remove('open'));
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ============ PORTFOLIO FILTER ============
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => { b.classList.remove('active'); b.classList.add('text-neutral-400'); });
    btn.classList.add('active');
    btn.classList.remove('text-neutral-400');

    const filter = btn.dataset.filter;
    portfolioItems.forEach(item => {
      if (filter === 'all' || item.dataset.category === filter) {
        item.style.display = '';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        setTimeout(() => {
          item.style.transition = 'all 0.4s';
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        }, 50);
      } else {
        item.style.transition = 'all 0.3s';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        setTimeout(() => { item.style.display = 'none'; }, 300);
      }
    });
  });
});

// ============ CONTACT FORM (Save to LocalStorage) ============
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Get form values
  const name = contactForm.querySelector('input[type="text"]').value;
  const projectType = contactForm.querySelector('select').value;
  const message = contactForm.querySelector('textarea').value;

  // Create message object
  const newMessage = {
    id: Date.now(),
    name: name,
    type: projectType,
    message: message,
    date: new Date().toLocaleString()
  };

  // Get existing messages from LocalStorage or create empty array
  let messages = JSON.parse(localStorage.getItem('zynex_messages')) || [];
  
  // Add new message and save back to LocalStorage
  messages.push(newMessage);
  localStorage.setItem('zynex_messages', JSON.stringify(messages));

  // Show success state
  formSuccess.classList.remove('hidden');
  contactForm.reset();
  setTimeout(() => formSuccess.classList.add('hidden'), 5000);
});

// ============ SMOOTH SCROLL FOR NAV LINKS ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============ LIGHT MODE INPUT STYLING ============
function updateInputs() {
  const isLight = html.classList.contains('light');
  document.querySelectorAll('.custom-input').forEach(el => {
    if (isLight) {
      el.style.background = 'rgba(255,255,255,0.8)';
      el.style.borderColor = 'rgba(0,0,0,0.1)';
      el.style.color = '#1a1a2e';
    } else {
      el.style.background = 'rgba(255,255,255,0.03)';
      el.style.borderColor = 'rgba(255,255,255,0.1)';
      el.style.color = '#ffffff';
    }
  });
}

updateInputs();