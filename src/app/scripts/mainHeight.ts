export function setMainHeight(): void {
  const header = document.getElementsByTagName('header')[0];
  const main = document.getElementsByTagName('main')[0];

  if (header && main) {
    const headerRect = header.getBoundingClientRect();
    const headerHeight: number = headerRect.height;

    const windowHeight: number = window.innerHeight;
    const mainHeight: number = windowHeight - headerHeight;

    document.documentElement.style.setProperty('--main-height', `${mainHeight}px`);
  }
}