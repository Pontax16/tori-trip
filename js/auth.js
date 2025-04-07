// Firebase設定
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "tori-trip.firebaseapp.com",
    projectId: "tori-trip",
    storageBucket: "tori-trip.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

class AuthSystem {
    constructor() {
        this.user = null;
        this.initializeUI();
        this.setupAuthStateListener();
    }

    // 認証状態の監視
    setupAuthStateListener() {
        auth.onAuthStateChanged(user => {
            this.user = user;
            this.updateUI();
            
            // カスタムイベントの発行
            const event = new CustomEvent('authStateChanged', { detail: { user } });
            document.dispatchEvent(event);
        });
    }

    // UIの初期化
    initializeUI() {
        const authContainer = document.createElement('div');
        authContainer.className = 'auth-container';
        authContainer.innerHTML = this.getAuthHTML();
        document.body.appendChild(authContainer);

        this.attachEventListeners();
    }

    // 認証UIのHTML
    getAuthHTML() {
        return `
            <div class="auth-overlay"></div>
            <div class="auth-modal">
                <button class="close-auth">&times;</button>
                
                <!-- ログインフォーム -->
                <div class="auth-form" id="loginForm">
                    <h2>ログイン</h2>
                    <form>
                        <div class="form-group">
                            <label for="loginEmail">メールアドレス</label>
                            <input type="email" id="loginEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="loginPassword">パスワード</label>
                            <input type="password" id="loginPassword" required>
                        </div>
                        <div class="form-error"></div>
                        <button type="submit" class="auth-button">ログイン</button>
                    </form>
                    <div class="auth-links">
                        <button class="link-button" data-action="showRegister">新規登録</button>
                        <button class="link-button" data-action="showReset">パスワードを忘れた方</button>
                    </div>
                    <div class="social-auth">
                        <button class="social-button google">
                            <i class="fab fa-google"></i>
                            Googleでログイン
                        </button>
                        <button class="social-button twitter">
                            <i class="fab fa-twitter"></i>
                            Twitterでログイン
                        </button>
                    </div>
                </div>

                <!-- 新規登録フォーム -->
                <div class="auth-form" id="registerForm" style="display: none;">
                    <h2>新規登録</h2>
                    <form>
                        <div class="form-group">
                            <label for="registerName">ユーザー名</label>
                            <input type="text" id="registerName" required>
                        </div>
                        <div class="form-group">
                            <label for="registerEmail">メールアドレス</label>
                            <input type="email" id="registerEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="registerPassword">パスワード</label>
                            <input type="password" id="registerPassword" required>
                        </div>
                        <div class="form-group">
                            <label for="registerPasswordConfirm">パスワード（確認）</label>
                            <input type="password" id="registerPasswordConfirm" required>
                        </div>
                        <div class="form-error"></div>
                        <button type="submit" class="auth-button">登録</button>
                    </form>
                    <div class="auth-links">
                        <button class="link-button" data-action="showLogin">ログインへ戻る</button>
                    </div>
                </div>

                <!-- パスワードリセットフォーム -->
                <div class="auth-form" id="resetForm" style="display: none;">
                    <h2>パスワードリセット</h2>
                    <form>
                        <div class="form-group">
                            <label for="resetEmail">メールアドレス</label>
                            <input type="email" id="resetEmail" required>
                        </div>
                        <div class="form-error"></div>
                        <button type="submit" class="auth-button">リセットメールを送信</button>
                    </form>
                    <div class="auth-links">
                        <button class="link-button" data-action="showLogin">ログインへ戻る</button>
                    </div>
                </div>
            </div>
        `;
    }

    // イベントリスナーの設定
    attachEventListeners() {
        // フォームの送信
        document.querySelector('#loginForm form').addEventListener('submit', e => this.handleLogin(e));
        document.querySelector('#registerForm form').addEventListener('submit', e => this.handleRegister(e));
        document.querySelector('#resetForm form').addEventListener('submit', e => this.handleReset(e));

        // フォームの切り替え
        document.querySelectorAll('.link-button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.switchForm(action);
            });
        });

        // ソーシャルログイン
        document.querySelector('.social-button.google').addEventListener('click', () => this.handleGoogleLogin());
        document.querySelector('.social-button.twitter').addEventListener('click', () => this.handleTwitterLogin());

        // モーダルを閉じる
        document.querySelector('.close-auth').addEventListener('click', () => this.toggleAuth(false));
        document.querySelector('.auth-overlay').addEventListener('click', () => this.toggleAuth(false));
    }

    // ログイン処理
    async handleLogin(e) {
        e.preventDefault();
        const email = document.querySelector('#loginEmail').value;
        const password = document.querySelector('#loginPassword').value;
        const errorElement = document.querySelector('#loginForm .form-error');

        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.toggleAuth(false);
        } catch (error) {
            errorElement.textContent = this.getErrorMessage(error);
        }
    }

    // 新規登録処理
    async handleRegister(e) {
        e.preventDefault();
        const name = document.querySelector('#registerName').value;
        const email = document.querySelector('#registerEmail').value;
        const password = document.querySelector('#registerPassword').value;
        const passwordConfirm = document.querySelector('#registerPasswordConfirm').value;
        const errorElement = document.querySelector('#registerForm .form-error');

        if (password !== passwordConfirm) {
            errorElement.textContent = 'パスワードが一致しません';
            return;
        }

        try {
            const { user } = await auth.createUserWithEmailAndPassword(email, password);
            await user.updateProfile({ displayName: name });
            this.toggleAuth(false);
        } catch (error) {
            errorElement.textContent = this.getErrorMessage(error);
        }
    }

    // パスワードリセット処理
    async handleReset(e) {
        e.preventDefault();
        const email = document.querySelector('#resetEmail').value;
        const errorElement = document.querySelector('#resetForm .form-error');

        try {
            await auth.sendPasswordResetEmail(email);
            errorElement.textContent = 'リセットメールを送信しました';
            errorElement.style.color = 'green';
        } catch (error) {
            errorElement.textContent = this.getErrorMessage(error);
        }
    }

    // Googleログイン
    async handleGoogleLogin() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
            this.toggleAuth(false);
        } catch (error) {
            console.error('Googleログインエラー:', error);
        }
    }

    // Twitterログイン
    async handleTwitterLogin() {
        const provider = new firebase.auth.TwitterAuthProvider();
        try {
            await auth.signInWithPopup(provider);
            this.toggleAuth(false);
        } catch (error) {
            console.error('Twitterログインエラー:', error);
        }
    }

    // フォームの切り替え
    switchForm(action) {
        const forms = {
            showLogin: '#loginForm',
            showRegister: '#registerForm',
            showReset: '#resetForm'
        };

        // すべてのフォームを非表示
        Object.values(forms).forEach(selector => {
            document.querySelector(selector).style.display = 'none';
        });

        // 指定されたフォームを表示
        document.querySelector(forms[action]).style.display = 'block';
    }

    // 認証モーダルの表示/非表示
    toggleAuth(show) {
        const modal = document.querySelector('.auth-modal');
        const overlay = document.querySelector('.auth-overlay');
        
        if (show) {
            modal.classList.add('visible');
            overlay.classList.add('visible');
            this.switchForm('showLogin');
        } else {
            modal.classList.remove('visible');
            overlay.classList.remove('visible');
        }
    }

    // UIの更新
    updateUI() {
        const authButton = document.querySelector('.auth-button');
        const userMenu = document.querySelector('.user-menu');
        
        if (this.user) {
            // ログイン済み
            authButton.innerHTML = `
                <img src="${this.user.photoURL || 'images/default-avatar.png'}" alt="プロフィール" class="avatar">
                <span>${this.user.displayName || 'ユーザー'}</span>
            `;
            userMenu.style.display = 'block';
        } else {
            // 未ログイン
            authButton.innerHTML = 'ログイン';
            userMenu.style.display = 'none';
        }
    }

    // エラーメッセージの取得
    getErrorMessage(error) {
        const errorMessages = {
            'auth/invalid-email': 'メールアドレスの形式が正しくありません',
            'auth/user-disabled': 'このアカウントは無効です',
            'auth/user-not-found': 'アカウントが見つかりません',
            'auth/wrong-password': 'パスワードが間違っています',
            'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
            'auth/operation-not-allowed': 'この操作は許可されていません',
            'auth/weak-password': 'パスワードが弱すぎます'
        };

        return errorMessages[error.code] || 'エラーが発生しました';
    }

    // ログアウト
    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('ログアウトエラー:', error);
        }
    }
}
