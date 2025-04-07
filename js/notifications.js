class NotificationSystem {
    constructor() {
        this.messaging = firebase.messaging();
        this.settings = this.loadSettings();
        this.initializeUI();
        this.setupServiceWorker();
    }

    // 設定の読み込み
    loadSettings() {
        return JSON.parse(localStorage.getItem('notificationSettings') || JSON.stringify({
            comments: true,
            likes: true,
            newArticles: true,
            messages: true,
            marketing: false
        }));
    }

    // 設定の保存
    saveSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }

    // Service Workerの設定
    async setupServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            this.messaging.useServiceWorker(registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    // 通知の許可を要求
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await this.messaging.getToken({
                    vapidKey: 'YOUR_VAPID_KEY'
                });
                this.saveToken(token);
                return true;
            }
            return false;
        } catch (error) {
            console.error('通知の許可を取得できませんでした:', error);
            return false;
        }
    }

    // トークンの保存
    async saveToken(token) {
        if (!firebase.auth().currentUser) return;

        try {
            await firebase.firestore()
                .collection('users')
                .doc(firebase.auth().currentUser.uid)
                .update({
                    notificationToken: token,
                    notificationSettings: this.settings
                });
        } catch (error) {
            console.error('トークンの保存に失敗しました:', error);
        }
    }

    // UIの初期化
    initializeUI() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.innerHTML = this.getNotificationHTML();
        document.body.appendChild(container);

        this.attachEventListeners();
        this.setupMessageHandler();
    }

    // 通知UIのHTML
    getNotificationHTML() {
        return `
            <div class="notification-center">
                <div class="notification-header">
                    <i class="fas fa-bell"></i>
                    <span>通知</span>
                    <button class="notification-settings-button">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
                <div class="notification-list"></div>
            </div>

            <div class="notification-settings-modal">
                <div class="modal-content">
                    <h3>通知設定</h3>
                    <div class="settings-list">
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" data-setting="comments" ${this.settings.comments ? 'checked' : ''}>
                                コメント通知
                            </label>
                            <p class="setting-description">記事へのコメントを通知</p>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" data-setting="likes" ${this.settings.likes ? 'checked' : ''}>
                                いいね通知
                            </label>
                            <p class="setting-description">投稿へのいいねを通知</p>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" data-setting="newArticles" ${this.settings.newArticles ? 'checked' : ''}>
                                新着記事通知
                            </label>
                            <p class="setting-description">新しい記事の投稿を通知</p>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" data-setting="messages" ${this.settings.messages ? 'checked' : ''}>
                                メッセージ通知
                            </label>
                            <p class="setting-description">新着メッセージを通知</p>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" data-setting="marketing" ${this.settings.marketing ? 'checked' : ''}>
                                マーケティング通知
                            </label>
                            <p class="setting-description">お得な情報やキャンペーンを通知</p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="cancel-button">キャンセル</button>
                        <button class="save-button">保存</button>
                    </div>
                </div>
            </div>
        `;
    }

    // イベントリスナーの設定
    attachEventListeners() {
        // 設定モーダルの表示/非表示
        const settingsButton = document.querySelector('.notification-settings-button');
        const modal = document.querySelector('.notification-settings-modal');
        const cancelButton = modal.querySelector('.cancel-button');
        const saveButton = modal.querySelector('.save-button');

        settingsButton.addEventListener('click', () => {
            modal.classList.add('visible');
        });

        cancelButton.addEventListener('click', () => {
            modal.classList.remove('visible');
        });

        saveButton.addEventListener('click', () => {
            this.saveNotificationSettings();
            modal.classList.remove('visible');
        });

        // 設定の変更を監視
        const checkboxes = document.querySelectorAll('.setting-item input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const setting = checkbox.dataset.setting;
                this.settings[setting] = checkbox.checked;
            });
        });
    }

    // メッセージハンドラーの設定
    setupMessageHandler() {
        this.messaging.onMessage((payload) => {
            this.showNotification(payload.notification);
            this.addNotificationToList(payload.notification);
        });
    }

    // 通知の表示
    showNotification(notification) {
        if (!this.settings[notification.type]) return;

        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.body}</p>
            </div>
            <button class="close-notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        // アニメーション効果
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // 自動で消える
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // 閉じるボタン
        toast.querySelector('.close-notification').addEventListener('click', () => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // 通知リストに追加
    addNotificationToList(notification) {
        const list = document.querySelector('.notification-list');
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.body}</p>
                <time>${this.formatTime(new Date())}</time>
            </div>
            <button class="mark-as-read">
                <i class="fas fa-check"></i>
            </button>
        `;

        list.insertBefore(item, list.firstChild);

        // 既読機能
        item.querySelector('.mark-as-read').addEventListener('click', () => {
            item.classList.add('read');
            setTimeout(() => item.remove(), 300);
        });
    }

    // 通知アイコンの取得
    getNotificationIcon(type) {
        const icons = {
            comments: 'fa-comment',
            likes: 'fa-heart',
            newArticles: 'fa-newspaper',
            messages: 'fa-envelope',
            marketing: 'fa-tag'
        };
        return icons[type] || 'fa-bell';
    }

    // 時間のフォーマット
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'たった今';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分前`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}時間前`;
        } else {
            return `${Math.floor(diff / 86400000)}日前`;
        }
    }

    // 通知設定の保存
    async saveNotificationSettings() {
        this.saveSettings();

        if (firebase.auth().currentUser) {
            try {
                await firebase.firestore()
                    .collection('users')
                    .doc(firebase.auth().currentUser.uid)
                    .update({
                        notificationSettings: this.settings
                    });
            } catch (error) {
                console.error('設定の保存に失敗しました:', error);
            }
        }
    }

    // テスト通知の送信
    sendTestNotification() {
        this.showNotification({
            type: 'test',
            title: 'テスト通知',
            body: 'これはテスト通知です。通知システムが正常に動作しています。'
        });
    }
}
