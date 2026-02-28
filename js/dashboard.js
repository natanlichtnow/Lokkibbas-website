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

async function isApiAvailable() {
    try {
        const response = await fetch('/api/posts', { cache: 'no-store' });
        return response.ok;
    } catch {
        return false;
    }
}

function renderDashboardPosts(posts, feedElement, emptyStateElement, onRemovePost) {
    const existing = feedElement.querySelectorAll('.dashboard-post');
    existing.forEach(node => node.remove());

    if (!posts.length) {
        emptyStateElement.style.display = 'block';
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
        removeButton.textContent = 'Remove item';
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
        } else if (post.mediaKind === 'image' && (post.mediaUrl || post.mediaData)) {
            const imageSource = post.mediaUrl || post.mediaData;
            mediaElement = document.createElement('img');
            mediaElement.className = 'dashboard-post__media';
            mediaElement.src = imageSource;
            mediaElement.alt = post.title;
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

async function fetchPosts() {
    const response = await fetch('/api/posts');
    if (!response.ok) {
        throw new Error('Failed to fetch posts');
    }
    return response.json();
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
    let posts = [];
    let usingApi = true;

    const sortPosts = list => [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const refreshFeed = async () => {
        if (usingApi) {
            posts = await fetchPosts();
        } else {
            posts = sortPosts(getDemoPosts());
        }
        renderDashboardPosts(posts, feedElement, emptyStateElement, handleRemovePost);
    };

    const handleRemovePost = async postId => {
        if (!window.confirm('Remove this gallery item?')) {
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
        setDashboardVisibility(false, loginCard, appCard);
        loginStatus.textContent = '';
        postStatus.textContent = '';
    };

    const init = async () => {
        usingApi = await isApiAvailable();

        if (!usingApi) {
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
        const imageFile = formData.get('imageFile');
        const hasFile = imageFile instanceof File && imageFile.size > 0;

        if (!title || !description) {
            postStatus.textContent = 'Title and description are required.';
            return;
        }

        if ((youtubeUrl && hasFile) || (!youtubeUrl && !hasFile)) {
            postStatus.textContent = 'Use exactly one media type: YouTube URL or uploaded photo.';
            return;
        }

        const requestForm = new FormData();
        requestForm.set('title', title);
        requestForm.set('description', description);

        if (youtubeUrl) {
            requestForm.set('youtubeUrl', youtubeUrl);
        }

        if (hasFile) {
            requestForm.set('imageFile', imageFile);
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

                let mediaData = '';
                if (hasFile) {
                    if (!imageFile.type.startsWith('image/')) {
                        postStatus.textContent = 'Please upload a valid image file.';
                        return;
                    }

                    if (imageFile.size > DEMO_MAX_FILE_SIZE) {
                        postStatus.textContent = 'Image is too large. Use files under 12MB.';
                        return;
                    }

                    mediaData = await readFileAsDataUrl(imageFile);
                }

                const demoPost = {
                    id: Date.now().toString(),
                    title,
                    description,
                    mediaKind: youtubeId ? 'youtube' : 'image',
                    youtubeId: youtubeId || undefined,
                    mediaData: mediaData || undefined,
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
