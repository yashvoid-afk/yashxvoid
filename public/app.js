const roomRates = { haveli: 14500, maharani: 22000, sheesh: 31500 };
const roomNames = { haveli: 'The Haveli Room', maharani: 'The Maharani Suite', sheesh: 'The Sheesh Mahal' };
const roomSelect = document.querySelector('#roomSelect');
const checkIn = document.querySelector('#checkIn');
const checkOut = document.querySelector('#checkOut');
const guestCount = document.querySelector('#guestCount');
const totalPrice = document.querySelector('#totalPrice');
const nightCount = document.querySelector('#nightCount');
const bookingForm = document.querySelector('#bookingForm');
const formMessage = document.querySelector('#formMessage');
const roomTrack = document.querySelector('#roomTrack');

const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(amount);

const today = new Date();
const localDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
checkIn.min = localDate(today);
checkOut.min = localDate(new Date(today.getTime() + 86400000));

function updateTotal() {
  const arrival = checkIn.value ? new Date(`${checkIn.value}T00:00:00`) : null;
  const departure = checkOut.value ? new Date(`${checkOut.value}T00:00:00`) : null;
  const nights = arrival && departure ? Math.round((departure - arrival) / 86400000) : 0;
  const rate = roomRates[roomSelect.value] || roomRates.haveli;
  totalPrice.textContent = formatINR(rate * Math.max(0, nights || 1));
  nightCount.textContent = nights > 0 ? `${nights} ${nights === 1 ? 'night' : 'nights'} · ${guestCount.value} ${guestCount.value === '1' ? 'guest' : 'guests'}` : 'Choose your dates';
}

checkIn.addEventListener('change', () => {
  const minimumDeparture = checkIn.value ? new Date(`${checkIn.value}T00:00:00`) : new Date();
  minimumDeparture.setDate(minimumDeparture.getDate() + 1);
  checkOut.min = localDate(minimumDeparture);
  if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = '';
  updateTotal();
});
checkOut.addEventListener('change', updateTotal);
roomSelect.addEventListener('change', updateTotal);
guestCount.addEventListener('change', updateTotal);

document.querySelectorAll('.choose-room').forEach((button) => {
  button.addEventListener('click', () => {
    roomSelect.value = button.dataset.room;
    updateTotal();
    document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
  });
});

document.querySelector('.carousel-arrow.prev').addEventListener('click', () => {
  roomTrack.scrollBy({ left: -roomTrack.querySelector('.room-card').getBoundingClientRect().width - 22, behavior: 'smooth' });
});
document.querySelector('.carousel-arrow.next').addEventListener('click', () => {
  roomTrack.scrollBy({ left: roomTrack.querySelector('.room-card').getBoundingClientRect().width + 22, behavior: 'smooth' });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
}, { threshold: 0.13 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const navToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navToggle.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  nav.classList.toggle('open', !expanded);
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation');
}));

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';
  formMessage.classList.remove('error');
  if (!checkIn.value || !checkOut.value || checkOut.value <= checkIn.value) {
    formMessage.textContent = 'Please choose a valid check-in and check-out date.';
    formMessage.classList.add('error');
    return;
  }
  const submitButton = bookingForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'SENDING YOUR REQUEST…';
  const data = Object.fromEntries(new FormData(bookingForm).entries());
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Please try again.');
    formMessage.textContent = `Thank you, ${data.name.trim()} — your request ${result.bookingId ? `(#${result.bookingId}) ` : ''}is with our Jaipur team. We’ll be in touch soon.`;
    bookingForm.reset();
    checkIn.min = localDate(new Date());
    checkOut.min = localDate(new Date(Date.now() + 86400000));
    roomSelect.value = 'haveli';
    guestCount.value = '2';
    updateTotal();
  } catch (error) {
    formMessage.textContent = error.message || 'We could not send your request. Please try again.';
    formMessage.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'REQUEST YOUR STAY <span>↗</span>';
  }
});

updateTotal();
