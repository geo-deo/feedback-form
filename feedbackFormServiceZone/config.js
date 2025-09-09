(function(){
  const PROD_API = "https://feedback-form-api.onrender.com";
  const DEV_API  = "http://localhost:3001";
  const isProd = (
    (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") ||
    (typeof window !== "undefined" && /feedback-form-app\.onrender\.com$/.test(window.location.hostname))
  );
  window.APP_CONFIG = { API_BASE: isProd ? PROD_API : DEV_API };
})();
