/**
 * Main JavaScript for Information Security Management Study Site
 * Handles navigation, theme switching, search, and general interactions
 */

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initThemeToggle();
    initSearch();
    initProgressTracking();
    initLocalStorage();
    updateStudyStatistics();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    // Initialize touch gestures for mobile
    initTouchGestures();
    
    console.log('SG Study Site initialized successfully');
});

/**
 * Navigation functionality
 */
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navDropdowns = document.querySelectorAll('.nav-dropdown');
    
    // Mobile menu toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
            
            // Update hamburger animation
            navToggle.classList.toggle('active');
            
            // Update aria-label
            const newLabel = isExpanded ? 'ナビゲーションメニューを開く' : 'ナビゲーションメニューを閉じる';
            navToggle.setAttribute('aria-label', newLabel);
        });
    }
    
    // Dropdown menus on mobile
    navDropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav-link');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (link && menu) {
            link.addEventListener('click', function(e) {
                if (window.innerWidth <= 767) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                    
                    const isExpanded = dropdown.classList.contains('active');
                    link.setAttribute('aria-expanded', isExpanded);
                }
            });
        }
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-container')) {
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.classList.remove('active');
            
            navDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                const link = dropdown.querySelector('.nav-link');
                if (link) link.setAttribute('aria-expanded', 'false');
            });
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 767) {
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.classList.remove('active');
            
            navDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                const link = dropdown.querySelector('.nav-link');
                if (link) link.setAttribute('aria-expanded', 'false');
            });
        }
    });
    
    // Active navigation highlighting
    highlightActiveNavigation();
}

/**
 * Highlight active navigation item based on current page
 */
function highlightActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        
        const linkPath = new URL(link.href).pathname;
        if (currentPath === linkPath || (linkPath !== '/' && currentPath.startsWith(linkPath))) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * Theme switching functionality
 */
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    
    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Apply initial theme
    if (currentTheme !== 'auto') {
        root.setAttribute('data-theme', currentTheme);
    }
    
    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            // Add transition class for smooth theme change
            document.body.classList.add('theme-changing');
            
            root.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
            
            // Remove transition class after animation
            setTimeout(() => {
                document.body.classList.remove('theme-changing');
            }, 300);
            
            // Update theme toggle aria-label
            const newLabel = currentTheme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え';
            themeToggle.setAttribute('aria-label', newLabel);
            
            // Analytics tracking (if implemented)
            trackEvent('theme_change', { theme: currentTheme });
        });
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            currentTheme = e.matches ? 'dark' : 'light';
            root.setAttribute('data-theme', currentTheme);
        }
    });
}

/**
 * Search functionality
 */
function initSearch() {
    const searchToggle = document.querySelector('.search-toggle');
    const searchOverlay = document.querySelector('.search-overlay');
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    const searchClose = document.querySelector('.search-close');
    const searchResults = document.querySelector('.search-results');
    
    let searchData = null;
    
    // Load search index
    loadSearchIndex();
    
    // Open search overlay
    if (searchToggle && searchOverlay) {
        searchToggle.addEventListener('click', function() {
            openSearch();
        });
    }
    
    // Close search overlay
    if (searchClose) {
        searchClose.addEventListener('click', function() {
            closeSearch();
        });
    }
    
    // Close search when clicking overlay background
    if (searchOverlay) {
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                closeSearch();
            }
        });
    }
    
    // Search input handling
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(this.value);
            }, 300);
        });
        
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(this.value);
            } else if (e.key === 'Escape') {
                closeSearch();
            }
        });
    }
    
    // Search button
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
    }
    
    function openSearch() {
        searchOverlay.classList.add('active');
        searchOverlay.setAttribute('aria-hidden', 'false');
        searchInput.focus();
        document.body.style.overflow = 'hidden';
    }
    
    function closeSearch() {
        searchOverlay.classList.remove('active');
        searchOverlay.setAttribute('aria-hidden', 'true');
        searchInput.value = '';
        searchResults.innerHTML = '';
        document.body.style.overflow = '';
    }
    
    async function loadSearchIndex() {
        try {
            // In a real implementation, this would load from a search index file
            searchData = {
                pages: [
                    { title: '試験情報', url: 'exam-info/', content: '情報セキュリティマネジメント試験 IPA CBT 60問 120分' },
                    { title: '基礎知識', url: 'study/basics/', content: '情報セキュリティ 脅威 脆弱性 リスクマネジメント' },
                    { title: '管理要素', url: 'study/management/', content: 'セキュリティポリシー 組織 人的セキュリティ' },
                    { title: '技術要素', url: 'study/technology/', content: '暗号化 認証 アクセス制御 ネットワークセキュリティ' },
                    { title: '法規・制度', url: 'study/laws/', content: '個人情報保護法 不正アクセス禁止法' },
                    { title: '分野別問題', url: 'practice/category/', content: '問題演習 分野別 練習' },
                    { title: '模擬試験', url: 'practice/mock-exam/', content: '模擬試験 60問 120分 本番形式' },
                    { title: '用語集', url: 'glossary/', content: '用語 辞書 検索' },
                    { title: '学習進捗', url: 'progress/', content: '進捗 統計 学習時間' },
                    { title: '合格体験談', url: 'tips/', content: '体験談 コツ 学習方法' }
                ]
            };
        } catch (error) {
            console.error('Failed to load search index:', error);
        }
    }
    
    function performSearch(query) {
        if (!query.trim() || !searchData) {
            searchResults.innerHTML = '';
            return;
        }
        
        const results = searchData.pages.filter(page => 
            page.title.toLowerCase().includes(query.toLowerCase()) ||
            page.content.toLowerCase().includes(query.toLowerCase())
        );
        
        displaySearchResults(results, query);
        
        // Track search analytics
        trackEvent('search', { query: query, results: results.length });
    }
    
    function displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="search-no-results">検索結果が見つかりませんでした。</p>';
            return;
        }
        
        const resultsHTML = results.map(result => `
            <div class="search-result">
                <h3><a href="${result.url}">${highlightQuery(result.title, query)}</a></h3>
                <p>${highlightQuery(result.content, query)}</p>
                <span class="search-url">${result.url}</span>
            </div>
        `).join('');
        
        searchResults.innerHTML = `
            <p class="search-count">${results.length}件の結果が見つかりました</p>
            ${resultsHTML}
        `;
    }
    
    function highlightQuery(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
}

/**
 * Progress tracking initialization
 */
function initProgressTracking() {
    // Track page view
    trackPageView();
    
    // Track time spent on page
    let startTime = Date.now();
    let isActive = true;
    
    // Track when user becomes inactive
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (isActive) {
                recordStudyTime(Date.now() - startTime);
                isActive = false;
            }
        } else {
            startTime = Date.now();
            isActive = true;
        }
    });
    
    // Track when user leaves page
    window.addEventListener('beforeunload', function() {
        if (isActive) {
            recordStudyTime(Date.now() - startTime);
        }
    });
}

/**
 * Local storage management
 */
function initLocalStorage() {
    // Check if localStorage is available
    if (!isLocalStorageAvailable()) {
        console.warn('LocalStorage is not available');
        return;
    }
    
    // Initialize storage structure if not exists
    if (!localStorage.getItem('sgStudyData')) {
        const initialData = {
            studyTime: {},
            questionStats: {},
            progress: {},
            bookmarks: [],
            settings: {},
            lastVisit: Date.now()
        };
        localStorage.setItem('sgStudyData', JSON.stringify(initialData));
    }
    
    // Update last visit
    updateLastVisit();
}

/**
 * Update study statistics display
 */
function updateStudyStatistics() {
    const studyData = getStudyData();
    
    // Update total study time
    const totalTimeElement = document.getElementById('total-study-time');
    if (totalTimeElement) {
        const totalMinutes = Object.values(studyData.studyTime).reduce((sum, time) => sum + time, 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        totalTimeElement.textContent = `${hours}時間${minutes}分`;
    }
    
    // Update total questions answered
    const totalQuestionsElement = document.getElementById('total-questions');
    if (totalQuestionsElement) {
        const totalQuestions = Object.values(studyData.questionStats).reduce((sum, stat) => sum + stat.total, 0);
        totalQuestionsElement.textContent = `${totalQuestions}問`;
    }
    
    // Update accuracy rate
    const accuracyElement = document.getElementById('accuracy-rate');
    if (accuracyElement) {
        const stats = Object.values(studyData.questionStats);
        const totalCorrect = stats.reduce((sum, stat) => sum + stat.correct, 0);
        const totalAnswered = stats.reduce((sum, stat) => sum + stat.total, 0);
        const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
        accuracyElement.textContent = `${accuracy}%`;
    }
    
    // Update study days
    const studyDaysElement = document.getElementById('study-days');
    if (studyDaysElement) {
        const studyDays = Object.keys(studyData.studyTime).length;
        studyDaysElement.textContent = `${studyDays}日`;
    }
    
    // Update category progress
    updateCategoryProgress(studyData);
}

/**
 * Update category progress bars
 */
function updateCategoryProgress(studyData) {
    const categories = ['基礎知識', '管理要素', '技術要素', '法規・制度'];
    const progressContainer = document.getElementById('category-progress');
    
    if (!progressContainer) return;
    
    categories.forEach((category, index) => {
        const progressItem = progressContainer.children[index];
        if (!progressItem) return;
        
        const progressBar = progressItem.querySelector('.progress-fill');
        const progressValue = progressItem.querySelector('.progress-value');
        
        if (progressBar && progressValue) {
            // Calculate progress based on study data (mock calculation)
            const categoryKey = category.toLowerCase().replace(/[・\s]/g, '_');
            const progress = studyData.progress[categoryKey] || 0;
            
            progressBar.style.width = `${progress}%`;
            progressValue.textContent = `${progress}%`;
        }
    });
}

/**
 * Keyboard shortcuts
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K: Open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchToggle = document.querySelector('.search-toggle');
            if (searchToggle) searchToggle.click();
        }
        
        // Ctrl/Cmd + D: Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            const themeToggle = document.querySelector('.theme-toggle');
            if (themeToggle) themeToggle.click();
        }
        
        // Escape: Close modals/overlays
        if (e.key === 'Escape') {
            const searchOverlay = document.querySelector('.search-overlay');
            if (searchOverlay && searchOverlay.classList.contains('active')) {
                const searchClose = document.querySelector('.search-close');
                if (searchClose) searchClose.click();
            }
        }
    });
}

/**
 * Touch gestures for mobile
 */
function initTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Swipe detection
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                // Swipe right
                handleSwipeRight();
            } else {
                // Swipe left
                handleSwipeLeft();
            }
        }
    });
}

function handleSwipeRight() {
    // Close mobile menu if open
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
    }
}

function handleSwipeLeft() {
    // Could implement navigation or other gestures
}

/**
 * Utility functions
 */

// Check if localStorage is available
function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// Get study data from localStorage
function getStudyData() {
    if (!isLocalStorageAvailable()) return {};
    
    try {
        return JSON.parse(localStorage.getItem('sgStudyData')) || {};
    } catch (e) {
        console.error('Failed to parse study data:', e);
        return {};
    }
}

// Save study data to localStorage
function saveStudyData(data) {
    if (!isLocalStorageAvailable()) return;
    
    try {
        localStorage.setItem('sgStudyData', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save study data:', e);
    }
}

// Record study time
function recordStudyTime(timeSpent) {
    const today = new Date().toISOString().split('T')[0];
    const studyData = getStudyData();
    
    if (!studyData.studyTime) studyData.studyTime = {};
    studyData.studyTime[today] = (studyData.studyTime[today] || 0) + Math.round(timeSpent / 1000 / 60);
    
    saveStudyData(studyData);
}

// Track page view
function trackPageView() {
    const page = window.location.pathname;
    const studyData = getStudyData();
    
    if (!studyData.pageViews) studyData.pageViews = {};
    studyData.pageViews[page] = (studyData.pageViews[page] || 0) + 1;
    
    saveStudyData(studyData);
}

// Update last visit
function updateLastVisit() {
    const studyData = getStudyData();
    studyData.lastVisit = Date.now();
    saveStudyData(studyData);
}

// Track events (for analytics)
function trackEvent(eventName, properties = {}) {
    // In a real implementation, this would send data to analytics service
    console.log('Event tracked:', eventName, properties);
    
    // Store in local analytics for now
    const studyData = getStudyData();
    if (!studyData.analytics) studyData.analytics = [];
    
    studyData.analytics.push({
        event: eventName,
        properties: properties,
        timestamp: Date.now()
    });
    
    // Keep only last 100 events
    if (studyData.analytics.length > 100) {
        studyData.analytics = studyData.analytics.slice(-100);
    }
    
    saveStudyData(studyData);
}

// Export functions for use in other modules
window.SGStudySite = {
    getStudyData,
    saveStudyData,
    recordStudyTime,
    trackEvent,
    updateStudyStatistics
};