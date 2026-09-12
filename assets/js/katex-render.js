const renderMath = () => {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
  }
};

const hookKatexLoader = (scriptElement) => {
  if (window.katex) {
    renderMath();
  } else {
    scriptElement.addEventListener("load", renderMath);
  }
};

let katexLoader = document.getElementById("katex-render");
if (katexLoader) {
  hookKatexLoader(katexLoader);
} else if ("MutationObserver" in window) {
  const observer = new MutationObserver(() => {
    katexLoader = document.getElementById("katex-render");
    if (katexLoader) {
      observer.disconnect();
      hookKatexLoader(katexLoader);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}