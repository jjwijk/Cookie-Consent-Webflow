/**
 * Cookie Consent Script - VERSION: 1.1.15
 */

// Function to check if the cookie popup should be displayed
function shouldShowCookiePopup() {
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("hidePopup"));
  return !cookie || !cookie.includes("true");
}

// Function to set a cookie to hide the popup for a specified period
function setCookieToHidePopup(hidePeriod) {
  const today = new Date();
  let numberOfDays;

  switch (hidePeriod) {
    case "FOREVER":
      numberOfDays = 3650; // 10 jaar
      break;
    case "ONE_YEAR":
      numberOfDays = 365; // 1 jaar
      break;
    case "SIX_MONTH":
      numberOfDays = 182; // 6 maanden
      break;
    case "THREE_MONTH":
      numberOfDays = 90; // 3 maanden
      break;
    default:
      numberOfDays = 30; // Standaard 1 maand
  }

  const expiryDate = new Date(today.setDate(today.getDate() + numberOfDays));
  document.cookie = `hidePopup=true; Path=/; Expires=${expiryDate.toUTCString()}; SameSite=Lax`;
}

// Function to hide the cookie popup by default using CSS
function hidePopupByDefault() {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(`
      .flowappz-cookie-consent {
        display: none;
      }
    `);
  document.adoptedStyleSheets.push(styleSheet);
}

// Function to delete all cookies except 'hidePopup' using the CookieStore API
async function deleteCookiesUsingCookieStore() {
  const cookies = await cookieStore.getAll();
  for (let cookie of cookies) {
    const { name, domain, path } = cookie;
    if (name.trim() !== "hidePopup") {
      await cookieStore.delete({ name, domain, path });
    }
  }
}

// Function to expire all cookies except 'hidePopup'
function expireCookies() {
  document.cookie
    .split(";")
    .filter((c) => !c.trim().startsWith("hidePopup"))
    .forEach((c) => {
      const cookieKey = c.split("=")[0].trim();
      document.cookie = `${cookieKey}=; Path=/; Expires=${new Date().toUTCString()}; SameSite=Lax`;
      document.cookie = `${cookieKey}=; Path=/; Expires=${new Date().toUTCString()}; domain=.${
        window.location.host
      }; SameSite=Lax`;
    });
}

// Function to load Google Analytics script
function loadGoogleAnalytics() {
  const script = document.createElement("script");
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-LTR729EM84";
  script.async = true;
  document.head.appendChild(script);

  script.onload = function () {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "G-LTR729EM84");
  };
}

// Event listener for DOMContentLoaded
window.addEventListener("DOMContentLoaded", async () => {
  hidePopupByDefault();

  try {
    if (!shouldShowCookiePopup()) {
      // Laad Google Analytics niet als 'hidePopup' true is
      if (
        document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("hidePopup=true"))
      ) {
        return;
      }
      loadGoogleAnalytics(); // Laad Google Analytics als de popup niet wordt weergegeven
      return;
    }

    let cookiePopupHidePeriod = "FOREVER";
    const res = await fetch(
      `https://cookie-consent-production.up.railway.app/api/cookie-consent/hostname?hostname=${window.location.hostname}`
    );
    if (res.ok) {
      const data = await res.json();
      if (!data.cookiePopupEnabled) return;
      cookiePopupHidePeriod = data.cookiePopupHidePeriod;
    }

    const cookiePopup = document.getElementById("flowappz-cookie-consent");
    if (cookiePopup) {
      cookiePopup.style.display = "block";
      cookiePopup.style.zIndex = "99999";

      const agreeButton = document.getElementById(
        "flowappz-cookie-consent-approve"
      );
      if (agreeButton) {
        agreeButton.addEventListener("click", () => {
          cookiePopup.style.display = "none";
          setCookieToHidePopup(cookiePopupHidePeriod); // Stel de cookie in om de popup te verbergen
          loadGoogleAnalytics(); // Laad Google Analytics wanneer de gebruiker cookies accepteert
        });
      }

      const rejectButton = document.getElementById(
        "flowappz-cookie-consent-reject"
      );
      if (rejectButton) {
        rejectButton.addEventListener("click", async () => {
          cookiePopup.style.display = "none";
          setCookieToHidePopup(cookiePopupHidePeriod); // Stel de cookie in om de popup te verbergen

          try {
            await deleteCookiesUsingCookieStore(); // Verwijder alle cookies behalve 'hidePopup'
          } catch (err) {
            expireCookies(); // Vervang de cookies als CookieStore API niet beschikbaar is
          }
        });
      }
    }
  } catch (err) {
    console.error("Error: ", err);
  }
});
