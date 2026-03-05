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

function getImageSources(post) {
    if (!post || post.mediaKind !== 'image') {
        return [];
    }

    if (Array.isArray(post.mediaUrls) && post.mediaUrls.length) {
        return post.mediaUrls.filter(source => typeof source === 'string' && source.trim());
    }

    const fallbackSource = post.mediaUrl || post.mediaData;
    return fallbackSource ? [fallbackSource] : [];
}

function openGalleryLightbox(imageSources, startIndex, imageAlt) {
    const existingLightbox = document.querySelector('.gallery-lightbox');
    if (existingLightbox) {
        existingLightbox.remove();
    }

    if (!Array.isArray(imageSources) || !imageSources.length) {
        return;
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

    const count = document.createElement('p');
    count.className = 'gallery-lightbox__count';

    let currentIndex = Math.max(0, Math.min(startIndex || 0, imageSources.length - 1));

    const setImage = index => {
        currentIndex = (index + imageSources.length) % imageSources.length;
        image.src = imageSources[currentIndex];
        image.alt = imageAlt || 'Gallery image';
        count.textContent = imageSources.length > 1 ? `${currentIndex + 1} / ${imageSources.length}` : '';
    };

    const showPrevious = () => setImage(currentIndex - 1);
    const showNext = () => setImage(currentIndex + 1);

    const escHandler = event => {
        if (event.key === 'Escape') {
            closeLightbox();
            return;
        }

        if (event.key === 'ArrowLeft') {
            showPrevious();
            return;
        }

        if (event.key === 'ArrowRight') {
            showNext();
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
    inner.appendChild(count);

    if (imageSources.length > 1) {
        let touchStartX = 0;
        let touchStartY = 0;
        const minSwipeDistance = 40;
        const maxVerticalDrift = 80;

        const prevButton = document.createElement('button');
        prevButton.className = 'gallery-lightbox__nav gallery-lightbox__nav--prev';
        prevButton.type = 'button';
        prevButton.setAttribute('aria-label', 'Previous image');
        prevButton.textContent = '‹';
        prevButton.addEventListener('click', event => {
            event.stopPropagation();
            showPrevious();
        });

        const nextButton = document.createElement('button');
        nextButton.className = 'gallery-lightbox__nav gallery-lightbox__nav--next';
        nextButton.type = 'button';
        nextButton.setAttribute('aria-label', 'Next image');
        nextButton.textContent = '›';
        nextButton.addEventListener('click', event => {
            event.stopPropagation();
            showNext();
        });

        const leftZone = document.createElement('button');
        leftZone.className = 'gallery-lightbox__zone gallery-lightbox__zone--left';
        leftZone.type = 'button';
        leftZone.setAttribute('aria-label', 'Previous image');
        leftZone.addEventListener('click', event => {
            event.stopPropagation();
            showPrevious();
        });

        const rightZone = document.createElement('button');
        rightZone.className = 'gallery-lightbox__zone gallery-lightbox__zone--right';
        rightZone.type = 'button';
        rightZone.setAttribute('aria-label', 'Next image');
        rightZone.addEventListener('click', event => {
            event.stopPropagation();
            showNext();
        });

        inner.addEventListener('touchstart', event => {
            const touch = event.changedTouches[0];
            if (!touch) {
                return;
            }

            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        inner.addEventListener('touchend', event => {
            const touch = event.changedTouches[0];
            if (!touch) {
                return;
            }

            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaY) > maxVerticalDrift) {
                return;
            }

            if (deltaX < 0) {
                showNext();
            } else {
                showPrevious();
            }
        }, { passive: true });

        inner.appendChild(leftZone);
        inner.appendChild(rightZone);
        inner.appendChild(prevButton);
        inner.appendChild(nextButton);
    }

    setImage(currentIndex);
    lightbox.appendChild(inner);
    document.body.appendChild(lightbox);
}

function renderPublicGalleryPosts(posts, feedElement, emptyStateElement, options = {}) {
    const shouldAppend = Boolean(options.append);

    if (!shouldAppend) {
        const existingPosts = feedElement.querySelectorAll('.gallery-post');
        existingPosts.forEach(post => post.remove());
    }

    if (!posts.length) {
        if (!shouldAppend && !feedElement.querySelector('.gallery-post')) {
            emptyStateElement.style.display = 'block';
        }
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
        } else if (post.mediaKind === 'image') {
            const imageSources = getImageSources(post);
            if (!imageSources.length) {
                return;
            }

            const carousel = document.createElement('div');
            carousel.className = 'gallery-post__carousel';

            const image = document.createElement('img');
            image.className = 'gallery-post__media gallery-post__media--image';
            image.alt = post.title;

            const count = document.createElement('span');
            count.className = 'gallery-post__carousel-count';

            let currentIndex = 0;

            const setImage = index => {
                currentIndex = (index + imageSources.length) % imageSources.length;
                image.src = imageSources[currentIndex];
                count.textContent = imageSources.length > 1 ? `${currentIndex + 1} / ${imageSources.length}` : '';
            };

            image.addEventListener('click', () => {
                openGalleryLightbox(imageSources, currentIndex, post.title);
            });

            carousel.appendChild(image);

            if (imageSources.length > 1) {
                let touchStartX = 0;
                let touchStartY = 0;
                const minSwipeDistance = 40;
                const maxVerticalDrift = 80;

                const prevButton = document.createElement('button');
                prevButton.className = 'gallery-post__carousel-nav gallery-post__carousel-nav--prev';
                prevButton.type = 'button';
                prevButton.setAttribute('aria-label', 'Previous image');
                prevButton.textContent = '‹';
                prevButton.addEventListener('click', event => {
                    event.stopPropagation();
                    setImage(currentIndex - 1);
                });

                const nextButton = document.createElement('button');
                nextButton.className = 'gallery-post__carousel-nav gallery-post__carousel-nav--next';
                nextButton.type = 'button';
                nextButton.setAttribute('aria-label', 'Next image');
                nextButton.textContent = '›';
                nextButton.addEventListener('click', event => {
                    event.stopPropagation();
                    setImage(currentIndex + 1);
                });

                carousel.addEventListener('touchstart', event => {
                    const touch = event.changedTouches[0];
                    if (!touch) {
                        return;
                    }

                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                }, { passive: true });

                carousel.addEventListener('touchend', event => {
                    const touch = event.changedTouches[0];
                    if (!touch) {
                        return;
                    }

                    const deltaX = touch.clientX - touchStartX;
                    const deltaY = touch.clientY - touchStartY;

                    if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaY) > maxVerticalDrift) {
                        return;
                    }

                    if (deltaX < 0) {
                        setImage(currentIndex + 1);
                    } else {
                        setImage(currentIndex - 1);
                    }
                }, { passive: true });

                carousel.appendChild(prevButton);
                carousel.appendChild(nextButton);
                carousel.appendChild(count);
            }

            setImage(0);
            mediaElement = carousel;
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

    const PAGE_SIZE = 6;
    let offset = 0;
    let hasMore = false;
    let isLoading = false;
    let usingApi = true;
    let loadFailed = false;
    let demoPosts = [];

    const loadingIndicator = document.createElement('p');
    loadingIndicator.className = 'gallery-feed__loading';
    loadingIndicator.textContent = 'Scroll to load more';
    feedElement.appendChild(loadingIndicator);

    const updateLoadingIndicator = () => {
        if (loadFailed) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = 'Unable to load more posts.';
            return;
        }

        if (hasMore) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = isLoading ? 'Loading more...' : 'Scroll to load more';
        } else {
            loadingIndicator.style.display = 'none';
        }
    };

    const fetchPostPage = async () => {
        const response = await fetch(`/api/posts?offset=${offset}&limit=${PAGE_SIZE}`);
        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }

        const payload = await response.json();
        if (Array.isArray(payload)) {
            const page = payload.slice(offset, offset + PAGE_SIZE);
            return {
                posts: page,
                hasMore: offset + page.length < payload.length
            };
        }

        return {
            posts: Array.isArray(payload.posts) ? payload.posts : [],
            hasMore: Boolean(payload.hasMore)
        };
    };

    const loadNextPage = async () => {
        if (isLoading || !hasMore) {
            return;
        }

        isLoading = true;
        updateLoadingIndicator();

        try {
            let pagePosts = [];
            if (usingApi) {
                const apiPage = await fetchPostPage();
                pagePosts = apiPage.posts;
                hasMore = apiPage.hasMore;
            } else {
                pagePosts = demoPosts.slice(offset, offset + PAGE_SIZE);
                hasMore = offset + pagePosts.length < demoPosts.length;
            }

            renderPublicGalleryPosts(pagePosts, feedElement, emptyStateElement, { append: true });
            offset += pagePosts.length;
            if (!hasMore && observer) {
                observer.disconnect();
            }
            updateLoadingIndicator();
        } catch {
            hasMore = false;
            loadFailed = true;
            if (observer) {
                observer.disconnect();
            }
        } finally {
            isLoading = false;
            updateLoadingIndicator();
        }
    };

    let observer;
    const setupObserver = () => {
        if (!hasMore) {
            return;
        }

        observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                loadNextPage();
            }
        }, {
            rootMargin: '300px 0px'
        });

        observer.observe(loadingIndicator);
    };

    try {
        const firstPage = await fetchPostPage();
        renderPublicGalleryPosts(firstPage.posts, feedElement, emptyStateElement);
        offset = firstPage.posts.length;
        hasMore = firstPage.hasMore;
    } catch {
        usingApi = false;
        demoPosts = getDemoPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const firstPage = demoPosts.slice(0, PAGE_SIZE);
        renderPublicGalleryPosts(firstPage, feedElement, emptyStateElement);
        offset = firstPage.length;
        hasMore = offset < demoPosts.length;

        if (!demoPosts.length) {
            emptyStateElement.textContent = 'No posts published yet.';
        }
    }

    updateLoadingIndicator();
    setupObserver();

    if (!hasMore && observer) {
        observer.disconnect();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadPublicGallery();
});
