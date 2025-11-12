import { generateTableBarCharts } from "./tableBarChart.js";

// Format helper for receipts: show real title if selected, otherwise show 3-digit ID
function threeDigitId(anyId){
    const raw = String(anyId);
    const m = raw.match(/(\d+)(?!.*\d)/);
    if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num)) return String(num).padStart(3, '0');
    }
    // Fallback: keep raw but ensure at least 3 chars
    return raw.replace(/\D/g,'').padStart(3, '0') || '000';
}

function receiptDisplayName(anyId, originalName){
    // If the dataset provides a real name, show it; otherwise show 3-digit ID
    const name = originalName == null ? "" : String(originalName);
    if (name && name !== "-") return name;
    return threeDigitId(anyId);
}

// Re-render results on language changes (if i18n is active)
let __lastRenderArgs;
window.addEventListener("langchange", () => {
    if (__lastRenderArgs) {
        const { instance, winners, notes } = __lastRenderArgs;
        try { displayResults(instance, { winners, notes }); } catch {}
    }
});

let showLosers = true;
/**
 * Utility to display a number with 0 decimals, or "0" if invalid
 */
function showNumber(value) {
    if (value == null || isNaN(value)) {
        return "0";
    }
    return parseFloat(value).toLocaleString(undefined, {
        maximumFractionDigits: 0
    });
}

/**
 * Short names for 8 real groups plus "ALL_INDIVIDUALS"
 */
const shortGroupNames = {
    "NeugierInteresse":    "Neugier",
    "MenschenErreichen":   "Menschen",
    "OeffentlicherRaum":   "Raum",
    "Newcomers":           "Newcomers",
    "Kreativitaet":        "Kreativ",
    "Natur":               "Natur",
    "Brauchtum":           "Brauchtum",
    "Emotionen":           "Emotionen",
    "ALL_INDIVIDUALS":     "All Indiv."
};

// Emoji per real group (used in receipts)
const groupEmojis = {
    "NeugierInteresse": "🔍",      // Curiosity / Interest
    "MenschenErreichen": "🧑‍🤝‍🧑", // Reaching people / community
    "OeffentlicherRaum": "🏙️",     // Public space / urban
    "Newcomers": "🌱",             // Newcomers / growth
    "Kreativitaet": "🎨",          // Creativity / arts
    "Natur": "🌿",                // Nature / environment
    "Brauchtum": "🏛️",            // Tradition / heritage
    "Emotionen": "❤️"             // Emotions / feelings
};

/**
 * Build the main project table
 * Columns:
 *   [0]: Project ID
 *   [1]: Project name
 *   [2]: Cost (green bar => #00c473)
 *   [3..(2 + groupIDs.length)]: columns for each group + ALL_INDIVIDUALS
 *     - text => "spent (score)"
 *     - bar => (spent / cost) * 100
 *     - color => #ffa300 for real groups, #e91e63 for ALL_INDIVIDUALS
 * 
 * Also includes a "TOTAL" row showing the sum of each group's spending plus share of total group spending.
 */

/**
 * Function to generate the Budget Overview Chart.
 * Displays each group's remaining budget after subtracting spent budget.
 */
/**
 * Function to generate the Budget Overview Charts.
 * Displays:
 * - Each group's remaining budget
 * - Individuals' remaining budget
 *//**
 * Function to generate the Budget Overview Charts.
 * Displays:
 * - Each group's remaining budget
 * - Individuals' remaining budget
 */
/**
 * Function to generate the Budget Overview Charts.
 * Displays:
 * - Each group's remaining budget
 * - Individuals' remaining budget
 */
function generateBudgetChart(instance, notes) {
    // SUMMARY (left, fixed) stays inside #budget-overview
    let summaryDiv = document.getElementById("budget-summary");
    if (!summaryDiv) {
        summaryDiv = document.createElement("div");
        summaryDiv.id = "budget-summary";
        summaryDiv.className = "budget-summary";
        document.getElementById("budget-overview").appendChild(summaryDiv);
    }

    // CHARTS (now moved back under the table, right side) container
    let rightResultsSection = document.getElementById("results-section");
    if (!rightResultsSection) return; // safety

    let chartsContainer = document.getElementById("budget-charts-right");
    if (!chartsContainer) {
        chartsContainer = document.createElement("div");
        chartsContainer.id = "budget-charts-right";
        chartsContainer.className = "budget-charts";
        rightResultsSection.appendChild(chartsContainer);
    } else {
        chartsContainer.innerHTML = ""; // clear existing charts
    }

    // Group chart element
    let groupChartDiv = document.createElement("div");
    groupChartDiv.id = "group-budget-chart";
    groupChartDiv.className = "budget-chart";
    chartsContainer.appendChild(groupChartDiv);

    // Individual chart element
    let individualChartDiv = document.createElement("div");
    individualChartDiv.id = "individual-budget-chart";
    individualChartDiv.className = "budget-chart";
    chartsContainer.appendChild(individualChartDiv);

    // Prevent animations when updating
    let groupChartInstance = echarts.init(groupChartDiv, null, { animation: false });
    let individualChartInstance = echarts.init(individualChartDiv, null, { animation: false });

    // --- DYNAMIC BUDGET CALCULATIONS ---
    const TOTAL_BUDGET = parseFloat(instance.meta.budget) || 380000; // Use instance budget if available
    const groupIndiRatio = parseFloat(instance.meta.groupIndiRatio) || 0.5;
    const groupBudget = TOTAL_BUDGET * groupIndiRatio;
    const individualBudget = TOTAL_BUDGET * (1 - groupIndiRatio);
    const groupWeights = instance.groupWeights || {};
    const individualVoters = Object.keys(notes.leftoverInd || {}).length;

    // Distribute the group budget proportionally based on group weights
    let sumGroupWeights = Object.values(groupWeights).reduce((a, b) => a + b, 0);
    let initialGroupBudgets = {};
    if (sumGroupWeights > 0) {
        for (let g in groupWeights) {
            initialGroupBudgets[g] = (groupWeights[g] / sumGroupWeights) * groupBudget;
        }
    }

    // --- GROUP SPENT BUDGET CHART ---
    let groupNames = Object.keys(groupWeights);
    let groupSpentBudgets = groupNames.map(g => Math.round((notes.initialGroup[g] || 0) - (notes.leftoverGroup[g] || 0)));

    // Calculate total group spending
    const totalGroupSpending = groupSpentBudgets.reduce((sum, current) => sum + current, 0);

    // Collect and rank projects each group spent budget on
    let groupProjectSpending = {};
    for (let g of groupNames) {
        groupProjectSpending[g] = [];
        for (let projId in instance.projects) {
            if (notes.spentByGroupOnProject[projId] && notes.spentByGroupOnProject[projId][g] > 0) {
                let projName = instance.projects[projId].name || `Project ${projId}`;
                let amountSpent = Math.round(notes.spentByGroupOnProject[projId][g]);
                groupProjectSpending[g].push({ name: projName, amount: amountSpent });
            }
        }
        groupProjectSpending[g].sort((a, b) => b.amount - a.amount);
    }
    const sharedFont = "Basis Grotesque, Roboto, sans-serif";
    let groupChartOption = {
        textStyle: { fontFamily: sharedFont },
        title: {
            text: `Group Budget Usage`,
            left: "center",
            textStyle: { fontSize: 18, fontWeight: 600, fontFamily: sharedFont }
        },
                tooltip: {
                        trigger: "axis",
                        axisPointer: { type: "shadow" },
                        confine: true,
                        enterable: true,
                        formatter: function (params) {
                                const groupName = params[0].name;
                                const idx = params[0].dataIndex;
                                const spentBudget = groupSpentBudgets[idx];

                                const spendingInfo = groupProjectSpending[groupName] || [];
                                const votingInfo = [];
                                if (instance.rawVotesGroups && instance.rawVotesGroups[groupName]) {
                                        for (let projId in instance.rawVotesGroups[groupName]) {
                                                const score = instance.rawVotesGroups[groupName][projId];
                                                if (score > 0) {
                                                        let projName = instance.projects[projId]?.name || `Project ${projId}`;
                                                        votingInfo.push({ name: projName, score });
                                                }
                                        }
                                        votingInfo.sort((a, b) => b.score - a.score);
                                }
                                                        // Build unified map of items (include voted items even if not funded)
                                                        const voteMap = new Map(votingInfo.map(v => [v.name, v.score]));
                                                        const spendMap = new Map(spendingInfo.map(s => [s.name, s.amount]));
                                                        const names = new Set([...voteMap.keys(), ...spendMap.keys()]);
                                                        const lineRows = [...names].map(n => ({
                                                                name: n,
                                                                votes: voteMap.get(n) || 0,
                                                                spent: spendMap.get(n) || 0
                                                        }));
                                                        // Sort primarily by votes descending, then spent descending
                                                        lineRows.sort((a,b)=> b.votes - a.votes || b.spent - a.spent);
                                                        const totalSpent = lineRows.reduce((a,b)=>a+b.spent,0);
                                                        const totalVotes = lineRows.reduce((a,b)=>a+b.votes,0);
                                                        const lineTable = lineRows.length ? lineRows.map(r => `<tr><td class=\"lnm\" title=\"${r.name}\">${r.name}</td><td class=\"lvote\">${r.votes}</td><td class=\"lspent\">${r.spent}</td></tr>`).join("") : '<tr><td colspan="3" class="empty">No items</td></tr>';
                                        return `
                                                        <div class="receipt-tooltip narrow">
                                            <div class="receipt-header">
                                                <span class="title">${groupName}</span>
                                                <span class="tot"><span class="lab">TOTAL</span><span class="num">${spentBudget}</span></span>
                                            </div>
                                          <div class="receipt-note">A top-voted project can show 0 spent if other supporters' budgets weren't enough to jointly fund it. Your unused budget then shifts to other projects you supported.</div>
                                                            <div class="receipt-lines-head">ITEM <span class="votes-col">VOTES</span> <span>SPENT</span></div>
                                                            <table class="receipt-lines"><tbody>${lineTable}<tr class=\"subtotal\"><td class=\"lnm\">Subtotal</td><td class=\"lvote\">${totalVotes}</td><td class=\"lspent\">${totalSpent}</td></tr></tbody></table>
                                        </div>`;
                        }
                },
    grid: { left: "6%", right: "4%", bottom: "8%", top: 50, containLabel: true },
        animation: false,
        xAxis: {
            type: "category",
            data: groupNames,
            axisLabel: { interval: 0, rotate: 30, fontSize: 12, fontFamily: sharedFont }
        },
        yAxis: {
            type: "value",
            min: 0,
            max: 40000,
            axisLabel: { fontSize: 12, fontFamily: sharedFont }
        },
        series: [
            {
                name: "Initial Budget",
                type: "bar",
                data: groupNames.map(g => Math.round(initialGroupBudgets[g])),
                itemStyle: { color: "#d3d3d3" }, // Grey bars for initial budget
                barWidth: "80%",
                barGap: "-100%" // Überlappende Balken
            },
            {
                name: "Spent Budget",
                type: "bar",
                data: groupSpentBudgets,
                itemStyle: { color: "rgb(255, 163, 0)" },
                barWidth: "80%",
                label: {
                    show: true, position: "top", fontSize: 12, color: "#333", formatter: "{c}", fontFamily: sharedFont
                }
            }
        ]
    };
    

    groupChartInstance.setOption(groupChartOption, { notMerge: true });

    // --- INDIVIDUAL BUDGET USAGE CHART ---
    let individualInitialBudgets = {};
    let initialIndBudget = individualVoters > 0 ? (individualBudget / individualVoters) : 0;

    // Assign each voter's initial budget
    Object.keys(notes.leftoverInd).forEach(voter => {
        individualInitialBudgets[voter] = notes.initialInd[voter] || initialIndBudget;
    });

    // Calculate spent budget
    let individualSpentBudgets = Object.keys(notes.leftoverInd).map(voter => {
        const initial = notes.initialInd[voter] || 0;
        const leftover = notes.leftoverInd[voter] || 0;
        return Math.round(initial - leftover);
    });

    // Calculate total individual spending
    const totalIndividualSpending = individualSpentBudgets.reduce((sum, current) => sum + current, 0);

    let voterLabels = Object.keys(notes.leftoverInd).map((_, i) => `Voter ${i + 1}`);

    // Collect and rank projects each individual spent budget on
    let individualProjectSpending = {};
    Object.keys(notes.leftoverInd).forEach(voter => {
        individualProjectSpending[voter] = [];

        if (notes.spentByIndividualOnProject) {
            for (let projId in notes.spentByIndividualOnProject) {
                let projSpending = notes.spentByIndividualOnProject[projId];
                if (projSpending && projSpending[voter] > 0) {
                    let projName = instance.projects[projId]?.name || `Project ${projId}`;
                    let amountSpent = Math.round(projSpending[voter]);
                    individualProjectSpending[voter].push({ name: projName, amount: amountSpent });
                }
            }
        }

        individualProjectSpending[voter].sort((a, b) => b.amount - a.amount);
    });
    // Aktualisierte Tooltip-Logik
    let individualChartOption = {
        textStyle: { fontFamily: sharedFont },
        title: { text: "Individual Budget Usage", left: "center", textStyle: { fontSize: 18, fontWeight: 600, fontFamily: sharedFont } },
                tooltip: {
                        trigger: "axis",
                        axisPointer: { type: "shadow" },
                        confine: true,
                        enterable: true,
                        formatter: function (params) {
                                const voterIndex = params[0].dataIndex;
                                const voterKey = Object.keys(notes.leftoverInd)[voterIndex];
                                const spentBudget = individualSpentBudgets[voterIndex];

                                const spendingInfo = individualProjectSpending[voterKey] || [];
                                const votingInfo = [];
                                if (instance.rawVotesIndividuals && instance.rawVotesIndividuals[voterKey]) {
                                        for (let projId in instance.rawVotesIndividuals[voterKey]) {
                                                const score = instance.rawVotesIndividuals[voterKey][projId];
                                                if (score > 0) {
                                                        let projName = instance.projects[projId]?.name || `Project ${projId}`;
                                                        votingInfo.push({ name: projName, score });
                                                }
                                        }
                                        votingInfo.sort((a, b) => b.score - a.score);
                                }
                                                        const voteMap = new Map(votingInfo.map(v => [v.name, v.score]));
                                                        const spendMap = new Map(spendingInfo.map(s => [s.name, s.amount]));
                                                        const names = new Set([...voteMap.keys(), ...spendMap.keys()]);
                                                        const lineRows = [...names].map(n => ({
                                                                name: n,
                                                                votes: voteMap.get(n) || 0,
                                                                spent: spendMap.get(n) || 0
                                                        }));
                                                        lineRows.sort((a,b)=> b.votes - a.votes || b.spent - a.spent);
                                                        const totalSpent = lineRows.reduce((a,b)=>a+b.spent,0);
                                                        const totalVotes = lineRows.reduce((a,b)=>a+b.votes,0);
                                                        const lineTable = lineRows.length ? lineRows.map(r => `<tr><td class=\"lnm\" title=\"${r.name}\">${r.name}</td><td class=\"lvote\">${r.votes}</td><td class=\"lspent\">${r.spent}</td></tr>`).join("") : '<tr><td colspan="3" class="empty">No items</td></tr>';
                                        return `
                                                        <div class="receipt-tooltip narrow">
                                            <div class="receipt-header">
                                                <span class="title">${voterLabels[voterIndex]}</span>
                                                <span class="tot"><span class="lab">TOTAL</span><span class="num">${spentBudget}</span></span>
                                            </div>
                                          <div class="receipt-note">A top-voted project can show 0 spent if other supporters' budgets weren't enough to jointly fund it. Your unused budget then shifts to other projects you supported.</div>
                                                            <div class="receipt-lines-head">ITEM <span class="votes-col">VOTES</span> <span>SPENT</span></div>
                                                            <table class="receipt-lines"><tbody>${lineTable}<tr class=\"subtotal\"><td class=\"lnm\">Subtotal</td><td class=\"lvote\">${totalVotes}</td><td class=\"lspent\">${totalSpent}</td></tr></tbody></table>
                                        </div>`;
                        }
                },        
        animation: false,
        xAxis: {
            type: "category",
            data: voterLabels,
            axisLabel: { interval: 0, rotate: 30, fontSize: 10, fontFamily: sharedFont }
        },
        yAxis: {
            type: "value",
            min: 0,
            max: 8000,
            axisLabel: { fontSize: 11, fontFamily: sharedFont }
        },
        series: [
            {
                name: "Initial Budget",
                type: "bar",
                data: voterLabels.map(() => Math.round(initialIndBudget)),
                itemStyle: { color: "#d3d3d3" }, // Grey bars for initial budget
                barWidth: "80%",
                barGap: "-100%" // Überlappende Balken
            },
            {
                name: "Spent Budget",
                type: "bar",
                data: individualSpentBudgets,
                itemStyle: { color: "rgb(233, 30, 99)" },
                barWidth: "80%",
                label: {
                    show: true, position: "top", fontSize: 11, color: "#333", formatter: "{c}", fontFamily: sharedFont
                }
            }
        ]
    };
    individualChartInstance.setOption(individualChartOption, { notMerge: true });

    // Calculate total overall spending
    const totalOverallSpending = totalGroupSpending + totalIndividualSpending;
    
    // Update the summary content (left side)
    summaryDiv.innerHTML = `
        <div class="budget-summary__items">
            <div class="budget-summary__item">
                <span class="budget-summary__value budget-summary__value--groups">Groups: ${totalGroupSpending.toLocaleString()}</span>
                <span class="budget-summary__percent">(${Math.round((totalGroupSpending / totalOverallSpending) * 100)}% of spending)</span>
            </div>
            <div class="budget-summary__item">
                <span class="budget-summary__value budget-summary__value--individuals">Individuals: ${totalIndividualSpending.toLocaleString()}</span>
                <span class="budget-summary__percent">(${Math.round((totalIndividualSpending / totalOverallSpending) * 100)}% of spending)</span>
            </div>
        </div>`;

}

function buildProjectTable(table, instance, winners, notes, includeLosers = true) {
    // 1) Data references
    const rawVotesGroups = instance.rawVotesGroups || {};
    const spentByGroupOnProject = notes.spentByGroupOnProject || {};
    const spentByAllInd = notes.spentByAllIndividualsOnProject || {};
    const scoreByAllInd = notes.allIndividualsScore || {};
    const rawVotesIndividuals = instance.rawVotesIndividuals || {};
    
    // 2) Gather group IDs and add "ALL_INDIVIDUALS"
    let groupIDs = Object.keys(rawVotesGroups).sort();
    let realGroupIDs = [...groupIDs];
    groupIDs.push("ALL_INDIVIDUALS");

    // 3) Compute individual aggregates:
    //    "Ind. Punkte" = sum of rawVotesIndividuals scores per project
    //    "Ind. Stimmen" = count of individuals who gave a positive vote (to be shown in parentheses)
    let projectIndividualPoints = {};
    let projectIndividualCount = {};
    let maxIndividualPoints = 0;
    for (let projId in instance.projects) {
        let sumPoints = 0;
        let countVoters = 0;
        for (let i in rawVotesIndividuals) {
            let val = rawVotesIndividuals[i][projId] || 0;
            sumPoints += val;
            if (val > 0) countVoters++;
        }
        projectIndividualPoints[projId] = sumPoints;
        projectIndividualCount[projId] = countVoters;
        if (sumPoints > maxIndividualPoints) {
            maxIndividualPoints = sumPoints;
        }
    }

    // 4) Compute group votes ("Gr. Stimmen")
    let projectGroupVotes = {};
    let maxGroupVotes = 0;
    for (let projId in instance.projects) {
        let sumGroupVotes = 0;
        for (let g of realGroupIDs) {
            if (rawVotesGroups[g] && rawVotesGroups[g][projId] != null) {
                sumGroupVotes += rawVotesGroups[g][projId];
            }
        }
        projectGroupVotes[projId] = sumGroupVotes;
        if (sumGroupVotes > maxGroupVotes) {
            maxGroupVotes = sumGroupVotes;
        }
    }

    // 5) Compute aggregated Score (group votes + individual points)
    let projectAggregatedScores = {};
    let maxAggregatedScore = 0;
    for (let projId in instance.projects) {
        let agg = projectGroupVotes[projId] + projectIndividualPoints[projId];
        projectAggregatedScores[projId] = agg;
        if (agg > maxAggregatedScore) {
            maxAggregatedScore = agg;
        }
    }
    // (We display raw integer scores, without further normalization.)

    // 6) Setup table styles and default sorting.
    table.dataset.sortable = "true";
    table.dataset.sortDefault = "5,desc"; // Score will be column index 5 after reordering
    table.style.tableLayout = "fixed";
    table.style.width = "100%";

    // 7) Build header with 8 columns (Funding Split moved after Score), i18n-aware labels
    // Columns: 0: id, 1: title, 2: cost, 3: grp_votes, 4: ind_points, 5: score, 6: funding_split, 7: selected
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const t = (k)=> (window.i18n?.t?.(k)) || k;
    const headers = [
        { key: 'col_id', label: t('col_id') },
        { key: 'col_title', label: t('col_title') },
        { key: 'col_cost', label: t('col_cost') },
        { key: 'col_grp_votes', label: t('col_grp_votes') },
        { key: 'col_ind_points', label: t('col_ind_points') },
        { key: 'col_score', label: t('col_score') },
        { key: 'col_funding_split', label: t('col_funding_split') },
        { key: 'col_selected', label: t('col_selected') }
    ];
    headers.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h.label;
        th.style.textAlign = "left";
        if (h.key === 'col_title') {
            th.style.width = "30%"; // tighter title
            th.classList.add("title-cell");
        } else if (h.key === 'col_funding_split') {
            // Let CSS control width; mark as split column
            th.classList.add("col--split");
        } else if (h.key === 'col_id') {
            th.style.width = "5%";
        } else if (h.key === 'col_selected') {
            th.style.width = "6%";
        } else {
            th.style.width = "8%"; // tighter numeric columns
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 8) Determine which projects to display
    let projectsToShow;
    if (includeLosers) {
        projectsToShow = Object.keys(instance.projects)
            .sort((a, b) => projectAggregatedScores[b] - projectAggregatedScores[a]);
    } else {
        projectsToShow = winners;
    }

    // 9) Totals initialization
    const groupSpentTotals = {};
    const groupVotesTotals = {};
    let totalSelectedCost = 0;
    let totalIndCountAll = 0;
    let totalIndPointsAll = 0;
    for (let g of groupIDs) {
        groupSpentTotals[g] = 0;
        if (g !== "ALL_INDIVIDUALS") {
            groupVotesTotals[g] = 0;
        }
    }
    let overallMaxCost = 0;
    for (let projId of projectsToShow) {
        const projectCost = parseFloat(instance.projects[projId].cost) || 0;
        if (projectCost > overallMaxCost) {
            overallMaxCost = projectCost;
        }
    }

    // 10) Build table body
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    const colCount = 8; // After merging budget columns

    for (let projId of projectsToShow) {
        let project = instance.projects[projId];
        let costVal = parseFloat(project.cost) || 0;
        let isWinner = winners.includes(projId);
        let row = document.createElement("tr");
        if (isWinner) {
            row.classList.add("winner-row");
            row.style.backgroundColor = "black";
            row.style.color = "white";
            totalSelectedCost += costVal;
        }
        const rowCells = [];
        for (let i = 0; i < colCount; i++) {
            const td = document.createElement("td");
            td.style.textAlign = "left";
            // Apply new compact widths matching header logic
            if (i === 1) { // Title
                td.style.width = "20%";
                td.classList.add("title-cell");
            } else if (i === 6) { // Funding Split
                // Let CSS control width; mark as split column
                td.classList.add("col--split");
            } else if (i === 0) { // ID
                td.style.width = "5%";
            } else if (i === 7) { // Selected
                td.style.width = "6%";
            } else {
                td.style.width = "8%";
            }
            rowCells.push(td);
        }
        // Column 0: ID (strip common prefix KK_25)
        const displayProjId = typeof projId === "string" ? projId.replace(/^KK_25[_-]?/i, "") : projId;
        rowCells[0].textContent = displayProjId;
        if (displayProjId !== projId) {
            rowCells[0].title = projId; // keep original as tooltip
        }
    // Column 1: Title (kk25.pb is pre-sanitized; '-' indicates anonymized)
        rowCells[1].textContent = (project.name && project.name !== "") ? project.name : "-";
    rowCells[1].style.fontWeight = "600"; // consistent font size handled via CSS
    // Column 2: Cost (with bar chart)
        rowCells[2].textContent = showNumber(costVal);
        rowCells[2].dataset.sortValue = costVal;
        rowCells[2].dataset.value = overallMaxCost > 0 ? (costVal / overallMaxCost) * 100 : 0;
        rowCells[2].style.position = "relative";
        rowCells[2].dataset.barColor = "#00c473";
    // Compute funding split values (groups vs individuals)
    let sumRealGroupsSpent = 0;
        for (let g of realGroupIDs) {
            let spent = 0;
            if (spentByGroupOnProject[projId] && spentByGroupOnProject[projId][g] != null) {
                spent = spentByGroupOnProject[projId][g];
            }
            sumRealGroupsSpent += spent;
            groupSpentTotals[g] += spent;
        }
        let grBudgetPercent = costVal > 0 ? Math.round((sumRealGroupsSpent / costVal) * 100) : 0;
    let indSpent = spentByAllInd[projId] || 0;
    let indBudgetPercent = costVal > 0 ? Math.round((indSpent / costVal) * 100) : 0;
    // Column 3: Grp. Votes (with bar)
        let sumRealGroupsVotes = 0;
        for (let g of realGroupIDs) {
            let votes = 0;
            if (rawVotesGroups[g] && rawVotesGroups[g][projId] != null) {
                votes = rawVotesGroups[g][projId];
            }
            sumRealGroupsVotes += votes;
            groupVotesTotals[g] = (groupVotesTotals[g] || 0) + votes;
        }
    // Count how many groups allocated positive votes for this project
    let groupSupportCount = 0;
    for (let g of realGroupIDs) {
        const v = rawVotesGroups[g] && rawVotesGroups[g][projId] != null ? rawVotesGroups[g][projId] : 0;
        if (v > 0) groupSupportCount++;
    }
    rowCells[3].textContent = showNumber(sumRealGroupsVotes) + " (" + showNumber(groupSupportCount) + ")";
    rowCells[3].dataset.sortValue = sumRealGroupsVotes;
    rowCells[3].dataset.value = maxGroupVotes > 0 ? (sumRealGroupsVotes / maxGroupVotes) * 100 : 0;
    rowCells[3].dataset.barColor = "#ffa300";
    rowCells[3].style.position = "relative";
    // Column 4: Ind. Points – with voter count (bar)
    let indPoints = projectIndividualPoints[projId] || 0;
    let indCount = projectIndividualCount[projId] || 0;
    rowCells[4].textContent = showNumber(indPoints) + " (" + showNumber(indCount) + ")";
    rowCells[4].dataset.sortValue = indPoints;
    rowCells[4].dataset.value = maxIndividualPoints > 0 ? (indPoints / maxIndividualPoints) * 100 : 0;
    rowCells[4].dataset.barColor = "#e91e63";
    rowCells[4].style.position = "relative";
    // Column 5: Score
    let scoreInt = Math.round(projectAggregatedScores[projId]);
    rowCells[5].textContent = scoreInt;
    rowCells[5].dataset.sortValue = scoreInt;
    rowCells[5].dataset.value = maxAggregatedScore > 0 ? (scoreInt / maxAggregatedScore) * 100 : 0;
    rowCells[5].dataset.barColor = "#00c473";
    rowCells[5].style.textAlign = "center";
    // Column 6: Funding Split dual bar (no textual ratio label)
    const splitWrapper = document.createElement("div");
    splitWrapper.className = "funding-split";
    const groupBar = document.createElement("div");
    groupBar.className = "funding-split__bar--group";
    groupBar.style.width = grBudgetPercent + "%";
    groupBar.title = `${(window.i18n?.t?.('groups')||'Groups')}: ${grBudgetPercent}%`;
    const indivBar = document.createElement("div");
    indivBar.className = "funding-split__bar--indiv";
    indivBar.style.width = indBudgetPercent + "%";
    indivBar.title = `${(window.i18n?.t?.('individuals')||'Individuals')}: ${indBudgetPercent}%`;
    splitWrapper.appendChild(groupBar);
    splitWrapper.appendChild(indivBar);
    rowCells[6].style.position = "relative";
    rowCells[6].appendChild(splitWrapper);
    rowCells[6].dataset.sortValue = grBudgetPercent;
    // Column 7: Selected
    rowCells[7].textContent = isWinner ? "✅" : "";
    rowCells[7].style.textAlign = "center";

        row.append(...rowCells);
        tbody.appendChild(row);
        if (isWinner) {
            totalIndCountAll += indCount;
            totalIndPointsAll += indPoints;
        }
    }

    // TOTALS ROW
    const totalRow = document.createElement("tr");
    totalRow.classList.add("total-row");
    totalRow.dataset.nosort = "true";
    totalRow.style.fontWeight = "bold";
    let totalCells = [];
    for (let c = 0; c < 8; c++) {
        const td = document.createElement("td");
        td.style.textAlign = "left";
        totalCells.push(td);
    }
    totalCells[0].textContent = (window.i18n?.t?.('total')) || 'TOTAL';
    totalCells[1].textContent = "";
    totalCells[2].textContent = showNumber(totalSelectedCost);
    totalCells[2].dataset.sortValue = totalSelectedCost;
    totalCells[2].dataset.value = overallMaxCost > 0 ? (totalSelectedCost / overallMaxCost) * 100 : 0;
    totalCells[2].dataset.barColor = "#00c473";
    totalCells[2].style.position = "relative";

    let sumRealGroups = 0;
    let sumIndividuals = groupSpentTotals["ALL_INDIVIDUALS"] || 0;
    for (let g of groupIDs) {
        if (g !== "ALL_INDIVIDUALS") {
            sumRealGroups += groupSpentTotals[g];
        }
    }
    let sumTotal = sumRealGroups + sumIndividuals;
    let allGroupTotals = {};
    for (let g of groupIDs) {
        let spentTotal = groupSpentTotals[g];
        let percent = sumTotal > 0 ? (spentTotal / sumTotal) * 100 : 0;
        let votesTotal = 0;
        if (g === "ALL_INDIVIDUALS") {
            votesTotal = Object.values(projectIndividualPoints).reduce((a, b) => a + b, 0);
        } else {
            votesTotal = groupVotesTotals[g] || 0;
        }
        allGroupTotals[g] = { spent: spentTotal, percent: Math.round(percent), votes: votesTotal };
    }
    // Funding split total (index 3)
    // Group votes total (index 3)
    const totalGroupVotesSum = Object.values(groupVotesTotals).reduce((a, b) => a + b, 0);
    const totalGroupCountDisplay = showNumber(realGroupIDs.length);
    totalCells[3].textContent = showNumber(totalGroupVotesSum) + " (" + totalGroupCountDisplay + ")";
    totalCells[3].dataset.value = 100;
    totalCells[3].dataset.barColor = "#ffa300";
    totalCells[3].style.position = "relative";

    // Individual points total (index 4)
    totalCells[4].textContent = showNumber(totalIndPointsAll) + " (" + showNumber(totalIndCountAll) + ")";
    totalCells[4].dataset.barColor = "#e91e63";
    totalCells[4].dataset.value = 100;
    totalCells[4].style.position = "relative";

    // Score total (index 5)
    const totalScore = showNumber(Object.values(groupVotesTotals).reduce((a,b)=>a+b,0) + totalIndPointsAll);
    totalCells[5].textContent = totalScore;
    totalCells[5].dataset.barColor = "#00c473";
    totalCells[5].dataset.value = 100;
    totalCells[5].style.position = "relative";

    // Funding split total (index 6)
    const totalGroupsPercent = totalSelectedCost > 0 ? Math.round((sumRealGroups / totalSelectedCost) * 100) : 0;
    const totalIndPercent = totalSelectedCost > 0 ? Math.round((sumIndividuals / totalSelectedCost) * 100) : 0;
    const totalSplitWrapper = document.createElement("div");
    totalSplitWrapper.className = "funding-split";
    const totalGroupBar = document.createElement("div");
    totalGroupBar.className = "funding-split__bar--group";
    totalGroupBar.style.width = totalGroupsPercent + "%";
    const totalIndBar = document.createElement("div");
    totalIndBar.className = "funding-split__bar--indiv";
    totalIndBar.style.width = totalIndPercent + "%";
    totalSplitWrapper.appendChild(totalGroupBar);
    totalSplitWrapper.appendChild(totalIndBar);
    totalCells[6].style.position = "relative";
    totalCells[6].appendChild(totalSplitWrapper);
    totalCells[6].dataset.sortValue = totalGroupsPercent;

    // Selected column (index 7)
    totalCells[7].textContent = "";
    totalRow.append(...totalCells);
    tbody.appendChild(totalRow);

    // Keep table sortable with pinned total row
    table.addEventListener("click", (ev) => {
        const th = ev.target.closest("th");
        if (!th) return;
        const tb = table.querySelector("tbody");
        const trTotal = tb.querySelector(".total-row");
        if (trTotal) tb.removeChild(trTotal);
        if (typeof Sortable !== "undefined" && Sortable.initTable) {
            Sortable.initTable(table);
        }
        if (trTotal) tb.appendChild(trTotal);
    });

    if (typeof initBarCharts === "function") {
        initBarCharts();
    }
}

// function showNumber(n) {
//     if (!n || isNaN(n)) return "0";
//     return parseInt(n, 10).toLocaleString();
// }




function makeTableSortableWithTotal(table) {
    // We'll do an event listener on the table's click of header
    // so the final row is not included in the sort.
    const tbody    = table.querySelector('tbody');
    
    table.addEventListener('click', (e) => {
        const header = e.target.closest('th');
        if (!header) return; // not a header click

        // find final row with .total-row
        const totalRow = tbody.querySelector('.total-row');
        if (!totalRow) return;

        // remove total row from DOM before sorting
        tbody.removeChild(totalRow);

        // run the sorting from Sortable
        // Sortable library typically triggers on the same event,
        // so we briefly re-init to ensure it sorts.
        Sortable.initTable(table);

        // re-append total row
        tbody.appendChild(totalRow);
    });
}

/**
 * Build usage table for groups + aggregated individuals
 */

function buildBudgetUsageTable(instance, notes) {
    if (!notes.leftoverGroup || !notes.initialGroup || !notes.leftoverInd || !notes.initialInd) {
        return null;
    }
    console.log(instance, notes);
    
    let usageTable = document.createElement("table");
    usageTable.classList.add("sortable-theme-light");
    usageTable.dataset.sortable = "true";
    usageTable.style.tableLayout = "fixed";
    usageTable.style.width = "100%";

    // Build header with 4 columns in German.
    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");
    
    const headers = ["Actor", "Projects", "Spent", "% Spent"]; 
    headers.forEach((h, index) => {
        let th = document.createElement("th");
        th.textContent = h;
        th.style.textAlign = "left";

        // Column width adjustments
        if (index === 1) { 
            th.style.width = "50%"; // Projects take up 50% of the table width
        } else if (index === 2 || index === 3) { 
            th.style.width = "5%"; // Spent and % Spent take up only 8%
        } else {
            th.style.width = "15%"; // Actor column takes remaining space
        }

        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    usageTable.appendChild(thead);

    // Calculate overall totals.
    let allSpentSum = 0;
    let usageRows = [];

    // For each real group.
    for (let g in notes.leftoverGroup) {
        let init = notes.initialGroup[g] || 0;
        let left = notes.leftoverGroup[g] || 0;
        let spent = init - left;
        
        // Determine which projects this group funded.
        let fundedProjects = [];
        for (let projId in instance.projects) {
            if (notes.spentByGroupOnProject[projId] &&
                notes.spentByGroupOnProject[projId][g] &&
                parseFloat(notes.spentByGroupOnProject[projId][g]) > 0) {
                let projName = instance.projects[projId].name || "";
                fundedProjects.push(projName.substring(0, 10));
            }
        }

        usageRows.push({
            actor: shortGroupNames[g] || g,
            spent,
            projects: fundedProjects.join(", ")
        });
        allSpentSum += spent;
    }

    // For aggregated individuals.
    let spentInd = 0;
    let countInd = Object.keys(notes.leftoverInd).length;
    
    if (countInd > 0) {
        let initialSum = 0, leftoverSum = 0;
        for (let i in notes.leftoverInd) {
            initialSum += notes.initialInd[i] || 0;
            leftoverSum += notes.leftoverInd[i] || 0;
        }
        spentInd = initialSum - leftoverSum;
    }

    // Determine funded projects by individuals.
    let fundedProjectsInd = [];
    for (let projId in instance.projects) {
        if (notes.spentByAllIndividualsOnProject[projId] &&
            parseFloat(notes.spentByAllIndividualsOnProject[projId]) > 0) {
            let projName = instance.projects[projId].name || "";
            fundedProjectsInd.push(projName.substring(0, 10));
        }
    }
    
    usageRows.push({
        actor: `All Individuals (${countInd})`,
        spent: spentInd,
        projects: fundedProjectsInd.join(", ")
    });
    allSpentSum += spentInd;

    // Build table body.
    let tbody = document.createElement("tbody");
    
    for (let rowData of usageRows) {
        let row = document.createElement("tr");

        let actorTd = document.createElement("td");
        actorTd.style.textAlign = "left";
        actorTd.textContent = rowData.actor;
        row.appendChild(actorTd);

        let projectsTd = document.createElement("td");
        projectsTd.style.textAlign = "left";
        projectsTd.style.width = "50%";
        projectsTd.textContent = rowData.projects;
        row.appendChild(projectsTd);

        let spentTd = document.createElement("td");
        spentTd.style.textAlign = "left";
        spentTd.style.width = "8%";
        spentTd.textContent = showNumber(rowData.spent);
        spentTd.dataset.sortValue = rowData.spent;
        row.appendChild(spentTd);

        let percentSpentTd = document.createElement("td");
        percentSpentTd.style.textAlign = "left";
        percentSpentTd.style.width = "8%";
        let pctSpent = allSpentSum > 0 ? (rowData.spent / allSpentSum) * 100 : 0;
        percentSpentTd.textContent = `${Math.round(pctSpent)}%`;
        percentSpentTd.dataset.value = pctSpent;
        row.appendChild(percentSpentTd);

        tbody.appendChild(row);
    }
    
    usageTable.appendChild(tbody);

    // Initialize sorting for usage table.
    Sortable.initTable(usageTable);

    // Apply bar charts to the percentage columns: % Ausgegeben
    generateTableBarCharts({
        tableElement: usageTable,
        columnIndex: 3,  // % Spent (column index adjusted for new structure)
        barWidth: 80,
        barColor: "#ffa300",
        textColor: "#000",
        forceLabelInside: true
    });

    return usageTable;
}
export function displayResults(instance, { winners, notes }) {
    // remember last args for i18n re-render
    __lastRenderArgs = { instance, winners, notes };
    const resultsDiv = document.getElementById("results-section");
    // Data is already sanitized in kk25.pb; no CSV-based masking needed
    
    // First check if we already have a table - if so, just add a loading class to it
    // instead of completely removing it during recalculation
    const existingTable = document.getElementById("winning-projects-table");
    if (existingTable) {
        existingTable.classList.add("loading");
    }
    
    // Instead of clearing the entire resultsDiv, we'll selectively update or create elements
    
    // Ensure the page description is on the RIGHT side, above the meta
    {
        let introWrap = document.getElementById('intro-description');
        if(!introWrap){
            introWrap = document.createElement('div');
            introWrap.id = 'intro-description';
            if (resultsDiv.firstChild) {
                resultsDiv.insertBefore(introWrap, resultsDiv.firstChild);
            } else {
                resultsDiv.appendChild(introWrap);
            }
        } else if (introWrap.parentElement !== resultsDiv) {
            // Move it from left to right if it exists elsewhere
            introWrap.parentElement.removeChild(introWrap);
            if (resultsDiv.firstChild) {
                resultsDiv.insertBefore(introWrap, resultsDiv.firstChild);
            } else {
                resultsDiv.appendChild(introWrap);
            }
        }
        const pageIntro = (window.i18n?.t?.('page_intro_html')) ||
            `<div id="page-description">We deployed Komitee Equal Shares in the 2025 <a href=\"https://kulturkomitee.win/#forschung\" target=\"_blank\" rel=\"noopener noreferrer\">Kultur Komitee</a> (KK25), where 38 residents evaluated 121 proposals and allocated CHF 378,901 to 43 projects. Participants co-defined eight impact fields, weighted their relative importance online, and deliberated in two rounds of field-based groups before casting individual point votes. The algorithm integrated all signals into one unified allocation that participants could inspect immediately on decision day, supported by outcome tables and receipts. For a detailed description of the method, see <a href=\"https://arxiv.org/abs/2510.02040\" target=\"_blank\" rel=\"noopener noreferrer\">this paper</a>. The Komitee Equal Shares platform was developed by <a href=\"https://www.joshuacyang.com\" target=\"_blank\" rel=\"noopener noreferrer\">Joshua C. Yang</a> (<a href=\"mailto:joyang@ethz.ch\">joyang@ethz.ch</a>), adapted from the <a href=\"https://equalshares.net/tools/compute/\" target=\"_blank\" rel=\"noopener noreferrer\">Method of Equal Shares: Online Computation Tool</a> by Dominik Peters.</div>`;
        introWrap.innerHTML = pageIntro;
    }
    
    // How-to read dropdown with meta stats inside
    let howto = document.getElementById("results-howto");
    if (!howto) {
        howto = document.createElement("details");
        howto.id = "results-howto";
        const sum = document.createElement("summary");
        sum.textContent = (window.i18n?.t?.('how_to_read_summary')) || 'How to read this table';
        howto.appendChild(sum);
        const body = document.createElement("div");
        body.className = "howto-body";
        howto.appendChild(body);
        resultsDiv.appendChild(howto);
    }
    // Update content each render
    const selectedCount = winners.length;
    const totalCost = notes.stats?.totalCost || 0;
    const avgCost = selectedCount > 0 ? Math.round(totalCost / selectedCount) : 0;
    const lblSel = (window.i18n?.t?.('selected_projects_label')) || 'Number of selected projects';
    const lblTot = (window.i18n?.t?.('total_cost_selected_label')) || 'Total cost of selected projects';
    const lblAvg = (window.i18n?.t?.('average_label')) || 'Average';
    const howtoBody = howto.querySelector('.howto-body');
    const expl = (window.i18n?.t?.('how_to_read_html')) || `The “Funding Split” column shows how much of the project’s cost was covered by groups (orange) and by individual voters (pink). The “Votes” columns show how many points the project received: “Grp. Votes” is the total points from groups, and “Ind. Points” is the total points from individual voters. The number in brackets for each tells how many groups or individuals gave the project any support. “Score” is the total of all group and individual points added together.`;
    howtoBody.innerHTML = `<p>${expl}</p><p>${lblSel}: ${selectedCount} · ${lblTot}: ${showNumber(totalCost)} (${lblAvg}: ${showNumber(avgCost)})</p>`;
    
    // Create or update the main project table
    let table;
    if (existingTable) {
        table = existingTable;
        table.innerHTML = ""; // Clear just the table contents
    } else {
    table = document.createElement("table");
    table.id = "winning-projects-table";
    table.classList.add("results-table");
        resultsDiv.appendChild(table);
    }
    
    // Remove loading class if it was added
    table.classList.remove("loading");
    
    // Build the table with the new data
    buildProjectTable(table, instance, winners, notes, showLosers);
    
    // Apply bar charts
    // Apply bar charts to Cost (col 2), Grp. Votes (col 3), Ind. Points (col 4), Score (col 5)
    generateTableBarCharts({ tableElement: table, columnIndex: 2, barWidth: 90, barColor: "#00c473", textColor: "#000", forceLabelInside: true });
    generateTableBarCharts({ tableElement: table, columnIndex: 3, barWidth: 90, barColor: "#ffa300", textColor: "#000", forceLabelInside: true });
    generateTableBarCharts({ tableElement: table, columnIndex: 4, barWidth: 90, barColor: "#e91e63", textColor: "#000", forceLabelInside: true });
    generateTableBarCharts({ tableElement: table, columnIndex: 5, barWidth: 90, barColor: "#00c473", textColor: "#000", forceLabelInside: true });
    
    // Make the table sortable, ignoring the total row
    Sortable.initTable(table);
    makeTableSortableWithTotal(table); // ensures total row won't move
    
    // Table actions (checkbox + downloads) directly under the table in a single container
    let actionsContainer = document.getElementById("table-actions");
    if(!actionsContainer){
        actionsContainer = document.createElement("div");
        actionsContainer.id = "table-actions";
        actionsContainer.className = "table-actions";
        // Insert right after table
        if(table.nextSibling){
            table.parentNode.insertBefore(actionsContainer, table.nextSibling);
        } else {
            table.parentNode.appendChild(actionsContainer);
        }
    } else {
        actionsContainer.innerHTML = ""; // rebuild each render to ensure order
    }

    // Show losers checkbox
    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "table-actions__item";
    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "show-losers-cb";
    checkbox.checked = showLosers;
    checkbox.addEventListener("change", () => {
        showLosers = checkbox.checked;
        displayResults(instance, { winners, notes });
    });
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(document.createTextNode(" " + ((window.i18n?.t?.("show_losers")) || "Show losing projects")));
    actionsContainer.appendChild(checkboxLabel);

    // Separator dot
    function addSep(){
        const sep = document.createElement("span");
        sep.textContent = "·";
        sep.className = "table-actions__sep";
        actionsContainer.appendChild(sep);
    }

    // XLSX download link
    const xlsxLink = document.createElement("a");
    xlsxLink.href = "#";
    xlsxLink.id = "download-xlsx";
    xlsxLink.textContent = (window.i18n?.t?.("download_xlsx")) || "Download .xlsx";
    xlsxLink.className = "table-actions__item";
    xlsxLink.addEventListener("click", (e)=>{
        e.preventDefault();
        let wb = XLSX.utils.table_to_book(table, { sheet: "Projects" });
        XLSX.writeFile(wb, "projects.xlsx");
    });
    addSep();
    actionsContainer.appendChild(xlsxLink);

    // CSV download link
    const csvLink = document.createElement("a");
    csvLink.href = "#";
    csvLink.id = "download-csv";
    csvLink.textContent = (window.i18n?.t?.("download_csv")) || "Download .csv";
    csvLink.className = "table-actions__item";
    csvLink.addEventListener("click", (e)=>{
        e.preventDefault();
        let wb = XLSX.utils.table_to_book(table);
        XLSX.writeFile(wb, "projects.csv");
    });
    addSep();
    actionsContainer.appendChild(csvLink);

    // Small hint text
    const hint = document.createElement("span");
    hint.className = "table-actions__hint";
    hint.textContent = (window.i18n?.t?.("export_hint")) || "Data export reflects current table view.";
    actionsContainer.appendChild(hint);
    
    // Mark Funding Split column for narrow styling and toggle visibility
    (function markFundingSplitColumn(){
        if (!table) return;
        const ths = table.querySelectorAll("thead th");
        let splitIdx = -1;
        ths.forEach((th, i) => {
            const txt = th.textContent.trim().toLowerCase();
            if (txt === "funding split" || txt === "finanzierungsanteil") {
                splitIdx = i;
                th.classList.add("col--split");
            }
        });
        // Fallback: detect by presence of .funding-split in first row
        if (splitIdx < 0) {
            const firstRow = table.querySelector("tbody tr");
            if (firstRow) {
                [...firstRow.children].some((td, i) => {
                    if (td.querySelector(".funding-split")) { splitIdx = i; return true; }
                    return false;
                });
                if (splitIdx >= 0 && ths[splitIdx]) ths[splitIdx].classList.add("col--split");
            }
        }
        if (splitIdx >= 0) {
            table.querySelectorAll("tbody tr").forEach(tr => {
                const td = tr.children[splitIdx];
                if (td) td.classList.add("col--split");
            });
            const tfoot = table.querySelector("tfoot tr");
            if (tfoot && tfoot.children[splitIdx]) tfoot.children[splitIdx].classList.add("col--split");
        }
    })();
    
    // Insert / update receipts section (now final visible section on right)
    generateReceiptsSection(instance, notes);
    // Still update budget label info (without rendering hidden charts/usage tables)
    updateBudgetUsageDisplay(instance, notes);
    // Remove / hide charts and supported projects section below receipts
    const existingCharts = document.querySelector('.budget-charts');
    if (existingCharts) existingCharts.remove();
    const budgetUsageDiv = document.getElementById('budget-usage');
    if (budgetUsageDiv) {
        budgetUsageDiv.innerHTML = "";
        budgetUsageDiv.style.display = 'none';
    }
}

// New: Build full receipts section (groups + individuals) displayed between table and charts
function generateReceiptsSection(instance, notes){
    const resultsDiv = document.getElementById("results-section");
    if(!resultsDiv) return;
    // Remove existing section on re-render
    let oldSection = document.getElementById("receipts-section");
    if(oldSection) oldSection.remove();

    // Core data references
    const rawVotesGroups = instance.rawVotesGroups || {};
    const rawVotesIndividuals = instance.rawVotesIndividuals || {};
    const spentByGroupOnProject = notes.spentByGroupOnProject || {};
    const spentByIndividualOnProject = notes.spentByIndividualOnProject || {};
    const projects = instance.projects || {};

    // Container
    const section = document.createElement("section");
    section.id = "receipts-section";
    const heading = document.createElement("h3");
    heading.textContent = (window.i18n?.t?.('receipts_heading')) || 'Detailed Receipts';
    section.appendChild(heading);
    const globalNote = document.createElement("p");
    globalNote.className = "receipt-explanation";
    globalNote.innerHTML = (window.i18n?.t?.('receipts_global_html')) || `<strong>Why some projects get skipped:</strong> If a project costs more than its supporters can afford together (given their remaining budgets), it cannot be funded. If other projects with stronger combined support are funded first, your budget may already be “spent” on those, leaving nothing for the later projects you supported.<br><strong>Why you might underspend your budget:</strong> If the projects you supported did not get enough overall backing, they were skipped and your remaining budget went unused. If many other people also supported the same projects, your individual share of the costs was smaller, leaving part of your budget unspent. The algorithm may stop once no remaining project can be afforded, even if you still had some budget left.`;
    section.appendChild(globalNote);
    // Groups subheading & flow
    const groupsHeading = document.createElement("h4");
    groupsHeading.className = "receipts-subhead";
    groupsHeading.textContent = (window.i18n?.t?.('groups')) || 'Groups';
    section.appendChild(groupsHeading);
    const groupsFlow = document.createElement("div");
    groupsFlow.className = "receipts-flow receipts-flow--groups";
    section.appendChild(groupsFlow);
    // Individuals subheading (inserted later only if individuals exist)
    let individualsFlow = null;

    // Helper to create unified receipt element
    function buildReceipt({ title, spentBudget, lineRows, totalVotes, totalSpent }){
        const wrap = document.createElement("div");
        wrap.className = "receipt-tooltip receipt-card"; // reuse styling
        const lineTable = lineRows.length ? lineRows.map(r => `<tr><td class=\"lnm\" title=\"${r.name}\">${r.name}</td><td class=\"lvote\">${r.votes}</td><td class=\"lspent\">${r.spent}</td></tr>`).join("") : `<tr><td colspan="3" class="empty">${(window.i18n?.t?.('no_items')) || 'No items'}</td></tr>`;
        wrap.innerHTML = `
            <div class="receipt-header">
                <span class="title">${title}</span>
                <span class="tot"><span class="lab">${(window.i18n?.t?.('total')) || 'TOTAL'}</span><span class="num">${showNumber(spentBudget)}</span></span>
            </div>
            <div class="receipt-lines-head">${(window.i18n?.t?.('item')) || 'ITEM'} <span class="votes-col">${(window.i18n?.t?.('votes')) || 'VOTES'}</span> <span>${(window.i18n?.t?.('spent')) || 'SPENT'}</span></div>
            <table class="receipt-lines"><tbody>${lineTable}<tr class="subtotal"><td class="lnm">${(window.i18n?.t?.('subtotal')) || 'Subtotal'}</td><td class="lvote">${showNumber(totalVotes)}</td><td class="lspent">${showNumber(totalSpent)}</td></tr></tbody></table>`;
        return wrap;
    }

    // Helper: in-place Fisher-Yates shuffle
    function shuffle(arr){
        for(let i = arr.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Build group receipts (randomized order each render)
    const groupNames = shuffle(Object.keys(rawVotesGroups));
    for(const g of groupNames){
        // Spent budget: sum spentByGroupOnProject over projects or difference initial-leftover
        let spentBudget = 0;
        if(notes.initialGroup && notes.leftoverGroup){
            spentBudget = Math.round((notes.initialGroup[g] || 0) - (notes.leftoverGroup[g] || 0));
        } else {
            // fallback sum
            for(const pid in spentByGroupOnProject){
                if(spentByGroupOnProject[pid][g]) spentBudget += Math.round(spentByGroupOnProject[pid][g]);
            }
        }
        // Voting info (with masked display names)
        const votingInfo = [];
        const votesObj = rawVotesGroups[g] || {};
        for(const pid in votesObj){
            const score = votesObj[pid];
            if(score > 0){
                const orig = projects[pid]?.name || `Project ${pid}`;
                votingInfo.push({ id: pid, name: orig, displayName: receiptDisplayName(pid, orig), score });
            }
        }
        votingInfo.sort((a,b)=> b.score - a.score);
        // Spending info (with masked display names)
        const spendingInfo = [];
        for(const pid in projects){
            if(spentByGroupOnProject[pid] && spentByGroupOnProject[pid][g] > 0){
                const orig = projects[pid].name || `Project ${pid}`;
                spendingInfo.push({ id: pid, name: orig, displayName: receiptDisplayName(pid, orig), amount: Math.round(spentByGroupOnProject[pid][g]) });
            }
        }
        spendingInfo.sort((a,b)=> b.amount - a.amount);
        // Merge by project id to preserve uniqueness even when names are masked
        const voteMap = new Map(votingInfo.map(v => [v.id, v]));
        const spendMap = new Map(spendingInfo.map(s => [s.id, s]));
        const ids = new Set([...voteMap.keys(), ...spendMap.keys()]);
        const lineRows = [...ids].map(id => {
            const v = voteMap.get(id);
            const s = spendMap.get(id);
            const displayName = v?.displayName || s?.displayName || '-';
            return { name: displayName, votes: v?.score || 0, spent: s?.amount || 0 };
        });
        lineRows.sort((a,b)=> b.votes - a.votes || b.spent - a.spent);
        const totalVotes = lineRows.reduce((a,b)=> a + b.votes, 0);
        const totalSpent = lineRows.reduce((a,b)=> a + b.spent, 0);
    const title = `${groupEmojis[g] ? groupEmojis[g] + ' ' : ''}${shortGroupNames[g] || g}`;
    groupsFlow.appendChild(buildReceipt({ title, spentBudget, lineRows, totalVotes, totalSpent }));
    }

    // Build individual receipts (randomized order each render)
    const individualList = Object.keys(rawVotesIndividuals).map((k,i)=>({ key:k, label:`Voter ${i+1}` }));
    if(individualList.length){
    const indivHeading = document.createElement("h4");
        indivHeading.className = "receipts-subhead";
    indivHeading.textContent = (window.i18n?.t?.('individuals')) || 'Individuals';
        section.appendChild(indivHeading);
        individualsFlow = document.createElement("div");
        individualsFlow.className = "receipts-flow receipts-flow--individuals";
        section.appendChild(individualsFlow);
    }
    shuffle(individualList).forEach(({key: voterKey, label}) => {
        // Spent budget: initial - leftover if available
        let spentBudget = 0;
        if(notes.initialInd && notes.leftoverInd && voterKey in notes.initialInd){
            spentBudget = Math.round((notes.initialInd[voterKey]||0) - (notes.leftoverInd[voterKey]||0));
        } else {
            for(const pid in spentByIndividualOnProject){
                if(spentByIndividualOnProject[pid][voterKey]) spentBudget += Math.round(spentByIndividualOnProject[pid][voterKey]);
            }
        }
        const votingInfo = [];
        const votesObj = rawVotesIndividuals[voterKey] || {};
        for(const pid in votesObj){
            const score = votesObj[pid];
            if(score > 0){
                const orig = projects[pid]?.name || `Project ${pid}`;
                votingInfo.push({ id: pid, name: orig, displayName: receiptDisplayName(pid, orig), score });
            }
        }
        votingInfo.sort((a,b)=> b.score - a.score);
        const spendingInfo = [];
        for(const pid in projects){
            if(spentByIndividualOnProject[pid] && spentByIndividualOnProject[pid][voterKey] > 0){
                const orig = projects[pid].name || `Project ${pid}`;
                spendingInfo.push({ id: pid, name: orig, displayName: receiptDisplayName(pid, orig), amount: Math.round(spentByIndividualOnProject[pid][voterKey]) });
            }
        }
        spendingInfo.sort((a,b)=> b.amount - a.amount);
        const voteMap = new Map(votingInfo.map(v => [v.id, v]));
        const spendMap = new Map(spendingInfo.map(s => [s.id, s]));
        const ids = new Set([...voteMap.keys(), ...spendMap.keys()]);
        const lineRows = [...ids].map(id => {
            const v = voteMap.get(id);
            const s = spendMap.get(id);
            const displayName = v?.displayName || s?.displayName || '-';
            return { name: displayName, votes: v?.score || 0, spent: s?.amount || 0 };
        });
        lineRows.sort((a,b)=> b.votes - a.votes || b.spent - a.spent);
        const totalVotes = lineRows.reduce((a,b)=> a + b.votes, 0);
        const totalSpent = lineRows.reduce((a,b)=> a + b.spent, 0);
        const title = `${(window.i18n?.t?.('voter')) || 'Voter'} ${label.replace(/\D+/g,'')}`;
        if(individualsFlow){
            individualsFlow.appendChild(buildReceipt({ title, spentBudget, lineRows, totalVotes, totalSpent }));
        }
    });

    // Insert receipts AFTER the actions container if present, else after the table
    const actionsContainer = document.getElementById("table-actions");
    const table = document.getElementById("winning-projects-table");
    if(actionsContainer && actionsContainer.parentNode){
        actionsContainer.parentNode.insertBefore(section, actionsContainer.nextSibling);
    } else if(table && table.parentNode){
        table.parentNode.insertBefore(section, table.nextSibling);
    } else {
        resultsDiv.appendChild(section);
    }
}

function updateBudgetDisplay(totalBudget, totalCost) {
    const budgetOutput = document.querySelector('output[for="totalBudget"]');
    
    if (budgetOutput) {
        const formattedCost = parseInt(totalCost || 0).toLocaleString();
        budgetOutput.innerHTML = `<span style="font-weight: bold; font-size: 2em;">${formattedCost}</span>`;
    }
}

// Funktion zur Aktualisierung der Budgetanzeige nach der Berechnung der Ergebnisse
function updateBudgetUsageDisplay(instance, notes) {
    if (!notes || !notes.stats) return;
    
    const totalCost = notes.stats.totalCost || 0;
    const fixedMaxBudget = 380000;
    const percentUsed = Math.round((totalCost / fixedMaxBudget) * 100);

    updateBudgetDisplay(document.getElementById('totalBudget').value, totalCost);
    
    // Aktualisieren des Budget-Titels mit der Prozentanzeige
    const budgetLabel = document.querySelector('[data-field="totalBudget"] h2');
    if (budgetLabel) {
    const usedBudgetTxt = (window.i18n?.t?.('used_budget')) || 'Used Budget';
    const ofTxt = (window.i18n?.t?.('of')) || 'of';
    budgetLabel.innerHTML = `${usedBudgetTxt} <br><span style="font-weight: normal; font-size: 0.8em; color: ${percentUsed > 100 ? '#c00' : '#666'};">${percentUsed}% ${ofTxt} ${fixedMaxBudget}</span>`;
    }
    
    // Fortschrittsbalken für die Budgetnutzung aktualisieren
    const usageBar = document.getElementById('budget-usage-bar');
    if (usageBar) {
        usageBar.style.width = `${Math.min(100, percentUsed)}%`;
        usageBar.style.backgroundColor = percentUsed > 105 ? '#ff6b6b' : '#00c473';
    }
}

/**
 * This function applies the bar charts to the table
 * - cost col => index=2 => #00c473
 * - group columns => #ffa300, except "ALL_INDIVIDUALS" => #e91e63
 */
// (applyBarCharts removed after refactor merging funding columns)
