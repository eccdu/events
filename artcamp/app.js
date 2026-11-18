/**
 * Art Camp ('চিত্রপট') Dedicated Engine
 * Independent control, validation, and Google Sheet integration
 */

(function () {
  "use strict";

  const config = window.ARTCAMP_CONFIG || {};

  // Check if Art Camp is closed
  if (config.IS_OPEN === false) {
    document.addEventListener("DOMContentLoaded", () => {
      const authView = document.getElementById("view-auth");
      const formView = document.getElementById("view-form");
      const closedView = document.getElementById("view-closed");
      const closedText = document.getElementById("closed-message-text");

      if (authView) authView.style.display = "none";
      if (formView) formView.style.display = "none";
      if (closedView) closedView.style.display = "block";
      if (closedText && config.CLOSED_MESSAGE) {
        closedText.textContent = config.CLOSED_MESSAGE;
      }
    });
    return;
  }

  // Application State
  const state = {
    currentUser: null,
    calculatedAge: null,
    selectedGroup: null,
    selectedMedium: null,
    selectedFee: 0
  };

  const elements = {
    viewAuth: document.getElementById("view-auth"),
    viewForm: document.getElementById("view-form"),
    userAccountBar: document.getElementById("user-account-bar"),
    headerAvatar: document.getElementById("header-avatar"),
    headerUserName: document.getElementById("header-user-name"),
    headerUserEmail: document.getElementById("header-user-email"),
    btnSignout: document.getElementById("btn-signout"),

    // Auth Form
    formAuthLogin: document.getElementById("form-auth-login"),
    authInputName: document.getElementById("auth-input-name"),
    authInputEmail: document.getElementById("auth-input-email"),

    // Art Camp Form
    formArtCamp: document.getElementById("form-art-camp"),
    acName: document.getElementById("ac-name"),
    acPhone: document.getElementById("ac-phone"),
    acBirthday: document.getElementById("ac-birthday"),
    acAge: document.getElementById("ac-age"),
    acAgeBadge: document.getElementById("ac-age-badge"),
    acFeeTopBadge: document.getElementById("ac-fee-top-badge"),
    acGroupHelper: document.getElementById("ac-group-helper"),
    acSelectedGroup: document.getElementById("ac-selected-group"),
    acSelectedMedium: document.getElementById("ac-selected-medium"),
    acSelectedFee: document.getElementById("ac-selected-fee"),
    groupCards: {
      kuri: document.getElementById("group-card-kuri"),
      koliPaper: document.getElementById("group-card-koli-paper"),
      koliCanvas: document.getElementById("group-card-koli-canvas")
    },
    acPaymentMethod: document.getElementById("ac-payment-method"),
    acPaymentNumber: document.getElementById("ac-payment-number"),
    acTrxId: document.getElementById("ac-trx-id"),
    btnSubmitArtCamp: document.getElementById("btn-submit-art-camp"),

    // Modals
    modalSuccess: document.getElementById("modal-success"),
    successUserName: document.getElementById("success-user-name"),
    toastContainer: document.getElementById("toast-container")
  };

  function init() {
    setupEventListeners();
    setupBirthdayConstraints();
    setupClipboardButtons();
    checkExistingSession();
  }

  function setupClipboardButtons() {
    document.querySelectorAll(".js-copy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-copy");
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            showToast(`কপি করা হয়েছে: ${text}`, "success");
          }).catch(() => {
            showToast("কপি করা যায়নি, ম্যানুয়ালি কপি করুন।", "error");
          });
        }
      });
    });
  }

  function setupBirthdayConstraints() {
    const today = new Date().toISOString().split("T")[0];
    elements.acBirthday.setAttribute("max", today);
  }

  function setupEventListeners() {
    // Auth Login
    if (elements.formAuthLogin) {
      elements.formAuthLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = elements.authInputName.value.trim();
        const email = elements.authInputEmail.value.trim().toLowerCase();

        if (!name) return showToast("অনুগ্রহ করে আপনার নাম লিখুন।", "error");
        if (!email || !email.includes("@") || !email.includes(".")) {
          return showToast("সঠিক ইমেইল এড্রেস প্রদান করুন।", "error");
        }

        const user = {
          name: name,
          email: email,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=005A7E&color=fff&bold=true`,
          sub: "user_" + Date.now()
        };

        handleSuccessfulLogin(user);
      });
    }

    // Sign out
    elements.btnSignout.addEventListener("click", signOut);

    // Birthday change -> Age calculation
    elements.acBirthday.addEventListener("change", handleBirthdayChange);
    elements.acBirthday.addEventListener("input", handleBirthdayChange);

    // Group cards selection
    Object.values(elements.groupCards).forEach(card => {
      card.addEventListener("click", () => {
        if (card.classList.contains("disabled")) return;
        selectArtCampGroup(card);
      });
    });

    // Form submission
    elements.formArtCamp.addEventListener("submit", handleArtCampSubmit);
  }

  function handleSuccessfulLogin(user) {
    state.currentUser = user;
    sessionStorage.setItem("ecc_user", JSON.stringify(user));

    elements.headerUserName.textContent = user.name;
    elements.headerUserEmail.textContent = user.email;
    elements.headerAvatar.src = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=005A7E&color=fff`;
    elements.userAccountBar.style.display = "flex";

    if (!elements.acName.value) {
      elements.acName.value = user.name;
    }

    elements.viewAuth.classList.remove("active");
    elements.viewForm.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  function signOut() {
    state.currentUser = null;
    sessionStorage.removeItem("ecc_user");
    elements.userAccountBar.style.display = "none";
    elements.viewForm.classList.remove("active");
    elements.viewAuth.classList.add("active");
    showToast("লগআউট সম্পন্ন হয়েছে।", "success");
  }

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

  function handleBirthdayChange() {
    const bdayVal = elements.acBirthday.value;
    const age = calculateAge(bdayVal);
    state.calculatedAge = age;

    if (age === null || age < 0) {
      elements.acAge.value = "";
      elements.acAgeBadge.textContent = "অনির্ধারিত";
      elements.acAgeBadge.className = "age-status-badge";
      disableAllGroups("সঠিক জন্মতারিখ দিন");
      resetSelectedGroup();
      return;
    }

    elements.acAge.value = `${age} বছর (${age} Years)`;

    if (age < 3) {
      elements.acAgeBadge.textContent = "বয়স ৩ বছরের কম";
      elements.acAgeBadge.className = "age-status-badge invalid";
      disableAllGroups("ন্যূনতম বয়স ৩ বছর আবশ্যক");
      resetSelectedGroup();
    } else if (age > 25) {
      elements.acAgeBadge.textContent = "বয়স ২৫ বছরের বেশি";
      elements.acAgeBadge.className = "age-status-badge invalid";
      disableAllGroups("সর্বোচ্চ বয়সসীমা ২৫ বছর");
      resetSelectedGroup();
    } else {
      elements.acAgeBadge.textContent = "বয়সসীমার অন্তর্ভুক্ত";
      elements.acAgeBadge.className = "age-status-badge valid";
      updateGroupEligibilityByAge(age);
    }
  }

  function updateGroupEligibilityByAge(age) {
    const isKuriEligible = age >= 3 && age <= 15;
    const isKoliEligible = age >= 16 && age <= 25;

    toggleGroupCard(elements.groupCards.kuri, isKuriEligible);
    toggleGroupCard(elements.groupCards.koliPaper, isKoliEligible);
    toggleGroupCard(elements.groupCards.koliCanvas, isKoliEligible);

    elements.acGroupHelper.textContent = isKuriEligible
      ? "আপনার বয়সের জন্য 'কুঁড়ি' গ্রুপ প্রযোজ্য"
      : "আপনার বয়সের জন্য 'কলি' গ্রুপসমূহ প্রযোজ্য";

    const activeCard = document.querySelector(".group-card.selected");
    if (activeCard && activeCard.classList.contains("disabled")) {
      resetSelectedGroup();
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

  function disableAllGroups(reason) {
    Object.values(elements.groupCards).forEach(card => {
      card.classList.add("disabled");
      card.classList.remove("selected");
    });
    elements.acGroupHelper.textContent = reason;
  }

  function resetSelectedGroup() {
    Object.values(elements.groupCards).forEach(card => card.classList.remove("selected"));
    elements.acSelectedGroup.value = "";
    elements.acSelectedMedium.value = "";
    elements.acSelectedFee.value = "0";
    if (elements.acFeeTopBadge) {
      elements.acFeeTopBadge.textContent = "০ টাকা";
    }
    state.selectedGroup = null;
    state.selectedMedium = null;
    state.selectedFee = 0;
  }

  function selectArtCampGroup(card) {
    Object.values(elements.groupCards).forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    const group = card.getAttribute("data-group");
    const medium = card.getAttribute("data-medium");
    const fee = parseInt(card.getAttribute("data-fee"), 10);

    state.selectedGroup = group;
    state.selectedMedium = medium;
    state.selectedFee = fee;

    elements.acSelectedGroup.value = group;
    elements.acSelectedMedium.value = medium;
    elements.acSelectedFee.value = fee;
    if (elements.acFeeTopBadge) {
      elements.acFeeTopBadge.textContent = `${fee.toLocaleString("bn-BD")} টাকা (${fee} TK)`;
    }
  }

  function handleArtCampSubmit(e) {
    e.preventDefault();

    if (!state.currentUser) {
      showToast("অনুগ্রহ করে প্রথমে লগইন করুন।", "error");
      elements.viewForm.classList.remove("active");
      elements.viewAuth.classList.add("active");
      return;
    }

    const name = elements.acName.value.trim();
    const phone = elements.acPhone.value.trim();
    const birthday = elements.acBirthday.value;
    const age = state.calculatedAge;
    const group = state.selectedGroup;
    const medium = state.selectedMedium;
    const fee = state.selectedFee;
    const paymentMethod = elements.acPaymentMethod.value;
    const paymentNumber = elements.acPaymentNumber.value.trim();
    const trxId = elements.acTrxId.value.trim();

    if (!name) return showToast("অনুগ্রহ করে অংশগ্রহণকারীর নাম লিখুন।", "error");
    if (!phone) return showToast("অনুগ্রহ করে ফোন নম্বর লিখুন।", "error");
    if (!birthday || age === null) return showToast("সঠিক জন্মতারিখ দিন।", "error");
    if (age < 3 || age > 25) return showToast("বয়স ৩ থেকে ২৫ বছরের মধ্যে হতে হবে।", "error");
    if (!group) return showToast("অনুগ্রহ করে একটি অনুমোদিত গ্রুপ নির্বাচন করুন।", "error");
    if (!paymentNumber) return showToast("অনুগ্রহ করে প্রেরকের পেমেন্ট নম্বরটি দিন।", "error");
    if (!trxId) return showToast("অনুগ্রহ করে ট্রানজেকশন আইডি (TrxID) লিখুন।", "error");

    const payload = {
      formType: "art-camp",
      googleEmail: state.currentUser.email,
      googleName: state.currentUser.name,
      name: name,
      gender: "",
      phoneNumber: phone,
      birthday: birthday,
      age: age,
      group: group,
      medium: medium,
      fee: fee,
      paymentMethod: paymentMethod,
      paymentNumber: paymentNumber,
      transactionId: trxId
    };

    const submitBtn = elements.btnSubmitArtCamp;
    toggleButtonLoading(submitBtn, true);

    fetch(config.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    })
      .then(res => res.json())
      .then(data => {
        toggleButtonLoading(submitBtn, false);
        if (data.status === "success") {
          elements.successUserName.textContent = name;
          elements.modalSuccess.classList.add("active");
          elements.formArtCamp.reset();
          resetSelectedGroup();
          elements.acAge.value = "";
          elements.acAgeBadge.textContent = "অনির্ধারিত";
          elements.acAgeBadge.className = "age-status-badge";
        } else {
          showToast(data.message || "সাবমিশন গ্রহণ করা যায়নি।", "error");
        }
      })
      .catch(err => {
        toggleButtonLoading(submitBtn, false);
        console.error("Submission failed:", err);
        showToast("সার্ভারে তথ্য পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।", "error");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
