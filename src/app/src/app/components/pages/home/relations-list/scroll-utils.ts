/**
 * Get current browser viewpane heigtht
 */
const getWindowHeight = () => {
  return (
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight ||
    0
  );
};

/**
 * Get current absolute window scroll position
 */
const getWindowYscroll = () => {
  return (
    window.pageYOffset ||
    document.body.scrollTop ||
    document.documentElement.scrollTop ||
    0
  );
};

/**
 * Get current absolute document height
 */
const getDocHeight = () => {
  return Math.max(
    document.body.scrollHeight || 0,
    document.documentElement.scrollHeight || 0,
    document.body.offsetHeight || 0,
    document.documentElement.offsetHeight || 0,
    document.body.clientHeight || 0,
    document.documentElement.clientHeight || 0
  );
};

/**
 * Get current vertical scroll percentage
 */
export const getScrollPercentage = () => {
  return (
    ((getWindowYscroll() + getWindowHeight()) / getDocHeight()) * 100
  );
};
