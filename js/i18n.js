export const i18n = (() => {
  const dict = {
    en: {
      page_title: "Kultur Komitee Winterthur — Results",
      used_budget: "Used Budget",
      group_individual: "Group : Individual",
      results_header: "Komitee Equal Shares Result",
      drop_overlay: "Drop a .pb file to import.",
  disclaimer_text: `The Komitee Equal Shares platform was developed by Joshua C. Yang (joyang@ethz.ch),\nadapted from the "Method of Equal Shares: Online Computation Tool" by Dominik Peters.`,
      show_losers: "Show losing projects",
      download_xlsx: "Download .xlsx",
      download_csv: "Download .csv",
      export_hint: "Data export reflects current table view.",
      funding_split: "Funding Split",
      toggle_split: "Show Funding Split column",
      // Table column headers
      col_id: "ID",
      col_title: "Title",
      col_cost: "Cost",
      col_grp_votes: "Grp. Votes",
      col_ind_points: "Ind. Points",
      col_score: "Score",
      col_funding_split: "Funding Split",
      col_selected: "Selected",
      // Stats labels
      selected_projects_label: "Number of selected projects",
      total_cost_selected_label: "Total cost of selected projects",
      average_label: "Average",
  reset: "Reset",
  of: "of",
    // How-to-read helper
    how_to_read_summary: "How to read this table",
    how_to_read_html: `The “Funding Split” column shows how much of the project’s cost was covered by groups (orange) and by individual voters (pink). The “Votes” columns show how many points the project received: “Grp. Votes” is the total points from groups, and “Ind. Points” is the total points from individual voters. The number in brackets for each tells how many groups or individuals gave the project any support. “Score” is the total of all group and individual points added together.`,
      // Receipts
      receipts_heading: "Detailed Receipts",
      receipts_global_html: `<strong>Why some projects get skipped:</strong> If a project costs more than its supporters can afford together (given their remaining budgets), it cannot be funded. If other projects with stronger combined support are funded first, your budget may already be “spent” on those, leaving nothing for the later projects you supported.<br><br><strong>Why you might underspend your budget:</strong> If the projects you supported did not get enough overall backing, they were skipped and your remaining budget went unused. If many other people also supported the same projects, your individual share of the costs was smaller, leaving part of your budget unspent. The algorithm may stop once no remaining project can be afforded, even if you still had some budget left.`,
      item: "ITEM",
      votes: "VOTES",
      spent: "SPENT",
      subtotal: "Subtotal",
      total: "TOTAL",
      no_items: "No items",
      groups: "Groups",
      individuals: "Individuals",
      voter: "Voter",
      // Intro paragraph
  page_intro_html: `<div id="page-description">We deployed Komitee Equal Shares in the 2025 <a href="https://kulturkomitee.win/#forschung" target="_blank" rel="noopener noreferrer">Kultur Komitee</a> (KK25), where 38 residents evaluated 121 proposals and allocated CHF 378,901 to 43 projects. Participants co-defined eight impact fields, weighted their relative importance online, and deliberated in two rounds of field-based groups before casting individual point votes. The algorithm integrated all signals into one unified allocation that participants could inspect immediately on decision day, supported by outcome tables and receipts. For a detailed description of the method, see <a href="https://arxiv.org/abs/2510.02040" target="_blank" rel="noopener noreferrer">this paper</a>. The Komitee Equal Shares platform was developed by <a href="https://www.joshuacyang.com" target="_blank" rel="noopener noreferrer">Joshua C. Yang</a> (<a href="mailto:joyang@ethz.ch">joyang@ethz.ch</a>), adapted from the <a href="https://equalshares.net/tools/compute/" target="_blank" rel="noopener noreferrer">Method of Equal Shares: Online Computation Tool</a> by Dominik Peters.</div>`
    },
    de: {
      page_title: "Kultur Komitee Winterthur — Auswertung",
      used_budget: "Verwendetes Budget",
      group_individual: "Gruppen : Individuell",
      results_header: "Komitee Equal Shares Ergebnis",
      drop_overlay: "Eine .pb-Datei hier ablegen, um zu importieren.",
  disclaimer_text: `Die Komitee Equal Shares Plattform wurde von Joshua C. Yang (joyang@ethz.ch) entwickelt,\nadaptiert vom „Method of Equal Shares: Online Computation Tool“ von Dominik Peters.`,
      show_losers: "Verliererprojekte anzeigen",
      download_xlsx: ".xlsx herunterladen",
      download_csv: ".csv herunterladen",
      export_hint: "Der Export entspricht der aktuellen Tabellenansicht.",
      funding_split: "Finanzierungsanteil",
      toggle_split: "Spalte Finanzierungsanteil anzeigen",
      // Table column headers
      col_id: "ID",
      col_title: "Titel",
      col_cost: "Kosten",
      col_grp_votes: "Grp. Stimmen",
      col_ind_points: "Ind. Punkte",
      col_score: "Punktzahl",
      col_funding_split: "Finanzierungsanteil",
      col_selected: "Ausgewählt",
      // Stats labels
      selected_projects_label: "Anzahl ausgewählter Projekte",
      total_cost_selected_label: "Gesamtkosten ausgewählter Projekte",
      average_label: "Durchschnitt",
  reset: "Zurücksetzen",
  of: "von",
    // How-to-read helper
    how_to_read_summary: "So liest man diese Tabelle",
    how_to_read_html: `Die Spalte „Finanzierungsanteil“ zeigt, welcher Anteil der Projektkosten von Gruppen (orange) und von Einzelpersonen (pink) gedeckt wurde. Die Spalten „Stimmen“ zeigen, wie viele Punkte das Projekt erhalten hat: „Grp. Stimmen“ ist die Gesamtpunktzahl der Gruppen, und „Ind. Punkte“ ist die Gesamtpunktzahl der Einzelpersonen. Die Zahl in Klammern gibt jeweils an, wie viele Gruppen bzw. Einzelpersonen dem Projekt irgendeine Unterstützung gegeben haben. „Punktzahl“ ist die Summe aller Gruppen- und Einzelpunkte.`,
      // Receipts
      receipts_heading: "Detaillierte Belege",
      receipts_global_html: `<strong>Warum manche Projekte übersprungen werden:</strong> Wenn ein Projekt mehr kostet, als seine Unterstützer:innen gemeinsam (mit ihren verbleibenden Budgets) finanzieren können, wird es nicht ausgewählt. Werden Projekte mit stärkerer Unterstützung zuerst finanziert, kann Ihr Budget bereits dafür verwendet worden sein.<br><br><strong>Warum Ihr Budget ungenutzt bleiben kann:</strong> Wenn die von Ihnen unterstützten Projekte insgesamt zu wenig Rückhalt hatten, wurden sie übersprungen und Ihr verbleibendes Budget blieb ungenutzt. Wenn viele andere dieselben Projekte unterstützt haben, war Ihr individueller Kostenanteil kleiner, wodurch ein Teil Ihres Budgets ungenutzt blieb. Der Algorithmus stoppt, sobald kein verbleibendes Projekt mehr finanzierbar ist – auch wenn noch Budget übrig ist.`,
      item: "PROJEKT",
      votes: "STIMMEN",
      spent: "AUSGABEN",
      subtotal: "Zwischensumme",
      total: "GESAMT",
      no_items: "Keine Einträge",
      groups: "Gruppen",
      individuals: "Einzelpersonen",
      voter: "Wähler/in",
      // Intro paragraph
  page_intro_html: `<div id="page-description">Wir haben Komitee Equal Shares im <a href="https://kulturkomitee.win/#forschung" target="_blank" rel="noopener noreferrer">Kultur Komitee</a> 2025 (KK25) eingesetzt: 38 Einwohner:innen bewerteten 121 Vorschläge und verteilten CHF 378’901 auf 43 Projekte. Die Teilnehmenden definierten gemeinsam acht Wirkungsfelder, gewichteten deren relative Bedeutung online und diskutierten in zwei Runden feldbasierter Gruppen, bevor sie individuelle Punktstimmen abgaben. Der Algorithmus integrierte alle Signale zu einer einheitlichen Zuteilung, die die Teilnehmenden am Entscheidungstag sofort einsehen konnten – unterstützt durch Ergebnis-Tabellen und Belege. Eine ausführliche Beschreibung der Methode finden Sie in <a href="https://arxiv.org/abs/2510.02040" target="_blank" rel="noopener noreferrer">diesem Paper</a>. Die Komitee Equal Shares Plattform wurde von <a href="https://www.joshuacyang.com" target="_blank" rel="noopener noreferrer">Joshua C. Yang</a> (<a href="mailto:joyang@ethz.ch">joyang@ethz.ch</a>) entwickelt, adaptiert vom <a href="https://equalshares.net/tools/compute/" target="_blank" rel="noopener noreferrer">Method of Equal Shares: Online Computation Tool</a> von Dominik Peters.</div>`
    }
  };

  let current = "en";

  function t(key) {
    return (dict[current] && dict[current][key]) || key;
  }

  function applyDom(root = document) {
    document.title = t("page_title");
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const txt = t(key);
      if (txt) el.textContent = txt;
    });
  }

  function setLang(lang) {
    if (!dict[lang]) return;
    current = lang;
    localStorage.setItem("lang", lang);
    document.documentElement.setAttribute("lang", lang);
    applyDom();
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
    });
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  function init() {
    const saved = localStorage.getItem("lang");
    const browser = (navigator.language || "en").slice(0,2);
    const initial = saved || (dict[browser] ? browser : "en");
    setLang(initial);
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".lang-btn");
      if (!btn) return;
      setLang(btn.dataset.lang);
    });
    window.i18n = { t, setLang, get lang(){ return current; } };
  }

  return { init, t, setLang, get lang(){ return current; } };
})();