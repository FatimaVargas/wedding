(() => {
 const navigation = document.querySelector('body > nav');
 if (!navigation) return;
 const setNavigationHeight = () => {
  document.documentElement.style.setProperty('--navigation-height', navigation.getBoundingClientRect().height + 'px');
 };
 setNavigationHeight();
 if ('ResizeObserver' in window) {
  new ResizeObserver(setNavigationHeight).observe(navigation);
 } else {
  window.addEventListener('resize', setNavigationHeight, {passive:true});
 }
})();
