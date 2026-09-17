/**
 * Angel & Jason Wedding — RSVP + Guestbook backend
 * ---------------------------------------------------------------
 * This script turns a Google Sheet into a free JSON API for the
 * wedding site hosted on GitHub Pages. It handles:
 *
 *   - doPost  : saves a new RSVP or guestbook entry as a row
 *   - doGet   : serves data back out, in three tiers:
 *       ?action=stats      -> public, aggregate numbers only
 *       ?action=guestbook  -> public, the guestbook wall entries
 *       ?action=all&key=.. -> admin only, full RSVP + guestbook data
 *
 * SETUP (see README.md for the full walkthrough):
 *   1. Create a Google Sheet, open Extensions > Apps Script, paste
 *      this file in as Code.gs (replacing the default content).
 *   2. Project Settings > Script properties > add a property named
 *      ADMIN_KEY with a password of your choosing. This key is
 *      never stored in this file or in the site's HTML — it only
 *      lives in Script Properties and in your own memory.
 *   3. Deploy > New deployment > Web app.
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   4. Copy the Web app URL into CONFIG.WEB_APP_URL in both
 *      index.html and admin.html.
 *
 * The two sheets ("RSVPs" and "Guestbook") are created
 * automatically on first submission — you do not need to set up
 * columns by hand.
 */

var SHEET_RSVPS = 'RSVPs';
var SHEET_GUESTBOOK = 'Guestbook';
var SHEET_RSVPS_REMOVED = 'RSVPs_Removed';
var SHEET_GUESTBOOK_REMOVED = 'Guestbook_Removed';

var RSVP_HEADERS = ['ID', 'Timestamp', 'Name', 'Attending', 'Guests', 'GuestNames', 'Meal', 'Dietary', 'Message'];
var GB_HEADERS = ['ID', 'Timestamp', 'Name', 'Kind', 'Message'];

/* ------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------ */

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      var v = row[i];
      obj[h] = (v instanceof Date) ? v.getTime() : v;
    });
    return obj;
  });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(v) {
  return (v === undefined || v === null) ? '' : String(v);
}

function checkAdmin_(params) {
  var props = PropertiesService.getScriptProperties();
  var adminKey = props.getProperty('ADMIN_KEY');
  return !!adminKey && params.key === adminKey;
}

/**
 * Moves the row whose ID column matches id from the sheet named
 * fromName to the sheet named toName (creating toName if needed).
 * Returns true if a row was moved.
 */
function moveRowById_(fromName, toName, headers, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fromSheet = ss.getSheetByName(fromName);
  if (!fromSheet) return false;
  var lastRow = fromSheet.getLastRow();
  if (lastRow < 2) return false;
  var range = fromSheet.getRange(2, 1, lastRow - 1, headers.length);
  var values = range.getValues();
  var idCol = headers.indexOf('ID');
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      var toSheet = getSheet_(toName, headers);
      toSheet.appendRow(values[i]);
      fromSheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------ *
 *  doPost — new RSVP or guestbook entry
 * ------------------------------------------------------------ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut_({ ok: false, error: 'missing body' });
    }
    var body = JSON.parse(e.postData.contents);
    var type = body.type;
    var r = body.record || {};

    if (type === 'rsvp') {
      var sheet = getSheet_(SHEET_RSVPS, RSVP_HEADERS);
      sheet.appendRow([
        clean_(r.id),
        new Date(),
        clean_(r.name),
        clean_(r.attending),
        clean_(r.guests),
        clean_(r.guestNames),
        clean_(r.meal),
        clean_(r.dietary),
        clean_(r.message)
      ]);
      return jsonOut_({ ok: true });
    }

    if (type === 'guestbook') {
      var gsheet = getSheet_(SHEET_GUESTBOOK, GB_HEADERS);
      gsheet.appendRow([
        clean_(r.id),
        new Date(),
        clean_(r.name),
        clean_(r.kind),
        clean_(r.message)
      ]);
      return jsonOut_({ ok: true });
    }

    if (type === 'remove' || type === 'restore') {
      if (!checkAdmin_(body)) {
        return jsonOut_({ ok: false, error: 'unauthorized' });
      }
      var target = body.target; // 'rsvp' | 'guestbook'
      var id = body.id;
      var moved;
      if (target === 'rsvp') {
        moved = (type === 'remove')
          ? moveRowById_(SHEET_RSVPS, SHEET_RSVPS_REMOVED, RSVP_HEADERS, id)
          : moveRowById_(SHEET_RSVPS_REMOVED, SHEET_RSVPS, RSVP_HEADERS, id);
      } else if (target === 'guestbook') {
        moved = (type === 'remove')
          ? moveRowById_(SHEET_GUESTBOOK, SHEET_GUESTBOOK_REMOVED, GB_HEADERS, id)
          : moveRowById_(SHEET_GUESTBOOK_REMOVED, SHEET_GUESTBOOK, GB_HEADERS, id);
      } else {
        return jsonOut_({ ok: false, error: 'unknown target: ' + target });
      }
      return jsonOut_({ ok: moved, error: moved ? undefined : 'row not found' });
    }

    return jsonOut_({ ok: false, error: 'unknown type: ' + type });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------ *
 *  doGet — read data back out
 * ------------------------------------------------------------ */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'stats';

  if (action === 'stats') {
    var rsvps = readSheet_(SHEET_RSVPS, RSVP_HEADERS);
    var going = 0, notGoing = 0, totalGuests = 0;
    rsvps.forEach(function (row) {
      if (row.Attending === 'yes') {
        going++;
        totalGuests += (parseInt(row.Guests, 10) || 1);
      } else if (row.Attending === 'no') {
        notGoing++;
      }
    });
    return jsonOut_({ ok: true, going: going, notGoing: notGoing, totalGuests: totalGuests });
  }

  if (action === 'guestbook') {
    var entries = readSheet_(SHEET_GUESTBOOK, GB_HEADERS).map(function (row) {
      return { id: row.ID, name: row.Name, kind: row.Kind, message: row.Message, ts: row.Timestamp };
    });
    return jsonOut_({ ok: true, guestbook: entries });
  }

  if (action === 'all') {
    if (!checkAdmin_(params)) {
      return jsonOut_({ ok: false, error: 'unauthorized' });
    }
    return jsonOut_({
      ok: true,
      rsvps: readSheet_(SHEET_RSVPS, RSVP_HEADERS),
      guestbook: readSheet_(SHEET_GUESTBOOK, GB_HEADERS),
      removedRsvps: readSheet_(SHEET_RSVPS_REMOVED, RSVP_HEADERS),
      removedGuestbook: readSheet_(SHEET_GUESTBOOK_REMOVED, GB_HEADERS)
    });
  }

  return jsonOut_({ ok: false, error: 'unknown action: ' + action });
}
