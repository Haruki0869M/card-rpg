// ===== Firebase の設定値（Firebase のコンソールの「ウェブアプリ」の firebaseConfig） =====
// ウェブのページに入って公開される値で、秘密ではない。守りはセキュリティルール（database.rules.json）でかける。
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const hasFirebaseConfig = () => !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.databaseURL;
