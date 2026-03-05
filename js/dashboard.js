const DASHBOARD_TOKEN_KEY = 'dashboard-owner-token';
const DEMO_GALLERY_STORAGE_KEY = 'gallery-demo-posts';
const DEMO_OWNER_USERNAME = 'roofboi';
const DEMO_OWNER_PASSWORD = '4251';
const DEMO_MAX_FILE_SIZE = 12 * 1024 * 1024;

function buildYouTubeEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
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

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
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

function saveDemoPosts(posts) {
    localStorage.setItem(DEMO_GALLERY_STORAGE_KEY, JSON.stringify(posts));
}

function isPortableImageSource(source) {
    return typeof source === 'string' && source.trim() && !source.startsWith('/uploads/');
}

function normalizePortablePosts(posts) {
    if (!Array.isArray(posts)) {
        return [];
    }

    return posts.filter(post => {
        if (!post || typeof post !== 'object') {
            return false;
        }

        if (post.mediaKind === 'youtube') {
            return typeof post.youtubeId === 'string' && post.youtubeId.trim().length > 0;
        }

        if (post.mediaKind !== 'image') {
            return false;
        }

        const sources = getImageSources(post);
        return sources.some(isPortableImageSource);
    }).map(post => {
        if (post.mediaKind !== 'image') {
            return post;
        }

        const sources = getImageSources(post).filter(isPortableImageSource);
        return {
            ...post,
            mediaUrls: sources,
            mediaUrl: sources[0] || undefined,
            mediaData: undefined
        };
    });
}

async function loadStaticSeedPosts() {
    const response = await fetch('data/posts.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to load static seed posts');
    }

    const payload = await response.json();
    return normalizePortablePosts(payload);
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

async function isApiAvailable() {
    try {
        const response = await fetch('/api/posts', { cache: 'no-store' });
        return response.ok;
    } catch {
        return false;
    }
}

function renderDashboardPosts(posts, feedElement, emptyStateElement, onRemovePost, options = {}) {
    const shouldAppend = Boolean(options.append);

    if (!shouldAppend) {
        const existing = feedElement.querySelectorAll('.dashboard-post');
        existing.forEach(node => node.remove());
    }

    if (!posts.length) {
        if (!shouldAppend && !feedElement.querySelector('.dashboard-post')) {
            emptyStateElement.style.display = 'block';
        }
        return;
    }

    emptyStateElement.style.display = 'none';

    posts.forEach(post => {
        const article = document.createElement('article');
        article.className = 'dashboard-post';

        const bar = document.createElement('div');
        bar.className = 'dashboard-post__bar';

        const title = document.createElement('h3');
        title.className = 'dashboard-post__title';
        title.textContent = post.title;

        const removeButton = document.createElement('button');
        removeButton.className = 'dashboard-post__remove';
        removeButton.type = 'button';
        removeButton.textContent = 'Delete post';
        removeButton.addEventListener('click', () => onRemovePost(post.id));

        bar.appendChild(title);
        bar.appendChild(removeButton);

        const meta = document.createElement('p');
        meta.className = 'dashboard-post__meta';
        meta.textContent = new Date(post.createdAt).toLocaleString();

        let mediaElement;
        if (post.mediaKind === 'youtube' && post.youtubeId) {
            mediaElement = document.createElement('iframe');
            mediaElement.className = 'dashboard-post__media dashboard-post__media--youtube';
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

            if (imageSources.length === 1) {
                mediaElement = document.createElement('img');
                mediaElement.className = 'dashboard-post__media';
                mediaElement.src = imageSources[0];
                mediaElement.alt = post.title;
                mediaElement.loading = 'lazy';
                mediaElement.decoding = 'async';
            } else {
                const wrapper = document.createElement('div');
                wrapper.className = 'dashboard-post__grid-wrap';

                const grid = document.createElement('div');
                grid.className = 'dashboard-post__grid';

                const visibleImages = imageSources.slice(0, 4);
                const hiddenCount = Math.max(imageSources.length - visibleImages.length, 0);

                visibleImages.forEach((source, index) => {
                    const tile = document.createElement('div');
                    tile.className = 'dashboard-post__grid-item';

                    const image = document.createElement('img');
                    image.className = 'dashboard-post__grid-image';
                    image.src = source;
                    image.alt = `${post.title} image ${index + 1}`;
                    image.loading = 'lazy';
                    image.decoding = 'async';
                    tile.appendChild(image);

                    if (hiddenCount > 0 && index === visibleImages.length - 1) {
                        const moreBadge = document.createElement('span');
                        moreBadge.className = 'dashboard-post__grid-more';
                        moreBadge.textContent = `+${hiddenCount}`;
                        tile.appendChild(moreBadge);
                    }

                    grid.appendChild(tile);
                });

                const imageCount = document.createElement('p');
                imageCount.className = 'dashboard-post__grid-count';
                imageCount.textContent = `${imageSources.length} photos`;

                wrapper.appendChild(grid);
                wrapper.appendChild(imageCount);
                mediaElement = wrapper;
            }
        }

        const description = document.createElement('p');
        description.className = 'dashboard-post__description';
        description.textContent = post.description;

        article.appendChild(bar);
        article.appendChild(meta);
        if (mediaElement) {
            article.appendChild(mediaElement);
        }
        article.appendChild(description);
        feedElement.appendChild(article);
    });
}

async function fetchPostsPage(offset, limit) {
    const response = await fetch(`/api/posts?offset=${offset}&limit=${limit}`);
    if (!response.ok) {
        throw new Error('Failed to fetch posts');
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
        const page = payload.slice(offset, offset + limit);
        return {
            posts: page,
            hasMore: offset + page.length < payload.length
        };
    }

    return {
        posts: Array.isArray(payload.posts) ? payload.posts : [],
        hasMore: Boolean(payload.hasMore)
    };
}

function setDashboardVisibility(isLoggedIn, loginCard, appCard) {
    loginCard.classList.toggle('dashboard-card--hidden', isLoggedIn);
    appCard.classList.toggle('dashboard-card--hidden', !isLoggedIn);
}

window.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.getElementById('dashboardLoginCard');
    const appCard = document.getElementById('dashboardAppCard');
    const loginForm = document.getElementById('dashboardLoginForm');
    const loginStatus = document.getElementById('dashboardLoginStatus');
    const postForm = document.getElementById('dashboardPostForm');
    const postStatus = document.getElementById('dashboardPostStatus');
    const logoutBtn = document.getElementById('dashboardLogoutBtn');
    const feedElement = document.getElementById('dashboardFeed');
    const emptyStateElement = document.getElementById('dashboardFeedEmpty');

    if (!loginCard || !appCard || !loginForm || !postForm || !feedElement || !emptyStateElement) {
        return;
    }

    let authToken = sessionStorage.getItem(DASHBOARD_TOKEN_KEY) || '';
    let usingApi = true;
    let demoPosts = [];
    let offset = 0;
    let hasMore = false;
    let isLoading = false;
    let loadFailed = false;
    let loadObserver;
    const PAGE_SIZE = 6;

    const loadingIndicator = document.createElement('p');
    loadingIndicator.className = 'dashboard-feed__loading';
    loadingIndicator.textContent = 'Scroll to load more';

    const sortPosts = list => [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const updateLoadingIndicator = () => {
        if (loadFailed) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = 'Unable to load more posts.';
            return;
        }

        if (hasMore) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = isLoading ? 'Loading more...' : 'Scroll to load more';
            return;
        }

        loadingIndicator.style.display = 'none';
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
                const page = await fetchPostsPage(offset, PAGE_SIZE);
                pagePosts = page.posts;
                hasMore = page.hasMore;
            } else {
                pagePosts = demoPosts.slice(offset, offset + PAGE_SIZE);
                hasMore = offset + pagePosts.length < demoPosts.length;
            }

            renderDashboardPosts(pagePosts, feedElement, emptyStateElement, handleRemovePost, { append: true });
            offset += pagePosts.length;

            if (!hasMore && loadObserver) {
                loadObserver.disconnect();
            }
        } catch {
            loadFailed = true;
            hasMore = false;
            if (loadObserver) {
                loadObserver.disconnect();
            }
        } finally {
            isLoading = false;
            updateLoadingIndicator();
        }
    };

    const setupInfiniteScroll = () => {
        if (loadObserver) {
            loadObserver.disconnect();
        }

        if (!feedElement.contains(loadingIndicator)) {
            feedElement.appendChild(loadingIndicator);
        }

        if (!hasMore) {
            updateLoadingIndicator();
            return;
        }

        loadObserver = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                loadNextPage();
            }
        }, {
            rootMargin: '300px 0px'
        });

        loadObserver.observe(loadingIndicator);
        updateLoadingIndicator();
    };

    const refreshFeed = async () => {
        offset = 0;
        hasMore = false;
        isLoading = false;
        loadFailed = false;

        try {
            if (usingApi) {
                const firstPage = await fetchPostsPage(0, PAGE_SIZE);
                renderDashboardPosts(firstPage.posts, feedElement, emptyStateElement, handleRemovePost);
                offset = firstPage.posts.length;
                hasMore = firstPage.hasMore;
            } else {
                demoPosts = sortPosts(getDemoPosts());
                const firstPage = demoPosts.slice(0, PAGE_SIZE);
                renderDashboardPosts(firstPage, feedElement, emptyStateElement, handleRemovePost);
                offset = firstPage.length;
                hasMore = offset < demoPosts.length;
            }
        } finally {
            setupInfiniteScroll();
        }
    };

    const handleRemovePost = async postId => {
        if (!window.confirm('Delete this post?')) {
            return;
        }

        if (usingApi) {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                postStatus.textContent = 'Unable to remove post.';
                return;
            }
        } else {
            const remaining = getDemoPosts().filter(post => post.id !== postId);
            saveDemoPosts(remaining);
        }

        postStatus.textContent = 'Post removed.';
        await refreshFeed();
    };

    const activateDashboard = async () => {
        setDashboardVisibility(true, loginCard, appCard);
        await refreshFeed();
    };

    const deactivateDashboard = () => {
        authToken = '';
        sessionStorage.removeItem(DASHBOARD_TOKEN_KEY);
        if (loadObserver) {
            loadObserver.disconnect();
        }
        setDashboardVisibility(false, loginCard, appCard);
        loginStatus.textContent = '';
        postStatus.textContent = '';
    };

    const init = async () => {
        usingApi = await isApiAvailable();

        if (!usingApi) {
            const localDemoPosts = getDemoPosts();
            if (!localDemoPosts.length) {
                const staticPosts = await loadStaticSeedPosts().catch(() => []);
                if (staticPosts.length) {
                    saveDemoPosts(staticPosts);
                }
            }
            loginStatus.textContent = 'Demo mode: data is stored in this browser (GitHub Pages safe).';
        }

        if (authToken) {
            activateDashboard().catch(() => {
                deactivateDashboard();
            });
        }
    };

    init();

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();

        const formData = new FormData(loginForm);
        const username = String(formData.get('username') || '').trim();
        const password = String(formData.get('password') || '');

        if (!username || !password) {
            loginStatus.textContent = 'Username and safety code are required.';
            return;
        }

        loginStatus.textContent = 'Signing in...';

        try {
            if (usingApi) {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    loginStatus.textContent = payload.error || 'Invalid username or safety code.';
                    return;
                }

                const payload = await response.json();
                authToken = payload.token;
                sessionStorage.setItem(DASHBOARD_TOKEN_KEY, authToken);
            } else {
                if (username !== DEMO_OWNER_USERNAME || password !== DEMO_OWNER_PASSWORD) {
                    loginStatus.textContent = 'Invalid username or safety code.';
                    return;
                }

                authToken = 'demo-local-auth';
                sessionStorage.setItem(DASHBOARD_TOKEN_KEY, authToken);
            }

            loginStatus.textContent = '';
            loginForm.reset();
            await activateDashboard();
        } catch {
            loginStatus.textContent = 'Unable to sign in right now.';
        }
    });

    postForm.addEventListener('submit', async event => {
        event.preventDefault();

        const formData = new FormData(postForm);
        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const youtubeUrl = String(formData.get('youtubeUrl') || '').trim();
        const imageFiles = formData
            .getAll('imageFiles')
            .filter(value => value instanceof File && value.size > 0);
        const hasFiles = imageFiles.length > 0;

        if (!title || !description) {
            postStatus.textContent = 'Title and description are required.';
            return;
        }

        if ((youtubeUrl && hasFiles) || (!youtubeUrl && !hasFiles)) {
            postStatus.textContent = 'Use exactly one media type: YouTube URL or uploaded photo(s).';
            return;
        }

        const requestForm = new FormData();
        requestForm.set('title', title);
        requestForm.set('description', description);

        if (youtubeUrl) {
            requestForm.set('youtubeUrl', youtubeUrl);
        }

        if (hasFiles) {
            imageFiles.forEach(file => {
                requestForm.append('imageFiles', file);
            });
        }

        postStatus.textContent = 'Publishing...';

        try {
            if (usingApi) {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${authToken}`
                    },
                    body: requestForm
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    postStatus.textContent = payload.error || 'Unable to publish post.';
                    return;
                }
            } else {
                const youtubeId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
                if (youtubeUrl && !youtubeId) {
                    postStatus.textContent = 'Please provide a valid YouTube URL.';
                    return;
                }

                let mediaDataList = [];
                if (hasFiles) {
                    for (const imageFile of imageFiles) {
                        if (!imageFile.type.startsWith('image/')) {
                            postStatus.textContent = 'Please upload valid image files only.';
                            return;
                        }

                        if (imageFile.size > DEMO_MAX_FILE_SIZE) {
                            postStatus.textContent = 'Each image must be under 12MB.';
                            return;
                        }

                        const mediaData = await readFileAsDataUrl(imageFile);
                        mediaDataList.push(mediaData);
                    }
                }

                const demoPost = {
                    id: Date.now().toString(),
                    title,
                    description,
                    mediaKind: youtubeId ? 'youtube' : 'image',
                    youtubeId: youtubeId || undefined,
                    mediaUrls: mediaDataList.length ? mediaDataList : undefined,
                    mediaData: mediaDataList[0] || undefined,
                    createdAt: new Date().toISOString()
                };

                const updated = [demoPost, ...getDemoPosts()];
                saveDemoPosts(updated);
            }

            postForm.reset();
            postStatus.textContent = 'Post published successfully.';
            await refreshFeed();
        } catch {
            postStatus.textContent = 'Unable to publish right now.';
        }
    });

    logoutBtn.addEventListener('click', () => {
        deactivateDashboard();
    });
});
