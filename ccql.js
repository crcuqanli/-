// ===== 常量定义 =====
const APP_CONFIG = {
    MAX_METEORS: 8,
    LOADING_TIMEOUT: 5000,
    RESOURCE_CHECK_DELAY: 500,
    DATE_UPDATE_INTERVAL: 1000,
    METEOR_CREATION_INTERVAL: 1000
};

// ===== DOM 元素缓存 =====
const DOM_ELEMENTS = {
    // 加载相关
    loadingScreen: document.getElementById('loading-screen'),
    body: document.body,
    
    // 时间显示
    currentTime: document.getElementById('current-time'),
    currentDate: document.getElementById('current-date'),
    
    // 音频播放器
    audioPlayer: document.getElementById('audio-player'),
    playPauseBtn: document.getElementById('play-pause'),
    playPauseIcon: document.getElementById('play-pause-icon'),
    albumArt: document.getElementById('album-art'),
    progressBar: document.getElementById('progress-bar'),
    progress: document.getElementById('progress'),
    audioCurrentTime: document.getElementById('audio-current-time'),
    durationDisplay: document.getElementById('duration'),
    songTitle: document.querySelector('.song-title'),
    artistName: document.querySelector('.artist')
};

// ===== 应用状态管理 =====
class AppState {
    constructor() {
        this.isLoaded = false;
        this.activeMeteors = 0;
        this.isPlaying = false;
    }
}

// ===== 加载管理器 =====
class LoadingManager {
    constructor() {
        this.state = new AppState();
        this.init();
    }

    init() {
        DOM_ELEMENTS.body.classList.add('loading');
        this.startLoadingProcess();
    }

    startLoadingProcess() {
        this.preloadCriticalResources();
        this.setupLoadingEvents();
        this.setLoadingTimeout();
    }

    preloadCriticalResources() {
        const resources = [
            { url: 'bj.webp', type: 'image' },
            { url: 'loop.webp', type: 'image' }
        ];

        resources.forEach(resource => {
            const loader = new Image();
            loader.onload = () => this.handleResourceLoaded();
            loader.onerror = () => this.handleResourceLoaded();
            loader.src = resource.url;
        });

        // 音频资源检查
        if (DOM_ELEMENTS.audioPlayer) {
            DOM_ELEMENTS.audioPlayer.addEventListener('canplaythrough', () => this.handleResourceLoaded());
            DOM_ELEMENTS.audioPlayer.addEventListener('error', () => this.handleResourceLoaded());
        }
    }

    setupLoadingEvents() {
        if (document.readyState === 'complete') {
            this.handleDOMReady();
        } else {
            window.addEventListener('load', () => this.handleDOMReady());
        }
    }

    setLoadingTimeout() {
        setTimeout(() => {
            if (!this.state.isLoaded) {
                console.warn('加载超时，强制完成加载过程');
                this.completeLoadingProcess();
            }
        }, APP_CONFIG.LOADING_TIMEOUT);
    }

    handleResourceLoaded() {
        setTimeout(() => {
            if (document.readyState === 'complete' && !this.state.isLoaded) {
                this.completeLoadingProcess();
            }
        }, APP_CONFIG.RESOURCE_CHECK_DELAY);
    }

    handleDOMReady() {
        setTimeout(() => {
            if (!this.state.isLoaded) {
                this.completeLoadingProcess();
            }
        }, 1000);
    }

    completeLoadingProcess() {
        if (this.state.isLoaded) return;

        this.state.isLoaded = true;
        console.log('页面资源加载完成');

        this.animateLoadingCompletion();
    }

    animateLoadingCompletion() {
        setTimeout(() => {
            DOM_ELEMENTS.loadingScreen.classList.add('hidden');
            DOM_ELEMENTS.body.classList.remove('loading');
            
            this.initializeApplication();
            
            this.removeLoadingScreen();
        }, 500);
    }

    removeLoadingScreen() {
        setTimeout(() => {
            if (DOM_ELEMENTS.loadingScreen?.parentNode) {
                DOM_ELEMENTS.loadingScreen.remove();
            }
        }, 1000);
    }

    initializeApplication() {
        this.initializeModules();
        this.setupEventListeners();
    }

    initializeModules() {
        DateTimeManager.init();
        AudioPlayerManager.init();
        MeteorEffectManager.init();
        LayoutManager.init();
    }

    setupEventListeners() {
        window.addEventListener('resize', LayoutManager.adjustLayout);
    }
}

// ===== 日期时间管理器 =====
class DateTimeManager {
    static init() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), APP_CONFIG.DATE_UPDATE_INTERVAL);
    }

    static updateDateTime() {
        const now = new Date();
        this.updateTimeDisplay(now);
        this.updateDateDisplay(now);
    }

    static updateTimeDisplay(now) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        DOM_ELEMENTS.currentTime.textContent = `${hours}:${minutes}`;
    }

    static updateDateDisplay(now) {
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        DOM_ELEMENTS.currentDate.textContent = `${month}月${day}日`;
    }
}

// ===== 音频播放器管理器 =====
class AudioPlayerManager {
    static init() {
        this.currentRotation = 0; // 新增：记录当前旋转角度
        this.rotationInterval = null; // 新增：旋转动画的interval
        this.isRotating = false; // 新增：是否正在旋转
        
        this.setupAudioMetadata();
        this.bindEventListeners();
        this.initializePlayerState();
    }

    static setupAudioMetadata() {
        DOM_ELEMENTS.audioPlayer.addEventListener('loadedmetadata', () => {
            DOM_ELEMENTS.durationDisplay.textContent = this.formatTime(DOM_ELEMENTS.audioPlayer.duration);
        });
    }

    static bindEventListeners() {
        DOM_ELEMENTS.playPauseBtn.addEventListener('click', () => this.togglePlayback());
        DOM_ELEMENTS.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        DOM_ELEMENTS.progressBar.addEventListener('click', (e) => this.handleProgressClick(e));
        
        // 音频加载状态
        DOM_ELEMENTS.audioPlayer.addEventListener('waiting', () => {
            DOM_ELEMENTS.albumArt.classList.add('loading');
        });
        
        DOM_ELEMENTS.audioPlayer.addEventListener('canplay', () => {
            DOM_ELEMENTS.albumArt.classList.remove('loading');
        });
    }

    static initializePlayerState() {
        DOM_ELEMENTS.songTitle.textContent = "Circulation(loop)";
        DOM_ELEMENTS.artistName.textContent = "由[乌鸦Producer]提供";
        
        // 初始化旋转角度为0
        this.setRotation(0);
    }

    static togglePlayback() {
        if (DOM_ELEMENTS.audioPlayer.paused) {
            this.playAudio();
        } else {
            this.pauseAudio();
        }
    }

    static playAudio() {
        DOM_ELEMENTS.audioPlayer.play().catch(error => {
            console.error('音频播放失败:', error);
        });
        this.updatePlayButtonState('playing');
        this.startRotation(); // 开始旋转
    }

    static pauseAudio() {
        DOM_ELEMENTS.audioPlayer.pause();
        this.updatePlayButtonState('paused');
        this.stopRotation(); // 停止旋转并保持当前角度
    }

    static updatePlayButtonState(state) {
        const iconPath = state === 'playing' ? "icons/pause.svg" : "icons/play.svg";
        DOM_ELEMENTS.playPauseIcon.src = iconPath;
    }

    // 新增：开始旋转动画
    static startRotation() {
        if (this.isRotating) return;
        
        this.isRotating = true;
        const startTime = Date.now();
        const startRotation = this.currentRotation;
        
        this.rotationInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            // 每20秒旋转360度
            this.currentRotation = startRotation + (elapsed / 20000) * 360;
            this.setRotation(this.currentRotation);
        }, 50); // 每50ms更新一次旋转
    }

    // 新增：停止旋转并保持当前角度
    static stopRotation() {
        if (!this.isRotating) return;
        
        this.isRotating = false;
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
        
        // 保持当前旋转角度
        this.setRotation(this.currentRotation);
    }

    // 新增：设置旋转角度
    static setRotation(degrees) {
        DOM_ELEMENTS.albumArt.style.transform = `rotate(${degrees}deg)`;
    }

    static updateProgress() {
        const currentTime = DOM_ELEMENTS.audioPlayer.currentTime;
        const duration = DOM_ELEMENTS.audioPlayer.duration;
        
        if (!isNaN(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            DOM_ELEMENTS.progress.style.width = `${progressPercent}%`;
            DOM_ELEMENTS.audioCurrentTime.textContent = this.formatTime(currentTime);
        }
    }

    static handleProgressClick(event) {
        const progressBarRect = DOM_ELEMENTS.progressBar.getBoundingClientRect();
        const clickPosition = (event.clientX - progressBarRect.left) / progressBarRect.width;
        DOM_ELEMENTS.audioPlayer.currentTime = clickPosition * DOM_ELEMENTS.audioPlayer.duration;
    }

    static formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// ===== 流星效果管理器 =====
class MeteorEffectManager {
    static init() {
        this.activeMeteors = 0;
        this.container = document.querySelector('.meteors-container');
        this.startMeteorCreation();
    }

    static startMeteorCreation() {
        setInterval(() => this.createMeteor(), APP_CONFIG.METEOR_CREATION_INTERVAL);
    }

    static createMeteor() {
        if (this.activeMeteors >= APP_CONFIG.MAX_METEORS) return;

        this.activeMeteors++;
        const meteor = this.createMeteorElement();
        this.container.appendChild(meteor);

        meteor.addEventListener('animationend', () => {
            meteor.remove();
            this.activeMeteors--;
        });
    }

    static createMeteorElement() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const startX = viewportWidth + 50 + Math.random() * 500;
        const startY = -50 - Math.random() * 300;
        const endX = -50 - Math.random() * 400;
        const endY = viewportHeight + 50 + Math.random() * 500;

        const meteor = document.createElement('div');
        meteor.classList.add('meteor');
        
        meteor.style.cssText = `
            top: ${startY}px;
            left: ${startX}px;
            width: ${80 + Math.random() * 120}px;
            height: ${1 + Math.random() * 2}px;
            background: linear-gradient(to right, 
                transparent, 
                rgba(255, 255, 255, ${0.7 + Math.random() * 0.3}), 
                rgba(200, 220, 255, 0.3),
                transparent);
            animation: meteor-fall ${3 + Math.random() * 2}s linear forwards;
            filter: blur(1px);
            box-shadow: 0 0 10px 2px rgba(180, 220, 255, 0.8);
            transform: rotate(-30deg);
            opacity: 0;
            transform-origin: left center;
        `;

        meteor.style.setProperty('--translate-x', `${endX - startX}px`);
        meteor.style.setProperty('--translate-y', `${endY - startY}px`);

        return meteor;
    }
}

// ===== 布局管理器 =====
class LayoutManager {
    static init() {
        this.adjustLayout();
    }

    static adjustLayout() {
        const isMobileView = window.innerWidth < 768;
        
        if (isMobileView) {
            DOM_ELEMENTS.body.classList.add('mobile-view');
        } else {
            DOM_ELEMENTS.body.classList.remove('mobile-view');
        }
    }
}

// ===== 应用初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    new LoadingManager();
});

// 响应式布局调整
function adjustLayout() {
    if (window.innerWidth < 768) {
        document.body.classList.add('mobile-view');
        
        // 移动端特殊布局调整
        const siteItems = document.querySelectorAll('.site-item');
        siteItems.forEach(item => {
            item.style.minWidth = 'auto';
            item.style.maxWidth = '100%';
        });
        
        // 确保网格容器宽度正确
        const sitesGrid = document.querySelector('.sites-grid');
        if (sitesGrid) {
            sitesGrid.style.width = '100%';
            sitesGrid.style.overflow = 'hidden';
        }
    } else {
        document.body.classList.remove('mobile-view');
        
        // 重置样式
        const siteItems = document.querySelectorAll('.site-item');
        siteItems.forEach(item => {
            item.style.minWidth = '';
            item.style.maxWidth = '';
        });
        
        const sitesGrid = document.querySelector('.sites-grid');
        if (sitesGrid) {
            sitesGrid.style.width = '';
            sitesGrid.style.overflow = '';
        }
    }
}

