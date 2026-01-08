document.addEventListener('DOMContentLoaded', () => {
  // Active menu
  const here = location.pathname.toLowerCase();
  document.querySelectorAll('.nav .nav-item').forEach(a => {
    const href = a.getAttribute('href').toLowerCase();
    if (href === here || (href !== '/' && here.startsWith(href))) a.classList.add('active');
  });
  // Mobile nav
  const btn = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  btn?.addEventListener('click', ()=> nav.classList.toggle('open'));
  // Theme toggle
  const key='bk_theme'; const root=document.documentElement; const btnTheme=document.querySelector('.mode-toggle');
  const saved=localStorage.getItem(key); if (saved) root.setAttribute('data-theme', saved);
  btnTheme?.addEventListener('click', ()=>{ const c=root.getAttribute('data-theme')==='dark'?'light':'dark'; root.setAttribute('data-theme',c); localStorage.setItem(key,c); });
});
