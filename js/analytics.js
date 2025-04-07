class AnalyticsSystem {
    constructor() {
        this.user = null;
        this.db = firebase.firestore();
        this.startTime = Date.now();
        this.pageViews = {};
        this.interactions = [];
    }

    // 分析システムの初期化
    async initialize(user) {
        this.user = user;
        this.trackPageView();
        this.setupEventListeners();
        await this.loadUserStats();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // ページ滞在時間の追跡
        window.addEventListener('beforeunload', () => {
            this.trackSessionDuration();
        });

        // クリックイベントの追跡
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, a, .clickable');
            if (target) {
                this.trackInteraction('click', {
                    element: target.tagName,
                    class: target.className,
                    text: target.textContent.trim(),
                    path: target.getAttribute('href') || ''
                });
            }
        });

        // スクロールの追跡
        let lastScrollTime = 0;
        window.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScrollTime > 1000) { // 1秒ごとにのみ記録
                lastScrollTime = now;
                const scrollDepth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
                this.trackScroll(Math.round(scrollDepth * 100));
            }
        });
    }

    // ページビューの追跡
    trackPageView() {
        const path = window.location.pathname;
        const timestamp = Date.now();

        this.pageViews[path] = this.pageViews[path] || [];
        this.pageViews[path].push(timestamp);

        this.db.collection('analytics').doc('pageViews').set({
            [path]: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

        if (this.user) {
            this.db.collection('users').doc(this.user.uid)
                .collection('activity')
                .add({
                    type: 'pageView',
                    path,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
    }

    // セッション時間の追跡
    trackSessionDuration() {
        const duration = Date.now() - this.startTime;
        
        this.db.collection('analytics').doc('sessions').set({
            totalDuration: firebase.firestore.FieldValue.increment(duration),
            count: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

        if (this.user) {
            this.db.collection('users').doc(this.user.uid)
                .collection('sessions')
                .add({
                    duration,
                    startTime: this.startTime,
                    endTime: Date.now(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
    }

    // インタラクションの追跡
    trackInteraction(type, details) {
        const interaction = {
            type,
            details,
            timestamp: Date.now()
        };

        this.interactions.push(interaction);

        if (this.user) {
            this.db.collection('users').doc(this.user.uid)
                .collection('interactions')
                .add({
                    ...interaction,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
    }

    // スクロールの追跡
    trackScroll(depth) {
        this.db.collection('analytics').doc('scrollDepth').set({
            [depth]: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
    }

    // ユーザー統計の読み込み
    async loadUserStats() {
        if (!this.user) return;

        try {
            const stats = await this.db.collection('users')
                .doc(this.user.uid)
                .collection('stats')
                .doc('overview')
                .get();

            if (stats.exists) {
                return stats.data();
            }

            return this.initializeUserStats();
        } catch (error) {
            console.error('統計の読み込みに失敗しました:', error);
        }
    }

    // ユーザー統計の初期化
    async initializeUserStats() {
        if (!this.user) return;

        const stats = {
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            averageTimePerVisit: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await this.db.collection('users')
                .doc(this.user.uid)
                .collection('stats')
                .doc('overview')
                .set(stats);

            return stats;
        } catch (error) {
            console.error('統計の初期化に失敗しました:', error);
        }
    }

    // コンテンツ分析の取得
    async getContentAnalytics(contentId) {
        try {
            const doc = await this.db.collection('content')
                .doc(contentId)
                .collection('analytics')
                .doc('overview')
                .get();

            if (doc.exists) {
                return doc.data();
            }

            return {
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                averageTimeOnPage: 0
            };
        } catch (error) {
            console.error('コンテンツ分析の取得に失敗しました:', error);
        }
    }

    // トレンド分析の取得
    async getTrendAnalytics(days = 7) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const snapshot = await this.db.collection('analytics')
                .doc('trends')
                .collection('daily')
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .orderBy('date')
                .get();

            return snapshot.docs.map(doc => ({
                date: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('トレンド分析の取得に失敗しました:', error);
        }
    }

    // エンゲージメント率の計算
    calculateEngagementRate(views, interactions) {
        if (!views || views === 0) return 0;
        return (interactions / views) * 100;
    }

    // 人気コンテンツの取得
    async getPopularContent(limit = 10) {
        try {
            const snapshot = await this.db.collection('content')
                .orderBy('stats.views', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('人気コンテンツの取得に失敗しました:', error);
        }
    }

    // ユーザー行動の分析
    async analyzeUserBehavior(userId) {
        try {
            const sessions = await this.db.collection('users')
                .doc(userId)
                .collection('sessions')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            const interactions = await this.db.collection('users')
                .doc(userId)
                .collection('interactions')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            const sessionData = sessions.docs.map(doc => doc.data());
            const interactionData = interactions.docs.map(doc => doc.data());

            return {
                averageSessionDuration: this.calculateAverageSessionDuration(sessionData),
                mostCommonInteractions: this.analyzeMostCommonInteractions(interactionData),
                peakActivityTimes: this.analyzePeakActivityTimes(interactionData)
            };
        } catch (error) {
            console.error('ユーザー行動の分析に失敗しました:', error);
        }
    }

    // 平均セッション時間の計算
    calculateAverageSessionDuration(sessions) {
        if (!sessions || sessions.length === 0) return 0;
        const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
        return Math.round(totalDuration / sessions.length);
    }

    // 最も一般的なインタラクションの分析
    analyzeMostCommonInteractions(interactions) {
        const interactionCounts = {};
        interactions.forEach(interaction => {
            const type = interaction.type;
            interactionCounts[type] = (interactionCounts[type] || 0) + 1;
        });

        return Object.entries(interactionCounts)
            .sort(([, a], [, b]) => b - a)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }

    // ピーク時のアクティビティ分析
    analyzePeakActivityTimes(interactions) {
        const hourCounts = new Array(24).fill(0);
        interactions.forEach(interaction => {
            const hour = new Date(interaction.timestamp).getHours();
            hourCounts[hour]++;
        });

        return hourCounts.map((count, hour) => ({
            hour,
            count
        }));
    }

    // レポートの生成
    async generateReport(type = 'daily') {
        try {
            const now = new Date();
            const report = {
                type,
                generatedAt: now,
                metrics: {}
            };

            // ページビュー統計
            const pageViews = await this.db.collection('analytics')
                .doc('pageViews')
                .get();
            report.metrics.pageViews = pageViews.data() || {};

            // セッション統計
            const sessions = await this.db.collection('analytics')
                .doc('sessions')
                .get();
            report.metrics.sessions = sessions.data() || {};

            // スクロール深度
            const scrollDepth = await this.db.collection('analytics')
                .doc('scrollDepth')
                .get();
            report.metrics.scrollDepth = scrollDepth.data() || {};

            // 人気コンテンツ
            report.metrics.popularContent = await this.getPopularContent(5);

            // レポートの保存
            await this.db.collection('reports')
                .doc(type)
                .collection('history')
                .add(report);

            return report;
        } catch (error) {
            console.error('レポートの生成に失敗しました:', error);
        }
    }
}
