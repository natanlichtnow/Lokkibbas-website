const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(rootDir, 'uploads');
const postsFilePath = path.join(dataDir, 'posts.json');
const NODE_ENV = process.env.NODE_ENV || 'development';

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_OWNER_USERNAME = 'roofboi';
const DEFAULT_OWNER_PASSWORD_SALT = 'moores-roofboi-salt';
const DEFAULT_OWNER_PASSWORD_HASH = '66f3f3d6a178a29384ec769d3ec87fe4e90620ff2c1e9b94425fddfd04c25cb5';
const DEFAULT_TOKEN_SECRET = 'change-this-token-secret-immediately';

const OWNER_USERNAME = process.env.OWNER_USERNAME || DEFAULT_OWNER_USERNAME;
const OWNER_PASSWORD_SALT = process.env.OWNER_PASSWORD_SALT || DEFAULT_OWNER_PASSWORD_SALT;
const OWNER_PASSWORD_HASH = process.env.OWNER_PASSWORD_HASH || DEFAULT_OWNER_PASSWORD_HASH;
const TOKEN_SECRET = process.env.TOKEN_SECRET || DEFAULT_TOKEN_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '846303717712-72aiml32ppb278g00m0ipn6rapt1olur.apps.googleusercontent.com';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'mooresexterios@gmail.com';
const AUTH_FAILURE_DELAY_MS = 400;

function isLikelyHex(value) {
    return typeof value === 'string' && /^[a-f0-9]+$/i.test(value);
}

function assertSecurityConfig() {
    if (NODE_ENV !== 'production') {
        return;
    }

    const usingDefaultOwnerValues = OWNER_USERNAME === DEFAULT_OWNER_USERNAME
        && OWNER_PASSWORD_SALT === DEFAULT_OWNER_PASSWORD_SALT
        && OWNER_PASSWORD_HASH === DEFAULT_OWNER_PASSWORD_HASH;

    if (usingDefaultOwnerValues) {
        throw new Error('Refusing to start in production with default owner credentials. Set OWNER_USERNAME, OWNER_PASSWORD_SALT, and OWNER_PASSWORD_HASH.');
    }

    if (!TOKEN_SECRET || TOKEN_SECRET === DEFAULT_TOKEN_SECRET || TOKEN_SECRET.length < 32) {
        throw new Error('Refusing to start in production with a weak TOKEN_SECRET. Use a random value of at least 32 characters.');
    }

    if (typeof OWNER_PASSWORD_SALT !== 'string' || OWNER_PASSWORD_SALT.length < 16) {
        throw new Error('Refusing to start in production with weak OWNER_PASSWORD_SALT. Use at least 16 characters.');
    }

    if (typeof OWNER_PASSWORD_HASH !== 'string' || OWNER_PASSWORD_HASH.length !== 64 || !isLikelyHex(OWNER_PASSWORD_HASH)) {
        throw new Error('Refusing to start in production with invalid OWNER_PASSWORD_HASH. Expected 64-char hex (PBKDF2-SHA256).');
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
let mailTransporter;

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });
}

let writeQueue = Promise.resolve();

async function ensureStorage() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(uploadsDir, { recursive: true });

    try {
        await fs.access(postsFilePath);
    } catch {
        await fs.writeFile(postsFilePath, '[]', 'utf8');
    }
}

async function readPosts() {
    const raw = await fs.readFile(postsFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
}

function writePosts(posts) {
    writeQueue = writeQueue.then(async () => {
        const tempPath = `${postsFilePath}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(posts, null, 2), 'utf8');
        await fs.rename(tempPath, postsFilePath);
    });

    return writeQueue;
}

function hashPassword(password) {
    return crypto.pbkdf2Sync(password, OWNER_PASSWORD_SALT, 210000, 32, 'sha256').toString('hex');
}

function safeEqualHex(a, b) {
    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');
    if (bufferA.length !== bufferB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufferA, bufferB);
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

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing auth token.' });
    }

    try {
        const payload = jwt.verify(token, TOKEN_SECRET, {
            issuer: 'moores-waterproofing-site',
            audience: 'dashboard-admin'
        });
        if (payload.sub !== OWNER_USERNAME) {
            return res.status(403).json({ error: 'Invalid user.' });
        }

        req.user = payload;
        return next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeExtension = extension || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image uploads are allowed.'));
        }
        return cb(null, true);
    }
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
            frameSrc: ["'self'", 'https://accounts.google.com'],
            connectSrc: ["'self'", 'https://accounts.google.com'],
            imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
            styleSrc: ["'self'", 'https:', "'unsafe-inline'"]
        }
    }
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(rootDir));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
});

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false
});

app.get('/api/public-config', (_req, res) => {
    return res.json({
        googleClientId: GOOGLE_CLIENT_ID || null,
        contactEnabled: Boolean(googleClient && mailTransporter),
        gmailComposeEnabled: Boolean(googleClient)
    });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !password) {
        await sleep(AUTH_FAILURE_DELAY_MS);
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const hashedInput = hashPassword(password);
    const isValid = username === OWNER_USERNAME && safeEqualHex(hashedInput, OWNER_PASSWORD_HASH);

    if (!isValid) {
        await sleep(AUTH_FAILURE_DELAY_MS);
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
        { sub: OWNER_USERNAME, role: 'owner' },
        TOKEN_SECRET,
        { expiresIn: '8h', issuer: 'moores-waterproofing-site', audience: 'dashboard-admin' }
    );
    return res.json({ token });
});

app.get('/api/posts', async (_req, res) => {
    try {
        const posts = await readPosts();
        const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const rawLimit = Number(_req.query.limit);
        const rawOffset = Number(_req.query.offset);
        const hasPaginationQuery = Number.isFinite(rawLimit) || Number.isFinite(rawOffset);

        if (!hasPaginationQuery) {
            return res.json(sorted);
        }

        const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 12, 1), 50);
        const offset = Math.max(Number.isFinite(rawOffset) ? Math.floor(rawOffset) : 0, 0);
        const pagedPosts = sorted.slice(offset, offset + limit);

        return res.json({
            posts: pagedPosts,
            hasMore: offset + pagedPosts.length < sorted.length,
            total: sorted.length,
            offset,
            limit
        });
    } catch {
        return res.status(500).json({ error: 'Failed to load posts.' });
    }
});

app.post('/api/posts', requireAuth, upload.array('imageFiles', 20), async (req, res) => {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
        const youtubeUrl = typeof req.body.youtubeUrl === 'string' ? req.body.youtubeUrl.trim() : '';
        const files = Array.isArray(req.files) ? req.files : [];

        if (!title || !description) {
            if (files.length) {
                await Promise.all(files.map(file => fs.unlink(file.path).catch(() => undefined)));
            }
            return res.status(400).json({ error: 'Title and description are required.' });
        }

        const usingYoutube = Boolean(youtubeUrl);
        const usingImage = files.length > 0;

        if ((usingYoutube && usingImage) || (!usingYoutube && !usingImage)) {
            if (files.length) {
                await Promise.all(files.map(file => fs.unlink(file.path).catch(() => undefined)));
            }
            return res.status(400).json({ error: 'Provide exactly one media type: YouTube URL or uploaded image(s).' });
        }

        let post;
        if (usingYoutube) {
            const youtubeId = extractYouTubeId(youtubeUrl);
            if (!youtubeId) {
                return res.status(400).json({ error: 'Invalid YouTube URL.' });
            }

            post = {
                id: crypto.randomUUID(),
                title,
                description,
                mediaKind: 'youtube',
                youtubeId,
                createdAt: new Date().toISOString()
            };
        } else {
            const mediaUrls = files.map(file => `/uploads/${file.filename}`);

            post = {
                id: crypto.randomUUID(),
                title,
                description,
                mediaKind: 'image',
                mediaUrl: mediaUrls[0],
                mediaUrls,
                createdAt: new Date().toISOString()
            };
        }

        const posts = await readPosts();
        posts.unshift(post);
        await writePosts(posts);

        return res.status(201).json(post);
    } catch (error) {
        const files = Array.isArray(req.files) ? req.files : [];
        if (files.length) {
            await Promise.all(files.map(file => fs.unlink(file.path).catch(() => undefined)));
        }
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Failed to create post.' });
    }
});

app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
        if (!googleClient || !mailTransporter) {
            return res.status(503).json({ error: 'Contact form is not configured yet.' });
        }

        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
        const idToken = typeof req.body.idToken === 'string' ? req.body.idToken.trim() : '';

        if (!name || !subject || !message || !idToken) {
            return res.status(400).json({ error: 'All fields are required, including Google authentication.' });
        }

        if (name.length > 90 || subject.length > 150 || message.length > 3000) {
            return res.status(400).json({ error: 'Form content is too long.' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const senderEmail = payload && payload.email ? String(payload.email).trim() : '';
        const senderVerified = Boolean(payload && payload.email_verified);

        if (!senderEmail || !senderVerified) {
            return res.status(401).json({ error: 'Google account email could not be verified.' });
        }

        await mailTransporter.sendMail({
            from: `Moores Website Contact <${GMAIL_USER}>`,
            to: CONTACT_TO_EMAIL,
            replyTo: senderEmail,
            subject: `[Website Contact] ${subject}`,
            text: [
                `From name: ${name}`,
                `Google email: ${senderEmail}`,
                '',
                'Message:',
                message
            ].join('\n')
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: 'Failed to send message.' });
    }
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const posts = await readPosts();
        const postToDelete = posts.find(post => post.id === postId);

        if (!postToDelete) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const remainingPosts = posts.filter(post => post.id !== postId);
        await writePosts(remainingPosts);

        if (postToDelete.mediaKind === 'image') {
            const sources = Array.isArray(postToDelete.mediaUrls)
                ? postToDelete.mediaUrls
                : (typeof postToDelete.mediaUrl === 'string' ? [postToDelete.mediaUrl] : []);

            const uniqueSources = [...new Set(sources.filter(source => typeof source === 'string'))];

            await Promise.all(uniqueSources.map(async source => {
                if (!source.startsWith('/uploads/')) {
                    return;
                }

                const filePath = path.join(rootDir, source.replace(/^\//, '').replace(/\//g, path.sep));
                await fs.unlink(filePath).catch(() => undefined);
            }));
        }

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: 'Failed to remove post.' });
    }
});

app.get('*', (req, res) => {
    const requestPath = req.path === '/' ? '/index.html' : req.path;
    const safePath = path.normalize(requestPath).replace(/^([.]{2}[\\/])+/, '');
    const filePath = path.join(rootDir, safePath);

    res.sendFile(filePath, error => {
        if (error) {
            res.status(404).send('Not found');
        }
    });
});

assertSecurityConfig();

ensureStorage().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
