/**
 * Progress Tracking for Information Security Management Study Site
 * Handles study progress visualization, statistics, and learning analytics
 */

/**
 * Progress Tracker Class
 */
class ProgressTracker {
    constructor() {
        this.categories = {
            'basics': '基礎知識',
            'management': '管理要素', 
            'technology': '技術要素',
            'laws': '法規・制度'
        };
        
        this.studyGoals = {
            dailyTime: 60, // minutes
            weeklyTime: 420, // minutes (7 hours)
            targetScore: 600,
            examDate: null
        };
        
        this.init();
    }

    /**
     * Initialize progress tracker
     */
    init() {
        this.loadStudyGoals();
        this.updateAllDisplays();
        this.setupProgressTracking();
        this.scheduleUpdates();
    }

    /**
     * Load study goals from storage
     */
    loadStudyGoals() {
        if (window.StorageManager) {
            const studyData = window.StorageManager.getStudyData();
            if (studyData.user && studyData.user.studyGoal) {
                this.studyGoals.targetScore = studyData.user.studyGoal;
            }
            if (studyData.user && studyData.user.targetExamDate) {
                this.studyGoals.examDate = new Date(studyData.user.targetExamDate);
            }
        }
    }

    /**
     * Set study goal
     */
    setStudyGoal(type, value) {
        this.studyGoals[type] = value;
        
        if (window.StorageManager) {
            const updates = {};
            if (type === 'targetScore') {
                updates.user = { studyGoal: value };
            }
            if (type === 'examDate') {
                updates.user = { targetExamDate: value };
            }
            window.StorageManager.updateStudyData(updates);
        }
    }

    /**
     * Update all progress displays
     */
    updateAllDisplays() {
        this.updateStudyTimeStats();
        this.updateQuestionStats();
        this.updateCategoryProgress();
        this.updateStreakInfo();
        this.updateExamProgress();
        this.updateRecentActivity();
    }

    /**
     * Update study time statistics
     */
    updateStudyTimeStats() {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        
        // Total study time
        const totalMinutes = this.getTotalStudyTime(studyData);
        this.updateElement('total-study-time', this.formatTime(totalMinutes));
        
        // Today's study time
        const today = new Date().toISOString().split('T')[0];
        const todayMinutes = studyData.studyTime[today] || 0;
        this.updateElement('today-study-time', this.formatTime(todayMinutes));
        
        // This week's study time
        const weekMinutes = this.getWeeklyStudyTime(studyData);
        this.updateElement('week-study-time', this.formatTime(weekMinutes));
        
        // Study streak
        const streakDays = studyData.streaks ? studyData.streaks.current : 0;
        this.updateElement('study-days', `${streakDays}日`);
        
        // Progress bars for daily/weekly goals
        this.updateProgressBar('daily-progress', todayMinutes, this.studyGoals.dailyTime);
        this.updateProgressBar('weekly-progress', weekMinutes, this.studyGoals.weeklyTime);
    }

    /**
     * Update question statistics
     */
    updateQuestionStats() {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        const stats = this.calculateQuestionStats(studyData);
        
        this.updateElement('total-questions', `${stats.total}問`);
        this.updateElement('correct-answers', `${stats.correct}問`);
        this.updateElement('accuracy-rate', `${stats.accuracy}%`);
        this.updateElement('average-time', `${stats.avgTime}秒`);
        
        // Update accuracy chart
        this.updateAccuracyChart(studyData);
    }

    /**
     * Update category progress
     */
    updateCategoryProgress() {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        const progressContainer = document.getElementById('category-progress');
        
        if (!progressContainer) return;
        
        Object.keys(this.categories).forEach((key, index) => {
            const categoryName = this.categories[key];
            const progress = this.calculateCategoryProgress(studyData, key);
            
            const progressItem = progressContainer.children[index];
            if (progressItem) {
                const progressBar = progressItem.querySelector('.progress-fill');
                const progressValue = progressItem.querySelector('.progress-value');
                const progressLabel = progressItem.querySelector('.progress-label');
                
                if (progressLabel) progressLabel.textContent = categoryName;
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                    progressBar.style.backgroundColor = this.getProgressColor(progress);
                }
                if (progressValue) progressValue.textContent = `${progress}%`;
            }
        });
    }

    /**
     * Update streak information
     */
    updateStreakInfo() {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        const streaks = studyData.streaks || { current: 0, longest: 0 };
        
        this.updateElement('current-streak', `${streaks.current}日`);
        this.updateElement('longest-streak', `${streaks.longest}日`);
        
        // Update streak visualization
        this.updateStreakCalendar(studyData);
    }

    /**
     * Update exam progress and countdown
     */
    updateExamProgress() {
        if (!this.studyGoals.examDate) return;
        
        const now = new Date();
        const examDate = this.studyGoals.examDate;
        const daysUntilExam = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
        
        this.updateElement('days-until-exam', `${daysUntilExam}日`);
        
        // Calculate readiness score
        const readinessScore = this.calculateReadinessScore();
        this.updateElement('readiness-score', `${readinessScore}%`);
        this.updateProgressBar('readiness-progress', readinessScore, 100);
    }

    /**
     * Update recent activity feed
     */
    updateRecentActivity() {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        const activities = this.generateRecentActivities(studyData);
        
        const activityContainer = document.getElementById('recent-activities');
        if (!activityContainer) return;
        
        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Record study session
     */
    recordStudySession(duration, category = null, topics = []) {
        if (!window.StorageManager) return;
        
        // Record in storage
        window.StorageManager.recordStudySession(duration, category);
        
        // Track progress for topics
        if (topics.length > 0) {
            this.updateTopicProgress(topics);
        }
        
        // Update displays
        this.updateAllDisplays();
        
        // Check for achievements
        this.checkStudyAchievements(duration, category);
        
        // Analytics tracking
        if (window.SGStudySite) {
            window.SGStudySite.trackEvent('study_session', {
                duration: duration,
                category: category,
                topics: topics
            });
        }
    }

    /**
     * Record question attempt
     */
    recordQuestionAttempt(questionId, category, isCorrect, timeSpent, difficulty = 'normal') {
        if (!window.StorageManager) return;
        
        // Record in storage
        window.StorageManager.recordQuestionResult(category, isCorrect, timeSpent);
        
        // Update category progress based on performance
        this.updateCategoryProgressFromQuestion(category, isCorrect, difficulty);
        
        // Update displays
        this.updateAllDisplays();
        
        // Analytics tracking
        if (window.SGStudySite) {
            window.SGStudySite.trackEvent('question_attempt', {
                questionId: questionId,
                category: category,
                isCorrect: isCorrect,
                timeSpent: timeSpent,
                difficulty: difficulty
            });
        }
    }

    /**
     * Calculate study statistics
     */
    calculateStudyStats() {
        if (!window.StorageManager) return {};
        
        const studyData = window.StorageManager.getStudyData();
        
        return {
            totalTime: this.getTotalStudyTime(studyData),
            totalSessions: Object.keys(studyData.studyTime).length,
            averageSessionTime: this.getAverageSessionTime(studyData),
            longestSession: this.getLongestSession(studyData),
            currentStreak: studyData.streaks ? studyData.streaks.current : 0,
            longestStreak: studyData.streaks ? studyData.streaks.longest : 0,
            questionStats: this.calculateQuestionStats(studyData),
            categoryProgress: this.calculateAllCategoryProgress(studyData),
            examReadiness: this.calculateReadinessScore()
        };
    }

    /**
     * Helper methods
     */

    getTotalStudyTime(studyData) {
        return Object.values(studyData.studyTime || {}).reduce((sum, time) => sum + time, 0);
    }

    getWeeklyStudyTime(studyData) {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        
        let weeklyTime = 0;
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            weeklyTime += studyData.studyTime[dateStr] || 0;
        }
        
        return weeklyTime;
    }

    getAverageSessionTime(studyData) {
        const sessions = Object.values(studyData.studyTime || {});
        return sessions.length > 0 ? Math.round(sessions.reduce((sum, time) => sum + time, 0) / sessions.length) : 0;
    }

    getLongestSession(studyData) {
        const sessions = Object.values(studyData.studyTime || {});
        return sessions.length > 0 ? Math.max(...sessions) : 0;
    }

    calculateQuestionStats(studyData) {
        const allStats = Object.values(studyData.questionStats || {});
        
        const total = allStats.reduce((sum, stat) => sum + stat.total, 0);
        const correct = allStats.reduce((sum, stat) => sum + stat.correct, 0);
        const totalTime = allStats.reduce((sum, stat) => sum + stat.totalTime, 0);
        
        return {
            total: total,
            correct: correct,
            incorrect: total - correct,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
            avgTime: total > 0 ? Math.round(totalTime / total / 1000) : 0
        };
    }

    calculateCategoryProgress(studyData, category) {
        // Calculate progress based on study time and question performance
        const studyTime = this.getCategoryStudyTime(studyData, category);
        const questionStats = studyData.questionStats[category];
        
        let progress = 0;
        
        // 40% weight for study time (assuming 5 hours = 100%)
        const timeProgress = Math.min(100, (studyTime / 300) * 100);
        progress += timeProgress * 0.4;
        
        // 60% weight for question performance
        if (questionStats && questionStats.total > 0) {
            const accuracyProgress = (questionStats.correct / questionStats.total) * 100;
            const volumeProgress = Math.min(100, (questionStats.total / 50) * 100);
            progress += (accuracyProgress * 0.4 + volumeProgress * 0.2);
        }
        
        return Math.round(Math.min(100, progress));
    }

    calculateAllCategoryProgress(studyData) {
        const progress = {};
        Object.keys(this.categories).forEach(key => {
            progress[key] = this.calculateCategoryProgress(studyData, key);
        });
        return progress;
    }

    getCategoryStudyTime(studyData, category) {
        // In a real implementation, this would track time per category
        // For now, estimate based on overall progress
        const totalTime = this.getTotalStudyTime(studyData);
        return Math.round(totalTime / 4); // Assume even distribution
    }

    calculateReadinessScore() {
        if (!window.StorageManager) return 0;
        
        const studyData = window.StorageManager.getStudyData();
        const categoryProgress = this.calculateAllCategoryProgress(studyData);
        const questionStats = this.calculateQuestionStats(studyData);
        
        // Weight different factors
        const avgCategoryProgress = Object.values(categoryProgress).reduce((sum, prog) => sum + prog, 0) / 4;
        const accuracyScore = questionStats.accuracy;
        const volumeScore = Math.min(100, (questionStats.total / 200) * 100); // 200 questions = 100%
        
        const readiness = (avgCategoryProgress * 0.4) + (accuracyScore * 0.4) + (volumeScore * 0.2);
        return Math.round(readiness);
    }

    updateCategoryProgressFromQuestion(category, isCorrect, difficulty) {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        
        // Adjust progress based on question performance
        let progressIncrease = isCorrect ? 1 : 0.5;
        
        // Adjust for difficulty
        if (difficulty === 'easy') progressIncrease *= 0.5;
        else if (difficulty === 'hard') progressIncrease *= 1.5;
        
        if (!studyData.progress[category]) {
            studyData.progress[category] = 0;
        }
        
        studyData.progress[category] = Math.min(100, studyData.progress[category] + progressIncrease);
        window.StorageManager.updateStudyData({ progress: studyData.progress });
    }

    updateTopicProgress(topics) {
        // Track progress for specific topics within categories
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        if (!studyData.topicProgress) {
            studyData.topicProgress = {};
        }
        
        topics.forEach(topic => {
            if (!studyData.topicProgress[topic]) {
                studyData.topicProgress[topic] = 0;
            }
            studyData.topicProgress[topic] = Math.min(100, studyData.topicProgress[topic] + 5);
        });
        
        window.StorageManager.updateStudyData({ topicProgress: studyData.topicProgress });
    }

    checkStudyAchievements(duration, category) {
        if (!window.StorageManager) return;
        
        const studyData = window.StorageManager.getStudyData();
        const achievements = [];
        
        // First study session
        if (this.getTotalStudyTime(studyData) <= duration) {
            achievements.push({
                id: 'first_study',
                title: '学習開始',
                description: '初回学習セッションを完了しました',
                icon: '🎯'
            });
        }
        
        // Study streak achievements
        const currentStreak = studyData.streaks ? studyData.streaks.current : 0;
        if (currentStreak === 7) {
            achievements.push({
                id: 'week_streak',
                title: '一週間継続',
                description: '7日間連続で学習しました',
                icon: '🔥'
            });
        } else if (currentStreak === 30) {
            achievements.push({
                id: 'month_streak',
                title: '一ヶ月継続',
                description: '30日間連続で学習しました',
                icon: '🏆'
            });
        }
        
        // Total study time achievements
        const totalHours = Math.floor(this.getTotalStudyTime(studyData) / 60);
        if (totalHours === 10) {
            achievements.push({
                id: 'ten_hours',
                title: '10時間達成',
                description: '総学習時間10時間を達成しました',
                icon: '⏰'
            });
        } else if (totalHours === 50) {
            achievements.push({
                id: 'fifty_hours',
                title: '50時間達成',
                description: '総学習時間50時間を達成しました',
                icon: '🌟'
            });
        }
        
        // Add achievements to storage
        if (achievements.length > 0) {
            achievements.forEach(achievement => {
                achievement.unlockedAt = Date.now();
            });
            
            if (!studyData.achievements) studyData.achievements = [];
            studyData.achievements.push(...achievements);
            window.StorageManager.updateStudyData({ achievements: studyData.achievements });
            
            // Show achievement notifications
            this.showAchievementNotifications(achievements);
        }
    }

    showAchievementNotifications(achievements) {
        achievements.forEach(achievement => {
            this.showNotification(`🎉 ${achievement.title}`, achievement.description, 'success');
        });
    }

    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">×</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    generateRecentActivities(studyData) {
        const activities = [];
        
        // Add study sessions
        Object.entries(studyData.studyTime || {}).slice(-5).forEach(([date, time]) => {
            activities.push({
                type: 'study',
                icon: '📚',
                title: `${this.formatTime(time)}の学習`,
                time: this.formatDate(date)
            });
        });
        
        // Add mock exam results
        if (studyData.mockExamResults) {
            studyData.mockExamResults.slice(-3).forEach(result => {
                activities.push({
                    type: 'exam',
                    icon: result.passed ? '🎯' : '📝',
                    title: `模擬試験: ${result.score}点`,
                    time: this.formatDate(new Date(result.completedAt))
                });
            });
        }
        
        // Sort by time and return latest 10
        return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
    }

    updateAccuracyChart(studyData) {
        // Update accuracy visualization chart
        const chartContainer = document.getElementById('accuracy-chart');
        if (!chartContainer) return;
        
        const categories = Object.keys(this.categories);
        const chartHTML = categories.map(category => {
            const stats = studyData.questionStats[category];
            const accuracy = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            
            return `
                <div class="chart-item">
                    <div class="chart-label">${this.categories[category]}</div>
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${accuracy}%; background-color: ${this.getProgressColor(accuracy)}"></div>
                    </div>
                    <div class="chart-value">${accuracy}%</div>
                </div>
            `;
        }).join('');
        
        chartContainer.innerHTML = chartHTML;
    }

    updateStreakCalendar(studyData) {
        const calendarContainer = document.getElementById('streak-calendar');
        if (!calendarContainer) return;
        
        // Generate last 30 days
        const today = new Date();
        const days = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const studyTime = studyData.studyTime[dateStr] || 0;
            
            days.push({
                date: dateStr,
                day: date.getDate(),
                hasStudy: studyTime > 0,
                studyTime: studyTime
            });
        }
        
        const calendarHTML = days.map(day => `
            <div class="calendar-day ${day.hasStudy ? 'has-study' : ''}" 
                 title="${day.date}: ${this.formatTime(day.studyTime)}">
                ${day.day}
            </div>
        `).join('');
        
        calendarContainer.innerHTML = calendarHTML;
    }

    setupProgressTracking() {
        // Set up automatic progress updates
        this.trackPageTime();
        this.trackScrollProgress();
    }

    trackPageTime() {
        let startTime = Date.now();
        let isActive = true;
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (isActive) {
                    const timeSpent = Date.now() - startTime;
                    this.recordPageTime(timeSpent);
                    isActive = false;
                }
            } else {
                startTime = Date.now();
                isActive = true;
            }
        });
        
        window.addEventListener('beforeunload', () => {
            if (isActive) {
                const timeSpent = Date.now() - startTime;
                this.recordPageTime(timeSpent);
            }
        });
    }

    recordPageTime(timeSpent) {
        if (timeSpent > 10000) { // Only record if more than 10 seconds
            const category = this.getCurrentPageCategory();
            if (category) {
                this.recordStudySession(timeSpent, category);
            }
        }
    }

    getCurrentPageCategory() {
        const path = window.location.pathname;
        if (path.includes('/study/basics/')) return 'basics';
        if (path.includes('/study/management/')) return 'management';
        if (path.includes('/study/technology/')) return 'technology';
        if (path.includes('/study/laws/')) return 'laws';
        return null;
    }

    trackScrollProgress() {
        let maxScroll = 0;
        
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            maxScroll = Math.max(maxScroll, scrollPercent);
        });
        
        window.addEventListener('beforeunload', () => {
            if (maxScroll > 80) { // If scrolled more than 80%, consider as engaged reading
                if (window.SGStudySite) {
                    window.SGStudySite.trackEvent('content_engagement', {
                        page: window.location.pathname,
                        scrollPercent: maxScroll,
                        engagementLevel: 'high'
                    });
                }
            }
        });
    }

    scheduleUpdates() {
        // Update displays every minute
        setInterval(() => {
            this.updateStudyTimeStats();
            this.updateExamProgress();
        }, 60000);
        
        // Update everything every 5 minutes
        setInterval(() => {
            this.updateAllDisplays();
        }, 300000);
    }

    // Utility methods

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    updateProgressBar(id, current, max) {
        const progressBar = document.getElementById(id);
        if (progressBar) {
            const percentage = Math.min(100, (current / max) * 100);
            const fill = progressBar.querySelector('.progress-fill');
            if (fill) {
                fill.style.width = `${percentage}%`;
                fill.style.backgroundColor = this.getProgressColor(percentage);
            }
        }
    }

    getProgressColor(percentage) {
        if (percentage < 30) return '#f44336'; // Red
        if (percentage < 60) return '#ff9800'; // Orange
        if (percentage < 80) return '#2196f3'; // Blue
        return '#4caf50'; // Green
    }

    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}時間${mins}分`;
        }
        return `${mins}分`;
    }

    formatDate(date) {
        if (typeof date === 'string') {
            return new Date(date).toLocaleDateString('ja-JP');
        }
        return date.toLocaleDateString('ja-JP');
    }
}

// Initialize progress tracker
document.addEventListener('DOMContentLoaded', () => {
    window.ProgressTracker = new ProgressTracker();
});

// Export for use in other modules
window.ProgressTracker = ProgressTracker;