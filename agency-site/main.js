document.documentElement.classList.add('js');
document.getElementById('yr').textContent = new Date().getFullYear();

const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
  toggle.textContent = open ? 'Close' : 'Menu';
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = 'Menu';
}));

if ('IntersectionObserver' in window) {
  const els = document.querySelectorAll('.h2, .sub, .card, .case, .steps li, .plan, .guide, .report, .pp__row, details');
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => { el.classList.add('rv'); io.observe(el); });
}

const form = document.getElementById('form');
const status = form.querySelector('.form__status');
form.addEventListener('submit', ev => {
  ev.preventDefault();
  const d = new FormData(form);
  const name = (d.get('name') || '').trim();
  const email = (d.get('email') || '').trim();
  const at = email.indexOf('@');
  if (!name || at < 1 || email.lastIndexOf('.') < at + 2 || email.includes(' ')) {
    status.textContent = 'Please add your name and a valid work email.';
    (name ? form.email : form.name).focus();
    return;
  }
  const nl = String.fromCharCode(10);
  const body = [
    'Name: ' + name,
    'Email: ' + email,
    'Website: ' + (d.get('site') || '-'),
    'Budget: ' + d.get('budget'),
    '',
    d.get('msg') || ''
  ].join(nl);
  location.href = 'mailto:mwensh308@gmail.com?subject=' + encodeURIComponent('Growth audit request: ' + name) + '&body=' + encodeURIComponent(body);
  status.textContent = 'Opening your email app to send the request.';
});
