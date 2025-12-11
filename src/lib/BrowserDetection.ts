export const BrowserDetection = {
  getUserAgent: () => navigator.userAgent,
  
  isFirefox: () => navigator.userAgent.includes("Firefox"),
  
  isChrome: () => {
    const userAgent = navigator.userAgent;
    return /Chrome|Chromium/.test(userAgent) && !/Edg/.test(userAgent);
  },
  
  isSafari: () => {
    const userAgent = navigator.userAgent;
    return /Safari/.test(userAgent) && !/Chrome|Chromium/.test(userAgent);
  },
  
  isEdge: () => /Edg/.test(navigator.userAgent),
  
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  
  isDesktop: () => !BrowserDetection.isMobile(),
  
  isSupportedBrowser: () => {
    return BrowserDetection.isChrome() || 
           BrowserDetection.isFirefox() || 
           (BrowserDetection.isSafari() && BrowserDetection.isDesktop());
  }
};