const DEMO_GALLERY_STORAGE_KEY = 'gallery-demo-posts';

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
            const queryId = parsedUrl.searchParams.get('v');
            if (queryId) {
                return queryId;
            }

            const segments = parsedUrl.pathname.split('/').filter(Boolean);
            const index = segments.findIndex(segment => segment === 'embed' || segment === 'shorts');
            if (index >= 0 && segments[index + 1]) {
                return segments[index + 1];
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

    const escHandler = event => {
        if (event.key === 'Escape') {
            closeLightbox();
        }
    };

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

    document.addEventListener('keydown', escHandler);

    inner.appendChild(closeButton);
    inner.appendChild(image);
    lightbox.appendChild(inner);
    document.body.appendChild(lightbox);
}

function renderPublicGalleryPosts(posts, feedElement, emptyStateElement) {
    const existingPosts = feedElement.querySelectorAll('.gallery-post');
    existingPosts.forEach(post => post.remove());

    if (!posts.length) {
        emptyStateElement.style.display = 'block';
        return;
    }

    emptyStateElement.style.display = 'none';

    posts.forEach(post => {
        const article = document.createElement('article');
        article.className = 'gallery-post';

        const title = document.createElement('h3');
        title.className = 'gallery-post__title';
        title.textContent = post.title;

        const meta = document.createElement('p');
        meta.className = 'gallery-post__meta';
        meta.textContent = new Date(post.createdAt).toLocaleString();

        let mediaElement;
        if (post.mediaKind === 'youtube' && post.youtubeId) {
            mediaElement = document.createElement('iframe');
            mediaElement.className = 'gallery-post__media gallery-post__media--youtube';
            mediaElement.src = buildYouTubeEmbedUrl(post.youtubeId);
            mediaElement.title = post.title;
            mediaElement.setAttribute('allowfullscreen', '');
            mediaElement.setAttribute('loading', 'lazy');
            mediaElement.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        } else if (post.mediaKind === 'image' && (post.mediaUrl || post.mediaData)) {
            const imageSource = post.mediaUrl || post.mediaData;
            mediaElement = document.createElement('img');
            mediaElement.className = 'gallery-post__media gallery-post__media--image';
            mediaElement.src = imageSource;
            mediaElement.alt = post.title;
            mediaElement.addEventListener('click', () => {
                openGalleryLightbox(imageSource, post.title);
            });
        } else {
            return;
        }

        const description = document.createElement('p');
        description.className = 'gallery-post__description';
        description.textContent = post.description;

        article.appendChild(title);
        article.appendChild(meta);
        article.appendChild(mediaElement);
        article.appendChild(description);
        feedElement.appendChild(article);
    });
}

function getDemoPosts() {
    try {
        const raw = localStorage.getItem(DEMO_GALLERY_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function loadPublicGallery() {
    const feedElement = document.getElementById('galleryFeed');
    const emptyStateElement = document.getElementById('galleryEmptyState');

    if (!feedElement || !emptyStateElement) {
        return;
    }

    try {
        const response = await fetch('/api/posts');
        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }

        const posts = await response.json();
        renderPublicGalleryPosts(posts, feedElement, emptyStateElement);
    } catch {
        const demoPosts = getDemoPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        renderPublicGalleryPosts(demoPosts, feedElement, emptyStateElement);

        if (!demoPosts.length) {
            emptyStateElement.textContent = 'No posts published yet.';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadPublicGallery();
});
