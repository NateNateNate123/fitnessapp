// Tiny helper so the SW can immediately control the page after first load on iOS
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(() => {
    if (navigator.serviceWorker.controller) {
      console.log('Service worker controlling the page.');
    }
  });
}
