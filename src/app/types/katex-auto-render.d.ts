declare module 'katex/contrib/auto-render' {
  interface Delimiter {
    left: string;
    right: string;
    display: boolean;
  }

  interface RenderMathInElementOptions {
    delimiters?: Delimiter[];
    ignoredTags?: string[];
    errorCallback?: (msg: string, err: Error) => void;
    throwOnError?: boolean;
  }

  export default function renderMathInElement(
    el: HTMLElement,
    options?: RenderMathInElementOptions
  ): void;
}