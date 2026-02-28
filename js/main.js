// main.js - site-wide JavaScript (video modal for homepage and any future behavior)

const THEME_STORAGE_KEY = 'site-theme';
const GALLERY_STORAGE_KEY = 'gallery-posts';
const GALLERY_MAX_FILE_SIZE = 12 * 1024 * 1024;

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeToggleLabel(button, theme) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const icon = nextTheme === 'light' ? '☀️' : '🌙';
    const label = nextTheme === 'light' ? 'Switch to light mode' : 'Switch to dark mode';
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

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read selected file.'));
        reader.readAsDataURL(file);
    });
}

function getGalleryPosts() {
    try {
        const rawValue = localStorage.getItem(GALLERY_STORAGE_KEY);
        if (!rawValue) {
            return [];
        }

        const parsedValue = JSON.parse(rawValue);
        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
        return [];
    }
}

function saveGalleryPosts(posts) {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(posts));
}

function extractYouTubeId(urlValue) {
    if (!urlValue) {
        return null;
    }

    try {
        const parsedUrl = new URL(urlValue);
        const host = parsedUrl.hostname.replace('www.', '');

        if (host === 'youtu.be') {
            return parsedUrl.pathname.slice(1) || null;
        }

        if (host.includes('youtube.com')) {
            const videoIdFromQuery = parsedUrl.searchParams.get('v');
            if (videoIdFromQuery) {
                return videoIdFromQuery;
            }

            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            const embedIndex = pathParts.findIndex(part => part === 'embed' || part === 'shorts');
            if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
                return pathParts[embedIndex + 1];
            }
        }
    } catch {
        return null;
    }

    return null;
}

function buildYouTubeEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
}

function openGalleryLightbox(imageSrc, imageAlt) {
    const existingLightbox = document.querySelector('.gallery-lightbox');
    if (existingLightbox) {
        existingLightbox.remove();
    }

    const lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox';

    const inner = document.createElement('div');
    inner.className = 'gallery-lightbox__inner';

    const closeButton = document.createElement('button');
    closeButton.className = 'gallery-lightbox__close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close image');
    closeButton.textContent = '×';

    const image = document.createElement('img');
    image.className = 'gallery-lightbox__image';
    image.src = imageSrc;
    image.alt = imageAlt || 'Gallery image';

    const closeLightbox = () => {
        lightbox.remove();
        document.removeEventListener('keydown', escHandler);
    };

    closeButton.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', event => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    const escHandler = event => {
        if (event.key === 'Escape') {
            closeLightbox();
        }
    };

    document.addEventListener('keydown', escHandler);

    inner.appendChild(closeButton);
    inner.appendChild(image);
    lightbox.appendChild(inner);
    document.body.appendChild(lightbox);
}

function renderGalleryPosts(posts, feedElement, emptyStateElement, onRemovePost) {
    if (!feedElement) {
        return;
    }

    const existingPosts = feedElement.querySelectorAll('.gallery-post');
    existingPosts.forEach(post => post.remove());

    if (!posts.length) {
        if (emptyStateElement) {
            emptyStateElement.style.display = 'block';
        }
        return;
    }

    if (emptyStateElement) {
        emptyStateElement.style.display = 'none';
    }

    posts.forEach(post => {
        const article = document.createElement('article');
        article.className = 'gallery-post';

        const actions = document.createElement('div');
        actions.className = 'gallery-post__actions';

        const removeButton = document.createElement('button');
        removeButton.className = 'gallery-post__remove';
        removeButton.type = 'button';
        removeButton.textContent = 'Remove item';
        removeButton.addEventListener('click', () => {
            const confirmed = window.confirm('Remove this gallery item?');
            if (confirmed && typeof onRemovePost === 'function') {
                onRemovePost(post.id);
            }
        });

        actions.appendChild(removeButton);

        const title = document.createElement('h3');
        title.className = 'gallery-post__title';
        title.textContent = post.title;

        const meta = document.createElement('p');
        meta.className = 'gallery-post__meta';
        const postDate = new Date(post.createdAt);
        meta.textContent = postDate.toLocaleString();

        let mediaElement;
        if (post.mediaKind === 'youtube' && post.youtubeId) {
            mediaElement = document.createElement('iframe');
            mediaElement.className = 'gallery-post__media gallery-post__media--youtube';
            mediaElement.src = buildYouTubeEmbedUrl(post.youtubeId);
            mediaElement.title = post.title;
            mediaElement.setAttribute('allowfullscreen', '');
            mediaElement.setAttribute('loading', 'lazy');
            mediaElement.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            mediaElement.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        } else if (post.mediaType && post.mediaType.startsWith('video/')) {
            mediaElement = document.createElement('video');
            mediaElement.controls = true;
            mediaElement.preload = 'metadata';
            mediaElement.className = 'gallery-post__media';
            mediaElement.src = post.mediaData;
        } else {
            mediaElement = document.createElement('img');
            mediaElement.alt = post.title;
            mediaElement.className = 'gallery-post__media gallery-post__media--image';
            mediaElement.src = post.mediaData;
            mediaElement.addEventListener('click', () => {
                openGalleryLightbox(post.mediaData, post.title);
            });
        }

        const description = document.createElement('p');
        description.className = 'gallery-post__description';
        description.textContent = post.description;

        article.appendChild(actions);
        article.appendChild(title);
        article.appendChild(meta);
        article.appendChild(mediaElement);
        article.appendChild(description);
        feedElement.appendChild(article);
    });
}

function initGalleryUploader() {
    const form = document.getElementById('galleryForm');
    const statusElement = document.getElementById('galleryStatus');
    const feedElement = document.getElementById('galleryFeed');
    const emptyStateElement = document.getElementById('galleryEmptyState');

    if (!form || !statusElement || !feedElement) {
        return;
    }

    const titleInput = form.querySelector('#galleryTitle');
    const descriptionInput = form.querySelector('#galleryDescription');
    const youtubeUrlInput = form.querySelector('#galleryYoutubeUrl');
    const mediaInput = form.querySelector('#galleryMedia');

    const handleRemovePost = postId => {
        posts = posts.filter(post => post.id !== postId);
        saveGalleryPosts(posts);
        renderGalleryPosts(posts, feedElement, emptyStateElement, handleRemovePost);
        statusElement.textContent = 'Post removed.';
    };

    let posts = getGalleryPosts();
    renderGalleryPosts(posts, feedElement, emptyStateElement, handleRemovePost);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const title = titleInput ? titleInput.value.trim() : '';
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        const youtubeUrl = youtubeUrlInput ? youtubeUrlInput.value.trim() : '';
        const selectedFile = mediaInput && mediaInput.files ? mediaInput.files[0] : null;
        const hasYouTubeUrl = youtubeUrl.length > 0;
        const hasUploadedFile = Boolean(selectedFile);

        if (!title || !description) {
            statusElement.textContent = 'Please complete title and description.';
            return;
        }

        if (!hasYouTubeUrl && !hasUploadedFile) {
            statusElement.textContent = 'Please add a YouTube URL or upload a photo.';
            return;
        }

        if (hasYouTubeUrl && hasUploadedFile) {
            statusElement.textContent = 'Please use only one media type: YouTube URL or uploaded photo.';
            return;
        }

        statusElement.textContent = 'Uploading...';

        try {
            let newPost;

            if (hasYouTubeUrl) {
                const youtubeId = extractYouTubeId(youtubeUrl);
                if (!youtubeId) {
                    statusElement.textContent = 'Please provide a valid YouTube URL.';
                    return;
                }

                newPost = {
                    id: Date.now().toString(),
                    title,
                    description,
                    mediaKind: 'youtube',
                    youtubeId,
                    createdAt: new Date().toISOString()
                };
            } else {
                if (!selectedFile.type.startsWith('image/')) {
                    statusElement.textContent = 'Please upload a valid image file.';
                    return;
                }

                if (selectedFile.size > GALLERY_MAX_FILE_SIZE) {
                    statusElement.textContent = 'File is too large. Please upload photos under 12MB.';
                    return;
                }

                const mediaData = await readFileAsDataUrl(selectedFile);

                newPost = {
                    id: Date.now().toString(),
                    title,
                    description,
                    mediaKind: 'image',
                    mediaType: selectedFile.type,
                    mediaData,
                    createdAt: new Date().toISOString()
                };
            }

            posts = [newPost, ...posts];
            saveGalleryPosts(posts);
            renderGalleryPosts(posts, feedElement, emptyStateElement, handleRemovePost);
            form.reset();
            statusElement.textContent = 'Post uploaded successfully.';
        } catch {
            statusElement.textContent = 'Upload failed. Please try another file.';
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initGalleryUploader();

    const videoSection = document.getElementById('videoSection');
    if (videoSection) {
        videoSection.addEventListener('click', () => {
            openVideoModal();
        });
    }
});

function openVideoModal() {
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

    // create video element
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.loop = true;

    const src = document.createElement('source');
    src.src = 'assets/Progress - finished roof.mp4';
    src.type = 'video/mp4';

    video.appendChild(src);
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
