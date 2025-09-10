/**
 * Local Storage Management for Information Security Management Study Site
 * Handles data persistence, synchronization, and backup/restore functionality
 */

// Storage keys
const STORAGE_KEYS = {
    STUDY_DATA: 'sgStudyData',
    SETTINGS: 'sgSettings',
    CACHE: 'sgCache',
    BACKUP: 'sgBackup'
};

// Default data structure
const DEFAULT_STUDY_DATA = {
    version: '1.0',
    user: {
        id: null,
        name: '',
        targetExamDate: null,
        studyGoal: 600, // Target score
        createdAt: null
    },
    studyTime: {}, // { date: minutes }
    questionStats: {}, // { category: { total, correct, incorrect, avgTime } }
    progress: {
        basics: 0,
        management: 0,
        technology: 0,
        laws: 0
    },
    bookmarks: [], // Array of bookmarked content
    notes: {}, // { pageId: noteText }
    achievements: [], // Array of unlocked achievements
    streaks: {
        current: 0,
        longest: 0,
        lastStudyDate: null
    },
    mockExamResults: [], // Array of mock exam results
    flashcards: {
        reviewed: [],
        mastered: [],
        difficult: []
    },
    settings: {
        theme: 'auto',
        notifications: true,
        soundEffects: true,
        studyReminders: true,
        reminderTime: '20:00',
        language: 'ja',
        difficulty: 'normal'
    },
    analytics: [],
    lastSync: null,
    lastBackup: null
};

/**
 * Storage Manager Class
 */
class StorageManager {
    constructor() {
        this.isAvailable = this.checkLocalStorageAvailability();
        this.initialize();
    }

    /**
     * Check if localStorage is available
     */
    checkLocalStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('LocalStorage is not available:', e);
            return false;
        }
    }

    /**
     * Initialize storage with default data
     */
    initialize() {
        if (!this.isAvailable) return;

        // Check if study data exists
        if (!this.getData(STORAGE_KEYS.STUDY_DATA)) {
            this.initializeStudyData();
        }

        // Migrate old data if needed
        this.migrateData();

        // Set up periodic cleanup
        this.setupPeriodicCleanup();
    }

    /**
     * Initialize default study data
     */
    initializeStudyData() {
        const initialData = {
            ...DEFAULT_STUDY_DATA,
            user: {
                ...DEFAULT_STUDY_DATA.user,
                id: this.generateUserId(),
                createdAt: Date.now()
            }
        };

        this.setData(STORAGE_KEYS.STUDY_DATA, initialData);
        console.log('Study data initialized');
    }

    /**
     * Get data from localStorage
     */
    getData(key) {
        if (!this.isAvailable) return null;

        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Failed to get data for key ${key}:`, e);
            return null;
        }
    }

    /**
     * Set data to localStorage
     */
    setData(key, data) {
        if (!this.isAvailable) return false;

        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Failed to set data for key ${key}:`, e);
            
            // Handle quota exceeded error
            if (e.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
            }
            
            return false;
        }
    }

    /**
     * Get study data
     */
    getStudyData() {
        return this.getData(STORAGE_KEYS.STUDY_DATA) || DEFAULT_STUDY_DATA;
    }

    /**
     * Update study data
     */
    updateStudyData(updates) {
        const currentData = this.getStudyData();
        const updatedData = this.deepMerge(currentData, updates);
        return this.setData(STORAGE_KEYS.STUDY_DATA, updatedData);
    }

    /**
     * Record study session
     */
    recordStudySession(duration, category = null) {
        const today = new Date().toISOString().split('T')[0];
        const studyData = this.getStudyData();

        // Update study time
        if (!studyData.studyTime[today]) {
            studyData.studyTime[today] = 0;
        }
        studyData.studyTime[today] += Math.round(duration / 1000 / 60); // Convert to minutes

        // Update streak
        this.updateStreak(studyData, today);

        // Update category progress if specified
        if (category && studyData.progress[category] !== undefined) {
            studyData.progress[category] = Math.min(100, studyData.progress[category] + 1);
        }

        return this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
    }

    /**
     * Record question result
     */
    recordQuestionResult(category, isCorrect, timeSpent) {
        const studyData = this.getStudyData();

        if (!studyData.questionStats[category]) {
            studyData.questionStats[category] = {
                total: 0,
                correct: 0,
                incorrect: 0,
                totalTime: 0
            };
        }

        const stats = studyData.questionStats[category];
        stats.total++;
        stats.totalTime += timeSpent;

        if (isCorrect) {
            stats.correct++;
        } else {
            stats.incorrect++;
        }

        return this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
    }

    /**
     * Save mock exam result
     */
    saveMockExamResult(result) {
        const studyData = this.getStudyData();
        
        const examResult = {
            id: this.generateId(),
            score: result.score,
            totalQuestions: result.totalQuestions,
            correctAnswers: result.correctAnswers,
            timeSpent: result.timeSpent,
            categoryScores: result.categoryScores,
            completedAt: Date.now(),
            passed: result.score >= 600
        };

        studyData.mockExamResults.push(examResult);

        // Keep only last 50 results
        if (studyData.mockExamResults.length > 50) {
            studyData.mockExamResults = studyData.mockExamResults.slice(-50);
        }

        // Check for achievements
        this.checkAchievements(studyData, examResult);

        return this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
    }

    /**
     * Manage bookmarks
     */
    toggleBookmark(pageId, title, url) {
        const studyData = this.getStudyData();
        const existingIndex = studyData.bookmarks.findIndex(b => b.pageId === pageId);

        if (existingIndex >= 0) {
            // Remove bookmark
            studyData.bookmarks.splice(existingIndex, 1);
        } else {
            // Add bookmark
            studyData.bookmarks.push({
                pageId,
                title,
                url,
                addedAt: Date.now()
            });
        }

        return this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
    }

    /**
     * Get bookmarks
     */
    getBookmarks() {
        const studyData = this.getStudyData();
        return studyData.bookmarks || [];
    }

    /**
     * Save/update note
     */
    saveNote(pageId, noteText) {
        const studyData = this.getStudyData();
        
        if (noteText.trim() === '') {
            delete studyData.notes[pageId];
        } else {
            studyData.notes[pageId] = {
                text: noteText,
                updatedAt: Date.now()
            };
        }

        return this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
    }

    /**
     * Get note for page
     */
    getNote(pageId) {
        const studyData = this.getStudyData();
        return studyData.notes[pageId] || null;
    }

    /**
     * Export study data
     */
    exportData() {
        const studyData = this.getStudyData();
        const exportData = {
            ...studyData,
            exportedAt: Date.now(),
            version: DEFAULT_STUDY_DATA.version
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import study data
     */
    importData(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            
            // Validate imported data
            if (!this.validateImportedData(importedData)) {
                throw new Error('Invalid data format');
            }

            // Backup current data
            this.createBackup();

            // Merge imported data with current data
            const currentData = this.getStudyData();
            const mergedData = this.mergeImportedData(currentData, importedData);

            return this.setData(STORAGE_KEYS.STUDY_DATA, mergedData);
        } catch (e) {
            console.error('Failed to import data:', e);
            return false;
        }
    }

    /**
     * Create backup
     */
    createBackup() {
        const studyData = this.getStudyData();
        const backup = {
            data: studyData,
            createdAt: Date.now()
        };

        this.setData(STORAGE_KEYS.BACKUP, backup);
        
        // Update last backup timestamp
        this.updateStudyData({ lastBackup: Date.now() });
    }

    /**
     * Restore from backup
     */
    restoreFromBackup() {
        const backup = this.getData(STORAGE_KEYS.BACKUP);
        
        if (!backup || !backup.data) {
            return false;
        }

        return this.setData(STORAGE_KEYS.STUDY_DATA, backup.data);
    }

    /**
     * Clear all data
     */
    clearAllData() {
        if (!this.isAvailable) return false;

        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Reinitialize
            this.initialize();
            return true;
        } catch (e) {
            console.error('Failed to clear data:', e);
            return false;
        }
    }

    /**
     * Get storage usage statistics
     */
    getStorageStats() {
        if (!this.isAvailable) return null;

        const stats = {
            used: 0,
            available: 0,
            total: 0,
            usage: 0
        };

        try {
            // Calculate used space
            let usedSpace = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    usedSpace += localStorage[key].length + key.length;
                }
            }

            stats.used = usedSpace;
            
            // Estimate total available space (5MB typical limit)
            stats.total = 5 * 1024 * 1024; // 5MB in bytes
            stats.available = stats.total - stats.used;
            stats.usage = (stats.used / stats.total) * 100;

            return stats;
        } catch (e) {
            console.error('Failed to get storage stats:', e);
            return null;
        }
    }

    /**
     * Helper methods
     */

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    deepMerge(target, source) {
        const output = Object.assign({}, target);
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    updateStreak(studyData, today) {
        const lastDate = studyData.streaks.lastStudyDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (!lastDate) {
            // First study session
            studyData.streaks.current = 1;
            studyData.streaks.longest = 1;
        } else if (lastDate === yesterdayStr) {
            // Consecutive day
            studyData.streaks.current++;
            studyData.streaks.longest = Math.max(studyData.streaks.longest, studyData.streaks.current);
        } else if (lastDate !== today) {
            // Streak broken
            studyData.streaks.current = 1;
        }

        studyData.streaks.lastStudyDate = today;
    }

    checkAchievements(studyData, examResult) {
        const achievements = [];

        // First exam achievement
        if (studyData.mockExamResults.length === 1) {
            achievements.push({
                id: 'first_exam',
                title: '初回模擬試験完了',
                description: '初めての模擬試験を完了しました',
                unlockedAt: Date.now()
            });
        }

        // High score achievement
        if (examResult.score >= 800) {
            achievements.push({
                id: 'high_score',
                title: '高得点達成',
                description: '800点以上を獲得しました',
                unlockedAt: Date.now()
            });
        }

        // Perfect score achievement
        if (examResult.score === 1000) {
            achievements.push({
                id: 'perfect_score',
                title: '満点達成',
                description: '満点を獲得しました！',
                unlockedAt: Date.now()
            });
        }

        // Add new achievements
        achievements.forEach(achievement => {
            if (!studyData.achievements.find(a => a.id === achievement.id)) {
                studyData.achievements.push(achievement);
            }
        });
    }

    validateImportedData(data) {
        const requiredFields = ['version', 'user', 'studyTime', 'questionStats'];
        return requiredFields.every(field => data.hasOwnProperty(field));
    }

    mergeImportedData(currentData, importedData) {
        // Preserve user ID and creation date
        importedData.user.id = currentData.user.id;
        importedData.user.createdAt = currentData.user.createdAt;

        // Merge study time data
        importedData.studyTime = { ...currentData.studyTime, ...importedData.studyTime };

        // Merge question stats
        Object.keys(importedData.questionStats).forEach(category => {
            if (currentData.questionStats[category]) {
                const current = currentData.questionStats[category];
                const imported = importedData.questionStats[category];
                
                importedData.questionStats[category] = {
                    total: current.total + imported.total,
                    correct: current.correct + imported.correct,
                    incorrect: current.incorrect + imported.incorrect,
                    totalTime: current.totalTime + imported.totalTime
                };
            }
        });

        return importedData;
    }

    migrateData() {
        const studyData = this.getStudyData();
        
        // Add version if missing
        if (!studyData.version) {
            studyData.version = DEFAULT_STUDY_DATA.version;
        }

        // Add missing fields from default data
        const updated = this.deepMerge(DEFAULT_STUDY_DATA, studyData);
        this.setData(STORAGE_KEYS.STUDY_DATA, updated);
    }

    handleQuotaExceeded() {
        console.warn('Storage quota exceeded, attempting cleanup...');
        
        // Clean old analytics data
        const studyData = this.getStudyData();
        if (studyData.analytics && studyData.analytics.length > 50) {
            studyData.analytics = studyData.analytics.slice(-50);
            this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
        }

        // Clean old cache
        localStorage.removeItem(STORAGE_KEYS.CACHE);
        
        console.log('Storage cleanup completed');
    }

    setupPeriodicCleanup() {
        // Clean up old data periodically
        setInterval(() => {
            this.performCleanup();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
    }

    performCleanup() {
        const studyData = this.getStudyData();
        let hasChanges = false;

        // Remove old analytics (keep last 100)
        if (studyData.analytics && studyData.analytics.length > 100) {
            studyData.analytics = studyData.analytics.slice(-100);
            hasChanges = true;
        }

        // Remove old study time data (keep last 365 days)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const cutoffDate = oneYearAgo.toISOString().split('T')[0];

        Object.keys(studyData.studyTime).forEach(date => {
            if (date < cutoffDate) {
                delete studyData.studyTime[date];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.setData(STORAGE_KEYS.STUDY_DATA, studyData);
            console.log('Periodic cleanup completed');
        }
    }
}

// Create global storage manager instance
const storageManager = new StorageManager();

// Export for use in other modules
window.StorageManager = storageManager;