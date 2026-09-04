// Small helpers for the .modal overlays. A modal is open when it lacks .hidden.

const closeHandlers = new WeakMap();

export function openModal(el) {
    el.classList.remove('hidden');
}

export function closeModal(el) {
    if (el.classList.contains('hidden')) return;
    el.classList.add('hidden');
    closeHandlers.get(el)?.();
}

export function isModalOpen() {
    return document.querySelector('.modal:not(.hidden)') !== null;
}

// Wire up close buttons ([data-close]) and clicks on the backdrop.
export function setupModal(el, onClose) {
    if (onClose) closeHandlers.set(el, onClose);
    el.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(el)));
    el.addEventListener('click', (e) => {
        if (e.target === el) closeModal(el);
    });
}

// Escape closes whatever is open, except modals marked data-static.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal:not(.hidden):not([data-static])').forEach(closeModal);
});
