// ===== Firebase の設定値（Firebase のコンソールの「ウェブアプリ」の firebaseConfig） =====
// ウェブのページに入って公開される値で、秘密ではない。守りはセキュリティルール（database.rules.json）でかける。
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBOnG0IOLACzhY-reWJ8B62ynVbWGRG51c',
  authDomain: 'card-rpg-1aa60.firebaseapp.com',
  // Realtime Database のアドレス（コンソールの Realtime Database の画面の上に出ている）
  databaseURL: '',
  projectId: 'card-rpg-1aa60',
  storageBucket: 'card-rpg-1aa60.firebasestorage.app',
  messagingSenderId: '261305671905',
  appId: '1:261305671905:web:36fc82cd6c2709b6cd97a0',
};

export const hasFirebaseConfig = () => !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.databaseURL;
