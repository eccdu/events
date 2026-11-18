/**
 * ============================================================================
 * Economics Cultural Club (ECC) Registration Backend
 * Google Apps Script (Code.gs)
 * ============================================================================
 * 
 * Instructions:
 * 1. Create two separate Google Sheets (or one sheet with two tabs):
 *    - Sheet 1: For 'চিত্রপট' (Art-camp)
 *    - Sheet 2: For 'উৎসব' (Movie Screening)
 * 2. Paste their Spreadsheet IDs below (found in the URL between /d/ and /edit).
 * 3. Deploy as a Web App:
 *    - Click "Deploy" -> "New deployment"
 *    - Select type: "Web app"
 *    - Execute as: "Me (your account)"
 *    - Who has access: "Anyone"
 *    - Copy the Web App URL and paste into config.js in your frontend.
 */

// CONFIGURATION: Google Sheet IDs configured from your links
const ART_CAMP_SHEET_ID = "1miYxJzCtdYe7MKDb47N0mnne-w-fOUKiY3owOswNdFI";
const MOVIE_SCREENING_SHEET_ID = "1heyv8bStl-evXOMdQJ-00X4O08OpvX9zmen3mCQzxAE";

// Optional sheet/tab name inside the target spreadsheets
const ART_CAMP_TAB_NAME = "Submissions";
const MOVIE_SCREENING_TAB_NAME = "Submissions";

/**
 * Handle incoming POST requests from the static frontend
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent requests to avoid race conditions
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: "error",
        message: "No request body received."
      }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const formType = payload.formType; // 'art-camp' or 'movie-screening'

    if (!formType) {
      return createJsonResponse({
        status: "error",
        message: "Missing 'formType' parameter in payload."
      }, 400);
    }

    const timestamp = new Date();

    if (formType === "art-camp") {
      handleArtCampSubmission(payload, timestamp);
    } else if (formType === "movie-screening") {
      handleMovieScreeningSubmission(payload, timestamp);
    } else {
      return createJsonResponse({
        status: "error",
        message: "Invalid formType specified: " + formType
      }, 400);
    }

    return createJsonResponse({
      status: "success",
      message: "Registration recorded successfully!",
      timestamp: timestamp.toISOString()
    }, 200);

  } catch (error) {
    Logger.log("Error processing submission: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: error.message || "An unexpected error occurred."
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle GET requests for connectivity test or diagnostics
 */
function doGet(e) {
  return createJsonResponse({
    status: "active",
    message: "ECC Registration Google Apps Script endpoint is online and operational."
  }, 200);
}

/**
 * Handle Art-camp 'চিত্রপট' submission and append to Google Sheet
 */
function handleArtCampSubmission(data, timestamp) {
  const sheet = getTargetSheet(ART_CAMP_SHEET_ID, ART_CAMP_TAB_NAME, "চিত্রপট_ArtCamp");

  // Ensure headers exist
  const headers = [
    "Timestamp",
    "User Email",
    "User Name",
    "Participant Name",
    "Gender",
    "Phone (Guardian's if Minor)",
    "Birthday",
    "Age (Years)",
    "Selected Group",
    "Medium",
    "Fee (TK)",
    "Payment Method",
    "Payment Number",
    "Transaction ID / Ref"
  ];
  ensureHeaders(sheet, headers);

  // Prepare row
  const row = [
    timestamp,
    data.googleEmail || "",
    data.googleName || "",
    data.name || "",
    data.gender || "",
    data.phoneNumber ? "'" + data.phoneNumber : "", // prepend quote to preserve phone as text
    data.birthday || "",
    data.age !== undefined ? data.age : "",
    data.group || "",
    data.medium || "",
    data.fee || 0,
    data.paymentMethod || "MFS / Bank",
    data.paymentNumber ? "'" + data.paymentNumber : "",
    data.transactionId || ""
  ];

  sheet.appendRow(row);
}

/**
 * Handle Movie Screening 'উৎসব' submission and append to Google Sheet
 */
function handleMovieScreeningSubmission(data, timestamp) {
  const sheet = getTargetSheet(MOVIE_SCREENING_SHEET_ID, MOVIE_SCREENING_TAB_NAME, "উৎসব_MovieScreening");

  // Ensure headers exist
  const headers = [
    "Timestamp",
    "User Email",
    "User Name",
    "Participant Name",
    "Gender",
    "Phone (Guardian's if Minor)",
    "Institution",
    "Specified Institution",
    "DU Reg. No.",
    "Session",
    "Specified Session",
    "Fee (TK)",
    "Payment Method",
    "Payment Number",
    "Transaction ID / Ref"
  ];
  ensureHeaders(sheet, headers);

  // Prepare row
  const row = [
    timestamp,
    data.googleEmail || "",
    data.googleName || "",
    data.name || "",
    data.gender || "",
    data.phoneNumber ? "'" + data.phoneNumber : "",
    data.institution || "",
    data.institutionOther || "",
    data.duRegNo ? "'" + data.duRegNo : "",
    data.session || "",
    data.sessionOther || "",
    data.fee || 0,
    data.paymentMethod || "MFS / Bank",
    data.paymentNumber ? "'" + data.paymentNumber : "",
    data.transactionId || ""
  ];

  sheet.appendRow(row);
}

/**
 * Helper to fetch target sheet object, handling both multi-sheet or multi-tab setups
 */
function getTargetSheet(spreadsheetId, tabName, fallbackTabName) {
  let spreadsheet;
  
  if (spreadsheetId && !spreadsheetId.includes("PASTE_")) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId.trim());
    } catch (e) {
      throw new Error("Unable to open Google Sheet with ID: " + spreadsheetId + ". Ensure the script has permissions and the ID is correct.");
    }
  } else {
    // If running bound to a spreadsheet or ID not set, fallback to active spreadsheet
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      throw new Error("Spreadsheet ID is not configured in Code.gs. Please set ART_CAMP_SHEET_ID and MOVIE_SCREENING_SHEET_ID.");
    }
  }

  if (!spreadsheet) {
    throw new Error("No accessible spreadsheet found. Please check your Spreadsheet IDs.");
  }

  // Attempt to find tab, or create if absent
  let sheet = spreadsheet.getSheetByName(tabName) || spreadsheet.getSheetByName(fallbackTabName);
  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0) {
      sheet = sheets[0];
      sheet.setName(tabName);
    } else {
      sheet = spreadsheet.insertSheet(tabName);
    }
  }
  return sheet;
}

/**
 * Ensure column headers exist in row 1 with nice styling
 */
function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#F1F5F9");
    headerRange.setFontColor("#0F172A");
    sheet.setFrozenRows(1);
  }
}

/**
 * Helper to return standard JSON HTTP response
 */
function createJsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
