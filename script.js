// Fonction de vérification du serveur
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000/');
        return response.ok;
    } catch (error) {
        console.error('Erreur de connexion au serveur:', error);
        return false;
    }
}

// Cache avec limite de taille et expiration
class QRCache {
    constructor(maxSize = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > 1000 * 60 * 60) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    clear() {
        this.cache.clear();
    }
}

// Système de cache pour les QR codes
const qrCache = new QRCache();

// Fusionner les deux systèmes d'analytics
const Analytics = {
    data: {
        generations: 0,
        errors: [],
        performance: [],
        types: {}
    },

    track(type) {
        this.data.generations++;
        this.data.types[type] = (this.data.types[type] || 0) + 1;
        this.save();
    },

    save() {
        localStorage.setItem('qr_analytics', JSON.stringify(this.data));
    },

    load() {
        const saved = localStorage.getItem('qr_analytics');
        if (saved) {
            this.data = JSON.parse(saved);
        }
    }
};

// Gestionnaire d'erreurs amélioré
const ErrorHandler = {
    handle(error, context) {
        console.error(`Erreur dans ${context}:`, error);
        Analytics.track('error', { context, message: error.message });
        alert(messages[userLang].error);
    }
};

// Supprimer les doublons de validation
const Validator = {
    url(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    phone(phone) {
        return /^\+?[1-9]\d{1,14}$/.test(phone);
    },

    sanitizeInput(input) {
        return input.replace(/<[^>]*>/g, '');
    },

    validateInput(input, type) {
        if (!input) return false;
        switch (type) {
            case 'phone': return this.phone(input);
            case 'url': return this.url(input);
            case 'social': return this.validateSocialInputs();
            default: return true;
        }
    }
};

// Initialisation améliorée
async function init() {
    try {
        await initDarkMode();
        await loadAnalytics();
        await checkServer();
        registerServiceWorker();
    } catch (error) {
        ErrorHandler.handle(error, 'initialization');
    }
}

// Enregistrement du Service Worker pour le mode hors ligne
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Internationalisation
const messages = {
    fr: {
        errorGeneration: 'Erreur de génération. Veuillez réessayer.',
        invalidPhone: 'Veuillez entrer un numéro de téléphone valide',
        invalidUrl: 'URL invalide',
        generateSuccess: 'QR code généré avec succès',
        shareError: 'Erreur lors du partage'
    },
    en: {
        errorGeneration: 'Generation error. Please try again.',
        invalidPhone: 'Please enter a valid phone number',
        invalidUrl: 'Invalid URL',
        generateSuccess: 'QR code generated successfully',
        shareError: 'Error while sharing'
    }
};

const userLang = navigator.language.split('-')[0] || 'fr';
const t = (key) => messages[userLang]?.[key] || messages.fr[key];

// Validation des URLs
function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        alert(t('invalidUrl'));
        return false;
    }
}

// Mode sombre
function initDarkMode() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const toggleDarkMode = (e) => {
        document.body.classList.toggle('dark-mode', e.matches);
    };
    darkModeMediaQuery.addListener(toggleDarkMode);
    toggleDarkMode(darkModeMediaQuery);
}

// Fonction unifiée de génération de QR code
async function generateQR(type = 'basic') {
    return Analytics.measurePerformance(() => {
        const input = Validator.sanitizeInput(document.getElementById('qr-input').value.trim());
        const config = getQRConfig();

        try {
            if (!Validator.validateInput(input, type)) {
                alert(t('invalidInput'));
                return;
            }

            const qrContainer = document.getElementById('qr-code');
            generateQRCode(formatQRData(type, input), config, qrContainer);
            Analytics.track(type);
        } catch (error) {
            ErrorHandler.handle(error, 'generateQR');
        }
    }, 'generateQR');
}

// Configuration centralisée
function getQRConfig() {
    return {
        color: document.getElementById('qr-color').value,
        bgColor: document.getElementById('bg-color').value,
        size: parseInt(document.getElementById('qr-size').value) || 200,
        logo: {
            url: document.getElementById('qr-logo').value.trim(),
            file: document.getElementById('qr-logo-upload').files[0]
        },
        style: document.getElementById('qr-style').value,
        corner: document.getElementById('qr-corner').value,
        border: parseInt(document.getElementById('qr-border').value) || 0
    };
}

// Formatage du texte QR selon le type
function formatQRText(input, type) {
    switch (type) {
        case 'phone':
            return `tel:${input}`;
        case 'social':
            return formatSocialLinks();
        case 'dynamic':
            return formatDynamicQR(input);
        default:
            return input;
    }
}

// Génération du QR code
async function generateQRCode(text, config, container) {
    const qrCode = new QRCode(container, {
        text,
        width: config.size,
        height: config.size,
        colorDark: config.color,
        colorLight: config.bgColor,
        correctLevel: QRCode.CorrectLevel.H
    });

    await addLogoIfNeeded(config.logo, container, config.size);
    applyStyle(container, config);
    showControls();
}

// Suppression des fonctions redondantes :
// - generatePhoneQR()
// - generateSocialQR()
// - generateDynamicQR()
// - generateContextualQR()
// - generateImageQR()

// Modification des événements click dans le HTML :
// onclick="generateQR('basic')"
// onclick="generateQR('phone')"
// onclick="generateQR('social')"
// onclick="generateQR('dynamic')"
// onclick="generateQR('contextual')"
// onclick="generateQR('image')"

// ...rest of the existing code (utilities, sharing, etc.)...

// Ajout de la prévisualisation en direct
document.getElementById('qr-input').addEventListener('input', debounce(generateQR, 500));

// Fonction debounce pour limiter les appels
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Amélioration des animations
function animateQRCode(canvas) {
    gsap.fromTo(canvas, 
        { 
            opacity: 0,
            scale: 0.8
        }, 
        { 
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.7)"
        }
    );
}

function downloadQR() {
    const qrContainer = document.getElementById('qr-code');
    const qrImage = qrContainer.querySelector('img') || qrContainer.querySelector('canvas');
    
    if (qrImage) {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = qrImage.src || qrImage.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function showShareOptions() {
    const shareOptions = document.getElementById('share-options');
    const qrCode = document.getElementById('qr-code').querySelector('canvas');

    if (!qrCode) {
        alert('Veuillez d\'abord générer un QR code');
        return;
    }

    if (!shareOptions.classList.contains('visible')) {
        shareOptions.classList.add('visible');
        gsap.fromTo('.share-icon', 
            { scale: 0, opacity: 0 }, 
            { 
                scale: 1, 
                opacity: 1, 
                duration: 0.3, 
                stagger: 0.05,
                ease: "back.out(1.7)"
            }
        );
    } else {
        gsap.to('.share-options', {
            opacity: 0,
            scale: 0.8,
            duration: 0.2,
            onComplete: () => {
                shareOptions.classList.remove('visible');
                gsap.set('.share-options', { opacity: 1, scale: 1 });
            }
        });
    }
}

function shareOn(platform) {
    const qrContainer = document.getElementById('qr-code');
    const qrCanvas = qrContainer.querySelector('canvas');
    
    if (!qrCanvas) {
        alert('Veuillez d\'abord générer un QR code');
        return;
    }

    try {
        // Convertir le QR code en image data URL
        const qrImageUrl = qrCanvas.toDataURL('image/png');
        const shareText = 'Mon QR Code généré avec QR MASTER Pro';
        
        // Configuration des URLs de partage
        const shareConfigs = {
            facebook: {
                url: `https://www.facebook.com/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`,
                width: 600,
                height: 400
            },
            twitter: {
                url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`,
                width: 600,
                height: 400
            },
            linkedin: {
                url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
                width: 600,
                height: 400
            },
            whatsapp: {
                url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + window.location.href)}`,
                width: 600,
                height: 400
            },
            email: {
                url: `mailto:?subject=${encodeURIComponent('QR Code partagé')}&body=${encodeURIComponent(shareText + '\n\n' + window.location.href)}`,
                width: 600,
                height: 400
            },
            pinterest: {
                url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(qrImageUrl)}&description=${encodeURIComponent(shareText)}`,
                width: 600,
                height: 400
            },
            reddit: {
                url: `https://www.reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(shareText)}`,
                width: 600,
                height: 400
            }
        };

        // Ouvrir la fenêtre de partage
        if (shareConfigs[platform]) {
            const config = shareConfigs[platform];
            const left = (window.innerWidth - config.width) / 2;
            const top = (window.innerHeight - config.height) / 2;
            const windowFeatures = `width=${config.width},height=${config.height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`;
            
            if (platform === 'email') {
                window.location.href = config.url;
            } else {
                window.open(config.url, '_blank', windowFeatures);
            }
        }
    } catch (error) {
        console.error('Erreur lors du partage:', error);
        alert('Une erreur est survenue lors du partage. Veuillez réessayer.');
    }
}

// Ajout de la fonction showControls qui était manquante
function showControls() {
    document.getElementById('download-btn').style.display = 'block';
    document.getElementById('share-btn').style.display = 'block';
}

// Ajout de la fonction loadAnalytics qui était manquante
function loadAnalytics() {
    try {
        const savedData = localStorage.getItem('qr_analytics');
        if (savedData) {
            Analytics.data = JSON.parse(savedData);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des analytics:', error);
    }
}

// Ajout de la fonction manquante pour formater les liens sociaux
function formatSocialLinks() {
    const socials = {
        linkedin: document.getElementById('qr-linkedin').value,
        twitter: document.getElementById('qr-twitter').value,
        facebook: document.getElementById('qr-facebook').value,
        instagram: document.getElementById('qr-instagram').value,
        whatsapp: document.getElementById('qr-whatsapp').value
    };

    return Object.entries(socials)
        .filter(([_, value]) => value.trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
}

// Ajout de la fonction manquante pour valider les entrées sociales
function validateSocialInputs() {
    const socials = ['linkedin', 'twitter', 'facebook', 'instagram', 'whatsapp'];
    const hasAtLeastOne = socials.some(social => 
        document.getElementById(`qr-${social}`).value.trim()
    );
    
    if (!hasAtLeastOne) {
        alert(t('enterSocialProfile'));
        return false;
    }
    return true;
}

// Ajout de la fonction manquante pour appliquer le style
function applyStyle(container, config) {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (config.style === 'rounded' || config.corner === 'rounded') {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(config.size / 2, config.size / 2, config.size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    if (config.border > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = config.border;
        ctx.strokeStyle = config.color;
        ctx.strokeRect(0, 0, config.size, config.size);
    }
}

// Ajout de la fonction manquante pour ajouter un logo
async function addLogoIfNeeded(logo, container, size) {
    if (!logo.file && !logo.url) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
        img.onload = () => {
            const logoSize = size * 0.2; // Logo prend 20% de la taille du QR
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;
            
            ctx.drawImage(img, x, y, logoSize, logoSize);
            resolve();
        };
        img.onerror = reject;
        
        if (logo.file) {
            const reader = new FileReader();
            reader.onload = e => img.src = e.target.result;
            reader.readAsDataURL(logo.file);
        } else {
            img.src = logo.url;
        }
    });
}

// Initialisation
window.addEventListener('load', init);
