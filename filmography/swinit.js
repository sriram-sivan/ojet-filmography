 if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('sw.js').then((registration) => {
         // Registration was successful
         console.log('myOPTapp ServiceWorker registration successful with scope: ', registration.scope);
     }).catch((err) => {
         // Registration failed
         console.log('myOPTapp ServiceWorker registration failed: ', err);
     });
 }