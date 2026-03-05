// main.js - site-wide JavaScript (video modal for homepage and any future behavior)

const THEME_STORAGE_KEY = 'site-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeToggleLabel(button, theme) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const icon = nextTheme === 'light' ? '☀️' : '🌙';
    const label = nextTheme === 'light' ? 'Change to light mode' : 'Change to dark mode';
    button.textContent = icon;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
}

function initThemeToggle() {
    const themeToggleButton = document.getElementById('themeToggle');
    if (!themeToggleButton) {
        return;
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark';
    applyTheme(initialTheme);
    updateThemeToggleLabel(themeToggleButton, initialTheme);

    themeToggleButton.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        updateThemeToggleLabel(themeToggleButton, nextTheme);
    });
}

function initHeaderMenu() {
    const header = document.querySelector('.header');
    const menuToggleButton = document.querySelector('.header__menu-toggle');
    const navWrapper = document.querySelector('.header__nav-wrapper');

    if (!header || !menuToggleButton || !navWrapper) {
        return;
    }

    const menuBackdrop = document.createElement('div');
    menuBackdrop.className = 'menu-backdrop';
    document.body.appendChild(menuBackdrop);

    const closeMenu = () => {
        header.classList.remove('header--menu-open');
        menuBackdrop.classList.remove('menu-backdrop--visible');
        menuToggleButton.setAttribute('aria-expanded', 'false');
        menuToggleButton.textContent = '☰';
    };

    const openMenu = () => {
        header.classList.add('header--menu-open');
        menuBackdrop.classList.add('menu-backdrop--visible');
        menuToggleButton.setAttribute('aria-expanded', 'true');
        menuToggleButton.textContent = '✕';
    };

    closeMenu();

    menuToggleButton.addEventListener('click', () => {
        const isOpen = header.classList.contains('header--menu-open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    navWrapper.addEventListener('click', event => {
        const clickedLink = event.target.closest('.header__nav-link');
        if (clickedLink) {
            closeMenu();
        }
    });

    menuBackdrop.addEventListener('click', () => {
        closeMenu();
    });

    document.addEventListener('click', event => {
        const isOpen = header.classList.contains('header--menu-open');
        if (!isOpen) {
            return;
        }

        const clickedInsideMenu = event.target.closest('.header__nav-wrapper');
        const clickedToggle = event.target.closest('.header__menu-toggle');
        if (!clickedInsideMenu && !clickedToggle) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });
}

function initHeaderScrollState() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }

    const updateHeaderState = () => {
        if (window.scrollY > 24) {
            header.classList.add('header--scrolled');
        } else {
            header.classList.remove('header--scrolled');
        }
    };

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
}

function initContactEmailForm() {
    const form = document.getElementById('contactEmailForm');
    const sendButton = document.getElementById('contactSendBtn');
    const statusElement = document.getElementById('contactFormStatus');

    if (!form || !sendButton || !statusElement) {
        return;
    }

    const targetEmail = 'mooresexteriors@gmail.com';
    sendButton.disabled = false;
    statusElement.textContent = '';

    form.addEventListener('submit', event => {
        event.preventDefault();

        const nameInput = document.getElementById('contactName');
        const subjectInput = document.getElementById('contactSubject');
        const messageInput = document.getElementById('contactMessage');

        const name = nameInput ? nameInput.value.trim() : '';
        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!name || !subject || !message) {
            statusElement.textContent = 'Please complete all fields.';
            return;
        }

        sendButton.disabled = true;
        statusElement.textContent = 'Opening email draft...';

        const composedMessage = [
            `Name: ${name}`,
            '',
            message
        ].join('\n');

        const mailtoLink = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composedMessage)}`;
        window.location.href = mailtoLink;

        statusElement.textContent = 'Email draft opened. Press Send in your email app to deliver your message.';
        sendButton.disabled = false;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initHeaderScrollState();
    initHeaderMenu();
    initThemeToggle();
    initContactEmailForm();

    const videoSection = document.getElementById('videoSection');
    if (videoSection) {
        videoSection.addEventListener('click', () => {
            openVideoModal();
        });
    }
});

function openVideoModal() {
    const activeVideo = document.getElementById('mainVideo');
    const activeVideoSrc = activeVideo && activeVideo.src
        ? activeVideo.src
        : 'https://www.youtube.com/embed/HvuPNqTCrh0?autoplay=1&mute=1&loop=1&playlist=HvuPNqTCrh0&controls=0&rel=0&vq=hd720&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&fs=0';

    // create modal container
    const modal = document.createElement('div');
    modal.className = 'video-modal';

    // create inner wrapper to hold video and close button
    const inner = document.createElement('div');
    inner.className = 'video-modal__inner';

    // close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'video-modal__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    inner.appendChild(closeBtn);

    const video = document.createElement('iframe');
    video.src = activeVideoSrc;
    video.title = 'Moores Waterproofing project video';
    video.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    video.referrerPolicy = 'strict-origin-when-cross-origin';
    video.allowFullscreen = true;

    inner.appendChild(video);
    modal.appendChild(inner);

    // clicking outside inner closes modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // ESC key closes modal
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(modal);
}

// FAQ toggle functionality
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            
            if (answer.style.maxHeight) {
                answer.style.maxHeight = null;
            } else {
                document.querySelectorAll('.faq-answer').forEach(item => {
                    item.style.maxHeight = null;
                });
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
});

window.addEventListener('DOMContentLoaded', () => {
    const serviceItems = document.querySelectorAll('.services__item');
    const servicesList = document.querySelector('.services__list');

    if (!serviceItems.length) {
        return;
    }

    function closeServiceItem(item) {
        const details = item.querySelector('.services__details');
        const toggle = item.querySelector('.services__toggle');
        if (!details || !toggle) {
            return;
        }

        details.style.maxHeight = null;
        toggle.textContent = 'Read more';
        toggle.setAttribute('aria-expanded', 'false');
        item.classList.remove('services__item--open');
    }

    function openServiceItem(item) {
        const details = item.querySelector('.services__details');
        const toggle = item.querySelector('.services__toggle');
        if (!details || !toggle) {
            return;
        }

        details.style.maxHeight = details.scrollHeight + 'px';
        toggle.textContent = 'Show less';
        toggle.setAttribute('aria-expanded', 'true');
        item.classList.add('services__item--open');

        if (servicesList) {
            servicesList.classList.add('services__list--has-open');
        }

        requestAnimationFrame(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function closeAllServiceItems() {
        serviceItems.forEach(item => {
            closeServiceItem(item);
        });

        if (servicesList) {
            servicesList.classList.remove('services__list--has-open');
        }
    }

    serviceItems.forEach(item => {
        const toggle = item.querySelector('.services__toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
        }

        closeServiceItem(item);

        item.addEventListener('click', event => {
            const clickedButton = event.target.closest('.services__toggle');
            const toggle = item.querySelector('.services__toggle');
            const isOpen = toggle && toggle.getAttribute('aria-expanded') === 'true';

            closeAllServiceItems();

            if (isOpen) {
                closeServiceItem(item);
            } else {
                openServiceItem(item);
            }

            if (clickedButton) {
                clickedButton.blur();
            }
        });
    });
});
