// ==UserScript==
// @name         Nothing Account Auto-Sync
// @namespace    https://essential-space.local/
// @version      1.0
// @description  Automatically sends Nothing Account access token to your self-hosted Essential Space dashboard
// @match        https://account.nothing.tech/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Set this to the exact origin of your Essential Space dashboard.
    // The token is only delivered to this origin, never to '*'.
    const DASHBOARD_ORIGIN = 'https://your-essential-space.example.com';

    function sendToken() {
        const token = localStorage.getItem('nothingAuth_account-app-web_accessToken');
        if (token) {
            if (window.opener) {
                window.opener.postMessage({ type: 'NOTHING_AUTH_TOKEN', token: token }, DASHBOARD_ORIGIN);
                window.close();
            }
        }
    }

    // Check immediately
    sendToken();

    // Check periodically if user just completed login
    setInterval(sendToken, 1000);
})();
