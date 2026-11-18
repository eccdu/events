/**
 * ============================================================================
 * Economics Cultural Club (ECC) Event Registration Engine
 * Handles Google OAuth, Form Routing, Dynamic Calculations, and Apps Script Submissions
 * ============================================================================
 */

(function () {
  "use strict";

  // Application State
  const state = {
    currentUser: null, // { name, email, picture, sub }
    currentView: "view-auth",
    artCamp: {
      calculatedAge: null,
      selectedGroup: null,
      selectedMedium: null,
      selectedFee: 0
    },
    movieScreening: {
      fee: 100
    }
  };

  // DOM Elements
  const elements = {
    // Views
    views: {
      auth: document.getElementById("view-auth"),
      menu: document.getElementById("view-menu"),
      artCamp: document.getElementById("view-art-camp"),
      movieScreening: document.getElementById("view-movie-screening")
    },
    // User bar
    userAccountBar: document.getElementById("user-account-bar"),
    headerAvatar: document.getElementById("header-avatar"),
    headerUserName: document.getElementById("header-user-name"),
    headerUserEmail: document.getElementById("header-user-email"),
    btnSignout: document.getElementById("btn-signout"),
    menuWelcomeText: document.getElementById("menu-welcome-text"),

    // Auth
    formAuthLogin: document.getElementById("form-auth-login"),
    authInputName: document.getElementById("auth-input-name"),
    authInputEmail: document.getElementById("auth-input-email"),

    // Menu buttons
    btnOpenArtCamp: document.getElementById("btn-open-art-camp"),
    btnOpenMovieScreening: document.getElementById("btn-open-movie-screening"),

    // Art Camp Form
    formArtCamp: document.getElementById("form-art-camp"),
    acName: document.getElementById("ac-name"),
    acGender: document.getElementById("ac-gender"),
    acPhone: document.getElementById("ac-phone"),
    acBirthday: document.getElementById("ac-birthday"),
    acAge: document.getElementById("ac-age"),
    acAgeBadge: document.getElementById("ac-age-badge"),
    acFee: document.getElementById("ac-fee"),
    acGroupHelper: document.getElementById("ac-group-helper"),
    acSelectedGroup: document.getElementById("ac-selected-group"),
    acSelectedMedium: document.getElementById("ac-selected-medium"),
    acSelectedFee: document.getElementById("ac-selected-fee"),
    groupCards: {
      kuri: document.getElementById("group-card-kuri"),
      koliPaper: document.getElementById("group-card-koli-paper"),
      koliCanvas: document.getElementById("group-card-koli-canvas")
    },
    btnSubmitArtCamp: document.getElementById("btn-submit-art-camp"),

    // Movie Screening Form
    formMovieScreening: document.getElementById("form-movie-screening"),
    msName: document.getElementById("ms-name"),
    msGender: document.getElementById("ms-gender"),
    msPhone: document.getElementById("ms-phone"),
    msInstitution: document.getElementById("ms-institution"),
    msInstitutionOtherGroup: document.getElementById("ms-institution-other-group"),
    msInstitutionOther: document.getElementById("ms-institution-other"),
    msSession: document.getElementById("ms-session"),
    msSessionOtherGroup: document.getElementById("ms-session-other-group"),
    msSessionOther: document.getElementById("ms-session-other"),
    msFeeDisplay: document.getElementById("ms-fee-display"),
    msFee: document.getElementById("ms-fee"),
    msFeeRuleNote: document.getElementById("ms-fee-rule-note"),
    btnSubmitMovieScreening: document.getElementById("btn-submit-movie-screening"),

    // Shared Components & Modals
    paymentContainers: document.querySelectorAll(".payment-component-container"),
    paymentTemplate: document.getElementById("template-payment-details"),
    modalSuccess: document.getElementById("modal-success"),
    modalSuccessTitle: document.getElementById("modal-success-title"),
    modalSuccessDesc: document.getElementById("modal-success-desc"),
    btnModalDone: document.getElementById("btn-modal-done"),
    toastContainer: document.getElementById("toast-container")
  };

  /**
   * Initialize Application
   */
  function init() {
    setupPaymentComponents();
    setupEventListeners();
    setupBirthdayConstraints();
    checkExistingSession();
  }

  /**
   * Clone and insert the shared Payment Component into both forms
   */
  function setupPaymentComponents() {
    elements.paymentContainers.forEach(container => {
      const clone = elements.paymentTemplate.content.cloneNode(true);
      container.appendChild(clone);
    });

    // Attach clipboard copy listeners to all copy pills
    document.querySelectorAll(".js-copy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const textToCopy = btn.getAttribute("data-copy");
        if (textToCopy) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showToast(`কপি করা হয়েছে: ${textToCopy}`, "success");
          }).catch(() => {
            showToast("কপি করা যায়নি, অনুগ্রহ করে ম্যানুয়ালি কপি করুন।", "error");
          });
        }
      });
    });
  }

  /**
   * Set max date for birthday picker to today
   */
  function setupBirthdayConstraints() {
    const today = new Date().toISOString().split("T")[0];
    elements.acBirthday.setAttribute("max", today);
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Navigation Back buttons
    document.querySelectorAll(".btn-back").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetView = btn.getAttribute("data-target") || "view-menu";
        switchView(targetView);
      });
    });

    // Menu open buttons
    elements.btnOpenArtCamp.addEventListener("click", () => {
      prefillUserData("ac");
      switchView("view-art-camp");
    });

    elements.btnOpenMovieScreening.addEventListener("click", () => {
      prefillUserData("ms");
      calculateMovieFee();
      switchView("view-movie-screening");
    });

    // Sign out button
    elements.btnSignout.addEventListener("click", signOut);

    // Auth Login form submit handler (0$ Setup - No Google Cloud Console needed)
    if (elements.formAuthLogin) {
      elements.formAuthLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = elements.authInputName.value.trim();
        const email = elements.authInputEmail.value.trim().toLowerCase();

        if (!name) {
          showToast("অনুগ্রহ করে আপনার নাম লিখুন।", "error");
          elements.authInputName.focus();
          return;
        }

        if (!email || !email.includes("@") || !email.includes(".")) {
          showToast("অনুগ্রহ করে একটি সঠিক গুগল / জিমেইল এড্রেস লিখুন।", "error");
          elements.authInputEmail.focus();
          return;
        }

        const user = {
          name: name,
          email: email,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff&bold=true`,
          sub: "user_" + Date.now()
        };

        handleSuccessfulLogin(user);
      });
    }

    // Form 1: Birthday change -> Calculate Age & update groups
    elements.acBirthday.addEventListener("change", handleBirthdayChange);
    elements.acBirthday.addEventListener("input", handleBirthdayChange);

    // Form 1: Group selection click handlers
    Object.values(elements.groupCards).forEach(card => {
      card.addEventListener("click", () => {
        if (card.classList.contains("disabled")) return;
        selectArtCampGroup(card);
      });
    });

    // Form 1: Submit handler
    elements.formArtCamp.addEventListener("submit", handleArtCampSubmit);

    // Form 2: Institution & Session change -> recalculate fee
    elements.msInstitution.addEventListener("change", () => {
      const isOther = elements.msInstitution.value === "Other";
      elements.msInstitutionOtherGroup.style.display = isOther ? "flex" : "none";
      elements.msInstitutionOther.required = isOther;
      if (!isOther) elements.msInstitutionOther.value = "";
      calculateMovieFee();
    });

    elements.msSession.addEventListener("change", () => {
      const isOther = elements.msSession.value === "Other";
      elements.msSessionOtherGroup.style.display = isOther ? "flex" : "none";
      elements.msSessionOther.required = isOther;
      if (!isOther) elements.msSessionOther.value = "";
      calculateMovieFee();
    });

    // Form 2: Submit handler
    elements.formMovieScreening.addEventListener("submit", handleMovieScreeningSubmit);

    // Success modal close button
    elements.btnModalDone.addEventListener("click", () => {
      elements.modalSuccess.classList.remove("active");
      switchView("view-menu");
    });
  }

  /**
   * Common handler once user is verified
   */
  function handleSuccessfulLogin(user) {
    state.currentUser = user;
    sessionStorage.setItem("ecc_user", JSON.stringify(user));

    // Update Header UI
    elements.headerUserName.textContent = user.name;
    elements.headerUserEmail.textContent = user.email;
    if (user.picture) {
      elements.headerAvatar.src = user.picture;
    } else {
      elements.headerAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f172a&color=fff`;
    }
    elements.userAccountBar.style.display = "flex";
    elements.menuWelcomeText.textContent = `স্বাগতম, ${user.name}!`;

    showToast(`লগইন সফল: ${user.name}`, "success");
    switchView("view-menu");
  }

  /**
   * Check if a valid session exists in sessionStorage
   */
  function checkExistingSession() {
    const saved = sessionStorage.getItem("ecc_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.email) {
          handleSuccessfulLogin(user);
        }
      } catch (e) {
        sessionStorage.removeItem("ecc_user");
      }
    }
  }

  /**
   * Sign Out
   */
  function signOut() {
    state.currentUser = null;
    sessionStorage.removeItem("ecc_user");
    elements.userAccountBar.style.display = "none";
    showToast("লগআউট সম্পন্ন হয়েছে।", "success");
    switchView("view-auth");

    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  /**
   * Prefill participant name from Google account if not already edited
   */
  function prefillUserData(formPrefix) {
    if (!state.currentUser) return;
    if (formPrefix === "ac" && !elements.acName.value) {
      elements.acName.value = state.currentUser.name;
    }
    if (formPrefix === "ms" && !elements.msName.value) {
      elements.msName.value = state.currentUser.name;
    }
  }

  /**
   * Switch between views smoothly
   */
  function switchView(viewId) {
    Object.values(elements.views).forEach(section => {
      section.classList.remove("active");
    });

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
      targetSection.classList.add("active");
      state.currentView = viewId;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /**
   * ==========================================================================
   * FORM 1: 'চিত্রপট' (Art-camp) LOGIC
   * ==========================================================================
   */

  /**
   * Calculate exact age in full years from birthday
   */
  function calculateAge(birthdayString) {
    if (!birthdayString) return null;
    const birthDate = new Date(birthdayString);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return age;
  }

  /**
   * Handle Birthday Change & Update Group Eligibility
   */
  function handleBirthdayChange() {
    const bdayVal = elements.acBirthday.value;
    const age = calculateAge(bdayVal);
    state.artCamp.calculatedAge = age;

    if (age === null || age < 0) {
      elements.acAge.value = "";
      elements.acAgeBadge.textContent = "অনির্ধারিত";
      elements.acAgeBadge.className = "age-status-badge";
      disableAllArtCampGroups("সঠিক জন্মতারিখ দিন");
      resetArtCampSelectedGroup();
      return;
    }

    // Display formatted age
    elements.acAge.value = `${age} বছর (${age} Years)`;

    // Check bounds
    if (age < 3) {
      elements.acAgeBadge.textContent = "বয়স ৩ বছরের কম";
      elements.acAgeBadge.className = "age-status-badge invalid";
      disableAllArtCampGroups("ন্যূনতম বয়স ৩ বছর আবশ্যক");
      resetArtCampSelectedGroup();
    } else if (age > 25) {
      elements.acAgeBadge.textContent = "বয়স ২৫ বছরের বেশি";
      elements.acAgeBadge.className = "age-status-badge invalid";
      disableAllArtCampGroups("সর্বোচ্চ বয়সসীমা ২৫ বছর");
      resetArtCampSelectedGroup();
    } else {
      elements.acAgeBadge.textContent = "বয়সসীমার অন্তর্ভুক্ত";
      elements.acAgeBadge.className = "age-status-badge valid";
      updateGroupEligibilityByAge(age);
    }
  }

  /**
   * Enable/Disable Art-camp groups based on age
   * - কুঁড়ি: 3–15 years
   * - কলি (কার্টিজ পেপার): 16–25 years
   * - কলি (ক্যানভাস): 16–25 years
   */
  function updateGroupEligibilityByAge(age) {
    const isKuriEligible = age >= 3 && age <= 15;
    const isKoliEligible = age >= 16 && age <= 25;

    toggleGroupCard(elements.groupCards.kuri, isKuriEligible);
    toggleGroupCard(elements.groupCards.koliPaper, isKoliEligible);
    toggleGroupCard(elements.groupCards.koliCanvas, isKoliEligible);

    elements.acGroupHelper.textContent = isKuriEligible
      ? "আপনার বয়সের জন্য 'কুঁড়ি' গ্রুপ প্রযোজ্য"
      : "আপনার বয়সের জন্য 'কলি' গ্রুপসমূহ প্রযোজ্য";

    // If currently selected group became disabled due to age shift, reset it
    const activeSelectedCard = document.querySelector(".group-card.selected");
    if (activeSelectedCard && activeSelectedCard.classList.contains("disabled")) {
      resetArtCampSelectedGroup();
      showToast("বয়স পরিবর্তনের কারণে পূর্বের গ্রুপ বাতিল করা হয়েছে। নতুন গ্রুপ নির্বাচন করুন।", "error");
    }
  }

  function toggleGroupCard(card, isEnabled) {
    if (isEnabled) {
      card.classList.remove("disabled");
      card.removeAttribute("aria-disabled");
    } else {
      card.classList.add("disabled");
      card.classList.remove("selected");
      card.setAttribute("aria-disabled", "true");
    }
  }

  function disableAllArtCampGroups(reason) {
    Object.values(elements.groupCards).forEach(card => {
      card.classList.add("disabled");
      card.classList.remove("selected");
    });
    elements.acGroupHelper.textContent = reason;
  }

  function resetArtCampSelectedGroup() {
    Object.values(elements.groupCards).forEach(card => card.classList.remove("selected"));
    elements.acSelectedGroup.value = "";
    elements.acSelectedMedium.value = "";
    elements.acSelectedFee.value = "0";
    elements.acFee.value = "০ টাকা";
    state.artCamp.selectedGroup = null;
    state.artCamp.selectedMedium = null;
    state.artCamp.selectedFee = 0;
  }

  function selectArtCampGroup(card) {
    Object.values(elements.groupCards).forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    const group = card.getAttribute("data-group");
    const medium = card.getAttribute("data-medium");
    const fee = parseInt(card.getAttribute("data-fee"), 10);

    state.artCamp.selectedGroup = group;
    state.artCamp.selectedMedium = medium;
    state.artCamp.selectedFee = fee;

    elements.acSelectedGroup.value = group;
    elements.acSelectedMedium.value = medium;
    elements.acSelectedFee.value = fee;
    elements.acFee.value = `${fee.toLocaleString("bn-BD")} টাকা (${fee} TK)`;
  }

  /**
   * Handle Art-camp Form Submission
   */
  function handleArtCampSubmit(e) {
    e.preventDefault();

    if (!ensureAuthenticated()) return;

    // Validation
    const name = elements.acName.value.trim();
    const gender = elements.acGender.value;
    const phone = elements.acPhone.value.trim();
    const birthday = elements.acBirthday.value;
    const age = state.artCamp.calculatedAge;
    const group = state.artCamp.selectedGroup;
    const medium = state.artCamp.selectedMedium;
    const fee = state.artCamp.selectedFee;

    // Shared verification inputs inside Art Camp form
    const container = elements.formArtCamp.querySelector(".payment-component-container");
    const paymentMethod = container.querySelector(".js-payment-method").value;
    const trxId = container.querySelector(".js-trx-id").value.trim();

    if (!name) return showToast("অনুগ্রহ করে অংশগ্রহণকারীর নাম লিখুন।", "error");
    if (!gender) return showToast("অনুগ্রহ করে লিঙ্গ নির্বাচন করুন।", "error");
    if (!phone) return showToast("অনুগ্রহ করে ফোন নম্বর লিখুন।", "error");
    if (!birthday || age === null) return showToast("সঠিক জন্মতারিখ দিন।", "error");
    if (age < 3 || age > 25) return showToast("বয়স ৩ থেকে ২৫ বছরের মধ্যে হতে হবে।", "error");
    if (!group) return showToast("অনুগ্রহ করে একটি অনুমোদিত গ্রুপ নির্বাচন করুন।", "error");
    if (!trxId) return showToast("অনুগ্রহ করে পেমেন্ট ট্রানজেকশন আইডি (TrxID) লিখুন।", "error");

    const payload = {
      formType: "art-camp",
      googleEmail: state.currentUser.email,
      googleName: state.currentUser.name,
      name: name,
      gender: gender,
      phoneNumber: phone,
      birthday: birthday,
      age: age,
      group: group,
      medium: medium,
      fee: fee,
      paymentMethod: paymentMethod,
      transactionId: trxId
    };

    submitToBackend(payload, elements.btnSubmitArtCamp, () => {
      elements.modalSuccessTitle.textContent = "‘চিত্রপট’ রেজিস্ট্রেশন সফল!";
      elements.modalSuccessDesc.textContent =
        `ধন্যবাদ ${name}! আপনার চিত্রপট আর্ট ক্যাম্পের রেজিস্ট্রেশন (গ্রুপ: ${group}, ফি: ${fee} টাকা) সফলভাবে রেকর্ড করা হয়েছে।`;
      elements.modalSuccess.classList.add("active");
      elements.formArtCamp.reset();
      resetArtCampSelectedGroup();
      elements.acAge.value = "";
      elements.acAgeBadge.textContent = "অনির্ধারিত";
      elements.acAgeBadge.className = "age-status-badge";
    });
  }

  /**
   * ==========================================================================
   * FORM 2: 'উৎসব' (Movie Screening) LOGIC
   * ==========================================================================
   */

  /**
   * Calculate Movie Screening Registration Fee
   * - Condition for 50 TK: Strictly Institution === "EconDU" AND Session in ["25/26", "24/25", "23/24", "22/23"]
   * - Condition for 100 TK: All other combinations (including "Other")
   */
  function calculateMovieFee() {
    const institution = elements.msInstitution.value;
    const session = elements.msSession.value;

    const validEconSessions = ["25/26", "24/25", "23/24", "22/23"];
    const isEconDuEligible = institution === "EconDU" && validEconSessions.includes(session);

    const fee = isEconDuEligible ? 50 : 100;
    state.movieScreening.fee = fee;
    elements.msFee.value = fee;

    if (fee === 50) {
      elements.msFeeDisplay.textContent = "৫০ টাকা (50 TK)";
      elements.msFeeDisplay.style.color = "var(--color-success)";
      elements.msFeeRuleNote.textContent = "প্রযোজ্য ছাড়: EconDU সেশন ভিত্তিক রেট (৫০ টাকা)";
    } else {
      elements.msFeeDisplay.textContent = "১০০ টাকা (100 TK)";
      elements.msFeeDisplay.style.color = "var(--color-text-main)";
      elements.msFeeRuleNote.textContent =
        institution || session
          ? "সাধারণ রেট: ১০০ টাকা প্রযোজ্য"
          : "EconDU এবং [25/26, 24/25, 23/24, 22/23] সেশনের জন্য ৫০ টাকা, অন্যদের জন্য ১০০ টাকা।";
    }
  }

  /**
   * Handle Movie Screening Form Submission
   */
  function handleMovieScreeningSubmit(e) {
    e.preventDefault();

    if (!ensureAuthenticated()) return;

    const name = elements.msName.value.trim();
    const gender = elements.msGender.value;
    const phone = elements.msPhone.value.trim();
    const institution = elements.msInstitution.value;
    const institutionOther = elements.msInstitutionOther.value.trim();
    const session = elements.msSession.value;
    const sessionOther = elements.msSessionOther.value.trim();
    const fee = state.movieScreening.fee;

    // Shared verification inputs inside Movie Screening form
    const container = elements.formMovieScreening.querySelector(".payment-component-container");
    const paymentMethod = container.querySelector(".js-payment-method").value;
    const trxId = container.querySelector(".js-trx-id").value.trim();

    if (!name) return showToast("অনুগ্রহ করে আপনার নাম লিখুন।", "error");
    if (!gender) return showToast("অনুগ্রহ করে লিঙ্গ নির্বাচন করুন।", "error");
    if (!phone) return showToast("অনুগ্রহ করে ফোন নম্বর লিখুন।", "error");
    if (!institution) return showToast("অনুগ্রহ করে প্রতিষ্ঠান নির্বাচন করুন।", "error");
    if (institution === "Other" && !institutionOther) {
      return showToast("অনুগ্রহ করে প্রতিষ্ঠানের নাম নির্দিষ্ট করুন।", "error");
    }
    if (!session) return showToast("অনুগ্রহ করে সেশন নির্বাচন করুন।", "error");
    if (session === "Other" && !sessionOther) {
      return showToast("অনুগ্রহ করে সেশন উল্লেখ করুন।", "error");
    }
    if (!trxId) return showToast("অনুগ্রহ করে পেমেন্ট ট্রানজেকশন আইডি (TrxID) লিখুন।", "error");

    const payload = {
      formType: "movie-screening",
      googleEmail: state.currentUser.email,
      googleName: state.currentUser.name,
      name: name,
      gender: gender,
      phoneNumber: phone,
      institution: institution,
      institutionOther: institutionOther,
      session: session,
      sessionOther: sessionOther,
      fee: fee,
      paymentMethod: paymentMethod,
      transactionId: trxId
    };

    submitToBackend(payload, elements.btnSubmitMovieScreening, () => {
      elements.modalSuccessTitle.textContent = "‘উৎসব’ রেজিস্ট্রেশন সফল!";
      elements.modalSuccessDesc.textContent =
        `ধন্যবাদ ${name}! আপনার চলচ্চিত্র প্রদর্শনীর টিকিট বুকিং (ফি: ${fee} টাকা) সফলভাবে সম্পন্ন হয়েছে।`;
      elements.modalSuccess.classList.add("active");
      elements.formMovieScreening.reset();
      elements.msInstitutionOtherGroup.style.display = "none";
      elements.msSessionOtherGroup.style.display = "none";
      calculateMovieFee();
    });
  }

  /**
   * ==========================================================================
   * BACKEND TRANSMISSION & UTILITY FUNCTIONS
   * ==========================================================================
   */

  function ensureAuthenticated() {
    if (!state.currentUser) {
      showToast("অনুগ্রহ করে প্রথমে গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।", "error");
      switchView("view-auth");
      return false;
    }
    return true;
  }

  /**
   * Submit data to Google Apps Script endpoint
   */
  function submitToBackend(payload, submitBtn, onSuccess) {
    const config = window.APP_CONFIG || {};
    const scriptUrl = config.GOOGLE_APPS_SCRIPT_URL;

    // Check if URL is still placeholder
    if (!scriptUrl || scriptUrl.includes("YOUR_GOOGLE_APPS_SCRIPT")) {
      console.warn("GAS Web App URL is not configured yet. Running simulated submission.");
      toggleButtonLoading(submitBtn, true);

      setTimeout(() => {
        toggleButtonLoading(submitBtn, false);
        console.log("Simulated Backend Payload:", payload);
        showToast("সিমুলেশন মোড: গুগল শিটে ডেটা পাঠানোর জন্য config.js-এ Web App URL সেট করুন।", "success");
        onSuccess();
      }, 800);
      return;
    }

    toggleButtonLoading(submitBtn, true);

    /**
     * Note: Sending as 'text/plain;charset=utf-8' prevents CORS preflight
     * OPTIONS requests which Google Apps Script web apps do not handle.
     */
    fetch(scriptUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        toggleButtonLoading(submitBtn, false);
        if (data.status === "success") {
          onSuccess();
        } else {
          showToast(data.message || "সাবমিশন গ্রহণ করা যায়নি।", "error");
        }
      })
      .catch(err => {
        toggleButtonLoading(submitBtn, false);
        console.error("Submission failed:", err);
        showToast("সার্ভারে তথ্য পাঠাতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ ও স্ক্রিপ্ট পারমিশন যাচাই করুন।", "error");
      });
  }

  function toggleButtonLoading(btn, isLoading) {
    const textSpan = btn.querySelector(".btn-text");
    const spinnerSpan = btn.querySelector(".btn-spinner");

    if (isLoading) {
      btn.disabled = true;
      if (textSpan) textSpan.style.display = "none";
      if (spinnerSpan) spinnerSpan.style.display = "inline";
    } else {
      btn.disabled = false;
      if (textSpan) textSpan.style.display = "inline";
      if (spinnerSpan) spinnerSpan.style.display = "none";
    }
  }

  /**
   * Show notification toast
   */
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 4000);
  }

  // Run initialization on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
