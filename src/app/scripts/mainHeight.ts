let mainHeightTimeout: NodeJS.Timeout | null = null;

export function setMainHeight(): void {
  if (mainHeightTimeout) {
    clearTimeout(mainHeightTimeout);
  }
  
  mainHeightTimeout = setTimeout(() => {
    const header = document.getElementsByTagName('header')[0];
    const main = document.getElementsByTagName('main')[0];

    if (header && main) {
      const headerRect = header.getBoundingClientRect();
      const headerHeight = headerRect.height;
      const windowHeight = window.innerHeight;
      const mainHeight = windowHeight - headerHeight;

      document.documentElement.style.setProperty('--main-height', `${mainHeight}px`);
    }
  }, 50);
}