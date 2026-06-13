self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'SoB Notification', {
    body: data.body || 'You have a new update!',
    icon: '/favicon-32x32.png',
  });
});
