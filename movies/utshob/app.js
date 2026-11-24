/**
 * Movie Screening ('উৎসব') Dedicated Engine
 * Independent control, dynamic pricing, and Google Sheet integration
 */

(function () {
  "use strict";

  const config = window.MOVIES_CONFIG || {};

  // Check if Movie Screening is closed
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
    fee: 0
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

    // Movie Screening Form
    formMovieScreening: document.getElementById("form-movie-screening"),
    msName: document.getElementById("ms-name"),
    msPhone: document.getElementById("ms-phone"),
    msInstitution: document.getElementById("ms-institution"),
    msDuRegGroup: document.getElementById("ms-du-reg-group"),
    msDuReg: document.getElementById("ms-du-reg"),
    msInstitutionOtherGroup: document.getElementById("ms-institution-other-group"),
    msInstitutionOther: document.getElementById("ms-institution-other"),
    msSession: document.getElementById("ms-session"),
    msSessionOtherGroup: document.getElementById("ms-session-other-group"),
    msSessionOther: document.getElementById("ms-session-other"),
    msFeeTopBadge: document.getElementById("ms-fee-top-badge"),
    msFeeRuleNote: document.getElementById("ms-fee-rule-note"),
    msPaymentMethod: document.getElementById("ms-payment-method"),
    msPaymentNumber: document.getElementById("ms-payment-number"),
    msTrxId: document.getElementById("ms-trx-id"),
    btnSubmitMovieScreening: document.getElementById("btn-submit-movie-screening"),

    // Modals
    modalSuccess: document.getElementById("modal-success"),
    successUserName: document.getElementById("success-user-name"),
    toastContainer: document.getElementById("toast-container")
  };

  function init() {
    setupEventListeners();
    setupClipboardButtons();
    checkExistingSession();
    calculateMovieFee();
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

    // Institution & Session changes
    elements.msInstitution.addEventListener("change", () => {
      const isEconDU = elements.msInstitution.value === "EconDU";
      const isOther = elements.msInstitution.value === "Other";

      // Toggle DU Reg No for EconDU
      if (elements.msDuRegGroup) {
        elements.msDuRegGroup.style.display = isEconDU ? "flex" : "none";
        elements.msDuReg.required = isEconDU;
        if (!isEconDU) elements.msDuReg.value = "";
      }

      // Toggle Other Institution Input
      elements.msInstitutionOtherGroup.style.display = isOther ? "flex" : "none";
      elements.msInstitutionOther.required = isOther;
      if (!isOther) elements.msInstitutionOther.value = "";

      calculateMovieFee();
    });

    if (elements.msDuReg) {
      elements.msDuReg.addEventListener("input", calculateMovieFee);
    }
    elements.msInstitutionOther.addEventListener("input", calculateMovieFee);

    elements.msSession.addEventListener("change", () => {
      const isOther = elements.msSession.value === "Other";
      elements.msSessionOtherGroup.style.display = isOther ? "flex" : "none";
      elements.msSessionOther.required = isOther;
      if (!isOther) elements.msSessionOther.value = "";
      calculateMovieFee();
    });
    elements.msSessionOther.addEventListener("input", calculateMovieFee);

    // Form submission
    elements.formMovieScreening.addEventListener("submit", handleMovieScreeningSubmit);
  }

  function handleSuccessfulLogin(user) {
    state.currentUser = user;
    sessionStorage.setItem("ecc_user", JSON.stringify(user));

    elements.headerUserName.textContent = user.name;
    elements.headerUserEmail.textContent = user.email;
    elements.headerAvatar.src = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=005A7E&color=fff`;
    elements.userAccountBar.style.display = "flex";

    if (!elements.msName.value) {
      elements.msName.value = user.name;
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

  function calculateMovieFee() {
    const institution = elements.msInstitution ? elements.msInstitution.value : "";
    const session = elements.msSession ? elements.msSession.value : "";
    const institutionOther = elements.msInstitutionOther ? elements.msInstitutionOther.value.trim() : "";
    const sessionOther = elements.msSessionOther ? elements.msSessionOther.value.trim() : "";
    const duReg = elements.msDuReg ? elements.msDuReg.value.trim() : "";

    // 1. Both institution and session must be selected
    if (!institution || !session) {
      setZeroFee("প্রতিষ্ঠান ও সেশন নির্বাচন করলে প্রযোজ্য ফি প্রদর্শিত হবে।");
      return;
    }

    // 2. If institution is Other, institutionOther must be provided
    if (institution === "Other" && !institutionOther) {
      setZeroFee("প্রতিষ্ঠানের নাম লিখলে প্রযোজ্য ফি প্রদর্শিত হবে।");
      return;
    }

    // 3. If institution is EconDU, DU Reg. No. must be provided
    if (institution === "EconDU" && !duReg) {
      setZeroFee("ঢাবি রেজিস্ট্রেশন নম্বর লিখলে প্রযোজ্য ফি প্রদর্শিত হবে।");
      return;
    }

    // 4. If session is Other, sessionOther must be provided
    if (session === "Other" && !sessionOther) {
      setZeroFee("সেশন উল্লেখ করলে প্রযোজ্য ফি প্রদর্শিত হবে।");
      return;
    }

    // When all required fields are provided:
    const validEconSessions = ["25/26", "24/25", "23/24", "22/23"];
    const isEconDuEligible = institution === "EconDU" && validEconSessions.includes(session);

    const fee = isEconDuEligible ? 50 : 100;
    state.fee = fee;

    if (elements.msFeeTopBadge) {
      if (fee === 50) {
        elements.msFeeTopBadge.textContent = "৫০ টাকা (50 TK)";
        elements.msFeeTopBadge.style.color = "var(--color-success)";
      } else {
        elements.msFeeTopBadge.textContent = "১০০ টাকা (100 TK)";
        elements.msFeeTopBadge.style.color = "var(--color-primary)";
      }
    }

    if (elements.msFeeRuleNote) {
      if (fee === 50) {
        elements.msFeeRuleNote.textContent = "প্রযোজ্য ছাড়: EconDU সেশন ভিত্তিক রেট (৫০ টাকা)";
      } else {
        elements.msFeeRuleNote.textContent = "সাধারণ রেট: ১০০ টাকা প্রযোজ্য";
      }
    }
  }

  function setZeroFee(noteText) {
    state.fee = 0;
    if (elements.msFeeTopBadge) {
      elements.msFeeTopBadge.textContent = "০ টাকা (0 TK)";
      elements.msFeeTopBadge.style.color = "var(--color-text-muted)";
    }
    if (elements.msFeeRuleNote) {
      elements.msFeeRuleNote.textContent = noteText;
    }
  }

  function handleMovieScreeningSubmit(e) {
    e.preventDefault();

    if (!state.currentUser) {
      showToast("অনুগ্রহ করে প্রথমে লগইন করুন।", "error");
      elements.viewForm.classList.remove("active");
      elements.viewAuth.classList.add("active");
      return;
    }

    const name = elements.msName.value.trim();
    const phone = elements.msPhone.value.trim();
    const institution = elements.msInstitution.value;
    const institutionOther = elements.msInstitutionOther.value.trim();
    const duRegNo = elements.msDuReg ? elements.msDuReg.value.trim() : "";
    const session = elements.msSession.value;
    const sessionOther = elements.msSessionOther.value.trim();
    const fee = state.fee;
    const paymentMethod = elements.msPaymentMethod.value;
    const paymentNumber = elements.msPaymentNumber.value.trim();
    const trxId = elements.msTrxId.value.trim();

    if (!name) return showToast("অনুগ্রহ করে আপনার নাম লিখুন।", "error");
    if (!phone) return showToast("অনুগ্রহ করে ফোন নম্বর লিখুন।", "error");
    if (!institution) return showToast("অনুগ্রহ করে প্রতিষ্ঠান নির্বাচন করুন।", "error");
    if (institution === "EconDU" && !duRegNo) {
      return showToast("অনুগ্রহ করে আপনার ঢাবি রেজিস্ট্রেশন নম্বর লিখুন।", "error");
    }
    if (institution === "Other" && !institutionOther) {
      return showToast("অনুগ্রহ করে প্রতিষ্ঠানের নাম নির্দিষ্ট করুন।", "error");
    }
    if (!session) return showToast("অনুগ্রহ করে সেশন নির্বাচন করুন।", "error");
    if (session === "Other" && !sessionOther) {
      return showToast("অনুগ্রহ করে সেশন উল্লেখ করুন।", "error");
    }
    if (fee === 0) {
      return showToast("অনুগ্রহ করে প্রয়োজনীয় তথ্য পূরণ করে ফি নিশ্চিত করুন।", "error");
    }
    if (!paymentNumber) return showToast("অনুগ্রহ করে প্রেরকের পেমেন্ট নম্বরটি দিন।", "error");
    if (!trxId) return showToast("অনুগ্রহ করে ট্রানজেকশন আইডি (TrxID) লিখুন।", "error");

    const payload = {
      formType: "movie-screening",
      googleEmail: state.currentUser.email,
      googleName: state.currentUser.name,
      name: name,
      gender: "",
      phoneNumber: phone,
      institution: institution,
      institutionOther: institutionOther,
      duRegNo: duRegNo,
      session: session,
      sessionOther: sessionOther,
      fee: fee,
      paymentMethod: paymentMethod,
      paymentNumber: paymentNumber,
      transactionId: trxId
    };

    const submitBtn = elements.btnSubmitMovieScreening;
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
          elements.formMovieScreening.reset();
          if (elements.msDuRegGroup) elements.msDuRegGroup.style.display = "none";
          elements.msInstitutionOtherGroup.style.display = "none";
          elements.msSessionOtherGroup.style.display = "none";
          calculateMovieFee();
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
