const openButton = document.getElementById('open-guide-button');
const closeButton = document.getElementById('close-guide-button');
const overlay = document.getElementById('modal-overlay');

openButton.addEventListener('click', () => {
  overlay.classList.remove('hidden');
});

closeButton.addEventListener('click', () => {
  overlay.classList.add('hidden');
});
