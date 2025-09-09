(function(){
  const PROD_API = "https://feedback-form-api.onrender.com";
  const DEV_API  = "http://localhost:3001";
  const isProd = (
    // If bundler injects env
    (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") ||
    // Or by host when served from prod site
    (typeof window !== "undefined" && /feedback-form-app\.onrender\.com$/.test(window.location.hostname))
  );
  window.APP_CONFIG = { API_BASE: isProd ? PROD_API : DEV_API };
})();
