importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "tori-trip.firebaseapp.com",
    projectId: "tori-trip",
    storageBucket: "tori-trip.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// バックグラウンド通知の処理
messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification;

    const options = {
        body: notification.body,
        icon: '/images/notification-icon.png',
        badge: '/images/notification-badge.png',
        data: payload.data
    };

    return self.registration.showNotification(notification.title, options);
});
