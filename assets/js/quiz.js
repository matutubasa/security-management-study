/**
 * Quiz System for Information Security Management Study Site
 * Handles practice questions, mock exams, and interactive learning
 */

/**
 * Quiz Engine Class
 */
class QuizEngine {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestion = 0;
        this.answers = [];
        this.startTime = null;
        this.timeRemaining = 0;
        this.isTimerActive = false;
        this.questionTimer = null;
        this.quizTimer = null;
        
        // Quiz settings
        this.settings = {
            showExplanation: true,
            showProgress: true,
            shuffleQuestions: true,
            shuffleOptions: true,
            timeLimit: 120, // minutes for mock exam
            questionTimeLimit: 3 // minutes per question
        };
        
        this.init();
    }

    /**
     * Initialize quiz engine
     */
    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.loadQuestionDatabase();
    }

    /**
     * Load quiz settings from storage
     */
    loadSettings() {
        if (window.StorageManager) {
            const studyData = window.StorageManager.getStudyData();
            if (studyData.settings && studyData.settings.quiz) {
                this.settings = { ...this.settings, ...studyData.settings.quiz };
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Answer selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="answer"]')) {
                this.selectAnswer(e.target.value);
            }
        });

        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quiz-next')) {
                this.nextQuestion();
            } else if (e.target.matches('.quiz-prev')) {
                this.previousQuestion();
            } else if (e.target.matches('.quiz-submit')) {
                this.submitQuiz();
            } else if (e.target.matches('.quiz-restart')) {
                this.restartQuiz();
            } else if (e.target.matches('.quiz-review')) {
                this.reviewAnswers();
            } else if (e.target.matches('.start-quiz')) {
                const category = e.target.dataset.category;
                const type = e.target.dataset.type || 'practice';
                this.startQuiz(category, type);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.currentQuiz) {
                this.handleKeyboardShortcuts(e);
            }
        });
    }

    /**
     * Load question database
     */
    async loadQuestionDatabase() {
        try {
            // In a real implementation, this would load from external files
            this.questionDatabase = this.generateSampleQuestions();
            console.log('Question database loaded');
        } catch (error) {
            console.error('Failed to load question database:', error);
        }
    }

    /**
     * Start a quiz
     */
    startQuiz(category, type = 'practice', customQuestions = null) {
        // Prepare quiz data
        let questions = customQuestions || this.getQuestionsByCategory(category, type);
        
        if (this.settings.shuffleQuestions) {
            questions = this.shuffleArray([...questions]);
        }

        // Initialize quiz state
        this.currentQuiz = {
            id: this.generateQuizId(),
            category: category,
            type: type,
            questions: questions,
            startTime: Date.now(),
            timeLimit: type === 'mock' ? this.settings.timeLimit * 60 * 1000 : null,
            settings: { ...this.settings }
        };

        this.currentQuestion = 0;
        this.answers = new Array(questions.length).fill(null);
        this.startTime = Date.now();

        // Setup UI
        this.setupQuizUI();
        this.displayQuestion();

        // Start timers
        if (this.currentQuiz.timeLimit) {
            this.startTimer();
        }

        // Track quiz start
        this.trackQuizEvent('quiz_started', {
            category: category,
            type: type,
            questionCount: questions.length
        });
    }

    /**
     * Setup quiz UI
     */
    setupQuizUI() {
        const quizContainer = document.getElementById('quiz-container');
        if (!quizContainer) return;

        quizContainer.innerHTML = `
            <div class="quiz-header">
                <div class="quiz-info">
                    <h2 class="quiz-title">${this.getQuizTitle()}</h2>
                    <div class="quiz-meta">
                        <span class="question-counter">
                            問題 <span id="current-question">1</span> / <span id="total-questions">${this.currentQuiz.questions.length}</span>
                        </span>
                        ${this.currentQuiz.timeLimit ? '<span class="quiz-timer" id="quiz-timer">00:00</span>' : ''}
                    </div>
                </div>
                <div class="quiz-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="quiz-progress"></div>
                    </div>
                </div>
            </div>

            <div class="quiz-content">
                <div class="question-container" id="question-container">
                    <!-- Question content will be inserted here -->
                </div>
                
                <div class="quiz-controls">
                    <button class="btn btn-outline quiz-prev" disabled>前の問題</button>
                    <div class="quiz-actions">
                        <button class="btn btn-outline quiz-bookmark" title="ブックマーク">🔖</button>
                        <button class="btn btn-outline quiz-hint" title="ヒント">💡</button>
                    </div>
                    <button class="btn btn-primary quiz-next">次の問題</button>
                </div>
            </div>

            <div class="quiz-sidebar">
                <div class="question-navigator">
                    <h4>問題一覧</h4>
                    <div class="question-grid" id="question-grid">
                        ${this.generateQuestionGrid()}
                    </div>
                </div>
                
                <div class="quiz-stats">
                    <h4>統計</h4>
                    <div class="stat-item">
                        <span class="stat-label">回答済み</span>
                        <span class="stat-value" id="answered-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">未回答</span>
                        <span class="stat-value" id="unanswered-count">${this.currentQuiz.questions.length}</span>
                    </div>
                    ${this.currentQuiz.timeLimit ? `
                    <div class="stat-item">
                        <span class="stat-label">残り時間</span>
                        <span class="stat-value" id="time-remaining">--:--</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Show quiz container
        quizContainer.style.display = 'block';
    }

    /**
     * Display current question
     */
    displayQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestion];
        const container = document.getElementById('question-container');
        
        if (!container || !question) return;

        // Shuffle options if setting is enabled
        const options = this.settings.shuffleOptions ? 
            this.shuffleArray([...question.options]) : question.options;

        container.innerHTML = `
            <div class="question">
                <div class="question-header">
                    <div class="question-category">${this.getCategoryName(question.category)}</div>
                    <div class="question-difficulty ${question.difficulty}">${this.getDifficultyText(question.difficulty)}</div>
                </div>
                
                <div class="question-text">
                    <h3>${question.question}</h3>
                    ${question.image ? `<img src="${question.image}" alt="問題図" class="question-image">` : ''}
                </div>
                
                <div class="question-options">
                    ${options.map((option, index) => `
                        <label class="option-label">
                            <input type="radio" name="answer" value="${option.id}" 
                                   ${this.answers[this.currentQuestion] === option.id ? 'checked' : ''}>
                            <span class="option-text">
                                <span class="option-number">${String.fromCharCode(65 + index)}</span>
                                ${option.text}
                            </span>
                        </label>
                    `).join('')}
                </div>
                
                ${question.hint ? `
                <div class="question-hint" id="question-hint" style="display: none;">
                    <div class="hint-header">💡 ヒント</div>
                    <div class="hint-content">${question.hint}</div>
                </div>
                ` : ''}
            </div>
        `;

        // Update UI elements
        this.updateQuizUI();
    }

    /**
     * Update quiz UI elements
     */
    updateQuizUI() {
        // Update question counter
        document.getElementById('current-question').textContent = this.currentQuestion + 1;
        
        // Update progress bar
        const progress = ((this.currentQuestion + 1) / this.currentQuiz.questions.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progress}%`;
        
        // Update navigation buttons
        const prevBtn = document.querySelector('.quiz-prev');
        const nextBtn = document.querySelector('.quiz-next');
        
        if (prevBtn) prevBtn.disabled = this.currentQuestion === 0;
        if (nextBtn) {
            if (this.currentQuestion === this.currentQuiz.questions.length - 1) {
                nextBtn.textContent = '解答完了';
                nextBtn.classList.remove('btn-primary');
                nextBtn.classList.add('btn-success');
            } else {
                nextBtn.textContent = '次の問題';
                nextBtn.classList.add('btn-primary');
                nextBtn.classList.remove('btn-success');
            }
        }
        
        // Update question grid
        this.updateQuestionGrid();
        
        // Update statistics
        this.updateQuizStats();
    }

    /**
     * Select answer for current question
     */
    selectAnswer(answerId) {
        this.answers[this.currentQuestion] = answerId;
        this.updateQuizUI();
        
        // Track answer time
        const currentTime = Date.now();
        const timeSpent = currentTime - (this.questionStartTime || this.startTime);
        
        // Record answer attempt
        if (window.ProgressTracker) {
            const question = this.currentQuiz.questions[this.currentQuestion];
            const isCorrect = answerId === question.correctAnswer;
            window.ProgressTracker.recordQuestionAttempt(
                question.id,
                question.category,
                isCorrect,
                timeSpent,
                question.difficulty
            );
        }
    }

    /**
     * Navigate to next question
     */
    nextQuestion() {
        if (this.currentQuestion < this.currentQuiz.questions.length - 1) {
            this.currentQuestion++;
            this.displayQuestion();
            this.questionStartTime = Date.now();
        } else {
            this.submitQuiz();
        }
    }

    /**
     * Navigate to previous question
     */
    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.displayQuestion();
            this.questionStartTime = Date.now();
        }
    }

    /**
     * Jump to specific question
     */
    jumpToQuestion(questionIndex) {
        if (questionIndex >= 0 && questionIndex < this.currentQuiz.questions.length) {
            this.currentQuestion = questionIndex;
            this.displayQuestion();
            this.questionStartTime = Date.now();
        }
    }

    /**
     * Submit quiz and show results
     */
    submitQuiz() {
        // Stop timers
        this.stopTimer();

        // Calculate results
        const results = this.calculateResults();

        // Save results
        this.saveQuizResults(results);

        // Show results screen
        this.showResults(results);

        // Track quiz completion
        this.trackQuizEvent('quiz_completed', {
            category: this.currentQuiz.category,
            type: this.currentQuiz.type,
            score: results.score,
            percentage: results.percentage,
            timeSpent: results.timeSpent
        });
    }

    /**
     * Calculate quiz results
     */
    calculateResults() {
        const questions = this.currentQuiz.questions;
        const answers = this.answers;
        
        let correct = 0;
        let categoryScores = {};
        const questionResults = [];

        // Initialize category scores
        questions.forEach(q => {
            if (!categoryScores[q.category]) {
                categoryScores[q.category] = { correct: 0, total: 0 };
            }
            categoryScores[q.category].total++;
        });

        // Calculate scores
        questions.forEach((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            if (isCorrect) {
                correct++;
                categoryScores[question.category].correct++;
            }

            questionResults.push({
                questionIndex: index,
                question: question,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect
            });
        });

        // Calculate final score (standard formula: correct/total * 1000)
        const percentage = (correct / questions.length) * 100;
        const score = Math.round(percentage * 10); // Convert to 1000-point scale

        const endTime = Date.now();
        const timeSpent = endTime - this.currentQuiz.startTime;

        return {
            totalQuestions: questions.length,
            correctAnswers: correct,
            incorrectAnswers: questions.length - correct,
            percentage: Math.round(percentage),
            score: score,
            timeSpent: timeSpent,
            categoryScores: categoryScores,
            questionResults: questionResults,
            passed: score >= 600
        };
    }

    /**
     * Show quiz results
     */
    showResults(results) {
        const quizContainer = document.getElementById('quiz-container');
        if (!quizContainer) return;

        const passedClass = results.passed ? 'passed' : 'failed';
        const passedText = results.passed ? '合格' : '不合格';
        const passedIcon = results.passed ? '🎉' : '📝';

        quizContainer.innerHTML = `
            <div class="quiz-results ${passedClass}">
                <div class="results-header">
                    <div class="results-icon">${passedIcon}</div>
                    <h2 class="results-title">${this.getQuizTitle()} - 結果</h2>
                    <div class="results-status ${passedClass}">${passedText}</div>
                </div>

                <div class="results-summary">
                    <div class="result-card main-score">
                        <div class="score-display">
                            <div class="score-number">${results.score}</div>
                            <div class="score-label">点</div>
                        </div>
                        <div class="score-details">
                            <div class="percentage">${results.percentage}%正解</div>
                            <div class="fraction">${results.correctAnswers} / ${results.totalQuestions}問正解</div>
                        </div>
                    </div>

                    <div class="result-card time-info">
                        <div class="result-label">所要時間</div>
                        <div class="result-value">${this.formatTime(results.timeSpent)}</div>
                    </div>

                    <div class="result-card accuracy-info">
                        <div class="result-label">正答率</div>
                        <div class="result-value">${results.percentage}%</div>
                    </div>
                </div>

                <div class="category-breakdown">
                    <h3>分野別成績</h3>
                    <div class="category-results">
                        ${Object.entries(results.categoryScores).map(([category, scores]) => `
                            <div class="category-result">
                                <div class="category-name">${this.getCategoryName(category)}</div>
                                <div class="category-score">
                                    ${scores.correct} / ${scores.total}問
                                    (${Math.round((scores.correct / scores.total) * 100)}%)
                                </div>
                                <div class="category-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${(scores.correct / scores.total) * 100}%"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="results-actions">
                    <button class="btn btn-primary quiz-review">解答解説を見る</button>
                    <button class="btn btn-outline quiz-restart">もう一度挑戦</button>
                    <button class="btn btn-outline" onclick="location.href='${this.getReturnUrl()}'">戻る</button>
                </div>

                ${this.generateRecommendations(results)}
            </div>
        `;
    }

    /**
     * Review answers with explanations
     */
    reviewAnswers() {
        const quizContainer = document.getElementById('quiz-container');
        if (!quizContainer) return;

        const results = this.calculateResults();
        
        quizContainer.innerHTML = `
            <div class="quiz-review">
                <div class="review-header">
                    <h2>解答解説</h2>
                    <div class="review-summary">
                        正解: ${results.correctAnswers}問 / 不正解: ${results.incorrectAnswers}問
                    </div>
                </div>

                <div class="review-content">
                    ${results.questionResults.map((result, index) => this.generateQuestionReview(result, index)).join('')}
                </div>

                <div class="review-actions">
                    <button class="btn btn-outline quiz-restart">もう一度挑戦</button>
                    <button class="btn btn-outline" onclick="location.href='${this.getReturnUrl()}'">戻る</button>
                </div>
            </div>
        `;
    }

    /**
     * Generate question review HTML
     */
    generateQuestionReview(result, index) {
        const question = result.question;
        const userOption = question.options.find(opt => opt.id === result.userAnswer);
        const correctOption = question.options.find(opt => opt.id === result.correctAnswer);
        
        const statusClass = result.isCorrect ? 'correct' : 'incorrect';
        const statusIcon = result.isCorrect ? '✅' : '❌';

        return `
            <div class="question-review ${statusClass}">
                <div class="review-question-header">
                    <span class="question-number">問題 ${index + 1}</span>
                    <span class="question-status">${statusIcon}</span>
                    <span class="question-category">${this.getCategoryName(question.category)}</span>
                </div>

                <div class="review-question-text">
                    <h4>${question.question}</h4>
                    ${question.image ? `<img src="${question.image}" alt="問題図" class="question-image">` : ''}
                </div>

                <div class="review-answers">
                    <div class="answer-comparison">
                        <div class="user-answer">
                            <strong>あなたの回答:</strong>
                            ${userOption ? userOption.text : '未回答'}
                        </div>
                        <div class="correct-answer">
                            <strong>正解:</strong>
                            ${correctOption.text}
                        </div>
                    </div>
                </div>

                ${question.explanation ? `
                    <div class="explanation">
                        <h5>解説</h5>
                        <p>${question.explanation}</p>
                    </div>
                ` : ''}

                ${question.reference ? `
                    <div class="reference">
                        <strong>参考:</strong> ${question.reference}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Generate recommendations based on results
     */
    generateRecommendations(results) {
        const recommendations = [];
        
        // Overall performance recommendations
        if (results.percentage < 60) {
            recommendations.push({
                type: 'study',
                title: '基礎学習の強化が必要です',
                description: '基礎知識の学習を重点的に行いましょう。',
                action: '基礎学習へ',
                url: '/study/basics/'
            });
        } else if (results.percentage < 80) {
            recommendations.push({
                type: 'practice',
                title: '問題演習で実力アップ',
                description: '分野別問題でさらなる向上を目指しましょう。',
                action: '分野別問題へ',
                url: '/practice/category/'
            });
        }

        // Category-specific recommendations
        Object.entries(results.categoryScores).forEach(([category, scores]) => {
            const percentage = (scores.correct / scores.total) * 100;
            if (percentage < 70) {
                recommendations.push({
                    type: 'category',
                    title: `${this.getCategoryName(category)}の学習が必要`,
                    description: 'この分野の理解を深めましょう。',
                    action: '学習する',
                    url: `/study/${category}/`
                });
            }
        });

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'excellent',
                title: '素晴らしい成績です！',
                description: '継続して学習を続けましょう。',
                action: '次の模擬試験へ',
                url: '/practice/mock-exam/'
            });
        }

        return `
            <div class="recommendations">
                <h3>学習アドバイス</h3>
                <div class="recommendation-list">
                    ${recommendations.map(rec => `
                        <div class="recommendation ${rec.type}">
                            <div class="recommendation-content">
                                <h4>${rec.title}</h4>
                                <p>${rec.description}</p>
                            </div>
                            <a href="${rec.url}" class="btn btn-outline">${rec.action}</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Save quiz results to storage
     */
    saveQuizResults(results) {
        if (!window.StorageManager) return;

        if (this.currentQuiz.type === 'mock') {
            window.StorageManager.saveMockExamResult(results);
        }

        // Save individual question stats
        results.questionResults.forEach(result => {
            window.StorageManager.recordQuestionResult(
                result.question.category,
                result.isCorrect,
                2000 // Estimated time per question
            );
        });
    }

    /**
     * Start quiz timer
     */
    startTimer() {
        if (!this.currentQuiz.timeLimit) return;

        this.timeRemaining = this.currentQuiz.timeLimit;
        this.isTimerActive = true;

        this.quizTimer = setInterval(() => {
            this.timeRemaining -= 1000;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.submitQuiz();
            }
        }, 1000);
    }

    /**
     * Stop quiz timer
     */
    stopTimer() {
        if (this.quizTimer) {
            clearInterval(this.quizTimer);
            this.quizTimer = null;
        }
        this.isTimerActive = false;
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('quiz-timer');
        if (!timerElement) return;

        const minutes = Math.floor(this.timeRemaining / 60000);
        const seconds = Math.floor((this.timeRemaining % 60000) / 1000);
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Add warning colors
        if (this.timeRemaining < 300000) { // Less than 5 minutes
            timerElement.classList.add('warning');
        }
        if (this.timeRemaining < 60000) { // Less than 1 minute
            timerElement.classList.add('danger');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousQuestion();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextQuestion();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                e.preventDefault();
                const optionIndex = parseInt(e.key) - 1;
                const options = document.querySelectorAll('input[name="answer"]');
                if (options[optionIndex]) {
                    options[optionIndex].checked = true;
                    this.selectAnswer(options[optionIndex].value);
                }
                break;
        }
    }

    /**
     * Utility methods
     */

    getQuestionsByCategory(category, type) {
        let questions = this.questionDatabase.filter(q => 
            category === 'all' || q.category === category
        );

        if (type === 'mock') {
            // For mock exams, select 60 questions with balanced distribution
            questions = this.selectMockExamQuestions(questions);
        } else {
            // For practice, limit to 10-20 questions
            questions = questions.slice(0, 20);
        }

        return questions;
    }

    selectMockExamQuestions(allQuestions) {
        const categories = ['basics', 'management', 'technology', 'laws'];
        const questionsPerCategory = 15; // 60 questions / 4 categories
        const selected = [];

        categories.forEach(category => {
            const categoryQuestions = allQuestions.filter(q => q.category === category);
            const shuffled = this.shuffleArray([...categoryQuestions]);
            selected.push(...shuffled.slice(0, questionsPerCategory));
        });

        return this.shuffleArray(selected);
    }

    generateQuestionGrid() {
        const questions = this.currentQuiz.questions;
        return questions.map((q, index) => `
            <button class="question-nav-btn" data-question="${index}">
                ${index + 1}
            </button>
        `).join('');
    }

    updateQuestionGrid() {
        const buttons = document.querySelectorAll('.question-nav-btn');
        buttons.forEach((btn, index) => {
            btn.classList.remove('current', 'answered');
            
            if (index === this.currentQuestion) {
                btn.classList.add('current');
            }
            if (this.answers[index] !== null) {
                btn.classList.add('answered');
            }
        });
    }

    updateQuizStats() {
        const answeredCount = this.answers.filter(a => a !== null).length;
        const unansweredCount = this.answers.length - answeredCount;

        const answeredElement = document.getElementById('answered-count');
        const unansweredElement = document.getElementById('unanswered-count');

        if (answeredElement) answeredElement.textContent = answeredCount;
        if (unansweredElement) unansweredElement.textContent = unansweredCount;
    }

    getQuizTitle() {
        const categoryName = this.getCategoryName(this.currentQuiz.category);
        const typeName = this.currentQuiz.type === 'mock' ? '模擬試験' : '練習問題';
        return `${categoryName} - ${typeName}`;
    }

    getCategoryName(category) {
        const categories = {
            'all': '全分野',
            'basics': '基礎知識',
            'management': '管理要素',
            'technology': '技術要素',
            'laws': '法規・制度'
        };
        return categories[category] || category;
    }

    getDifficultyText(difficulty) {
        const difficulties = {
            'easy': '基礎',
            'normal': '標準',
            'hard': '応用'
        };
        return difficulties[difficulty] || difficulty;
    }

    getReturnUrl() {
        return this.currentQuiz.type === 'mock' ? '/practice/mock-exam/' : '/practice/category/';
    }

    restartQuiz() {
        this.startQuiz(this.currentQuiz.category, this.currentQuiz.type);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    generateQuizId() {
        return 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        
        if (minutes > 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}時間${remainingMinutes}分`;
        }
        
        return `${minutes}分${seconds}秒`;
    }

    trackQuizEvent(eventName, properties) {
        if (window.SGStudySite) {
            window.SGStudySite.trackEvent(eventName, properties);
        }
    }

    /**
     * Generate sample questions for demonstration
     */
    generateSampleQuestions() {
        return [
            // 基礎知識
            {
                id: 'q001',
                category: 'basics',
                difficulty: 'easy',
                question: '情報セキュリティの三要素として正しいものはどれか。',
                options: [
                    { id: 'a', text: '機密性、完全性、可用性' },
                    { id: 'b', text: '機密性、安全性、信頼性' },
                    { id: 'c', text: '完全性、可用性、効率性' },
                    { id: 'd', text: '機密性、可用性、効率性' }
                ],
                correctAnswer: 'a',
                explanation: '情報セキュリティの三要素は、機密性（Confidentiality）、完全性（Integrity）、可用性（Availability）です。これらはCIAトライアドと呼ばれます。',
                reference: 'IPA 情報セキュリティマネジメントガイドライン'
            },
            {
                id: 'q002',
                category: 'basics',
                difficulty: 'normal',
                question: 'リスクマネジメントにおいて、リスクの算出方法として正しいものはどれか。',
                options: [
                    { id: 'a', text: 'リスク = 脅威 × 脆弱性' },
                    { id: 'b', text: 'リスク = 脅威 × 脆弱性 × 資産価値' },
                    { id: 'c', text: 'リスク = 脅威 + 脆弱性' },
                    { id: 'd', text: 'リスク = 脅威 ÷ 脆弱性' }
                ],
                correctAnswer: 'b',
                explanation: 'リスクは「脅威 × 脆弱性 × 資産価値」で算出されます。脅威が発生する可能性、システムの脆弱性、そして保護すべき資産の価値を掛け合わせることでリスクの大きさを評価します。',
                reference: 'JIS Q 27001:2014'
            },
            // 管理要素
            {
                id: 'q101',
                category: 'management',
                difficulty: 'normal',
                question: '情報セキュリティポリシーの階層構造において、最上位に位置するものはどれか。',
                options: [
                    { id: 'a', text: '情報セキュリティ基本方針' },
                    { id: 'b', text: '情報セキュリティ対策基準' },
                    { id: 'c', text: '情報セキュリティ実施手順' },
                    { id: 'd', text: '情報セキュリティガイドライン' }
                ],
                correctAnswer: 'a',
                explanation: '情報セキュリティポリシーは3階層で構成され、最上位が「基本方針」、次に「対策基準」、最下位が「実施手順」となります。',
                reference: 'NISC 政府機関等の情報セキュリティ対策のための統一基準群'
            },
            // 技術要素
            {
                id: 'q201',
                category: 'technology',
                difficulty: 'normal',
                question: '共通鍵暗号方式の特徴として正しいものはどれか。',
                options: [
                    { id: 'a', text: '暗号化と復号化で異なる鍵を使用する' },
                    { id: 'b', text: '暗号化と復号化で同じ鍵を使用する' },
                    { id: 'c', text: '鍵の配布が不要である' },
                    { id: 'd', text: 'デジタル署名に使用される' }
                ],
                correctAnswer: 'b',
                explanation: '共通鍵暗号方式（対称鍵暗号方式）は、暗号化と復号化で同じ鍵を使用する方式です。高速な処理が可能ですが、鍵の安全な配布が課題となります。',
                reference: 'CRYPTREC 暗号リスト'
            },
            // 法規・制度
            {
                id: 'q301',
                category: 'laws',
                difficulty: 'normal',
                question: '個人情報保護法において、個人情報取扱事業者が個人情報を第三者に提供する場合に必要な手続きはどれか。',
                options: [
                    { id: 'a', text: '本人の同意を得ること' },
                    { id: 'b', text: '行政機関への届出' },
                    { id: 'c', text: '個人情報保護委員会への報告' },
                    { id: 'd', text: '特に手続きは不要' }
                ],
                correctAnswer: 'a',
                explanation: '個人情報保護法では、個人情報を第三者に提供する場合は原則として本人の同意が必要です。ただし、法律に基づく場合など例外的な場合もあります。',
                reference: '個人情報保護法第27条'
            }
            // より多くの問題を追加可能
        ];
    }
}

// Initialize quiz engine when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.QuizEngine = new QuizEngine();
});

// Export for use in other modules
window.QuizEngine = QuizEngine;